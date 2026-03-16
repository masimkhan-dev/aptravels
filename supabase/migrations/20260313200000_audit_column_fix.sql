-- ============================================================
-- MIGRATION: Fix missing audit_logs columns & table integrity
-- ============================================================

-- Ensure audit_logs has the expected columns for fn_audit_log_trigger
ALTER TABLE public.audit_logs 
ADD COLUMN IF NOT EXISTS old_data JSONB,
ADD COLUMN IF NOT EXISTS new_data JSONB;

-- Ensure staff_profiles table exists (referenced in types.ts but missing from earlier migrations)
CREATE TABLE IF NOT EXISTS public.staff_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Protect staff profiles
ALTER TABLE public.staff_profiles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "Staff can view all profiles" ON public.staff_profiles FOR SELECT TO authenticated USING (true);
    CREATE POLICY "Admins can manage profiles" ON public.staff_profiles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- If audit_logs or fn_audit_log_trigger was broken, we recreate the trigger function
-- to ensure it uses the now-guaranteed columns.
CREATE OR REPLACE FUNCTION public.fn_audit_log_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_record_id UUID;
  v_action    TEXT;
  v_old       JSONB := NULL;
  v_new       JSONB := NULL;
BEGIN
  v_action := TG_OP; -- 'INSERT' | 'UPDATE' | 'DELETE'

  IF TG_OP = 'DELETE' THEN
    v_old := to_jsonb(OLD);
    v_record_id := (OLD).id;
  ELSIF TG_OP = 'INSERT' THEN
    v_new := to_jsonb(NEW);
    v_record_id := (NEW).id;
  ELSE -- UPDATE
    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);
    v_record_id := (NEW).id;
  END IF;

  INSERT INTO public.audit_logs (table_name, record_id, action, old_data, new_data, performed_by)
  VALUES (TG_TABLE_NAME, v_record_id, v_action, v_old, v_new, auth.uid());

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

-- ─── 4. BOOKING LEDGER VIEW ─────────────────────────────────
-- Drop first because Postgres cannot "drop columns" from a view
-- using CREATE OR REPLACE if the column list changes.
-- CASCADE is needed because rpc_get_admin_dashboard_metrics depends on it.
DROP VIEW IF EXISTS public.booking_ledger_view CASCADE;

CREATE VIEW public.booking_ledger_view AS
SELECT
    b.id AS booking_id,
    b.invoice_no,
    c.full_name AS customer_name,
    b.total_price,
    COALESCE(SUM(p.amount_paid) FILTER (WHERE p.voided = false), 0) AS total_paid,
    (b.total_price - COALESCE(SUM(p.amount_paid) FILTER (WHERE p.voided = false), 0)) AS balance_due,
    b.status,
    b.booking_type,
    b.pnr_number,
    b.visa_country,
    b.created_at
FROM public.bookings b
LEFT JOIN public.customers_safe_view c ON b.customer_id = c.id
LEFT JOIN public.payments p ON b.id = p.booking_id
WHERE b.deleted_at IS NULL
GROUP BY b.id, b.invoice_no, c.full_name, b.total_price, b.status, b.booking_type, b.pnr_number, b.visa_country, b.created_at;

-- Grant access to authenticated users
GRANT SELECT ON public.booking_ledger_view TO authenticated;

-- ─── 5. RECREATE DEPENDENT RPCS ─────────────────────────────
-- Since we used CASCADE, we must restore functions that used the view.
CREATE OR REPLACE FUNCTION public.rpc_get_admin_dashboard_metrics()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bookings      JSONB;
  v_financials    JSONB;
  v_agents        JSONB;
  v_recent        JSONB;
  v_inquiry_count BIGINT;
BEGIN
  -- Only admin/manager/ops can fetch dashboard metrics
  IF NOT (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'manager') OR
    public.has_role(auth.uid(), 'ops')
  ) THEN
    RAISE EXCEPTION 'ACCESS DENIED: Insufficient role to view dashboard metrics.';
  END IF;

  -- ── Booking counts ────────────────────────────────────
  SELECT jsonb_build_object(
    'total_bookings',  COUNT(*),
    'total_packages',  COUNT(*) FILTER (WHERE booking_type = 'Package' AND status != 'Voided'),
    'total_tickets',   COUNT(*) FILTER (WHERE booking_type = 'Ticket'  AND status != 'Voided'),
    'total_visas',     COUNT(*) FILTER (WHERE booking_type = 'Visa'    AND status != 'Voided'),
    'confirmed',       COUNT(*) FILTER (WHERE status = 'Confirmed'),
    'completed',       COUNT(*) FILTER (WHERE status = 'Completed'),
    'voided',          COUNT(*) FILTER (WHERE status = 'Voided'),
    'draft',           COUNT(*) FILTER (WHERE status = 'Draft')
  )
  INTO v_bookings
  FROM public.bookings
  WHERE deleted_at IS NULL;

  -- ── Financial summary ─────────────────────────────────
  WITH
    booking_stats AS (
      SELECT
        COALESCE(SUM(total_price) FILTER (WHERE status != 'Voided'), 0) AS total_sales,
        COALESCE(SUM(margin)      FILTER (WHERE status != 'Voided'), 0) AS total_margin
      FROM public.bookings WHERE deleted_at IS NULL
    ),
    payment_stats AS (
      SELECT
        COALESCE(SUM(amount_paid) FILTER (WHERE voided = false), 0) AS total_collected,
        COALESCE(SUM(amount_paid) FILTER (WHERE voided = false AND payment_method = 'cash'), 0) AS cash_inflow,
        COALESCE(SUM(amount_paid) FILTER (WHERE voided = false AND payment_method != 'cash'), 0) AS bank_inflow
      FROM public.payments
    ),
    outgoing_stats AS (
      SELECT
        COALESCE(SUM(amount) FILTER (WHERE deleted_at IS NULL), 0) AS total_outgoing,
        COALESCE(SUM(amount) FILTER (WHERE deleted_at IS NULL AND payment_method = 'cash'), 0) AS cash_outflow,
        COALESCE(SUM(amount) FILTER (WHERE deleted_at IS NULL AND payment_method != 'cash'), 0) AS bank_outflow
      FROM public.outgoing_payments
    )
  SELECT jsonb_build_object(
    'total_sales',      b.total_sales,
    'total_margin',     b.total_margin,
    'total_collected',  p.total_collected,
    'total_balance',    b.total_sales - p.total_collected,
    'total_outgoing',   o.total_outgoing,
    'cash_liquidity',   p.cash_inflow - o.cash_outflow,
    'bank_liquidity',   p.bank_inflow - o.bank_outflow
  )
  INTO v_financials
  FROM booking_stats b, payment_stats p, outgoing_stats o;

  -- ── Agent wallet summary ───────────────────────────────
  SELECT jsonb_build_object(
    'total_receive', COALESCE(SUM(amount) FILTER (WHERE direction = 'RECEIVE'), 0),
    'total_send',    COALESCE(SUM(amount) FILTER (WHERE direction = 'SEND'), 0),
    'net_balance',   COALESCE(SUM(amount) FILTER (WHERE direction = 'RECEIVE'), 0)
                   - COALESCE(SUM(amount) FILTER (WHERE direction = 'SEND'), 0)
  )
  INTO v_agents
  FROM public.agent_transactions;

  -- ── Recent 5 bookings ─────────────────────────────────
  SELECT jsonb_agg(row_to_json(r))
  INTO v_recent
  FROM (
    SELECT
      blv.booking_id,
      blv.invoice_no,
      blv.customer_name,
      blv.total_price,
      blv.total_paid,
      blv.balance_due,
      blv.status,
      blv.booking_type,
      b.created_at
    FROM public.booking_ledger_view blv
    JOIN public.bookings b ON b.id = blv.booking_id
    WHERE b.deleted_at IS NULL
    ORDER BY b.created_at DESC
    LIMIT 5
  ) r;

  -- ── Inquiry count ──────────────────────────────────────
  SELECT COUNT(*) INTO v_inquiry_count FROM public.inquiries WHERE is_read = false;

  -- ── Assemble and return ───────────────────────────────
  RETURN jsonb_build_object(
    'bookings',       v_bookings,
    'financials',     v_financials,
    'agents',         v_agents,
    'recent_bookings', COALESCE(v_recent, '[]'::jsonb),
    'unread_inquiries', v_inquiry_count
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_get_admin_dashboard_metrics() TO authenticated;

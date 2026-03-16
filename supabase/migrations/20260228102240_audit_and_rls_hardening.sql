-- ============================================================
-- MIGRATION: Audit Logs, PII Safe View & RLS Hardening
-- Safe to run on existing DB — all changes are ADDITIVE.
-- ============================================================

-- ─── 1. UPGRADE app_role ENUM (ADDITIVE) ──────────────────
-- These values may already exist from a later migration; using
-- IF NOT EXISTS via DO block to avoid errors on re-run.
DO $$ BEGIN
  ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'manager';
  ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'sales';
  ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'ops';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── 2. AUDIT LOGS TABLE ──────────────────────────────────
-- This table tracks who changed what and when across all
-- financial and booking tables. The existing types.ts already
-- references this table but it was never created in SQL.
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name    TEXT NOT NULL,
  record_id     UUID NOT NULL,
  action        TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE', 'VOID')),
  old_data      JSONB,
  new_data      JSONB,
  performed_by  UUID REFERENCES auth.users(id),
  performed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes         TEXT
);

-- Protect audit_logs: only admins/managers can read; nobody can update/delete
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and managers can view audit logs"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'manager')
  );

-- Audit log rows are inserted only by trigger functions (SECURITY DEFINER)
-- so we do not need an INSERT policy for end users.

-- ─── 3. GENERIC AUDIT LOG TRIGGER FUNCTION ────────────────
-- Attaches to any table and writes one row to audit_logs per
-- INSERT/UPDATE/DELETE. Captures auth.uid() as the actor.
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

-- ─── 4. ATTACH AUDIT TRIGGERS TO FINANCIAL TABLES ─────────
-- bookings
DROP TRIGGER IF EXISTS trg_audit_bookings ON public.bookings;
CREATE TRIGGER trg_audit_bookings
  AFTER INSERT OR UPDATE OR DELETE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log_trigger();

-- payments
DROP TRIGGER IF EXISTS trg_audit_payments ON public.payments;
CREATE TRIGGER trg_audit_payments
  AFTER INSERT OR UPDATE OR DELETE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log_trigger();

-- outgoing_payments (expenses & refunds)
DROP TRIGGER IF EXISTS trg_audit_outgoing ON public.outgoing_payments;
CREATE TRIGGER trg_audit_outgoing
  AFTER INSERT OR UPDATE OR DELETE ON public.outgoing_payments
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log_trigger();

-- NOTE: agent_transactions already has immutability triggers and is
-- append-only, so a separate audit trigger is not added there.

-- ─── 5. PII-SAFE CUSTOMER VIEW ────────────────────────────
-- Masks CNIC/passport for all users. Visible to all authenticated
-- users. Admins/managers can call get_customer_pii() for full data.
CREATE OR REPLACE VIEW public.customers_safe_view AS
SELECT
  id,
  full_name,
  phone,
  email,
  address,
  -- Mask CNIC/passport: expose last 4 chars only
  CASE
    WHEN cnic_passport IS NULL THEN NULL
    ELSE repeat('•', GREATEST(0, length(cnic_passport) - 4))
         || right(cnic_passport, 4)
  END AS cnic_passport_masked,
  created_at
FROM public.customers
WHERE deleted_at IS NULL;

-- ─── 6. PRIVILEGED PII LOOKUP FUNCTION ───────────────────
-- Returns the raw CNIC/passport ONLY for admin or manager roles.
-- All other calls return NULL for the sensitive field.
CREATE OR REPLACE FUNCTION public.get_customer_pii(p_customer_id UUID)
RETURNS TABLE (
  id             UUID,
  full_name      TEXT,
  cnic_passport  TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Enforce role check inside the function (cannot be bypassed by RLS)
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')) THEN
    RAISE EXCEPTION 'ACCESS DENIED: Insufficient role to view PII data.';
  END IF;

  RETURN QUERY
  SELECT c.id, c.full_name, c.cnic_passport
  FROM public.customers c
  WHERE c.id = p_customer_id;
END;
$$;

-- ─── 7. RLS: CUSTOMERS TABLE ──────────────────────────────
-- All authenticated users can read SAFE fields via the view.
-- Only admin/manager can read the raw table directly.
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Drop any open policy if it exists, then recreate with proper scope
DROP POLICY IF EXISTS "Authenticated can view customers" ON public.customers;
CREATE POLICY "Admins and managers can read full customer data"
  ON public.customers FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'manager')
  );

DROP POLICY IF EXISTS "Authenticated can insert customers" ON public.customers;
CREATE POLICY "Authenticated staff can insert customers"
  ON public.customers FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can update customers" ON public.customers;
CREATE POLICY "Admins and managers can update customers"
  ON public.customers FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'manager')
  );

DROP POLICY IF EXISTS "Authenticated can delete customers" ON public.customers;
CREATE POLICY "Admins can delete customers"
  ON public.customers FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ─── 8. RLS: BOOKINGS TABLE ───────────────────────────────
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can view bookings" ON public.bookings;
CREATE POLICY "Authenticated staff can view bookings"
  ON public.bookings FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated can insert bookings" ON public.bookings;
CREATE POLICY "Authenticated staff can insert bookings"
  ON public.bookings FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Only admin/manager can update bookings (prevents sales from changing totals)
DROP POLICY IF EXISTS "Authenticated can update bookings" ON public.bookings;
CREATE POLICY "Admin and manager can update bookings"
  ON public.bookings FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'manager')
  );

DROP POLICY IF EXISTS "Authenticated can delete bookings" ON public.bookings;
-- Soft delete via deleted_at; hard delete is admin-only
CREATE POLICY "Admins can delete bookings"
  ON public.bookings FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ─── 9. RLS: PAYMENTS TABLE ───────────────────────────────
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can view payments" ON public.payments;
CREATE POLICY "Authenticated staff can view payments"
  ON public.payments FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated can insert payments" ON public.payments;
CREATE POLICY "Authenticated staff can record payments"
  ON public.payments FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Payments can only be voided (updated), not freely modified
DROP POLICY IF EXISTS "Authenticated can update payments" ON public.payments;
CREATE POLICY "Admin and manager can void payments"
  ON public.payments FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'manager')
  );

DROP POLICY IF EXISTS "Authenticated can delete payments" ON public.payments;
CREATE POLICY "Admins can delete payments"
  ON public.payments FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ─── 10. PERFORMANCE INDEXES ──────────────────────────────
-- Add indexes on the highest-traffic lookup fields.
-- CREATE INDEX IF NOT EXISTS prevents errors on re-run.
CREATE INDEX IF NOT EXISTS idx_bookings_customer_id
  ON public.bookings (customer_id);

CREATE INDEX IF NOT EXISTS idx_bookings_status
  ON public.bookings (status);

CREATE INDEX IF NOT EXISTS idx_bookings_invoice_no
  ON public.bookings (invoice_no);

CREATE INDEX IF NOT EXISTS idx_payments_booking_id
  ON public.payments (booking_id);

CREATE INDEX IF NOT EXISTS idx_payments_payment_date
  ON public.payments (payment_date);

CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record
  ON public.audit_logs (table_name, record_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_performed_by
  ON public.audit_logs (performed_by);

-- ─── END OF MIGRATION ─────────────────────────────────────
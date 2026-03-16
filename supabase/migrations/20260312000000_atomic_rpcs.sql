-- ============================================================
-- MIGRATION: Atomic RPCs for Booking Creation & Dashboard
-- All functions are additive / idempotent (CREATE OR REPLACE).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.idempotency_keys (
    request_id UUID PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 1. ATOMIC BOOKING + PAYMENT CREATOR ─────────────────
-- Wraps customer lookup, booking insert, and optional first-
-- payment insert into a single database transaction.
-- If any step raises an exception, the whole transaction rolls back.
--
-- Parameters:
--   p_customer_id   UUID     — existing customer ID
--   p_booking_data  JSONB    — booking fields (total_price, booking_type, etc.)
--   p_payment_data  JSONB    — payment fields or NULL to skip payment
--
-- Returns: the new booking id as UUID
CREATE OR REPLACE FUNCTION public.create_booking_with_payment(
  p_customer_id  UUID,
  p_booking_data JSONB,
  p_payment_data JSONB DEFAULT NULL,
  p_request_id   UUID  DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking_id  UUID;
  v_invoice_no  TEXT;
  v_year        INT := EXTRACT(YEAR FROM NOW());
  v_seq         INT;
  v_journal_id  UUID;
  v_ar_acct     UUID;
  v_rev_acct    UUID;
BEGIN
  -- ── Idempotency Check ─────────────────────────────
  -- If request_id is provided, ensure we haven't processed it
  IF p_request_id IS NOT NULL THEN
    BEGIN
      INSERT INTO public.idempotency_keys (request_id) VALUES (p_request_id);
    EXCEPTION WHEN unique_violation THEN
      RAISE EXCEPTION 'IDEMPOTENCY_ERROR: This request has already been processed.';
    END;
  END IF;

  -- ── Validate customer exists ──────────────────────────
  IF NOT EXISTS (SELECT 1 FROM public.customers WHERE id = p_customer_id) THEN
    RAISE EXCEPTION 'BOOKING_ERROR: Customer % not found.', p_customer_id;
  END IF;

  -- ── Generate invoice number atomically ────────────────
  -- Prevents duplicate invoice_no under concurrent inserts
  INSERT INTO public.invoice_sequences (year, last_value)
  VALUES (v_year, 1)
  ON CONFLICT (year) DO UPDATE
    SET last_value = invoice_sequences.last_value + 1
  RETURNING last_value INTO v_seq;

  v_invoice_no := 'APT-' || v_year || '-' || LPAD(v_seq::TEXT, 4, '0');

  -- ── Insert booking ─────────────────────────────────────
  INSERT INTO public.bookings (
    customer_id,
    assigned_to,
    invoice_no,
    booking_type,
    total_price,
    margin,
    travel_date,
    status,
    pnr_number,
    airline_name,
    ticket_sector,
    visa_country,
    visa_profession,
    package_id
  )
  VALUES (
    p_customer_id,
    (p_booking_data->>'assigned_to')::UUID,
    v_invoice_no,
    COALESCE(p_booking_data->>'booking_type', 'Package'),
    (p_booking_data->>'total_price')::NUMERIC,
    NULLIF(p_booking_data->>'margin', '')::NUMERIC,
    NULLIF(p_booking_data->>'travel_date', '')::DATE,
    COALESCE(p_booking_data->>'status', 'Confirmed'),
    NULLIF(p_booking_data->>'pnr_number', ''),
    NULLIF(p_booking_data->>'airline_name', ''),
    NULLIF(p_booking_data->>'ticket_sector', ''),
    NULLIF(p_booking_data->>'visa_country', ''),
    NULLIF(p_booking_data->>'visa_profession', ''),
    NULLIF(p_booking_data->>'package_id', '')::UUID
  )
  RETURNING id INTO v_booking_id;

  -- ── Post Double-Entry for Booking Revenue ──────────────
  -- Get Account IDs
  SELECT id INTO v_ar_acct FROM public.accounts WHERE code = '1200';
  SELECT id INTO v_rev_acct FROM public.accounts WHERE code = '4000';

  -- Create Journal Entry
  INSERT INTO public.journal_entries (reference_id, reference_type, description, entry_date, created_by)
  VALUES (v_booking_id, 'Booking', 'Booking Invoice ' || v_invoice_no, CURRENT_DATE, auth.uid())
  RETURNING id INTO v_journal_id;

  -- Debit Accounts Receivable
  INSERT INTO public.ledger_lines (journal_entry_id, account_id, debit, credit)
  VALUES (v_journal_id, v_ar_acct, (p_booking_data->>'total_price')::NUMERIC, 0);

  -- Credit Sales Revenue
  INSERT INTO public.ledger_lines (journal_entry_id, account_id, debit, credit)
  VALUES (v_journal_id, v_rev_acct, 0, (p_booking_data->>'total_price')::NUMERIC);

  -- ── Insert first payment (optional) ─────────────────────
  IF p_payment_data IS NOT NULL AND (p_payment_data->>'amount_paid') IS NOT NULL THEN
    IF (p_payment_data->>'amount_paid')::NUMERIC <= 0 THEN
      RAISE EXCEPTION 'PAYMENT_ERROR: Payment amount must be positive.';
    END IF;

    -- Bounds Validation: Payment shouldn't exceed total price
    IF (p_payment_data->>'amount_paid')::NUMERIC > (p_booking_data->>'total_price')::NUMERIC THEN
      RAISE EXCEPTION 'PAYMENT_ERROR: Payment exceeds booking total.';
    END IF;

    INSERT INTO public.payments (
      booking_id,
      amount_paid,
      payment_method,
      reference_no,
      payment_date
    )
    VALUES (
      v_booking_id,
      (p_payment_data->>'amount_paid')::NUMERIC,
      COALESCE(p_payment_data->>'payment_method', 'cash'),
      NULLIF(p_payment_data->>'reference_no', ''),
      COALESCE(NULLIF(p_payment_data->>'payment_date', '')::DATE, CURRENT_DATE)
    );
  END IF;

  RETURN v_booking_id;

EXCEPTION
  WHEN OTHERS THEN
    -- Postgres automatically rolls back the transaction on unhandled exceptions
    RAISE;
END;
$$;

-- Grant execute to authenticated users (RLS on the child tables still applies)
REVOKE ALL ON FUNCTION public.create_booking_with_payment(UUID, JSONB, JSONB, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_booking_with_payment(UUID, JSONB, JSONB, UUID) TO authenticated;

-- ─── 2. ADMIN DASHBOARD METRICS RPC ──────────────────────
-- Replaces 6-10 separate API calls from AdminDashboard.tsx
-- with a single RPC returning all required metrics as JSONB.
--
-- Returns JSONB with:
--   total_bookings, total_packages, total_tickets, total_visas
--   total_sales, total_collected, total_balance
--   total_outgoing, cash_liquidity, bank_liquidity
--   agent_total_receive, agent_total_send
--   recent_bookings (last 5)
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

-- Grant execute to authenticated users
REVOKE ALL ON FUNCTION public.rpc_get_admin_dashboard_metrics() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_get_admin_dashboard_metrics() TO authenticated;

-- ─── END OF MIGRATION ─────────────────────────────────────

-- ============================================================
-- OUTGOING PAYMENTS / EXPENSE MODULE
-- Migration: 20260310000000_outgoing_payments.sql
-- ============================================================

-- 1. Create outgoing_payments table
CREATE TABLE IF NOT EXISTS public.outgoing_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Core Fields
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    category VARCHAR(50) NOT NULL CHECK (category IN ('supplier_payment', 'operational_expense', 'customer_refund')),
    paid_to VARCHAR(255) NOT NULL,  -- Free text: Agent name, Utility Co, Customer Name
    description TEXT,

    -- Optional Linkage (all nullable)
    booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,

    -- Payment Details
    payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('cash', 'bank_transfer', 'online', 'cheque')),
    reference_no VARCHAR(100),
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,

    -- System Fields (matching existing pattern)
    created_by UUID REFERENCES auth.users(id) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ  -- Soft Delete support
);

-- 2. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_outgoing_category ON public.outgoing_payments(category);
CREATE INDEX IF NOT EXISTS idx_outgoing_date ON public.outgoing_payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_outgoing_booking ON public.outgoing_payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_outgoing_customer ON public.outgoing_payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_outgoing_created_by ON public.outgoing_payments(created_by);

-- 3. Auto-update updated_at (reuse existing function)
DROP TRIGGER IF EXISTS trigger_outgoing_updated_at ON public.outgoing_payments;
CREATE TRIGGER trigger_outgoing_updated_at
BEFORE UPDATE ON public.outgoing_payments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 4. Refund Safety Function
-- Prevents refunding more than total customer payments
-- ============================================================
CREATE OR REPLACE FUNCTION public.check_refund_limit()
RETURNS TRIGGER AS $$
DECLARE
    v_total_paid NUMERIC;
    v_total_refunded NUMERIC;
BEGIN
    -- Only run check for customer_refund category
    IF NEW.category = 'customer_refund' AND NEW.booking_id IS NOT NULL THEN

        -- Total paid by customer for this booking
        SELECT COALESCE(SUM(amount_paid), 0) INTO v_total_paid
        FROM public.payments
        WHERE booking_id = NEW.booking_id
          AND voided = false;

        -- Total already refunded for this booking (exclude current record on UPDATE)
        SELECT COALESCE(SUM(amount), 0) INTO v_total_refunded
        FROM public.outgoing_payments
        WHERE booking_id = NEW.booking_id
          AND category = 'customer_refund'
          AND deleted_at IS NULL
          AND id IS DISTINCT FROM NEW.id;

        -- Block if refund exceeds total paid
        IF (v_total_refunded + NEW.amount) > v_total_paid THEN
            RAISE EXCEPTION 'Refund Blocked: Total refund (Rs %) would exceed total payments received (Rs %) for this booking.',
                (v_total_refunded + NEW.amount), v_total_paid;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Attach refund safety trigger
DROP TRIGGER IF EXISTS trigger_refund_security ON public.outgoing_payments;
CREATE TRIGGER trigger_refund_security
BEFORE INSERT OR UPDATE ON public.outgoing_payments
FOR EACH ROW EXECUTE FUNCTION public.check_refund_limit();

-- ============================================================
-- 5. Audit Log Function
-- Writes to existing audit_logs table on insert/soft-delete
-- ============================================================
CREATE OR REPLACE FUNCTION public.audit_outgoing_payment()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.audit_logs (table_name, record_id, action, performed_by, performed_at, notes)
        VALUES (
            'outgoing_payments',
            NEW.id,
            'INSERT',
            NEW.created_by,
            NOW(),
            jsonb_build_object(
                'category', NEW.category,
                'amount', NEW.amount,
                'paid_to', NEW.paid_to,
                'payment_method', NEW.payment_method,
                'payment_date', NEW.payment_date
            )::TEXT
        );
    ELSIF TG_OP = 'UPDATE' AND OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
        INSERT INTO public.audit_logs (table_name, record_id, action, performed_by, performed_at, notes)
        VALUES (
            'outgoing_payments',
            NEW.id,
            'DELETE',
            auth.uid(),
            NOW(),
            jsonb_build_object(
                'category', NEW.category,
                'amount', NEW.amount,
                'paid_to', NEW.paid_to
            )::TEXT
        );
    ELSIF TG_OP = 'UPDATE' AND OLD.deleted_at IS NULL AND NEW.deleted_at IS NULL THEN
        INSERT INTO public.audit_logs (table_name, record_id, action, performed_by, performed_at, notes)
        VALUES (
            'outgoing_payments',
            NEW.id,
            'UPDATE',
            auth.uid(),
            NOW(),
            jsonb_build_object(
                'category', NEW.category,
                'amount', NEW.amount,
                'paid_to', NEW.paid_to
            )::TEXT
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_audit_outgoing ON public.outgoing_payments;
CREATE TRIGGER trigger_audit_outgoing
AFTER INSERT OR UPDATE ON public.outgoing_payments
FOR EACH ROW EXECUTE FUNCTION public.audit_outgoing_payment();

-- ============================================================
-- 6. Row Level Security (RLS)
-- Only 'admin' role exists in system (app_role enum)
-- Uses existing has_role() helper function
-- ============================================================
ALTER TABLE public.outgoing_payments ENABLE ROW LEVEL SECURITY;

-- Admin: Full access
DROP POLICY IF EXISTS "Admins can manage outgoing_payments" ON public.outgoing_payments;
CREATE POLICY "Admins can manage outgoing_payments"
ON public.outgoing_payments
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 7. Update daily_cash_summary view
-- Now includes Outflow from outgoing_payments for Net Cash
-- Note: DROP first required because existing view has different column names
-- ============================================================
DROP VIEW IF EXISTS public.daily_cash_summary CASCADE;
CREATE VIEW public.daily_cash_summary AS
SELECT
    combined.date_record,
    COALESCE(combined.total_inflow, 0)  AS total_inflow,
    COALESCE(combined.total_outflow, 0) AS total_outflow,
    (COALESCE(combined.total_inflow, 0) - COALESCE(combined.total_outflow, 0)) AS net_cash
FROM (
    SELECT
        COALESCE(inc.date_record, out.date_record) AS date_record,
        inc.total_inflow,
        out.total_outflow
    FROM (
        SELECT
            DATE(payment_date) AS date_record,
            SUM(amount_paid)   AS total_inflow
        FROM public.payments
        WHERE voided = false
        GROUP BY DATE(payment_date)
    ) AS inc
    FULL OUTER JOIN (
        SELECT
            DATE(payment_date) AS date_record,
            SUM(amount)        AS total_outflow
        FROM public.outgoing_payments
        WHERE deleted_at IS NULL
        GROUP BY DATE(payment_date)
    ) AS out ON inc.date_record = out.date_record
) AS combined
ORDER BY combined.date_record DESC;

-- ============================================================
-- 8. Final Dashboard Stats View
-- Consolidated view for the main admin dashboard cards
-- Subtracts expenses from margin for true Net Profit
-- ============================================================
DROP VIEW IF EXISTS public.admin_dashboard_stats CASCADE;
CREATE VIEW public.admin_dashboard_stats AS
WITH booking_stats AS (
    SELECT
        COALESCE(SUM(total_price), 0)  AS total_sales,
        COALESCE(SUM(margin), 0)       AS total_margin,
        COUNT(*)                        AS total_bookings,
        COUNT(*) FILTER (WHERE travel_date >= CURRENT_DATE) AS active_cases,
        COUNT(*) FILTER (WHERE booking_type = 'Package') AS umrah_count,
        COUNT(*) FILTER (WHERE booking_type = 'Ticket')  AS ticket_count,
        COUNT(*) FILTER (WHERE booking_type = 'Visa')    AS visa_count
    FROM public.bookings
    WHERE status != 'Voided'
),
payment_stats AS (
    SELECT 
        COALESCE(SUM(amount_paid), 0) AS total_collected,
        COALESCE(SUM(amount_paid) FILTER (WHERE payment_method ILIKE 'cash'), 0) as cash_inflow,
        COALESCE(SUM(amount_paid) FILTER (WHERE payment_method NOT ILIKE 'cash'), 0) as bank_inflow
    FROM public.payments
    WHERE voided = false
),
expense_stats AS (
    SELECT 
        COALESCE(SUM(amount), 0) AS total_expenses,
        COALESCE(SUM(amount) FILTER (WHERE payment_method ILIKE 'cash'), 0) as cash_outflow,
        COALESCE(SUM(amount) FILTER (WHERE payment_method NOT ILIKE 'cash'), 0) as bank_outflow
    FROM public.outgoing_payments
    WHERE deleted_at IS NULL
)
SELECT
    b.total_sales,
    p.total_collected,
    (b.total_sales - p.total_collected) AS total_balance,
    (b.total_margin - e.total_expenses) AS total_margin, -- Real Net Profit
    b.total_bookings,
    b.active_cases,
    b.umrah_count,
    b.ticket_count,
    b.visa_count,
    e.total_expenses,
    (p.cash_inflow - e.cash_outflow) as cash_balance,
    (p.bank_inflow - e.bank_outflow) as bank_balance,
    (p.total_collected - e.total_expenses) as total_liquidity
FROM booking_stats b, payment_stats p, expense_stats e;

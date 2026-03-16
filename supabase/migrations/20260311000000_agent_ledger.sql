-- Migration: 20260311000000_agent_ledger.sql

-- 1. Create Agents Table
CREATE TABLE IF NOT EXISTS public.agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL CHECK (name <> ''),
    phone TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- 2. Modify Bookings Table
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS agent_id UUID REFERENCES public.agents(id);

-- 3. Create Agent Transactions Table
CREATE TABLE IF NOT EXISTS public.agent_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES public.agents(id),
    booking_id UUID REFERENCES public.bookings(id),
    amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    direction TEXT NOT NULL CHECK (direction IN ('SEND', 'RECEIVE')),
    account_type TEXT NOT NULL CHECK (account_type IN ('CASH', 'BANK')),
    notes TEXT,
    created_by UUID,
    performed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    is_reversal BOOLEAN DEFAULT false,
    
    CONSTRAINT check_send_booking CHECK (
        direction <> 'SEND' OR booking_id IS NOT NULL
    )
);

-- 4. Liquidity Calculation Function
CREATE OR REPLACE FUNCTION public.check_liquidity(p_account_type TEXT)
RETURNS NUMERIC AS $$
DECLARE
    v_inflow NUMERIC := 0;
    v_outflow NUMERIC := 0;
BEGIN
    -- Inflows: Customer payments + Agent RECEIVE
    SELECT 
        COALESCE(SUM(amount_paid), 0) INTO v_inflow
    FROM public.payments
    WHERE voided = false 
      AND (
          (p_account_type = 'CASH' AND payment_method ILIKE 'cash') OR
          (p_account_type = 'BANK' AND payment_method NOT ILIKE 'cash')
      );

    SELECT 
        COALESCE(SUM(amount), 0) + v_inflow INTO v_inflow
    FROM public.agent_transactions
    WHERE direction = 'RECEIVE' AND account_type = p_account_type;

    -- Outflows: Outgoing payments + Agent SEND
    SELECT 
        COALESCE(SUM(amount), 0) INTO v_outflow
    FROM public.outgoing_payments
    WHERE deleted_at IS NULL
      AND (
          (p_account_type = 'CASH' AND payment_method ILIKE 'cash') OR
          (p_account_type = 'BANK' AND payment_method NOT ILIKE 'cash')
      );

    SELECT 
        COALESCE(SUM(amount), 0) + v_outflow INTO v_outflow
    FROM public.agent_transactions
    WHERE direction = 'SEND' AND account_type = p_account_type;

    RETURN v_inflow - v_outflow;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Treasury Protection Trigger
CREATE OR REPLACE FUNCTION public.fn_trg_agent_wallet_check()
RETURNS TRIGGER AS $$
DECLARE
    v_balance NUMERIC;
BEGIN
    IF NEW.direction = 'SEND' THEN
        -- 1. Lock treasury using advisory lock
        PERFORM pg_advisory_xact_lock(5001);

        -- 2. Calculate available balance
        v_balance := public.check_liquidity(NEW.account_type);

        -- 3. Check if balance is sufficient
        IF v_balance < NEW.amount THEN
            RAISE EXCEPTION 'Insufficient % balance. Available: %, Attempted: %',
                NEW.account_type, v_balance, NEW.amount;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_agent_wallet_check
BEFORE INSERT ON public.agent_transactions
FOR EACH ROW EXECUTE FUNCTION public.fn_trg_agent_wallet_check();

-- 6. Auto Payment Trigger
CREATE OR REPLACE FUNCTION public.fn_trg_agent_receive_payment()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.direction = 'RECEIVE' AND NEW.booking_id IS NOT NULL THEN
        INSERT INTO public.payments (
            booking_id,
            amount_paid,
            payment_method,
            voided,
            payment_date,
            reference_no -- Optional, using for identification
        ) VALUES (
            NEW.booking_id,
            NEW.amount,
            NEW.account_type,
            false,
            now(),
            'AGENT-TX-' || NEW.id::text
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_agent_receive_payment
AFTER INSERT ON public.agent_transactions
FOR EACH ROW EXECUTE FUNCTION public.fn_trg_agent_receive_payment();

-- 7. Agent Balance View
CREATE OR REPLACE VIEW public.agent_balances AS
SELECT
    agent_id,
    SUM(
        CASE
            WHEN direction = 'SEND' THEN amount
            ELSE -amount
        END
    ) AS balance
FROM public.agent_transactions
GROUP BY agent_id;

-- 8. Agent Statement View
CREATE OR REPLACE VIEW public.agent_statements AS
SELECT
    id AS transaction_id,
    agent_id,
    performed_at AS date,
    direction,
    account_type,
    amount,
    notes,
    SUM(
        CASE
            WHEN direction = 'SEND' THEN amount
            ELSE -amount
        END
    ) OVER (PARTITION BY agent_id ORDER BY performed_at, id) AS running_balance
FROM public.agent_transactions;

-- 9. Update Dashboard View
DROP VIEW IF EXISTS public.admin_dashboard_stats CASCADE;
CREATE OR REPLACE VIEW public.admin_dashboard_stats AS
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
    WHERE status != 'Voided' AND deleted_at IS NULL
),
payment_stats AS (
    -- Customer Payments
    SELECT 
        COALESCE(SUM(amount_paid), 0) AS total_collected,
        COALESCE(SUM(amount_paid) FILTER (WHERE payment_method ILIKE 'cash'), 0) as cash_inflow,
        COALESCE(SUM(amount_paid) FILTER (WHERE payment_method NOT ILIKE 'cash'), 0) as bank_inflow
    FROM public.payments
    WHERE voided = false
),
agent_stats AS (
    -- Agent Inflows (RECEIVE) and Outflows (SEND)
    SELECT
        COALESCE(SUM(amount) FILTER (WHERE direction = 'RECEIVE' AND account_type = 'CASH'), 0) as agent_cash_in,
        COALESCE(SUM(amount) FILTER (WHERE direction = 'RECEIVE' AND account_type = 'BANK'), 0) as agent_bank_in,
        COALESCE(SUM(amount) FILTER (WHERE direction = 'SEND' AND account_type = 'CASH'), 0) as agent_cash_out,
        COALESCE(SUM(amount) FILTER (WHERE direction = 'SEND' AND account_type = 'BANK'), 0) as agent_bank_out
    FROM public.agent_transactions
),
expense_stats AS (
    -- Outgoing Expenses
    SELECT 
        COALESCE(SUM(amount), 0) AS total_expenses,
        COALESCE(SUM(amount) FILTER (WHERE payment_method ILIKE 'cash'), 0) as cash_outflow,
        COALESCE(SUM(amount) FILTER (WHERE payment_method NOT ILIKE 'cash'), 0) as bank_outflow
    FROM public.outgoing_payments
    WHERE deleted_at IS NULL
)
SELECT
    b.total_sales,
    (p.total_collected + (SELECT COALESCE(SUM(amount), 0) FROM public.agent_transactions WHERE direction = 'RECEIVE')) AS total_collected,
    (b.total_sales - p.total_collected) AS total_balance,
    (b.total_margin - e.total_expenses) AS total_margin,
    b.total_bookings,
    b.active_cases,
    b.umrah_count,
    b.ticket_count,
    b.visa_count,
    (e.total_expenses + (SELECT COALESCE(SUM(amount), 0) FROM public.agent_transactions WHERE direction = 'SEND')) AS total_expenses,
    (p.cash_inflow + a.agent_cash_in - e.cash_outflow - a.agent_cash_out) as cash_balance,
    (p.bank_inflow + a.agent_bank_in - e.bank_outflow - a.agent_bank_out) as bank_balance,
    ((p.total_collected + a.agent_cash_in + a.agent_bank_in) - (e.total_expenses + a.agent_cash_out + a.agent_bank_out)) as total_liquidity
FROM booking_stats b, payment_stats p, expense_stats e, agent_stats a;

-- 10. Security Rules (RLS)
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_transactions ENABLE ROW LEVEL SECURITY;

-- Agents Policies
CREATE POLICY "Allow authenticated admins to manage agents"
ON public.agents FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Agent Transactions Policies
CREATE POLICY "Allow authenticated admins to insert/select agent transactions"
ON public.agent_transactions FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated admins to insert transactions"
ON public.agent_transactions FOR INSERT
TO authenticated
WITH CHECK (true);

-- Explicitly block update/delete
CREATE POLICY "Block agent transaction updates"
ON public.agent_transactions FOR UPDATE
TO authenticated
USING (false);

CREATE POLICY "Block agent transaction deletes"
ON public.agent_transactions FOR DELETE
TO authenticated
USING (false);

-- Trigger for immutability (Extra safety)
CREATE OR REPLACE FUNCTION public.fn_block_immutable_updates()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Financial transactions are immutable and cannot be updated or deleted.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_immutable_agent_transactions
BEFORE UPDATE OR DELETE ON public.agent_transactions
FOR EACH ROW EXECUTE FUNCTION public.fn_block_immutable_updates();

-- ============================================================
-- MIGRATION: Safety Guardrails (Minimal Improvements)
-- Provides Agent Payout limits and basic refund rules.
-- Includes concurrency controls and ledger safety checks.
-- ============================================================

-- ─── 0. PERFORMANCE & CONSISTENCY INDEXES ───────────────────
-- Enforce unique constraint to prevent duplicate double-entry posting
-- for the same transaction.
CREATE UNIQUE INDEX IF NOT EXISTS idx_journal_reference_unique 
ON public.journal_entries(reference_type, reference_id)
WHERE reference_id IS NOT NULL;

-- Index to speed up payout validation sums
CREATE INDEX IF NOT EXISTS idx_agent_tx_booking
ON public.agent_transactions(booking_id, direction);

-- ─── 1. AGENT PAYOUT VALIDATION (TRIGGER) ───────────────────
-- Blocks "SEND" agent transactions if the cumulative payout 
-- exceeds the booking's total price. Limits financial risk.

CREATE OR REPLACE FUNCTION public.fn_validate_agent_payout()
RETURNS TRIGGER AS $$
DECLARE
    v_booking_price NUMERIC := 0;
    v_margin NUMERIC := 0;
    v_supplier_cost NUMERIC := 0;
    v_already_sent NUMERIC := 0;
BEGIN
    -- 0a. Prevent Negative or Zero Transactions
    IF NEW.amount <= 0 THEN
        RAISE EXCEPTION 'INVALID_AMOUNT: Transaction amount must be strictly positive.';
    END IF;

    -- 0b. Prevent SEND without Booking
    IF NEW.direction = 'SEND' AND NEW.booking_id IS NULL THEN
        RAISE EXCEPTION 'BOOKING_REQUIRED_FOR_SEND: You must link a booking when sending money to an agent.';
    END IF;

    -- 0c. Prevent Reversal Loops
    IF NEW.reversal_of IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM public.agent_transactions WHERE id = NEW.reversal_of AND is_reversal = false) THEN
            RAISE EXCEPTION 'INVALID_REVERSAL_REFERENCE: You can only reverse an original transaction, not another reversal.';
        END IF;
    END IF;

    -- We only care about SENDs tied to a booking for payout limits
    IF NEW.direction = 'SEND' AND NEW.booking_id IS NOT NULL THEN
        
        -- 1. Validate agent exists
        IF NOT EXISTS (SELECT 1 FROM public.agents WHERE id = NEW.agent_id) THEN
            RAISE EXCEPTION 'INVALID_AGENT: Agent % does not exist.', NEW.agent_id;
        END IF;

        -- 2. Get the booking total price and margin AND lock the row to prevent race conditions
        SELECT total_price, COALESCE(margin, 0)
        INTO v_booking_price, v_margin
        FROM public.bookings
        WHERE id = NEW.booking_id
        FOR UPDATE;

        IF v_booking_price IS NULL THEN
            RAISE EXCEPTION 'BOOKING_NOT_FOUND: Linked booking does not exist.';
        END IF;

        v_supplier_cost := v_booking_price - v_margin;

        -- 2b. Add row-level locking on existing agent transactions for this booking to prevent concurrent sum race-conditions
        PERFORM 1
        FROM public.agent_transactions
        WHERE booking_id = NEW.booking_id
        FOR UPDATE;

        -- 3. Calculate what we have ALREADY sent for this booking
        SELECT COALESCE(SUM(amount), 0)
        INTO v_already_sent
        FROM public.agent_transactions
        WHERE booking_id = NEW.booking_id AND direction = 'SEND';

        -- 4. Check if the proposed amount exceeds the limit (Supplier Cost)
        IF (v_already_sent + NEW.amount) > v_supplier_cost THEN
            RAISE EXCEPTION 'PAYOUT_LIMIT_EXCEEDED: You cannot send more to the agent (Rs %) than the Supplier Cost (Rs %). [Total: Rs %, Margin: Rs %, Already sent: Rs %]', 
                NEW.amount, v_supplier_cost, v_booking_price, v_margin, v_already_sent;
        END IF;

    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_validate_agent_payout ON public.agent_transactions;
CREATE TRIGGER trg_validate_agent_payout
BEFORE INSERT ON public.agent_transactions
FOR EACH ROW EXECUTE FUNCTION public.fn_validate_agent_payout();


-- ─── 2. REFUND / REVERSAL SYSTEM ────────────────────────────
-- 2a. Add Reversal Tracking to agent_transactions
ALTER TABLE public.agent_transactions 
ADD COLUMN IF NOT EXISTS reversal_of UUID REFERENCES public.agent_transactions(id);

-- 2b. Protect voided bookings from financial changes
CREATE OR REPLACE FUNCTION public.fn_prevent_voided_payments()
RETURNS TRIGGER AS $$
DECLARE
    v_status TEXT;
BEGIN
    IF NEW.booking_id IS NOT NULL THEN
        SELECT status INTO v_status FROM public.bookings WHERE id = NEW.booking_id;
        
        IF v_status IS NULL THEN
            RAISE EXCEPTION 'BOOKING_NOT_FOUND: Linked booking does not exist.';
        END IF;
        
        IF v_status = 'Voided' THEN
            -- Allow "is_reversal" transactions even if booking is voided
            -- Otherwise block standard payments or agent payouts
            IF TG_TABLE_NAME = 'agent_transactions' THEN
                IF NEW.is_reversal = false THEN
                    RAISE EXCEPTION 'Cannot record new standard transactions for a Voided booking. Use an explicit reversal.';
                END IF;
            ELSE
                -- For customer payments: allow negative payments (refunds), block positive payments
                IF NEW.amount_paid > 0 THEN
                    RAISE EXCEPTION 'Cannot record new payments on a Voided booking.';
                END IF;
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_prevent_voided_agent_tx ON public.agent_transactions;
CREATE TRIGGER trg_prevent_voided_agent_tx
BEFORE INSERT ON public.agent_transactions
FOR EACH ROW EXECUTE FUNCTION public.fn_prevent_voided_payments();

DROP TRIGGER IF EXISTS trg_prevent_voided_cust_payments ON public.payments;
CREATE TRIGGER trg_prevent_voided_cust_payments
BEFORE INSERT ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.fn_prevent_voided_payments();


-- ─── 3. DOUBLE-ENTRY ACCOUNTING INTEGRATION ─────────────────
-- Automatically posts journal entries and ledger lines when 
-- an agent transaction (SEND or RECEIVE) is recorded.

CREATE OR REPLACE FUNCTION public.fn_post_agent_ledger()
RETURNS TRIGGER AS $$
DECLARE
  v_journal_id UUID;
  v_cash_acct UUID;
  v_bank_acct UUID;
  v_agent_liability_acct UUID;
  v_liquidity_acct UUID;
BEGIN
  -- We strictly block double entries for negative amounts or zero
  IF NEW.amount <= 0 THEN
     RAISE EXCEPTION 'INVALID_AMOUNT: Journal Ledger cannot process zero or negative amounts. Use reversels instead.';
  END IF;

  -- Get Account IDs
  SELECT id INTO v_cash_acct FROM public.accounts WHERE code = '1000';
  SELECT id INTO v_bank_acct FROM public.accounts WHERE code = '1100';
  SELECT id INTO v_agent_liability_acct FROM public.accounts WHERE code = '2100';

  -- Validate ledger accounts
  IF v_cash_acct IS NULL OR v_bank_acct IS NULL OR v_agent_liability_acct IS NULL THEN
    RAISE EXCEPTION 'LEDGER_ACCOUNT_MISSING: Critical financial accounts (1000, 1100, 2100) are not configured.';
  END IF;

  -- Determine liquidity account (Cash or Bank)
  IF NEW.account_type = 'CASH' THEN
    v_liquidity_acct := v_cash_acct;
  ELSE
    v_liquidity_acct := v_bank_acct;
  END IF;

  -- Setup Journal Entry
  -- Use Agent Transaction ID as reference_id to ensure uniqueness via idx_journal_reference_unique
  INSERT INTO public.journal_entries (reference_id, reference_type, description, entry_date, created_by)
  VALUES (
    NEW.id, 
    'Agent Transaction', 
    'Agent Transaction: ' || NEW.direction || ' for Agent ' || NEW.agent_id, 
    CURRENT_DATE, 
    COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000')
  )
  RETURNING id INTO v_journal_id;

  -- Routing based on SEND vs RECEIVE
  IF NEW.direction = 'SEND' THEN
    -- We are paying the agent (Reducing liability, Reducing Cash/Bank)
    -- Debit: Agent Liability
    INSERT INTO public.ledger_lines (journal_entry_id, account_id, debit, credit)
    VALUES (v_journal_id, v_agent_liability_acct, NEW.amount, 0);

    -- Credit: Cash/Bank
    INSERT INTO public.ledger_lines (journal_entry_id, account_id, debit, credit)
    VALUES (v_journal_id, v_liquidity_acct, 0, NEW.amount);
    
  ELSIF NEW.direction = 'RECEIVE' THEN
    -- Agent is paying us (Increasing Cash/Bank, Increasing liability)
    -- Debit: Cash/Bank
    INSERT INTO public.ledger_lines (journal_entry_id, account_id, debit, credit)
    VALUES (v_journal_id, v_liquidity_acct, NEW.amount, 0);

    -- Credit: Agent Liability
    INSERT INTO public.ledger_lines (journal_entry_id, account_id, debit, credit)
    VALUES (v_journal_id, v_agent_liability_acct, 0, NEW.amount);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_post_agent_ledger ON public.agent_transactions;
CREATE TRIGGER trg_post_agent_ledger
AFTER INSERT ON public.agent_transactions
FOR EACH ROW EXECUTE FUNCTION public.fn_post_agent_ledger();

-- ─── END OF MIGRATION ────────────────────────────────────

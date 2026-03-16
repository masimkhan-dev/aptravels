-- ============================================================
-- MIGRATION: Phase 7 - Core Financial Ledger (Double-Entry)
-- ============================================================

-- ─── 1. CHART OF ACCOUNTS ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(10) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('asset', 'liability', 'equity', 'revenue', 'expense')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed defaults (idempotent)
INSERT INTO public.accounts (code, name, type) VALUES 
('1000', 'Cash & Equivalents', 'asset'),
('1100', 'Bank Account', 'asset'),
('1200', 'Accounts Receivable', 'asset'),
('2000', 'Accounts Payable', 'liability'),
('2100', 'Agent Liability', 'liability'),
('4000', 'Sales Revenue', 'revenue'),
('5000', 'Cost of Goods Sold', 'expense')
ON CONFLICT (code) DO NOTHING;

-- ─── 2. JOURNAL ENTRIES ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.journal_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference_id UUID, -- e.g., booking_id, payment_id
    reference_type VARCHAR(50) NOT NULL, -- e.g., 'Booking', 'Payment'
    description TEXT NOT NULL,
    entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_by UUID, -- auth.uid() usually
    created_at TIMESTAMPTZ DEFAULT NOW(),
    voided BOOLEAN DEFAULT false
);

-- Protect journal entries from deletion
CREATE OR REPLACE FUNCTION public.fn_prevent_journal_deletion()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Accounting Principle: Journal entries cannot be deleted, only voided/reversed.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_journal_delete ON public.journal_entries;
CREATE TRIGGER trg_prevent_journal_delete
BEFORE DELETE ON public.journal_entries
FOR EACH ROW EXECUTE FUNCTION public.fn_prevent_journal_deletion();

-- ─── 3. LEDGER LINES ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ledger_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    journal_entry_id UUID NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES public.accounts(id),
    debit NUMERIC(12,2) DEFAULT 0 CHECK (debit >= 0),
    credit NUMERIC(12,2) DEFAULT 0 CHECK (credit >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    -- Rule: Must be either debit or credit, not both on the same line
    CONSTRAINT chk_debit_credit_mutex CHECK (
        (debit > 0 AND credit = 0) OR (credit > 0 AND debit = 0) OR (debit = 0 AND credit = 0)
    )
);

-- Protect ledger lines from deletion or update
CREATE OR REPLACE FUNCTION public.fn_prevent_ledger_tampering()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Accounting Principle: Ledger lines are immutable.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_ledger_tampering ON public.ledger_lines;
CREATE TRIGGER trg_prevent_ledger_tampering
BEFORE UPDATE OR DELETE ON public.ledger_lines
FOR EACH ROW EXECUTE FUNCTION public.fn_prevent_ledger_tampering();

-- Enable RLS for these tables (Admin/Manager only typically)
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_lines ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Admins can manage accounts" ON public.accounts FOR ALL USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
  CREATE POLICY "Anyone can read accounts" ON public.accounts FOR SELECT USING (true);
EXCEPTION WHEN OTHERS THEN END; $$;

DO $$ BEGIN
  CREATE POLICY "Staff can read journals" ON public.journal_entries FOR SELECT USING (true);
  CREATE POLICY "Staff can read lines" ON public.ledger_lines FOR SELECT USING (true);
EXCEPTION WHEN OTHERS THEN END; $$;

-- ─── 4. PAYMENT TRIGGER ─────────────────────────────────────
-- A trigger to automatically post dual-entry journals when a payment is added.
CREATE OR REPLACE FUNCTION public.fn_post_payment_ledger()
RETURNS TRIGGER AS $$
DECLARE
  v_journal_id UUID;
  v_cash_acct UUID;
  v_bank_acct UUID;
  v_ar_acct UUID;
  v_debit_acct UUID;
BEGIN
  -- We only post if the payment is positive
  IF NEW.amount_paid <= 0 THEN
    RETURN NEW;
  END IF;

  -- Get Account IDs
  SELECT id INTO v_cash_acct FROM public.accounts WHERE code = '1000';
  SELECT id INTO v_bank_acct FROM public.accounts WHERE code = '1100';
  SELECT id INTO v_ar_acct FROM public.accounts WHERE code = '1200';

  -- Determine debit account based on payment method
  IF LOWER(NEW.payment_method) = 'cash' THEN
    v_debit_acct := v_cash_acct;
  ELSE
    v_debit_acct := v_bank_acct;
  END IF;

  -- Create Journal Entry
  INSERT INTO public.journal_entries (reference_id, reference_type, description, entry_date, created_by)
  VALUES (NEW.id, 'Payment', 'Received payment for Booking ' || NEW.booking_id, CURRENT_DATE, auth.uid())
  RETURNING id INTO v_journal_id;

  -- Debit Cash/Bank
  INSERT INTO public.ledger_lines (journal_entry_id, account_id, debit, credit)
  VALUES (v_journal_id, v_debit_acct, NEW.amount_paid, 0);

  -- Credit Accounts Receivable
  INSERT INTO public.ledger_lines (journal_entry_id, account_id, debit, credit)
  VALUES (v_journal_id, v_ar_acct, 0, NEW.amount_paid);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_post_payment_ledger ON public.payments;
CREATE TRIGGER trg_post_payment_ledger
AFTER INSERT ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.fn_post_payment_ledger();

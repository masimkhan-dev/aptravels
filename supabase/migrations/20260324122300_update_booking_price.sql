-- MIGRATION: 20260324122300_update_booking_price.sql

-- ─── ATOMIC BOOKING PRICE EDIT RPC ───────────────────────────────────────
-- Safely modifies a booking's total price on a live system.
-- Because double-entry ledgers and agent transactions are strictly immutable, 
-- this uses a "Reversal & Re-entry" approach to net out the old values
-- before applying the new ones.
-- 
-- It updates:
-- 1. public.bookings (total_price)
-- 2. public.journal_entries & public.ledger_lines (creates reversing entries and new correct entries)
-- 3. public.agent_transactions (adjusts the agent's running balance if they were linked/paid)

CREATE OR REPLACE FUNCTION public.rpc_update_booking_total_price(
  p_booking_id UUID,
  p_new_total_price NUMERIC,
  p_reason TEXT DEFAULT 'Price correction'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_total NUMERIC;
  v_margin NUMERIC;
  v_agent_id UUID;
  v_invoice_no TEXT;
  
  v_ar_acct UUID;
  v_rev_acct UUID;
  
  v_rev_journal_id UUID;
  v_new_journal_id UUID;
  
  v_diff_amount NUMERIC;
  
  v_total_sent_to_agent NUMERIC := 0;
  v_new_supplier_cost NUMERIC;
BEGIN
  -- 1. Validate Admin Role
  IF NOT (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'manager')
  ) THEN
    RAISE EXCEPTION 'ACCESS DENIED: Insufficient role to edit financials.';
  END IF;

  -- 2. Get current booking data
  SELECT total_price, margin, agent_id, invoice_no 
  INTO v_old_total, v_margin, v_agent_id, v_invoice_no
  FROM public.bookings
  WHERE id = p_booking_id AND deleted_at IS NULL;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found or already deleted.';
  END IF;

  IF p_new_total_price = v_old_total THEN
    RETURN jsonb_build_object('success', true, 'message', 'No change needed.');
  END IF;

  IF p_new_total_price < 0 THEN
    RAISE EXCEPTION 'Total price cannot be negative.';
  END IF;

  -- 3. Account References
  SELECT id INTO v_ar_acct FROM public.accounts WHERE code = '1200';
  SELECT id INTO v_rev_acct FROM public.accounts WHERE code = '4000';

  -- 4. Reversal Journal Entry for OLD Total
  INSERT INTO public.journal_entries (reference_id, reference_type, description, entry_date, created_by)
  VALUES (p_booking_id, 'BookingAdjustment_Rev', 'Reversal for Booking Edit ' || v_invoice_no || ': ' || p_reason, CURRENT_DATE, auth.uid())
  RETURNING id INTO v_rev_journal_id;

  -- Reverse original: Credit A/R (reduces asset), Debit Revenue (reduces equity/revenue)
  INSERT INTO public.ledger_lines (journal_entry_id, account_id, debit, credit)
  VALUES (v_rev_journal_id, v_ar_acct, 0, v_old_total);
  INSERT INTO public.ledger_lines (journal_entry_id, account_id, debit, credit)
  VALUES (v_rev_journal_id, v_rev_acct, v_old_total, 0);

  -- 5. New Journal Entry for NEW Total
  INSERT INTO public.journal_entries (reference_id, reference_type, description, entry_date, created_by)
  VALUES (p_booking_id, 'BookingAdjustment_New', 'New Entry for Booking Edit ' || v_invoice_no, CURRENT_DATE, auth.uid())
  RETURNING id INTO v_new_journal_id;

  -- Debit A/R, Credit Revenue
  INSERT INTO public.ledger_lines (journal_entry_id, account_id, debit, credit)
  VALUES (v_new_journal_id, v_ar_acct, p_new_total_price, 0);
  INSERT INTO public.ledger_lines (journal_entry_id, account_id, debit, credit)
  VALUES (v_new_journal_id, v_rev_acct, 0, p_new_total_price);

  -- 6. Update Agent Balance (If Agent Linked)
  -- The agent's supplier_cost is what we owe them (total_price - margin)
  -- If total_price changes, the supplier cost changes by the exact same diff amount (assuming margin stays static).
  IF v_agent_id IS NOT NULL THEN
    
    -- Let's see if we ever "SENT" money (Supplier Cost payout) to the agent for this booking.
    -- Or, more safely, just calculate the difference and post an adjusting entry.
    v_diff_amount := v_old_total - p_new_total_price;
    
    IF v_diff_amount > 0 THEN
      -- Price Dropped. The agent's "Payout" they get is smaller. 
      -- In our system, SEND makes their balance go UP (meaning we owe them / we paid them).
      -- RECEIVE makes their balance go DOWN.
      -- If the price dropped, we owe the agent LESS. We insert a RECEIVE "Reversal" to drop their balance.
      INSERT INTO public.agent_transactions (
        agent_id, booking_id, amount, direction, account_type, notes, created_by, is_reversal
      ) VALUES (
        v_agent_id, p_booking_id, v_diff_amount, 'RECEIVE', 'CASH', 'Auto-adjustment: Booking price reduced by ' || v_diff_amount, auth.uid(), true
      );
    ELSIF v_diff_amount < 0 THEN
      -- Price Increased. We owe the agent MORE. 
      -- We insert a SEND entry for the difference to increase their balance.
      INSERT INTO public.agent_transactions (
        agent_id, booking_id, amount, direction, account_type, notes, created_by, is_reversal
      ) VALUES (
        v_agent_id, p_booking_id, ABS(v_diff_amount), 'SEND', 'CASH', 'Auto-adjustment: Booking price increased by ' || ABS(v_diff_amount), auth.uid(), true
      );
    END IF;
  END IF;

  -- 7. Audit Log the change
  INSERT INTO public.audit_logs (table_name, record_id, action, performed_by, notes)
  VALUES ('bookings', p_booking_id::TEXT, 'UPDATE', auth.uid(), 'Changed total_price from ' || v_old_total || ' to ' || p_new_total_price || '. Reason: ' || p_reason);

  -- 8. Apply the Update
  UPDATE public.bookings 
  SET total_price = p_new_total_price,
      updated_at = NOW()
  WHERE id = p_booking_id;

  RETURN jsonb_build_object(
    'success', true, 
    'message', 'Booking price successfully updated to ' || p_new_total_price,
    'old_price', v_old_total,
    'new_price', p_new_total_price
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$$;

-- Grant execution
REVOKE ALL ON FUNCTION public.rpc_update_booking_total_price(UUID, NUMERIC, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_update_booking_total_price(UUID, NUMERIC, TEXT) TO authenticated;

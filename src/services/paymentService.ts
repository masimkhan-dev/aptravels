/**
 * paymentService.ts
 * Typed Supabase wrappers for payment operations.
 * — All writes use strict types; no `as any` casts.
 */

import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type PaymentRow    = Database['public']['Tables']['payments']['Row'];
type PaymentInsert = Database['public']['Tables']['payments']['Insert'];

// ─── READ ───────────────────────────────────────────────────

export async function fetchPaymentsForBooking(bookingId: string): Promise<PaymentRow[]> {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('booking_id', bookingId)
    .order('payment_date', { ascending: true });

  if (error) throw error;
  return (data ?? []) as PaymentRow[];
}

// ─── WRITE ──────────────────────────────────────────────────

export async function recordPayment(payload: PaymentInsert): Promise<PaymentRow> {
  if (!payload.amount_paid || payload.amount_paid <= 0) {
    throw new Error('PAYMENT_ERROR: Payment amount must be positive.');
  }

  const { data, error } = await supabase
    .from('payments')
    .insert([payload])
    .select()
    .single();

  if (error) throw error;
  return data as PaymentRow;
}

/**
 * Void a payment by setting voided=true and recording a reason.
 * Admin/manager only — enforced by RLS on the payments table.
 */
export async function voidPayment(
  paymentId: string,
  reason: string,
): Promise<void> {
  if (!reason.trim()) {
    throw new Error('VOID_ERROR: A reason is required to void a payment.');
  }

  const { error } = await supabase
    .from('payments')
    .update({ voided: true, void_reason: reason })
    .eq('id', paymentId)
    .eq('voided', false); // Safety: do not re-void

  if (error) throw error;
}

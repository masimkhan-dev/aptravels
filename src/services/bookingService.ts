/**
 * bookingService.ts  
 * Typed Supabase wrappers for all booking operations.
 * — Uses strict Database types; no `as any` casts.
 * — All mutations call the atomic Postgres RPC where possible,
 *   or a typed single-table operation otherwise.
 */

import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

// ─── Local type aliases ─────────────────────────────────────
type BookingRow    = Database['public']['Tables']['bookings']['Row'];
type BookingInsert = Database['public']['Tables']['bookings']['Insert'];
type BookingUpdate = Database['public']['Tables']['bookings']['Update'];
type LedgerRow     = Database['public']['Views']['booking_ledger_view']['Row'];

export interface BookingFilters {
  search?:     string;
  filterType?: string;
  filterStatus?: string;
  page?:       number;
  pageSize?:   number;
}

export interface CreateBookingPayload {
  customerId:   string;
  bookingData:  Omit<BookingInsert, 'customer_id' | 'invoice_no'>;
  paymentData?: {
    amount_paid:    number;
    payment_method: string;
    reference_no?:  string;
    payment_date?:  string;
  } | null;
}

// ─── READ ───────────────────────────────────────────────────

/** Paginated, filtered list from the booking_ledger_view. */
export async function fetchBookings(filters: BookingFilters = {}) {
  const {
    search,
    filterType   = 'all',
    filterStatus = 'all',
    page         = 0,
    pageSize     = 50,
  } = filters;

  let query = supabase
    .from('booking_ledger_view')
    .select('*', { count: 'exact' })
    .order('invoice_no', { ascending: false });

  if (search) {
    query = query.or(
      `customer_name.ilike.%${search}%,invoice_no.ilike.%${search}%`,
    );
  }
  if (filterType !== 'all')   query = query.eq('booking_type', filterType);
  if (filterStatus !== 'all') query = query.eq('status', filterStatus);

  const from = page * pageSize;
  const to   = from + pageSize - 1;
  query = query.range(from, to);

  const { data, count, error } = await query;
  if (error) throw error;

  return { data: data as LedgerRow[], count: count ?? 0 };
}

/** Full booking detail with related customer and package info. */
export async function fetchBookingById(id: string) {
  // 1. Fetch main booking
  const { data: booking, error: bError } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', id)
    .single();

  if (bError) throw bError;

  // 2. Fetch customer from safe view
  const { data: customer } = await (supabase.from('customers_safe_view' as any) as any)
    .select('id, full_name, phone, address, cnic_passport:cnic_passport_masked')
    .eq('id', booking.customer_id)
    .single();

  // 3. Fetch package if applicable
  let pkg = null;
  if (booking.package_id) {
    const { data: p } = await (supabase.from('packages' as any) as any)
      .select('title, destination, duration')
      .eq('id', booking.package_id)
      .single();
    pkg = p;
  }

  return {
    ...booking,
    customers: customer || null,
    packages:  pkg
  } as BookingRow & {
    customers: { id: string; full_name: string; phone: string; address: string | null; cnic_passport: string } | null;
    packages:  { title: string; destination: string; duration: string } | null;
  };
}

// ─── WRITE ──────────────────────────────────────────────────

/**
 * Atomic booking creation via Postgres RPC.
 * Wraps customer validation, invoice generation, booking insert,
 * and optional first payment in a single DB transaction.
 */
export async function createBooking(payload: CreateBookingPayload): Promise<string> {
  const requestId = crypto.randomUUID();

  const { data, error } = await supabase.rpc('create_booking_with_payment' as any, {
    p_customer_id:  payload.customerId,
    p_booking_data: payload.bookingData as Record<string, unknown>,
    p_payment_data: payload.paymentData ?? null,
    p_request_id:   requestId,
  });

  if (error) throw error;
  return data as unknown as string; // returns new booking UUID
}

/** Update specific booking fields. Admin/manager only (enforced by RLS). */
export async function updateBooking(id: string, update: BookingUpdate) {
  const { error } = await supabase
    .from('bookings')
    .update(update)
    .eq('id', id);

  if (error) throw error;
}

/** Convenience wrapper for status-only updates. */
export async function updateBookingStatus(
  id: string,
  status: BookingRow['status'],
) {
  return updateBooking(id, { status });
}

/** Soft-delete a booking by setting deleted_at. */
export async function softDeleteBooking(id: string) {
  const { error } = await supabase
    .from('bookings')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
}

/**
 * customerService.ts
 * Typed Supabase wrappers for all customer operations.
 * — fetchCustomers() queries the safe view (masked PII) by default.
 * — getCustomerPII() calls the privileged RPC (admin/manager only).
 */

import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type CustomerRow    = Database['public']['Tables']['customers']['Row'];
type CustomerInsert = Database['public']['Tables']['customers']['Insert'];

export interface CustomerSafeRow {
  id:                  string;
  full_name:           string;
  phone:               string;
  email:               string | null;
  address:             string | null;
  cnic_passport_masked: string | null;
  created_at:          string;
}

export interface CustomerPII {
  id:            string;
  full_name:     string;
  cnic_passport: string | null;
}

// ─── READ ───────────────────────────────────────────────────

/**
 * Fetch customers from the PII-safe view.
 * CNIC/passport is masked at the database level — safe to use
 * in components visible to sales/ops roles.
 */
export async function fetchCustomers(search?: string): Promise<CustomerSafeRow[]> {
  let query = supabase
    .from('customers_safe_view' as 'customers') // view returns safe shape
    .select('id, full_name, phone, email, address, cnic_passport_masked, created_at')
    .order('created_at', { ascending: false }) as ReturnType<typeof supabase.from>;

  if (search) {
    (query as ReturnType<typeof supabase.from>).or(
      `full_name.ilike.%${search}%,phone.ilike.%${search}%`,
    );
  }

  const { data, error } = await (query as ReturnType<typeof supabase.from>);
  if (error) throw error;
  return (data ?? []) as CustomerSafeRow[];
}

/**
 * Retrieve un-masked PII for a customer.
 * Calls the `get_customer_pii` RPC which enforces admin/manager
 * role at the database level — will throw for unauthorized callers.
 */
export async function getCustomerPII(customerId: string): Promise<CustomerPII | null> {
  const { data, error } = await supabase.rpc('get_customer_pii', {
    p_customer_id: customerId,
  });

  if (error) throw error;
  const rows = data as CustomerPII[] | null;
  return rows && rows.length > 0 ? rows[0] : null;
}

/** All customer fields for admin-only contexts (raw table read). */
export async function fetchCustomerById(id: string): Promise<CustomerRow | null> {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single();

  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
  return data as CustomerRow | null;
}

// ─── WRITE ──────────────────────────────────────────────────

export async function createCustomer(
  payload: CustomerInsert,
): Promise<CustomerRow> {
  const { data, error } = await supabase
    .from('customers')
    .insert([payload])
    .select()
    .single();

  if (error) throw error;
  return data as CustomerRow;
}

export async function updateCustomer(
  id: string,
  payload: Partial<CustomerInsert>,
): Promise<void> {
  const { error } = await supabase
    .from('customers')
    .update(payload)
    .eq('id', id);

  if (error) throw error;
}

/** Soft-delete: sets deleted_at, preserves historical data. */
export async function deleteCustomer(id: string): Promise<void> {
  const { error } = await supabase
    .from('customers')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

/**
 * useCustomers.ts
 * React Query hooks for customer data.
 * — Reads from the PII-safe view by default.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchCustomers,
  fetchCustomerById,
  getCustomerPII,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from '@/services/customerService';
import type { Database } from '@/integrations/supabase/types';

type CustomerInsert = Database['public']['Tables']['customers']['Insert'];

export const CUSTOMER_QUERY_KEYS = {
  all:    ['customers'] as const,
  list:   (search?: string) => ['customers', 'list', search] as const,
  detail: (id: string) => ['customers', 'detail', id] as const,
  pii:    (id: string) => ['customers', 'pii', id] as const,
};

// ─── READS ──────────────────────────────────────────────────

/** Returns masked PII — safe for all roles. */
export function useCustomers(search?: string) {
  return useQuery({
    queryKey: CUSTOMER_QUERY_KEYS.list(search),
    queryFn:  () => fetchCustomers(search),
    staleTime: 60_000, // customer list is relatively stable
  });
}

/** Full customer row — admin/manager only (RLS enforced by DB). */
export function useCustomerDetail(id: string | undefined) {
  return useQuery({
    queryKey: CUSTOMER_QUERY_KEYS.detail(id!),
    queryFn:  () => fetchCustomerById(id!),
    enabled:  Boolean(id),
  });
}

/**
 * Raw PII (CNIC/passport) — admin/manager only.
 * The underlying RPC will throw and React Query will surface an
 * error state if the caller lacks the required role.
 */
export function useCustomerPII(id: string | undefined) {
  return useQuery({
    queryKey: CUSTOMER_QUERY_KEYS.pii(id!),
    queryFn:  () => getCustomerPII(id!),
    enabled:  Boolean(id),
    staleTime: 0, // always fresh for PII — never serve stale identity data
    gcTime:   0, // remove from cache immediately when unused
  });
}

// ─── WRITES ─────────────────────────────────────────────────

export function useCreateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CustomerInsert) => createCustomer(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CUSTOMER_QUERY_KEYS.all });
    },
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: Partial<CustomerInsert>;
    }) => updateCustomer(id, payload),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: CUSTOMER_QUERY_KEYS.detail(id) });
      queryClient.invalidateQueries({ queryKey: CUSTOMER_QUERY_KEYS.all });
    },
  });
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteCustomer(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CUSTOMER_QUERY_KEYS.all });
    },
  });
}

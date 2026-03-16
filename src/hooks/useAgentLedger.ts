/**
 * useAgentLedger.ts
 * React Query hooks for agent and ledger operations.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchAgents,
  fetchAgentsWithBalances,
  fetchAgentTransactions,
  createAgent,
  updateAgent,
  recordAgentTransaction,
  type AgentTransactionFilters,
} from '@/services/agentService';
import type { Database } from '@/integrations/supabase/types';

type AgentInsert            = Database['public']['Tables']['agents']['Insert'];
type AgentUpdate            = Database['public']['Tables']['agents']['Update'];
type AgentTransactionInsert = Database['public']['Tables']['agent_transactions']['Insert'];

export const AGENT_QUERY_KEYS = {
  all:          ['agents'] as const,
  list:         ['agents', 'list'] as const,
  withBalances: ['agents', 'with-balances'] as const,
  transactions: (filters: AgentTransactionFilters) =>
    ['agents', 'transactions', filters] as const,
};

// ─── READS ──────────────────────────────────────────────────

export function useAgents() {
  return useQuery({
    queryKey: AGENT_QUERY_KEYS.list,
    queryFn:  fetchAgents,
    staleTime: 60_000,
  });
}

export function useAgentsWithBalances() {
  return useQuery({
    queryKey: AGENT_QUERY_KEYS.withBalances,
    queryFn:  fetchAgentsWithBalances,
    staleTime: 30_000,
  });
}

export function useAgentTransactions(filters: AgentTransactionFilters = {}) {
  return useQuery({
    queryKey: AGENT_QUERY_KEYS.transactions(filters),
    queryFn:  () => fetchAgentTransactions(filters),
    staleTime: 20_000,
  });
}

// ─── WRITES ─────────────────────────────────────────────────

export function useCreateAgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: AgentInsert) => createAgent(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AGENT_QUERY_KEYS.all });
    },
  });
}

export function useUpdateAgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: AgentUpdate }) =>
      updateAgent(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AGENT_QUERY_KEYS.all });
    },
  });
}

export function useRecordAgentTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: AgentTransactionInsert) =>
      recordAgentTransaction(payload),
    onSuccess: () => {
      // Invalidate both transactions and balances (balance changes on new tx)
      queryClient.invalidateQueries({ queryKey: AGENT_QUERY_KEYS.all });
    },
  });
}

/**
 * agentService.ts
 * Typed Supabase wrappers for agent operations.
 * — Uses strict types; no `as any` casts.
 */

import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type AgentRow            = Database['public']['Tables']['agents']['Row'];
type AgentTransactionRow = Database['public']['Tables']['agent_transactions']['Row'];
type AgentTransactionInsert = Database['public']['Tables']['agent_transactions']['Insert'];

export interface AgentBalance {
  agent_id: string;
  balance:  number;
}

export interface AgentWithBalance extends AgentRow {
  balance: number;
}

export interface AgentTransactionFilters {
  agentId?: string;
  limit?:   number;
}

// ─── READ ───────────────────────────────────────────────────

export async function fetchAgents(): Promise<AgentRow[]> {
  const { data, error } = await supabase
    .from('agents')
    .select('*')
    .order('name', { ascending: true });

  if (error) throw error;
  return (data ?? []) as AgentRow[];
}

export async function fetchAgentBalances(): Promise<AgentBalance[]> {
  const { data, error } = await supabase
    .from('agent_balances')
    .select('*') as { data: AgentBalance[] | null; error: typeof supabase['from'] extends (...args: unknown[]) => { error: infer E } ? E : never };

  if (error) throw error;
  return data ?? [];
}

/** Fetch agents and join their balance in a single round-trip. */
export async function fetchAgentsWithBalances(): Promise<AgentWithBalance[]> {
  const [agents, balances] = await Promise.all([
    fetchAgents(),
    fetchAgentBalances(),
  ]);

  return agents.map((a) => ({
    ...a,
    balance: balances.find((b) => b.agent_id === a.id)?.balance ?? 0,
  }));
}

export async function fetchAgentTransactions(
  filters: AgentTransactionFilters = {},
): Promise<AgentTransactionRow[]> {
  let query = supabase
    .from('agent_transactions')
    .select(`
      *,
      agents:agent_id(name),
      bookings:booking_id(invoice_no, customers:customer_id(full_name))
    `)
    .order('performed_at', { ascending: false })
    .limit(filters.limit ?? 50);

  if (filters.agentId) {
    query = query.eq('agent_id', filters.agentId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as AgentTransactionRow[];
}

// ─── WRITE ──────────────────────────────────────────────────

export async function createAgent(
  payload: Database['public']['Tables']['agents']['Insert'],
): Promise<AgentRow> {
  const { data, error } = await supabase
    .from('agents')
    .insert([payload])
    .select()
    .single();

  if (error) throw error;
  return data as AgentRow;
}

export async function updateAgent(
  id: string,
  payload: Database['public']['Tables']['agents']['Update'],
): Promise<void> {
  const { error } = await supabase
    .from('agents')
    .update(payload)
    .eq('id', id);

  if (error) throw error;
}

/**
 * Record an agent transaction.
 * Wallet balance and overdraft protection are enforced entirely
 * by the DB trigger `fn_trg_agent_wallet_check` — this service
 * simply forwards the insert and surfaces any DB exceptions.
 */
export async function recordAgentTransaction(
  payload: AgentTransactionInsert,
): Promise<AgentTransactionRow> {
  if (!payload.amount || payload.amount <= 0) {
    throw new Error('TRANSACTION_ERROR: Amount must be positive.');
  }

  const { data, error } = await supabase
    .from('agent_transactions')
    .insert([payload])
    .select()
    .single();

  if (error) throw error;
  return data as AgentTransactionRow;
}

/**
 * dashboardService.ts
 * Single-call aggregation via the rpc_get_admin_dashboard_metrics RPC.
 * Replaces 6-10 separate supabase.from() calls in AdminDashboard.tsx.
 */

import { supabase } from '@/integrations/supabase/client';

// ─── Shape of the RPC return value ──────────────────────────
export interface DashboardMetrics {
  bookings: {
    total_bookings: number;
    total_packages: number;
    total_tickets:  number;
    total_visas:    number;
    confirmed:      number;
    completed:      number;
    voided:         number;
    draft:          number;
  };
  financials: {
    total_sales:     number;
    total_margin:    number;
    total_collected: number;
    total_balance:   number;
    total_outgoing:  number;
    cash_liquidity:  number;
    bank_liquidity:  number;
  };
  agents: {
    total_receive: number;
    total_send:    number;
    net_balance:   number;
  };
  recent_bookings: Array<{
    booking_id:    string;
    invoice_no:    string;
    customer_name: string;
    total_price:   number;
    total_paid:    number;
    balance_due:   number;
    status:        string;
    booking_type:  string;
    created_at:    string;
  }>;
  unread_inquiries: number;
}

// ─── Service function ────────────────────────────────────────

export async function fetchDashboardMetrics(): Promise<DashboardMetrics> {
  const { data, error } = await supabase.rpc('rpc_get_admin_dashboard_metrics');

  if (error) throw error;
  return data as DashboardMetrics;
}

/**
 * useDashboardMetrics.ts
 * Single React Query hook for all dashboard data.
 * — One network request replaces the 6-10 calls in AdminDashboard.tsx.
 * — 60s staleTime: dashboard stats do not need real-time precision.
 */

import { useQuery } from '@tanstack/react-query';
import { fetchDashboardMetrics, type DashboardMetrics } from '@/services/dashboardService';

export const DASHBOARD_QUERY_KEY = ['dashboard', 'metrics'] as const;

export function useDashboardMetrics() {
  return useQuery<DashboardMetrics>({
    queryKey: DASHBOARD_QUERY_KEY,
    queryFn:  fetchDashboardMetrics,
    staleTime: 60_000, // 1 minute stale — dashboard data is a summary, not a ledger
    refetchInterval: 60_000, // Automatically poll every minute for live dashboard
    retry: 2,
  });
}

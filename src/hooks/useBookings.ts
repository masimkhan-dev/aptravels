/**
 * useBookings.ts
 * React Query hooks for booking data fetching and mutations.
 * — Replaces useEffect + useState patterns in AdminBookings.tsx
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchBookings,
  fetchBookingById,
  createBooking,
  updateBooking,
  updateBookingStatus,
  softDeleteBooking,
  type BookingFilters,
  type CreateBookingPayload,
} from '@/services/bookingService';
import type { Database } from '@/integrations/supabase/types';

type BookingStatus = Database['public']['Tables']['bookings']['Row']['status'];

// Query key constants — centralising prevents stale-key bugs
export const BOOKING_QUERY_KEYS = {
  all:    ['bookings'] as const,
  list:   (filters: BookingFilters) => ['bookings', 'list', filters] as const,
  detail: (id: string) => ['bookings', 'detail', id] as const,
};

// ─── READS ──────────────────────────────────────────────────

export function useBookings(filters: BookingFilters = {}) {
  return useQuery({
    queryKey: BOOKING_QUERY_KEYS.list(filters),
    queryFn:  () => fetchBookings(filters),
    staleTime: 30_000, // 30 seconds — bookings change frequently
  });
}

export function useBookingDetail(id: string | undefined) {
  return useQuery({
    queryKey: BOOKING_QUERY_KEYS.detail(id!),
    queryFn:  () => fetchBookingById(id!),
    enabled:  Boolean(id),
    staleTime: 10_000,
  });
}

// ─── WRITES ─────────────────────────────────────────────────

export function useCreateBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateBookingPayload) => createBooking(payload),
    onSuccess: () => {
      // Invalidate the whole booking list so the new record appears
      queryClient.invalidateQueries({ queryKey: BOOKING_QUERY_KEYS.all });
    },
  });
}

export function useUpdateBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      update,
    }: {
      id:     string;
      update: Parameters<typeof updateBooking>[1];
    }) => updateBooking(id, update),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: BOOKING_QUERY_KEYS.detail(id) });
      queryClient.invalidateQueries({ queryKey: BOOKING_QUERY_KEYS.all });
    },
  });
}

export function useUpdateBookingStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: BookingStatus }) =>
      updateBookingStatus(id, status),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: BOOKING_QUERY_KEYS.detail(id) });
      queryClient.invalidateQueries({ queryKey: BOOKING_QUERY_KEYS.all });
    },
  });
}

export function useSoftDeleteBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => softDeleteBooking(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BOOKING_QUERY_KEYS.all });
    },
  });
}

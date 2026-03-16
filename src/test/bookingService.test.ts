import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as bookingService from '../services/bookingService';
import { supabase } from '@/integrations/supabase/client';

// Mock the supersonic client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
    })),
  },
}));

describe('bookingService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetchBookings constructs query correctly without filters', async () => {
    const mockData = [{ id: '1', booking_type: 'Visa' }];
    const mockSelect = vi.fn().mockReturnThis();
    const mockOrder = vi.fn().mockReturnThis();
    const mockRange = vi.fn().mockResolvedValue({ data: mockData, error: null, count: 1 });
    
    (supabase.from as any).mockReturnValue({
      select: mockSelect,
      order: mockOrder,
      range: mockRange,
    });

    const result = await bookingService.fetchBookings({ page: 1, pageSize: 10 });
    
    expect(supabase.from).toHaveBeenCalledWith('booking_ledger_view');
    expect(mockSelect).toHaveBeenCalledWith('*', { count: 'exact' });
    expect(mockOrder).toHaveBeenCalledWith('invoice_no', { ascending: false });
    expect(mockRange).toHaveBeenCalledWith(10, 19);
    expect(result.data).toEqual(mockData);
    expect(result.count).toBe(1);
  });

  it('createBooking calls atomic RPC with correct payloads', async () => {
    const customerPayload = {
      full_name: 'John Doe',
      phone: '1234567890',
      cnic_passport: '12345'
    };
    
    const bookingPayload = {
      booking_type: 'Visa',
      total_price: 5000,
      visa_country: 'UAE'
    };

    const paymentPayload = {
      amount_paid: 1000,
      payment_method: 'Cash',
      payment_date: new Date().toISOString()
    };

    (supabase.rpc as any).mockResolvedValue({
      data: { booking_id: 'test-booking-id' },
      error: null
    });

    const result = await bookingService.createBooking({
      customerId: 'new',
      bookingData: { ...bookingPayload, customer_name: customerPayload.full_name, customer_phone: customerPayload.phone } as any,
      paymentData: paymentPayload
    });

    expect(supabase.rpc).toHaveBeenCalledWith('create_booking_with_payment', {
      p_customer_id: 'new',
      p_booking_data: { ...bookingPayload, customer_name: customerPayload.full_name, customer_phone: customerPayload.phone },
      p_payment_data: paymentPayload,
      p_request_id: expect.any(String)
    });
    
    expect(result).toEqual({ booking_id: 'test-booking-id' });
  });

  it('updateBookingStatus rejects invalid transitions', async () => {
    await expect(bookingService.updateBookingStatus('1', 'NotAStatus' as any)).rejects.toThrow();
  });

  it('updateBookingStatus calls supabase update for valid transition', async () => {
    const mockEq = vi.fn().mockResolvedValue({ error: null });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
    (supabase.from as any).mockReturnValue({ update: mockUpdate });

    await bookingService.updateBookingStatus('1', 'Confirmed');

    expect(supabase.from).toHaveBeenCalledWith('bookings');
    expect(mockUpdate).toHaveBeenCalledWith({ status: 'Confirmed' });
    expect(mockEq).toHaveBeenCalledWith('id', '1');
  });
});

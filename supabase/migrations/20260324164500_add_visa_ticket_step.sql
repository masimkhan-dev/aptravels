-- Migration: Replace visa_step_final_stamping with visa_step_ticket

BEGIN;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'bookings'
        AND column_name = 'visa_step_ticket'
    ) THEN
        ALTER TABLE public.bookings ADD COLUMN visa_step_ticket BOOLEAN DEFAULT false;
    END IF;
END $$;

COMMIT;

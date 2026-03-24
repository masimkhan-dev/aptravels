-- Migration to add 'visa_step_approved' to bookings

BEGIN;

-- Add the new column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'bookings'
        AND column_name = 'visa_step_approved'
    ) THEN
        ALTER TABLE public.bookings ADD COLUMN visa_step_approved BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Update the view booking_ledger_view to include the new column if necessary
-- Actually booking_ledger_view doesn't explicitly Select the visa steps, they are queried directly from bookings.
-- But just in case any other view needs to be recreated, we would do it here.

COMMIT;

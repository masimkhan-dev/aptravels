-- ─── 1. SECURE EMAIL CHECK RPC ─────────────────────────────────
-- Allows unauthenticated users to safely check if a staff email 
-- exists before attempting a password reset, without exposing PII.

CREATE OR REPLACE FUNCTION public.check_staff_email_exists(p_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_exists BOOLEAN;
BEGIN
    -- Check directly against auth.users to cover legacy admins 
    -- who might not have a profile in staff_profiles yet, but do have a role.
    SELECT EXISTS (
        SELECT 1 
        FROM auth.users au
        JOIN public.user_roles ur ON au.id = ur.user_id
        WHERE lower(au.email) = lower(p_email)
    ) INTO v_exists;
    
    RETURN v_exists;
END;
$$;

-- Grant access to anonymous users so they can verify before resetting
GRANT EXECUTE ON FUNCTION public.check_staff_email_exists(TEXT) TO anon, authenticated;

-- ============================================================
-- MIGRATION: Fix Staff Management RLS & Orphaned Records
-- Fixes the bug where admins cannot manage or see other staff
-- and ensures proper access control for the staff dashboard.
-- ============================================================

-- ─── 1. FIX USER_ROLES POLICIES ─────────────────────────────
-- Dropping existing policies to ensure idempotency
DROP POLICY IF EXISTS "Admins can view roles" ON public.user_roles;
DROP POLICY IF EXISTS "Staff can view team directory" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;

-- Allow all authenticated staff to see who else is on the team (Directory view)
CREATE POLICY "Staff can view team directory"
ON public.user_roles FOR SELECT
TO authenticated
USING (true);

-- Allow Admins to manage (Insert/Update/Delete) roles for everyone
CREATE POLICY "Admins can manage all roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));


-- ─── 2. FIX STAFF_PROFILES POLICIES ─────────────────────────
-- Dropping existing policies to ensure a clean slate
DROP POLICY IF EXISTS "Staff can view all profiles" ON public.staff_profiles;
DROP POLICY IF EXISTS "Admins can manage profiles" ON public.staff_profiles;

-- Ensure SELECT is open to authenticated (so directory works)
CREATE POLICY "Staff can view all profiles" 
ON public.staff_profiles FOR SELECT 
TO authenticated 
USING (true);

-- Ensure Admins have full control (including DELETE)
CREATE POLICY "Admins can manage profiles" 
ON public.staff_profiles FOR ALL 
TO authenticated 
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));


-- ─── 3. CLEANUP FUNCTION (OPTIONAL BUT HELPFUL) ────────────
-- This RPC can be called to remove a staff member and their profile
-- in a single atomic transaction from the frontend.
CREATE OR REPLACE FUNCTION public.rpc_delete_staff_member(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Check if caller is admin
    IF NOT public.has_role(auth.uid(), 'admin') THEN
        RAISE EXCEPTION 'ACCESS DENIED: Only administrators can delete staff.';
    END IF;

    -- Prevent self-deletion
    IF p_user_id = auth.uid() THEN
        RAISE EXCEPTION 'INVALID_ACTION: You cannot delete your own administrative account.';
    END IF;

    -- Delete role first (cascade doesn't always work if foreign key is complex)
    DELETE FROM public.user_roles WHERE user_id = p_user_id;
    
    -- Delete profile
    DELETE FROM public.staff_profiles WHERE id = p_user_id;

    -- Note: auth.users cannot be deleted via SQL without service_role, 
    -- but removing role + profile effectively disables portal access.
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_delete_staff_member(UUID) TO authenticated;

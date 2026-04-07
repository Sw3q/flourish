-- Migration: 20260407000000_add_reject_user.sql
-- Description: Adds an RPC to delete a user from auth.users (cascades to profiles).

CREATE OR REPLACE FUNCTION public.reject_user(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- Check if caller is admin or super admin
  IF NOT (public.is_admin() OR public.is_super_admin()) THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can reject users.';
  END IF;

  -- Delete from auth.users (this will cascade to profiles and other tables)
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reject_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_user(uuid) TO service_role;

-- Unify the admin check to include super_admin for general checks
-- But keep role-specific functions for granular RLS
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean 
LANGUAGE sql 
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() 
      AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean 
LANGUAGE sql 
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() 
      AND role = 'super_admin'
  );
$$;

-- Ensure the profiles update policy is floor-aware for standard admins
DROP POLICY IF EXISTS "Admins can update profiles." ON profiles;
DROP POLICY IF EXISTS "Users can update own profile or super admins can update any." ON profiles;
DROP POLICY IF EXISTS "Users can update own profile or admins/super admins can update any." ON profiles;

CREATE POLICY "Admin Floor Isolation Update Policy" 
ON public.profiles FOR UPDATE
TO authenticated
USING (
  -- 1. Users can update their own profile (e.g. for delegation/settings)
  auth.uid() = id
  OR 
  -- 2. Super Admins can update ANY profile across ANY floor
  public.is_super_admin()
  OR
  -- 3. Standard Admins can ONLY update profiles on THEIR OWN floor
  (
    public.is_admin() 
    AND 
    floor_id = (SELECT floor_id FROM public.profiles WHERE id = auth.uid())
  )
)
WITH CHECK (
  auth.uid() = id
  OR 
  public.is_super_admin()
  OR
  (
    public.is_admin() 
    AND 
    floor_id = (SELECT floor_id FROM public.profiles WHERE id = auth.uid())
  )
);

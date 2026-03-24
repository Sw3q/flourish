CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO service_role;

-- Fix recurring_expenses policies to use the new is_admin() helper
-- (They were previously hardcoded to 'admin' role only)
drop policy if exists "Admins can insert recurring expenses." on recurring_expenses;
create policy "Admins can insert recurring expenses."
  on recurring_expenses for insert
  with check ( public.is_admin() );

drop policy if exists "Admins can update recurring expenses." on recurring_expenses;
create policy "Admins can update recurring expenses."
  on recurring_expenses for update
  using ( public.is_admin() );

drop policy if exists "Admins can delete recurring expenses." on recurring_expenses;
create policy "Admins can delete recurring expenses."
  on recurring_expenses for delete
  using ( public.is_admin() );

drop policy if exists "Recurring expenses viewable by approved members." on recurring_expenses;
create policy "Recurring expenses viewable by approved members."
  on recurring_expenses for select
  using ( public.is_approved() or public.is_admin() );


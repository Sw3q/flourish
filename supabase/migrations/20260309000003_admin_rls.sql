-- Add a security definer function to securely check for admin role without infinite recursion
create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'admin'
  );
$$ language sql security definer;

-- Profiles: Add SELECT policy so admins can see pending users
create policy "Admins can view all profiles."
  on profiles for select
  using ( public.is_admin() );

-- Profiles: Add UPDATE policy so admins can approve/revoke users
create policy "Admins can update profiles."
  on profiles for update
  using ( public.is_admin() );

-- Categories: Add INSERT policy so admins can create categories
create policy "Admins can insert categories."
  on categories for insert
  with check ( public.is_admin() );

-- Transactions: Add INSERT policy so admins can deposit or deduct funds
create policy "Admins can insert transactions."
  on transactions for insert
  with check ( public.is_admin() );

-- Proposals: Add DELETE policy so admins can delete proposals
create policy "Admins can delete proposals."
  on proposals for delete
  using ( public.is_admin() );

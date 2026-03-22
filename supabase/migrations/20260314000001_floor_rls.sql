-- Phase 24: Multi-Floor Architecture (One-to-Many)
-- Migration: 20260314000001_floor_rls.sql
-- 
-- Rewrites existing Row Level Security policies to enforce floor-based isolation.
-- Also incorporates the new 'super_admin' role override.

-- Helper Function: Check if user is super admin
create or replace function public.is_super_admin()
returns boolean as $$
begin
  return exists (
    select 1 from public.profiles 
    where id = auth.uid() and role = 'super_admin'
  );
end;
$$ language plpgsql security definer;

-- 1. PROFILES
drop policy if exists "Public profiles are viewable by everyone." on profiles;
drop policy if exists "Users can update own profile." on profiles;

-- Read: Super Admins can read all.
-- Everyone else can only read profiles that belong to the SAME floor as them.
create policy "Profiles viewable by floor members or super admins." on profiles for select
using (
  public.is_super_admin() 
  or 
  floor_id = (select floor_id from profiles where id = auth.uid())
);

create policy "Users can update own profile or super admins can update any." on profiles for update
using (
  auth.uid() = id
  or
  public.is_super_admin()
);

-- 2. CATEGORIES
drop policy if exists "Categories are viewable by everyone." on categories;
drop policy if exists "Floor admins can manage categories." on categories;

-- Read: Floor members or super admins
create policy "Categories viewable by floor members or super admins." on categories for select
using (
  public.is_super_admin() 
  or 
  floor_id = (select floor_id from profiles where id = auth.uid())
);

-- Write: Floor Admins for their floor, or Super Admins
create policy "Floor admins and super admins can manage categories." on categories for all
using (
  public.is_super_admin()
  or
  (floor_id = (select floor_id from profiles where id = auth.uid()) and exists (select 1 from profiles where id = auth.uid() and role = 'admin'))
);

-- 3. PROPOSALS
drop policy if exists "Proposals are viewable by everyone." on proposals;
drop policy if exists "Approved members can create proposals." on proposals;
drop policy if exists "Creator or admin can delete proposals." on proposals;

-- Read
create policy "Proposals viewable by floor members or super admins." on proposals for select
using (
  public.is_super_admin() 
  or 
  floor_id = (select floor_id from profiles where id = auth.uid())
);

-- Create: Must be an approved member of the floor where the proposal is being created
create policy "Approved floor members can create proposals." on proposals for insert
with check (
  public.is_super_admin()
  or
  (floor_id = (select floor_id from profiles where id = auth.uid()) and exists (select 1 from profiles where id = auth.uid() and is_approved = true))
);

-- Delete: Creator, Floor Admin, or Super Admin
create policy "Creator, floor admin, or super admin can delete proposals." on proposals for delete
using (
  public.is_super_admin()
  or
  auth.uid() = creator_id
  or
  (floor_id = (select floor_id from profiles where id = auth.uid()) and exists (select 1 from profiles where id = auth.uid() and role = 'admin'))
);

-- 4. VOTES
-- Note: Votes table doesn't have a floor_id directly. We traverse through the proposal_id.
drop policy if exists "Votes are viewable by everyone." on votes;
drop policy if exists "Approved members can vote." on votes;
drop policy if exists "Approved members can update their own votes." on votes;

create policy "Votes viewable by floor members or super admins." on votes for select
using (
  public.is_super_admin()
  or
  exists (
    select 1 from proposals p 
    where p.id = votes.proposal_id 
    and p.floor_id = (select floor_id from profiles where id = auth.uid())
  )
);

create policy "Approved floor members can vote." on votes for insert
with check (
  public.is_super_admin()
  or
  (exists (select 1 from profiles where id = auth.uid() and is_approved = true)
   and exists (
      select 1 from proposals p 
      where p.id = proposal_id 
      and p.floor_id = (select floor_id from profiles where id = auth.uid())
    )
  )
);

create policy "Approved members can update their own votes." on votes for update
using (
  auth.uid() = voter_id
  and exists (select 1 from profiles where id = auth.uid() and is_approved = true)
);

-- 5. TRANSACTIONS
drop policy if exists "Transactions viewable by everyone." on transactions;

create policy "Transactions viewable by floor members or super admins." on transactions for select
using (
  public.is_super_admin() 
  or 
  floor_id = (select floor_id from profiles where id = auth.uid())
);

-- 6. CATEGORY DELEGATIONS
drop policy if exists "Category delegations viewable by approved members." on category_delegations;
drop policy if exists "Users can insert their own category delegations." on category_delegations;
drop policy if exists "Users can update their own category delegations." on category_delegations;
drop policy if exists "Users can delete their own category delegations." on category_delegations;

create policy "Category delegations viewable by floor members or super admins." on category_delegations for select
using (
  public.is_super_admin() 
  or 
  floor_id = (select floor_id from profiles where id = auth.uid())
);

create policy "Users manage own category delegations." on category_delegations for all
using ( auth.uid() = user_id );

-- 7. PROPOSAL DELEGATIONS (Assuming it exists and needs RLS)
-- The `proposal_delegations` table was added dynamically during the tinder update phase, we must ensure it has floor tracking if needed, 
-- or we secure it by jumping through proposal_id like we did for votes.
drop policy if exists "Proposal delegations viewable by approved members" on proposal_delegations;

create policy "Proposal delegations viewable by floor members or super admins." on proposal_delegations for select
using (
  public.is_super_admin()
  or
  exists (
    select 1 from proposals p 
    where p.id = proposal_delegations.proposal_id 
    and p.floor_id = (select floor_id from profiles where id = auth.uid())
  )
);

create policy "Users manage own proposal delegations." on proposal_delegations for all
using ( auth.uid() = user_id );


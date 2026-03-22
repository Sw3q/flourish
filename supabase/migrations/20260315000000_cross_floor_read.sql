-- Phase 25: Cross-Floor Read Access
-- Migration: 20260315000000_cross_floor_read.sql

-- Drop existing restricted SELECT policies
drop policy if exists "Profiles viewable by floor members or super admins." on profiles;
drop policy if exists "Categories viewable by floor members or super admins." on categories;
drop policy if exists "Proposals viewable by floor members or super admins." on proposals;
drop policy if exists "Votes viewable by floor members or super admins." on votes;
drop policy if exists "Transactions viewable by floor members or super admins." on transactions;
drop policy if exists "Category delegations viewable by floor members or super admins." on category_delegations;
drop policy if exists "Proposal delegations viewable by floor members or super admins." on proposal_delegations;

-- Drop newer versions too for re-runnability
drop policy if exists "Profiles viewable by approved members or super admins." on profiles;
drop policy if exists "Categories viewable by approved members or super admins." on categories;
drop policy if exists "Proposals viewable by approved members or super admins." on proposals;
drop policy if exists "Votes viewable by approved members or super admins." on votes;
drop policy if exists "Transactions viewable by approved members or super admins." on transactions;
drop policy if exists "Category delegations viewable by approved members or super admins." on category_delegations;
drop policy if exists "Proposal delegations viewable by approved members or super admins." on proposal_delegations;
drop policy if exists "Recurring expenses viewable by approved members or super admins." on recurring_expenses;

-- 1. PROFILES
-- Approved users can see all profiles (needed for building view and global stats)
create policy "Profiles viewable by approved members or super admins." on profiles for select
using (
  auth.uid() = id
  or
  public.is_super_admin() 
  or 
  public.is_approved()
);

-- 2. CATEGORIES
create policy "Categories viewable by approved members or super admins." on categories for select
using (
  public.is_super_admin() 
  or 
  public.is_approved()
);

-- 3. PROPOSALS
create policy "Proposals viewable by approved members or super admins." on proposals for select
using (
  public.is_super_admin() 
  or 
  public.is_approved()
);

-- 4. VOTES
create policy "Votes viewable by approved members or super admins." on votes for select
using (
  public.is_super_admin()
  or
  public.is_approved()
);

-- 5. TRANSACTIONS
create policy "Transactions viewable by approved members or super admins." on transactions for select
using (
  public.is_super_admin() 
  or 
  public.is_approved()
);

-- 6. CATEGORY DELEGATIONS
create policy "Category delegations viewable by approved members or super admins." on category_delegations for select
using (
  public.is_super_admin() 
  or 
  public.is_approved()
);

-- 7. PROPOSAL DELEGATIONS
create policy "Proposal delegations viewable by approved members or super admins." on proposal_delegations for select
using (
  public.is_super_admin()
  or
  public.is_approved()
);

-- 8. RECURRING EXPENSES (New read policy)
drop policy if exists "Recurring expenses viewable by floor members or super admins." on recurring_expenses;
create policy "Recurring expenses viewable by approved members or super admins." on recurring_expenses for select
using (
  public.is_super_admin() 
  or 
  public.is_approved()
);

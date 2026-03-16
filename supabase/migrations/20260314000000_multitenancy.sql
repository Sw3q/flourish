-- Phase 24: Multi-Floor Architecture (One-to-Many)
-- Migration: 20260314000000_multitenancy.sql

-- 1. FLOORS TABLE (super_admin handled in 20260313000003_add_super_admin.sql)

-- 2. FLOORS TABLE
create table if not exists floors (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table floors enable row level security;
create policy "Floors are viewable by everyone." on floors for select using (true);
create policy "Super Admins can create floors." on floors for insert with check (
  exists (select 1 from profiles where id = auth.uid() and role = 'super_admin')
);

-- Note: We are ignoring existing data migration as requested.
-- However, we still need a default floor so existing records don't violate non-null constraints if we wanted to enforce them.
-- For safety, we insert a default floor, and then update existing profiles.
insert into floors (id, name) values ('00000000-0000-0000-0000-000000000000', 'Default Floor') on conflict do nothing;

-- 3. ALTER PROFILES
alter table profiles add column if not exists floor_id uuid references floors(id) on delete cascade default '00000000-0000-0000-0000-000000000000';
-- Force all new users to specify a floor going forward by dropping the default eventually, but keeping it for now allows smooth DB transitions.

-- 4. ALTER OTHER TABLES
alter table categories add column if not exists floor_id uuid references floors(id) on delete cascade default '00000000-0000-0000-0000-000000000000';
alter table proposals add column if not exists floor_id uuid references floors(id) on delete cascade default '00000000-0000-0000-0000-000000000000';
alter table transactions add column if not exists floor_id uuid references floors(id) on delete cascade default '00000000-0000-0000-0000-000000000000';
alter table category_delegations add column if not exists floor_id uuid references floors(id) on delete cascade default '00000000-0000-0000-0000-000000000000';
alter table recurring_expenses add column if not exists floor_id uuid references floors(id) on delete cascade default '00000000-0000-0000-0000-000000000000';

-- We will handle RLS in a designated second migration script for clarity, 
-- as it requires completely replacing the current policies.

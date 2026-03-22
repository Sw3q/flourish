-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- PROFILES
create type user_role as enum ('admin', 'member');

create table profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  role user_role default 'member' not null,
  is_approved boolean default false not null,
  delegated_to uuid references profiles(id) on delete set null
);

-- CATEGORIES
create table categories (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  color_theme text not null
);

-- PROPOSALS
create type proposal_status as enum ('active', 'passed', 'rejected');

create table proposals (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text not null,
  category_id uuid references categories(id) on delete restrict not null,
  amount numeric not null,
  creator_id uuid references profiles(id) on delete cascade not null,
  status proposal_status default 'active' not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  expires_at timestamp with time zone not null
);

-- VOTES
create table votes (
  id uuid primary key default uuid_generate_v4(),
  proposal_id uuid references proposals(id) on delete cascade not null,
  voter_id uuid references profiles(id) on delete cascade not null,
  vote boolean not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (proposal_id, voter_id)
);

-- TRANSACTIONS
create type transaction_type as enum ('deposit', 'withdrawal');

create table transactions (
  id uuid primary key default uuid_generate_v4(),
  amount numeric not null,
  type transaction_type not null,
  description text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS POLICIES

-- Enable RLS
alter table profiles enable row level security;
alter table categories enable row level security;
alter table proposals enable row level security;
alter table votes enable row level security;
alter table transactions enable row level security;

-- Profiles: Anyone can read approved profiles or their own. Admin can read all. Update only by admin or self.
create policy "Public profiles are viewable by everyone."
  on profiles for select
  using ( is_approved = true or auth.uid() = id );

create policy "Users can update own profile."
  on profiles for update
  using ( auth.uid() = id );

-- Categories: Read for everyone, Write for admin only
create policy "Categories are viewable by everyone."
  on categories for select
  using ( true );

-- Proposals: Read for everyone, Write for approved members
create policy "Proposals are viewable by everyone."
  on proposals for select
  using ( true );

create policy "Approved members can create proposals."
  on proposals for insert
  with check ( 
    exists (select 1 from profiles where id = auth.uid() and is_approved = true)
  );

-- Votes: Read for everyone, Write for approved members
create policy "Votes are viewable by everyone."
  on votes for select
  using ( true );

create policy "Approved members can vote."
  on votes for insert
  with check (
    exists (select 1 from profiles where id = auth.uid() and is_approved = true)
  );

-- Transactions: Read for everyone
create policy "Transactions viewable by everyone."
  on transactions for select
  using ( true );

-- Functions and Triggers for Auto-Profile Creation on Signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

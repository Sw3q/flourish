-- Migration: 20260318000001_proposal_comments.sql
-- Description: Create proposal_comments table for proposal-specific chat.

create table if not exists proposal_comments (
  id uuid primary key default uuid_generate_v4(),
  proposal_id uuid references proposals(id) on delete cascade not null,
  author_id uuid references profiles(id) on delete cascade not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  floor_id uuid references floors(id) on delete cascade not null
);

-- Enable RLS
alter table proposal_comments enable row level security;

-- RLS Policies
create policy "Comments are viewable by everyone."
  on proposal_comments for select
  using ( true );

create policy "Approved members can comment."
  on proposal_comments for insert
  with check (
    exists (select 1 from profiles where id = auth.uid() and is_approved = true)
  );

create policy "Authors can delete their own comments."
  on proposal_comments for delete
  using ( auth.uid() = author_id );

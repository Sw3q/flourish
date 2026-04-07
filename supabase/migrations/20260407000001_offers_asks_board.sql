-- Migration: 20260407000001_offers_asks_board.sql
-- Description: Adds offers_asks tables for the cross-floor bulletin board.

CREATE TYPE board_post_type AS ENUM ('offer', 'ask');
CREATE TYPE board_post_status AS ENUM ('active', 'completed');

CREATE TABLE IF NOT EXISTS public.offers_asks (
    id uuid primary key default uuid_generate_v4(),
    type board_post_type not null,
    title text not null,
    description text not null,
    creator_id uuid references public.profiles(id) on delete cascade not null,
    floor_id uuid references public.floors(id) on delete cascade not null,
    status board_post_status default 'active' not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
ALTER TABLE public.offers_asks ENABLE ROW LEVEL SECURITY;

-- Policies for offers_asks
-- Read: Everyone can read all offers_asks across all floors
CREATE POLICY "Offers/Asks are viewable by everyone."
  ON public.offers_asks FOR SELECT
  USING (true);

-- Insert: Approved members can insert, tying to their own ID
CREATE POLICY "Approved members can create offers/asks."
  ON public.offers_asks FOR INSERT
  WITH CHECK (
    auth.uid() = creator_id AND
    public.is_approved()
  );

-- Update: Creator or admin can update
CREATE POLICY "Creator or admin can update offers/asks."
  ON public.offers_asks FOR UPDATE
  USING (
    auth.uid() = creator_id OR
    public.is_admin() OR
    public.is_super_admin()
  );

-- Delete: Creator or admin can delete
CREATE POLICY "Creator or admin can delete offers/asks."
  ON public.offers_asks FOR DELETE
  USING (
    auth.uid() = creator_id OR
    public.is_admin() OR
    public.is_super_admin()
  );

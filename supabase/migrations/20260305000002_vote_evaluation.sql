-- Phase 10: Server-Side Vote Evaluation
-- Migration: 20260305000002_vote_evaluation.sql
--
-- Run this in the Supabase SQL Editor.
-- This migration:
--   1. Adds the category_delegations table for per-category vote delegation
--   2. Adds the evaluate_proposal() Postgres function
--   3. Adds a trigger that fires it after every vote insert/update
--   4. Adds the early defeat check and auto-withdrawal transaction on pass

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. PER-CATEGORY DELEGATIONS TABLE
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists category_delegations (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references profiles(id) on delete cascade,
  category_id uuid not null references categories(id) on delete cascade,
  delegated_to uuid not null references profiles(id) on delete cascade,
  created_at  timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (user_id, category_id)
);

alter table category_delegations enable row level security;

-- Approved users can read all category delegations
create policy "Category delegations viewable by approved members."
  on category_delegations for select
  using ( exists (select 1 from profiles where id = auth.uid() and is_approved = true) );

-- Users can manage their own category delegations
create policy "Users can insert their own category delegations."
  on category_delegations for insert
  with check ( auth.uid() = user_id );

create policy "Users can update their own category delegations."
  on category_delegations for update
  using ( auth.uid() = user_id );

create policy "Users can delete their own category delegations."
  on category_delegations for delete
  using ( auth.uid() = user_id );

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. RLS: Allow approved members to update their own votes (for vote changes)
-- ─────────────────────────────────────────────────────────────────────────────
create policy "Approved members can update their own votes."
  on votes for update
  using (
    auth.uid() = voter_id
    and exists (select 1 from profiles where id = auth.uid() and is_approved = true)
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. VOTE EVALUATION FUNCTION
--
-- Called after every insert/update on votes.
-- Calculates weighted votes (global delegation + per-category override),
-- enforces 40% quorum, 50%+1 pass threshold, and early defeat.
-- On pass: updates proposal status and inserts a withdrawal transaction.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function evaluate_proposal(p_proposal_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_proposal        record;
  v_total_approved  integer;
  v_quorum_required integer;
  v_threshold       numeric;

  -- Vote tally (weighted)
  v_yes_votes       numeric := 0;
  v_no_votes        numeric := 0;
  v_total_votes     numeric := 0;
  v_unique_voters   integer := 0;

  v_vote            record;
  v_effective_delegate uuid;
  v_weight          integer;
begin
  -- Fetch the proposal; bail if it's not active
  select * into v_proposal from proposals where id = p_proposal_id;
  if not found or v_proposal.status <> 'active' then
    return;
  end if;

  -- Count total approved users (denominator for threshold & quorum)
  select count(*) into v_total_approved
  from profiles
  where is_approved = true;

  if v_total_approved = 0 then
    return;
  end if;

  -- Quorum: 40% of approved users must have voted
  v_quorum_required := ceil(v_total_approved * 0.4);

  -- Threshold: strictly more than 50% of approved users' weighted votes = yes
  v_threshold := v_total_approved / 2.0;

  -- ── Build weighted vote totals ─────────────────────────────────────────────
  -- For each voter on this proposal:
  --   1. Check if there's a category-specific delegation for this proposal's category.
  --      If so, the vote is counted under the delegate's identity instead.
  --   2. Otherwise use global delegated_to on profiles.
  --   3. The effective voter's weight = 1 + (number of people delegating TO them
  --      for this category / globally, depending on which delegation applies).

  -- We work directly on individual vote rows for this proposal.
  -- weight for a voter = 1 + count of people who delegated to them
  --   (category-specific delegation takes priority over global)

  -- Count unique participating voters (for quorum)
  select count(*) into v_unique_voters
  from votes
  where proposal_id = p_proposal_id;

  -- Iterate votes and accumulate weighted results
  for v_vote in
    select v.voter_id, v.vote
    from votes v
    where v.proposal_id = p_proposal_id
  loop
    -- Determine the effective voter's weight:
    --   weight = 1 (self) + number of people whose effective delegate resolves to this voter

    -- For each person p who delegated (category or global) to v_vote.voter_id for this proposal's category:
    -- Category-specific delegation count pointing to this voter
    select count(*) into v_weight
    from (
      -- People with a category-specific delegation to this voter for this proposal's category
      select cd.user_id
      from category_delegations cd
      where cd.delegated_to = v_vote.voter_id
        and cd.category_id = v_proposal.category_id

      union

      -- People with a global delegation to this voter, who do NOT have a category override for this category
      select p.id
      from profiles p
      where p.delegated_to = v_vote.voter_id
        and p.id <> v_vote.voter_id
        and not exists (
          select 1 from category_delegations cd2
          where cd2.user_id = p.id
            and cd2.category_id = v_proposal.category_id
        )
    ) as delegators;

    -- +1 for self
    v_weight := v_weight + 1;

    v_total_votes := v_total_votes + v_weight;
    if v_vote.vote = true then
      v_yes_votes := v_yes_votes + v_weight;
    else
      v_no_votes := v_no_votes + v_weight;
    end if;
  end loop;

  -- ── Evaluate outcomes ───────────────────────────────────────────────────────

  -- 1. Proposal passes: yes > 50% threshold AND quorum met
  if v_yes_votes > v_threshold and v_unique_voters >= v_quorum_required then
    -- Mark passed
    update proposals set status = 'passed' where id = p_proposal_id;

    -- Auto-log withdrawal transaction
    insert into transactions (amount, type, description)
    values (
      v_proposal.amount,
      'withdrawal',
      'Auto: Proposal "' || v_proposal.title || '" passed'
    );
    return;
  end if;

  -- 2. Early defeat: no votes > threshold (impossible for yes to ever win now)
  if v_no_votes > v_threshold then
    update proposals set status = 'rejected' where id = p_proposal_id;
    return;
  end if;

  -- 3. Time expiry: voting window closed without reaching threshold
  if v_proposal.expires_at < now() then
    update proposals set status = 'rejected' where id = p_proposal_id;
    return;
  end if;

  -- Otherwise: still active, nothing to do
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. TRIGGER: fire evaluate_proposal after every vote insert or update
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function trigger_evaluate_vote()
returns trigger
language plpgsql
security definer
as $$
begin
  perform evaluate_proposal(NEW.proposal_id);
  return NEW;
end;
$$;

drop trigger if exists on_vote_evaluate on votes;

create trigger on_vote_evaluate
  after insert or update on votes
  for each row
  execute function trigger_evaluate_vote();

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. ALLOW PROPOSAL DELETION BY CREATOR OR ADMIN
-- ─────────────────────────────────────────────────────────────────────────────
create policy "Creator or admin can delete proposals."
  on proposals for delete
  using (
    auth.uid() = creator_id
    or exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

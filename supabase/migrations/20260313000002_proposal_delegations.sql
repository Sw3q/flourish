-- Phase 23: Fix Delegation Logic - Per-Proposal Delegations
-- Migration: 20260313000002_proposal_delegations.sql
--
-- Replaces category-level delegation with proposal-level delegation.
-- This ensures that delegating on one proposal does NOT affect other proposals,
-- even if those proposals share the same category.

-- 1. Create the proposal_delegations table
create table if not exists proposal_delegations (
  user_id    uuid references profiles(id) on delete cascade not null,
  proposal_id uuid references proposals(id) on delete cascade not null,
  delegated_to uuid references profiles(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (user_id, proposal_id)
);

-- 2. Enable RLS
alter table proposal_delegations enable row level security;

-- 3. RLS Policies
create policy "Proposal delegations are viewable by everyone."
  on proposal_delegations for select
  using (true);

create policy "Users can manage own proposal delegations."
  on proposal_delegations for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own proposal delegations."
  on proposal_delegations for delete
  using (auth.uid() = user_id);

-- 4. Update evaluate_proposal() to use proposal_delegations for per-proposal weight
create or replace function evaluate_proposal(p_proposal_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_proposal        record;
  v_total_approved  integer;
  v_quorum_required integer;
  v_absolute_threshold numeric;

  -- Vote tally (weighted)
  v_yes_votes       numeric := 0;
  v_no_votes        numeric := 0;
  v_total_weighted_votes numeric := 0;
  v_unique_voters   integer := 0;

  v_vote            record;
  v_weight          integer;
begin
  -- Fetch the proposal; bail if it's not active
  select * into v_proposal from proposals where id = p_proposal_id;
  if not found or v_proposal.status <> 'active' then
    return;
  end if;

  -- Count total approved users (denominator for quorum)
  select count(*) into v_total_approved
  from profiles
  where is_approved = true;

  if v_total_approved = 0 then
    return;
  end if;

  -- Quorum: 40% of approved users must have voted directly
  v_quorum_required := ceil(v_total_approved * 0.4);

  -- Absolute Threshold: > 50% of the entire community (instant pass)
  v_absolute_threshold := v_total_approved / 2.0;

  -- Count unique participating voters (direct votes)
  select count(*) into v_unique_voters
  from votes
  where proposal_id = p_proposal_id;

  -- ── Build weighted vote totals ─────────────────────────────────────────────
  -- For each voter who cast a DIRECT vote on this proposal:
  --   Weight = 1 (self)
  --   + Number of people who have delegated THIS SPECIFIC PROPOSAL to this voter
  --     AND have not cast their own vote.
  --   + Number of people globally delegating to this voter (no category or proposal override)
  --     AND have not cast their own vote.
  
  for v_vote in
    select v.voter_id, v.vote
    from votes v
    where v.proposal_id = p_proposal_id
  loop
    -- Calculate weight for this direct voter
    select count(*) into v_weight
    from (
      -- 1. People with a PROPOSAL-specific delegation to this voter
      select pd.user_id
      from proposal_delegations pd
      where pd.delegated_to = v_vote.voter_id
        and pd.proposal_id = p_proposal_id
        -- EXCLUDE if they voted themselves
        and not exists (select 1 from votes v2 where v2.proposal_id = p_proposal_id and v2.voter_id = pd.user_id)

      union

      -- 2. People with a GLOBAL delegation to this voter, with NO proposal override
      select p.id
      from profiles p
      where p.delegated_to = v_vote.voter_id
        and p.id <> v_vote.voter_id
        -- EXCLUDE if they voted themselves
        and not exists (select 1 from votes v3 where v3.proposal_id = p_proposal_id and v3.voter_id = p.id)
        -- EXCLUDE if they have a proposal-specific override for this proposal
        and not exists (
          select 1 from proposal_delegations pd2
          where pd2.user_id = p.id
            and pd2.proposal_id = p_proposal_id
        )
    ) as delegators;

    v_weight := v_weight + 1; -- +1 for self
    v_total_weighted_votes := v_total_weighted_votes + v_weight;

    if v_vote.vote = true then
      v_yes_votes := v_yes_votes + v_weight;
    else
      v_no_votes := v_no_votes + v_weight;
    end if;
  end loop;

  -- ── Evaluate outcomes ───────────────────────────────────────────────────────

  -- 1. INSTANT PASS: Yes votes > 50% of entire community AND quorum met
  if v_yes_votes > v_absolute_threshold and v_unique_voters >= v_quorum_required then
    update proposals set status = 'passed' where id = p_proposal_id;
    insert into transactions (amount, type, description)
    values (v_proposal.amount, 'withdrawal', 'Auto: Proposal "' || v_proposal.title || '" passed (Absolute Majority)');
    return;
  end if;

  -- 2. SUSTAINED PASS (Conviction): 
  --    If Yes > No AND Quorum Met, start/check the timer.
  if v_yes_votes > v_no_votes and v_unique_voters >= v_quorum_required then
    if v_proposal.quorum_reached_at is null then
      -- Mark the start of the sustained majority
      update proposals set quorum_reached_at = now() where id = p_proposal_id;
    elsif v_proposal.quorum_reached_at <= (now() - interval '24 hours') then
      -- 24 hours have passed with sustained majority
      update proposals set status = 'passed' where id = p_proposal_id;
      insert into transactions (amount, type, description)
      values (v_proposal.amount, 'withdrawal', 'Auto: Proposal "' || v_proposal.title || '" passed (Sustained Majority)');
      return;
    end if;
  else
    -- Lost majority or quorum, reset the timer
    if v_proposal.quorum_reached_at is not null then
      update proposals set quorum_reached_at = null where id = p_proposal_id;
    end if;
  end if;

  -- 3. EARLY DEFEAT: If No > 50% of community, it's dead.
  if v_no_votes > v_absolute_threshold then
    update proposals set status = 'rejected' where id = p_proposal_id;
    return;
  end if;

  -- 4. TIME EXPIRY
  if v_proposal.expires_at < now() then
    update proposals set status = 'rejected' where id = p_proposal_id;
    return;
  end if;

  -- Otherwise: still active
end;
$$;

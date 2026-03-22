-- Phase 24: Multi-Floor Architecture
-- Migration: 20260314000002_update_evaluate.sql
--
-- Modifies evaluate_proposal to be floor-aware for quorum calculations.

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
  v_weight          integer;
begin
  -- Fetch the proposal; bail if it's not active
  select * into v_proposal from proposals where id = p_proposal_id;
  if not found or v_proposal.status <> 'active' then
    return;
  end if;

  -- CORE MULTI-FLOOR CHANGE: 
  -- Count total approved users ONLY on the specific floor this proposal belongs to.
  -- Includes both Admins and Members, and Super Admins if they are explicitly assigned to this floor.
  select count(*) into v_total_approved
  from profiles
  where is_approved = true
  and floor_id = v_proposal.floor_id;

  if v_total_approved = 0 then
    return;
  end if;

  -- Quorum: 40% of approved users on THAT floor must have voted
  v_quorum_required := ceil(v_total_approved * 0.4);

  -- Threshold: strictly more than 50% of approved users' weighted votes = yes
  v_threshold := v_total_approved / 2.0;

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

    -- Category-specific + Global delegation logic pointing to this voter
    select count(*) into v_weight
    from (
      -- People with a category-specific delegation to this voter
      select cd.user_id
      from category_delegations cd
      where cd.delegated_to = v_vote.voter_id
        and cd.category_id = v_proposal.category_id

      union

      -- People with a global delegation to this voter, who do NOT have a category override
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

    -- Auto-log withdrawal transaction (scoped to the proposal's floor automatically)
    insert into transactions (amount, type, description, floor_id)
    values (
      v_proposal.amount,
      'withdrawal',
      'Auto: Proposal "' || v_proposal.title || '" passed',
      v_proposal.floor_id
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
end;
$$;

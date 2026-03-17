-- Phase 30: Fix Proposal Expiration Logic
-- Migration: 20260317000001_evaluate_cleanup.sql
--
-- Adds a batch-evaluation function to clean up stale 'active' proposals.

create or replace function evaluate_cleanup()
returns void
language plpgsql
security definer
as $$
declare
  v_prop record;
begin
  -- Iterate through all proposals still marked as active
  -- that have already passed their expiration date.
  for v_prop in 
    select id 
    from proposals 
    where status = 'active' 
    and expires_at < now()
  loop
    -- Reuse existing evaluation logic for each expired proposal
    perform evaluate_proposal(v_prop.id);
  end loop;
end;
$$;

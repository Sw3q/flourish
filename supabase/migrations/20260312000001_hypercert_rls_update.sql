-- Allow users to update the hypercert_uri on passed proposals ONLY if they participated.
-- Participation is defined as:
-- 1. Direct vote: The user cast a vote themselves.
-- 2. Indirect participation: The user delegated their power to someone who cast a vote.

create policy "Participants can link hypercerts to passed proposals."
  on proposals for update
  using (
    exists (select 1 from profiles where id = auth.uid() and is_approved = true)
    and status = 'passed'
    and (
      -- Direct participation
      exists (select 1 from votes where proposal_id = proposals.id and voter_id = auth.uid())
      or
      -- Indirect participation (delegated to someone who voted)
      exists (
        select 1 from votes v
        join profiles p on p.id = auth.uid()
        left join category_delegations cd on cd.user_id = p.id and cd.category_id = proposals.category_id
        where v.proposal_id = proposals.id
          and v.voter_id = coalesce(cd.delegated_to, p.delegated_to)
      )
    )
  )
  with check (
    status = 'passed' -- Ensure status doesn't change
  );

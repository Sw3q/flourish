-- Phase 10 patch: allow approved members to retract their own votes
create policy "Approved members can delete their own votes."
  on votes for delete
  using (
    auth.uid() = voter_id
    and exists (select 1 from profiles where id = auth.uid() and is_approved = true)
  );

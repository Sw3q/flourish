-- Migration: 20260318000002_proposal_fixes.sql
-- Description: Fix RLS for proposal updates and enable real-time for comments.

-- 1. Allow authors to update their own active proposals
create policy "Authors can update their own active proposals."
  on proposals for update
  using ( auth.uid() = creator_id and status = 'active' )
  with check ( auth.uid() = creator_id and status = 'active' );

-- 2. Add proposal_comments to realtime publication
-- We use DO block to handle cases where the publication or table might already be linked
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table proposal_comments;
  end if;
end $$;

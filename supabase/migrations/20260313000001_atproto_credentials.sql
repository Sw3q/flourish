-- Add persistent ATProto credentials to profiles
alter table profiles add column atproto_handle text;
alter table profiles add column atproto_app_password text;

-- Add comments for clarity
comment on column profiles.atproto_handle is 'Bluesky/ATProto handle (e.g., user.bsky.social)';
comment on column profiles.atproto_app_password is 'ATProto App Password for authenticated actions like issuing Hypercerts.';

-- Note: RLS policies already allow users to update their own profiles.
-- The existing policy "Users can update own profile." on profiles table covers this.

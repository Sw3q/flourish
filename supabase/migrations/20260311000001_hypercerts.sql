-- Add hypercert fields to proposals and profiles

alter table proposals add column hypercert_uri text;
alter table profiles add column atproto_did text;

-- Add comment explaining the fields
comment on column proposals.hypercert_uri is 'URI of the Hypercert (ATProto record) associated with this proposal if passed and issued.';
comment on column profiles.atproto_did is 'AT Protocol Decentralized Identifier (DID) for the user, used for identity linking.';

-- Phase 46: Modular Hypercert Claims
-- Polymorphic claim table so future subject types (events, deliverables, ...) reuse the same plumbing.

CREATE TYPE hypercert_claim_status AS ENUM ('pending', 'approved', 'denied');

CREATE TABLE public.hypercert_claims (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_type text NOT NULL,
  subject_id uuid NOT NULL,
  claimant_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  creator_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status hypercert_claim_status NOT NULL DEFAULT 'pending',
  hypercert_uri text,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  CONSTRAINT no_self_claim CHECK (claimant_id <> creator_id),
  CONSTRAINT one_claim_per_subject UNIQUE (subject_type, subject_id, claimant_id)
);

CREATE INDEX hypercert_claims_subject_idx ON public.hypercert_claims(subject_type, subject_id);

ALTER TABLE public.hypercert_claims ENABLE ROW LEVEL SECURITY;

-- Read: claimant, creator, or admins
CREATE POLICY "Participants can read hypercert claims"
  ON public.hypercert_claims FOR SELECT
  USING (
    auth.uid() = claimant_id
    OR auth.uid() = creator_id
    OR public.is_admin()
    OR public.is_super_admin()
  );

-- Insert: approved member, claiming for self, against a completed offer/ask whose creator matches
CREATE POLICY "Approved members can request hypercert claims"
  ON public.hypercert_claims FOR INSERT
  WITH CHECK (
    public.is_approved()
    AND auth.uid() = claimant_id
    AND auth.uid() <> creator_id
    AND (
      subject_type <> 'offer_ask'
      OR EXISTS (
        SELECT 1 FROM public.offers_asks oa
        WHERE oa.id = subject_id
          AND oa.creator_id = hypercert_claims.creator_id
      )
    )
  );

-- Update: creator resolves status; claimant attaches the issued uri
CREATE POLICY "Creator or claimant can update hypercert claims"
  ON public.hypercert_claims FOR UPDATE
  USING (auth.uid() = creator_id OR auth.uid() = claimant_id);

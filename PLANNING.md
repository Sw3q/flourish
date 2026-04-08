# Planning workspace

Use this workspace to draft and refine high-level plans, especially in Plan Mode.

## Current Objective
- **Phase 46: Hypercert Claims for Offers/Asks**: Add a modular, polymorphic Hypercert claim flow allowing any approved member (non-creator) to request a Hypercert on a *completed* offer/ask. Creator approves/denies inline; on approval the claimant issues an ATProto record via existing `useHypercerts`. Designed as a generic `hypercert_claims` table keyed by `subject_type`/`subject_id` so future subjects (events, deliverables, etc.) reuse the same plumbing.

## Phase 46 Architecture
- **DB**: New `hypercert_claims` table — `(id, subject_type, subject_id, claimant_id, creator_id, status, hypercert_uri, created_at, resolved_at)`. Unique on `(subject_type, subject_id, claimant_id)`. RLS: claimant inserts pending only against `completed` offers/asks where `creator_id` matches the subject's owner; creator updates status; claimant attaches uri after approval.
- **Hook**: `useHypercertClaims(subjectType, subjectId)` — `claims, requestClaim, resolveClaim, attachUri`. Reuses `useHypercerts.createHypercert` for the actual ATProto record (no duplication).
- **UI**: `HypercertClaimSection` rendered inline at the bottom of each completed offer/ask card. Three states: non-creator (Claim button → pending → approved → Issue → Hypercert link), creator (pending claims list with ✓/✗).
- **OffersAsks fetch**: Now returns `active` and `completed` posts in the 7-day window so completed cards remain visible for claim resolution.

## Upcoming Objectives
- **Phase 44: Implementation Follow-ups**: Monitor voting evaluation performance and consider UX enhancements for the Offer/Ask board.

## Upcoming Objectives
- **Phase 41: Brand Kit Overhaul & Re-styling**: Update the UI styling and elements to match the existing Frontier Tower brand kit.
- **Phase 39: Impact Visualization**: Enhance Hypercert displays and cross-floor impact tracking metrics.

## Completed Plans History
- **Phase 43 (Offers/Asks Board)**: Implemented per-floor bulletin board with global aggregation and type-based filtering.
- **Phase 42 (Interactive Treasury Visualization)**: Replaced bar chart with compact SVG donut chart and floor selection dropdown.
- **Phase 37 (Proposal Enhancements)**: Implemented proposal editing for authors and a dedicated chat/comment interface for each proposal instance.
- **Phase 37 (Admin Isolation)**: Hardened RLS to restrict floor admins to their own domain and enhanced super admin dashboard with building-wide floor labels.
- **Phase 36 (Magic Link Auth & Floor naming)**: Replaced passwords with dynamic magic link detection, fixed signup floor assignment, and renamed/reordered all 16 building floors.
- **Phase 35 (Dashboard Layout Refinement)**: Optimized dashboard grid layout to eliminate whitespace and balance governance vs. identity modules.
- **Phase 34 (Dashboard Refactoring)**: Implemented condensed, high-density header for floor metrics in `Dashboard.tsx`.
- **Phase 33 (Real Data Integration)**: Connected dashboard metrics and activity trends to live Supabase data.
- **Phase 32 (Global Sidebar)**: Implemented collapsible sidebar for persistent navigation and maximized viewport space.
- **Phase 31 (Tower Dashboard Redesign)**: Replaced legacy building view with the new data-rich `TowerDashboard.tsx`.
- **Phase 30 (Proposal Expiration Fix)**: Implemented batch-evaluation RPC and client-side filtering for stale proposals.
- **Phase 29 (Premium Frontend Refinement)**: Re-designed core pages with Bricolage Grotesque typography and Frontier OS aesthetics.
- **Phase 28 (Building Dashboard)**: Created data-rich `BuildingView.tsx` with global/floor stats and `useTowerStats.ts`.
- **Phase 25 (Building View Navigation)**: Interactive tower navigation and multi-floor routing.
- **Phase 24 (Multi-Floor Architecture)**: Multi-tenant system with `floor_id` scoping and super_admin access.
- **Phase 45 (Admin Hardening)**: Implemented `reject_user` RPC for full user deletion and modularized `useAdminActions.ts`.
- **Phase 44 (Codebase Cleanup)**: Decoupled `ProposalsList.tsx`, unified types in `src/types.ts`, and resolved all lint/TS errors.
- **Phase 40 (Circular Delegation)**: Implemented UI blockers to prevent infinite delegation loops globally and per-proposal.
- **Outdated Plans**: Tinder UI (23), Recurring Expenses (11, 14), Conviction Voting (12), Hypercerts (20, 21), Auth Bypass (19).

# Flourish Fund - AI Operating System & Project Rules

This document serves as the project-specific AI operating system for the Flourish Fund repository. It enforces consistent behavior, code style, architecture, and forbidden patterns.

## 1. Project Overview & Core Mechanics
The Flourish Fund is a React/Vite/TypeScript web application managing a communal pot for the "Human Flourishing Floor". 
*   **Authentication**: Passwordless email-only Magic Link (OTP) authentication. Dynamic detection automatically distinguishes between new residents (enforced floor selection) and existing residents during login (`Login.tsx`). Admin approval required for full access (`PendingApproval.tsx`).
*   **Proposals**: Communal spending requests with predefined categories and customizable expiration durations (minimum 3 days). Rendered via a Tinder-style swipeable card deck (`AdminDashboard.tsx`, `ProposalsList.tsx`).
*   **Liquid Democracy**: Users vote Yes/No directly, or delegate power to another member (globally or per-category using `useDashboardData.ts`).
*   **Passage Thresholds**: Pass if `Yes > No` AND `Quorum (40%)` is met. Implementation uses **Conviction Voting**: a proposal passes automatically ONLY after maintaining majority + quorum for a sustained 24-hour period (`quorum_reached_at`).
*   **Virtual Funds**: Fund tracking is virtual, consisting of manual deposits from admins and automatic withdrawals when proposals pass.
*   **Recurring Expenses**: Admins can define and manage monthly recurring expenses, which are manually processed to deduct from the communal pot, providing transparency to all users on the dashboard.
*   **Hypercerts (Impact Tracking)**: Impact records can be issued for passed proposals and completed Offers/Asks using the AT Protocol.
    *   **Proposals**: Issuance is decentralized to participants of a passed proposal (`HypercertIssuanceModal.tsx`, `useHypercerts.ts`).
    *   **Offers & Asks**: Issuance is **bi-directional and simultaneous**. On claim approval, the system issues a Hypercert to both the claimant and the creator's ATProto repositories. Enrollment is strictly gated on both parties having configured their identity (`atproto_did`).
*   **Offers & Asks Board**: A community bulletin board for floor-local and building-wide requests. Features 7-day expiration and type-based filtering (Offers/Asks) at the top of the dashboard (`OffersAsksBoard.tsx`, `useOffersAsks.ts`).

*   **Building Navigation**: The primary entry point is the `TowerDashboard.tsx` (accessible via `/building`), which features global activity visualizations and floor-by-floor treasury distributions. Individual floor dashboards are accessed via `/floor/:floorId`.
*   **Global Sidebar**: A persistent, collapsible navigation sidebar is managed by `AuthLayout.tsx`, allowing for deep-floor access and search across the entire tower.
*   **Multitenancy**: Data is scoped by `floor_id`. Approved users have read access to all floors for transparency. **Floor Admins** are restricted to managing members and categories on their primary floor; **Super Admins** have global oversight and cross-floor management capabilities.
*   **Super Admin Role**: A `super_admin` role exists with global oversight and bypass capabilities for approval checks.

## 2. Tech Stack Ecosystem
*   **Frontend**: React, Vite, TypeScript
*   **Styling**: Tailwind CSS (Tailwind variables managed in `index.css` for primary/accent dynamic theming)
*   **Backend Database / Auth**: Supabase (Postgres, Auth)
*   **Testing**: Vitest and React Testing Library

## 3. Recommended Workflow & Thought Hierarchy 
For maximum efficiency, adhere to the **Plan → Break Down Tasks → Execute → Validate & Ship** workflow.
1. **Plan**: Use `Planning.md` to draft high-level mechanics. 
2. **Break Down Tasks**: Use `tasks.md` to define atomic, checklist tasks.
3. **Execute**: Write tests, then execute the implementation.
4. **Validate**: Run tests (`npm run test`) and verify visually. 

*Combine this with the Think Hard Hierarchy before major refactors.*

## 4. Code Style & Requirements
*   **Test-Driven Culture**: Unit tests (`*.test.ts/tsx`) must accompany all logic changes, hooks, and regressions.
*   **Aesthetics**: "Frontier OS" - Refined Editorial aesthetic. Use **Bricolage Grotesque** for headings and **Plus Jakarta Sans** for body. Rely on a charcoal/cream palette with Frontier Blue accents. Incorporate noise textures and grain overlays for depth.
*   **Components**: Keep components practical. Extract complex Supabase data interactions into modular hooks (e.g. `useAdminUsers.ts`, `useAdminLedger.ts`, `useAdminCategories.ts`). UI components should be highly decoupled (e.g., `ProposalCard.tsx` extracted from `ProposalsList.tsx`).
*   **Visualizations**: Maintain high-fidelity, interactive SVG-based visualizations for global tower metrics (e.g., Donut Charts, Trend Polylines). Avoid heavy third-party charting libraries to preserve the "Refined Editorial" load performance and specialized aesthetic.

## 5. Architectural Strictures
*   **Server-Side Source of Truth**: NEVER calculate vital governance states (quorum, vote passage, threshold) on the frontend. Use Supabase Postgres Functions (`evaluate_proposal`) and Triggers to evaluate proposal success. Success is defined by maintaining 40% quorum and majority Yes for 24 consecutive hours.
*   **Stale Proposal Cleanup**: Use the `evaluate_cleanup()` RPC function on frontend load to process proposals that have expired without reaching a conclusive state. Frontend hooks (`useProposals`, `useTowerStats`) must also implement current-time filtering safeguards for active counts.
*   **Delegation Override**: Logic must ensure that direct votes cast by a user ALWAYS override any power they would have delegated. This applies to both the SQL `evaluate_proposal` logic and frontend `useProposals` weight calculations.
*   **Vote Manipulation / DB Updates**: Vote toggling and `category_delegations` assignment must use explicit `.delete()` then `.insert()` commands. Avoid using `.update()` or `.upsert()` for junction tables missing formal serial primary keys, due to PostgREST silent failure bugs.
*   **RLS Helpers**: Use `public.is_super_admin()`, `public.is_admin()`, and `public.is_approved()` SECURITY DEFINER functions in RLS policies to avoid infinite recursion when querying the `profiles` table. Standard admins must have their `floor_id` matched in RLS for update actions on that floor.
*   **User Rejection**: Admin rejection must use the `reject_user` RPC function to cascade-delete the user from both public profiles and the `auth.users` table for complete removal.
*   **Hypercert Issuance**: Only users who contributed voting weight to a proposal (directly or via delegation) are permitted to issue its Hypercert. This is enforced via RLS and the `evaluate_proposal` logic.
*   **Component Composition**: Highly specialized UI components (like `ProposalsList`) should expose control props (`hideHeader`, `isCreatingOverride`) to parent pages (`Dashboard.tsx`) to allow for context-specific layout overrides and state management.

## 6. Forbidden Patterns
*   **Direct Mutation**: Never mutate React component state directly; always use functional updates.
*   **Client-Side Evaluation**: Do not determine if a proposal "Passed" on the client. Trust the `status` column strictly enforced by Postgres.
*   **Unapproved Actions**: Do not allow unapproved users to access floor-specific voting or admin features. However, approved users can read-only data from any floor.
*   **Over-Engineering UI**: "Keep it simple and maintainable." Do not add complicated state machines to standard buttons.
*   **Grid layouts for Proposals**: Active proposals must use the built-in Tinder-style swipeable card navigator split by "To Vote" and "My Votes" tabs, not a multi-column grid, to preserve focus.

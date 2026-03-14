# Flourish Fund - AI Operating System & Project Rules

This document serves as the project-specific AI operating system for the Flourish Fund repository. It enforces consistent behavior, code style, architecture, and forbidden patterns.

## 1. Project Overview & Core Mechanics
The Flourish Fund is a React/Vite/TypeScript web application managing a communal pot for the "Human Flourishing Floor". 
*   **Authentication**: Strict manual verification. Admin must approve new accounts before they can view or vote (`PendingApproval.tsx`).
*   **Proposals**: Communal spending requests with predefined categories and customizable expiration durations (minimum 3 days) (`AdminDashboard.tsx`, `ProposalsList.tsx`).
*   **Liquid Democracy**: Users vote Yes/No directly, or delegate power to another member (globally or per-category using `useDashboardData.ts`).
*   **Passage Thresholds**: Pass if `Yes > No` AND `Quorum (40%)` is met. Implementation uses **Conviction Voting**: a proposal passes automatically ONLY after maintaining majority + quorum for a sustained 24-hour period (`quorum_reached_at`).
*   **Virtual Funds**: Fund tracking is virtual, consisting of manual deposits from admins and automatic withdrawals when proposals pass.
*   **Recurring Expenses**: Admins can define and manage monthly recurring expenses, which are manually processed to deduct from the communal pot, providing transparency to all users on the dashboard.
*   **Hypercerts (Impact Tracking)**: Impact records can be issued for passed proposals using the AT Protocol. Issuance power is decentralized: any approved member who participated in the proposal (directly or through delegation) can link their identity and issue a Hypercert (`HypercertIssuanceModal.tsx`, `useHypercerts.ts`).

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
*   **Aesthetics**: Glassmorphic, highly dynamic UI. DO NOT use basic, generic Tailwind colors. Always rely on `primary` and `accent` gradient mappings defined in `index.css`.
*   **Components**: Keep components practical. Extract complex Supabase data interactions into custom hooks (e.g. `useProposals.ts`, `useAdminActions.ts`, `useHypercerts.ts`).

## 5. Architectural Strictures
*   **Server-Side Source of Truth**: NEVER calculate vital governance states (quorum, vote passage, threshold) on the frontend. Use Supabase Postgres Functions (`evaluate_proposal`) and Triggers to evaluate proposal success. Success is defined by maintaining 40% quorum and majority Yes for 24 consecutive hours.
*   **Delegation Override**: Logic must ensure that direct votes cast by a user ALWAYS override any power they would have delegated. This applies to both the SQL `evaluate_proposal` logic and frontend `useProposals` weight calculations.
*   **Vote Manipulation / DB Updates**: Vote toggling and `category_delegations` assignment must use explicit `.delete()` then `.insert()` commands. Avoid using `.update()` or `.upsert()` for junction tables missing formal serial primary keys, due to PostgREST silent failure bugs.
*   **Hypercert Issuance**: Only users who contributed voting weight to a proposal (directly or via delegation) are permitted to issue its Hypercert. This is enforced via RLS and the `evaluate_proposal` logic.

## 6. Forbidden Patterns
*   **Direct Mutation**: Never mutate React component state directly; always use functional updates.
*   **Client-Side Evaluation**: Do not determine if a proposal "Passed" on the client. Trust the `status` column strictly enforced by Postgres.
*   **Unapproved Actions**: Do not allow unapproved users to access the main Dashboard or Admin Dashboard.
*   **Over-Engineering UI**: "Keep it simple and maintainable." Do not add complicated state machines to standard buttons.

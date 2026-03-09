# Flourish Fund - AI Operating System & Project Rules

This document serves as the critical project-specific AI operating system for the Flourish Fund repository. It enforces consistent behavior, code style, architecture, and forbidden patterns.

## 1. Project Overview & Core Mechanics
The Flourish Fund manages a communal pot for the "Human Flourishing Floor". 
*   **Authentication**: Strict manual verification. Admin must approve new accounts before they can view or vote.
*   **Proposals**: Semi-structured funding requests with predefined categories.
*   **Liquid Democracy**: Users vote Yes/No directly, or delegate power to another member (globally or per-category).
*   **Passage Thresholds**: >50% vote threshold and 40% quorum required. Evaluated firmly via backend Postgres triggers.
*   **Virtual Funds**: Fund tracking is completely virtual and managed manually by admins.

## 2. Tech Stack Ecosystem
*   **Frontend**: React, Vite, TypeScript
*   **Styling**: Tailwind CSS (Tailwind variables managed in `index.css`)
*   **Backend Database / Auth**: Supabase (Postgres, Auth, Edge Functions)

## 3. Recommended Workflow & Thought Hierarchy 
For maximum efficiency, adhere to the **Plan → Break Down Tasks → Execute → Validate & Ship** workflow.
1. **Plan**: Use `Planning.md` to draft high-level mechanics. 
2. **Break Down Tasks**: Use `tasks.md` to define atomic, checklist tasks.
3. **Execute**: Write tests, then execute the implementation.
4. **Validate**: Run tests (`npm run test`) and verify visually. 

*Always combine this with the Think Hard Hierarchy (think → think hard → ultrathink) before major refactors.*

## 4. Code Style & Requirements
*   **Test-Driven Culture**: Unit tests (Vitest/React Testing library) must accompany all logic changes, hooks, and regressions.
*   **Aesthetics**: Glassmorphic, highly dynamic UI. DO NOT use basic, generic Tailwind colors. Always rely on `primary` and `accent` gradient mappings defined in `index.css`.
*   **Components**: Keep components functional and pure. Extract complex data interactions into custom hooks (e.g. `useProposals.ts`, `useDashboardData.ts`).

## 5. Architectural Strictures
*   **Server-Side Source of Truth**: NEVER calculate vital governance states (quorum, vote passage, threshold) on the frontend. Use Supabase Postgres Functions (`evaluate_proposal`) and Triggers to evaluate proposal success and automatically generate withdrawal transactions upon passage.
*   **Vote Manipulation**: Vote toggling in `useProposals.ts` must use explicit `.delete()` then `.insert()` commands. Avoid using `.upsert()` or `.update()` for votes or `category_delegations` due to PostgREST silent failures on tables without explicit serial primary keys.

## 6. Forbidden Patterns
*   **Direct Mutation of Props/State**: Never mutate React component state directly; always use functional updates.
*   **Client-Side Evaluation**: Do not determine if a proposal "Passed" on the client. Trust the `status` column strictly enforced by Postgres.
*   **Unapproved Actions**: Do not allow unapproved users to load proposals, vote, or query system balances in the UI logic. 
*   **Over-Engineering UI**: "Keep it simple and maintainable." Do not add complicated state machines to standard buttons or generic interaction surfaces unless strictly necessary.

# Tasks

Use this document to break down plans into atomic, checklist-style tasks with checkboxes for tracking progress.

## Current Tasks
- [x] **Phase 20: Hypercerts Integration**
    - [x] Create database migration for `hypercert_uri` and `atproto_did`.
    - [x] Install latest ATProto SDKs (`@atproto/lex`, `@atproto/lex-password-session`).
    - [x] Implement proper handle-to-DID resolution (Identity Anchoring).
    - [x] Update hooks with refined authentication flow.
    - [x] Update AdminDashboard with Hypercert issuance modal.
    - [x] Update Dashboard with DID linking (anchored to DID).
    - [x] Verify integration and update walkthrough.

## Completed Tasks History
- **Phase 19**: Implemented `BYPASS_AUTH` mode in `config.ts`, `AuthLayout.tsx`, `useDashboardData.ts`, and `useAdminActions.ts`.
- **Phase 18**: Improved `Login.tsx` error handling for rate limit errors and provided SMTP guidance.
- **Phase 17**: Updated `Login.tsx` to redirect to `${window.location.origin}/pending` in `signUp`.
- **Phase 16**: Implemented dynamic `emailRedirectTo` URL in `supabase.auth.signUp` in `Login.tsx`.
- **Phase 11**: Created `recurring_expenses` DB schema, admin logic in hook, and Admin UI for recurring expenses.
- **Phase 12**: Refined voting with 24h conviction voting, delegation overrides, contextual power, and vote switching UI.
- **Phase 13**: Fixed sorting for active members list and patched Admin RLS database policies.
- **Phase 14**: Added admin promotion functionality, category color mapping, and inline editing for recurring expenses.
- **Phase 15**: Added customizable proposal duration times (minimum 3 days) capability to hooks and New Proposal form.
- **Dashboard Enhancements**: Updated UI terminology from "Monthly Burn" to "Recurring Expenses".

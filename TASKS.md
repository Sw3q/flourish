# Tasks

Use this document to break down plans into atomic, checklist-style tasks with checkboxes for tracking progress.

## Current Tasks
- [ ] **Phase 22: Future Enhancements**
    - [ ] Explore automated impact reporting notifications.
    - [ ] Refine Hypercert display on the main dashboard.

## Completed Tasks History
- **Phase 23.5**: Separated active proposals into "To Vote" (unvoted) and "My Votes" (voted) tabs. Added auto-swipe animation upon voting. Updated UI unit tests.
- **Phase 23**: Implemented core Tinder-style single-card UI with ←/→ navigation.
- **Phase 19**: Implemented `BYPASS_AUTH` mode in `config.ts`, `AuthLayout.tsx`, `useDashboardData.ts`, and `useAdminActions.ts`.
- **Phase 20**: Integrated Hypercerts impact tracking using ATProto; implemented handle resolution, record creation (`org.hypercerts.claim`), and participation-based issuance logic.
- **Phase 21**: Streamlined Hypercert flow with persistent user credentials (`atproto_handle`, `atproto_app_password`), decentralized issuance to participants, and cleaned up redundant Admin UI.
- **Phase 18**: Improved `Login.tsx` error handling for rate limit errors and provided SMTP guidance.
- **Phase 17**: Updated `Login.tsx` to redirect to `${window.location.origin}/pending` in `signUp`.
- **Phase 16**: Implemented dynamic `emailRedirectTo` URL in `supabase.auth.signUp` in `Login.tsx`.
- **Phase 11**: Created `recurring_expenses` DB schema, admin logic in hook, and Admin UI for recurring expenses.
- **Phase 12**: Refined voting with 24h conviction voting, delegation overrides, contextual power, and vote switching UI.
- **Phase 13**: Fixed sorting for active members list and patched Admin RLS database policies.
- **Phase 14**: Added admin promotion functionality, category color mapping, and inline editing for recurring expenses.
- **Phase 15**: Added customizable proposal duration times (minimum 3 days) capability to hooks and New Proposal form.
- **Dashboard Enhancements**: Updated UI terminology from "Monthly Burn" to "Recurring Expenses".

# Planning workspace

Use this workspace to draft and refine high-level plans, especially in Plan Mode.

## Current Objective
- **Phase 20: Hypercerts Integration**: Enable impact tracking via ATProto hypercerts for passed proposals and support identity linking (Profile ↔ DID).

## Completed Plans History
- **Phase 11 & 14 (Recurring Expenses & Admin Enhancements)**: Implemented `recurring_expenses` schema, admin controls, inline editing, and user transparency metrics.
- **Phase 12 (Voting System Refinement)**: Implemented conviction voting (24h majority/quorum maintenance), category-specific voting power, and delegation-override logic.
- **Phase 13 (Admin Dashboard Fixes)**: Resolved RLS and query sorting bugs for the Admin Dashboard.
- **Phase 15 (Proposal Expiration Time)**: Implemented customizable proposal duration times (minimum 3 days) during proposal creation.
- **Phase 16 (Authentication Redirect Fix)**: Implemented dynamic `emailRedirectTo` logic in `signUp` to ensure confirmation emails point to the correct site origin.
- **Phase 17 (Redirect to Pending after Auth)**: Implemented redirect to `/pending` page after email verification in `signUp` options.
- **Phase 18 (Email Rate Limit Handling)**: Improved UX for rate limit errors and provided SMTP configuration guidance.
- **Phase 19 (Optional Auth Bypass)**: Implemented a toggleable bypass for local development, allowing users to skip login/approval steps via `CONFIG.BYPASS_AUTH`.

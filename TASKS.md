# Tasks

Use this document to break down plans into atomic, checklist-style tasks with checkboxes for tracking progress.

## Phase 11: Recurring Expenses

### Database Schema
- [x] Write SQL migration to create `recurring_expenses` table.
- [x] Add RLS Policies: Viewable by approved members, Insert/Update/Delete strictly restricted to Admin roles.
- [x] Apply migration via Supabase SQL Editor.

### Admin Logic & State (`useAdminActions.ts`)
- [x] Add state `recurringExpenses` and `fetchRecurringExpenses`.
- [x] Implement `createRecurringExpense(title, amount, categoryId)`.
- [x] Implement `toggleRecurringExpense(expenseId, isActive)`.
- [x] Implement `processRecurringExpense(expenseId)`: Inserts a withdrawal transaction for the amount and logs it.
- [x] Write Vitest unit tests verifying all the above actions in `useAdminActions.test.ts`.

### User Transparency & Analytics
- [x] In `useDashboardData.ts`, fetch the active `recurring_expenses` to calculate `monthlyBurnRate`.
- [x] Update `Dashboard.tsx` to display the Community "Monthly Burn Rate" next to the Current Balance.

### Admin Dashboard UI
- [x] Add "Manage Recurring Expenses" segment to `AdminDashboard.tsx`.
- [x] Build form to add a new recurring expense (Title, Amount, Category).
- [x] Build the list view of active/inactive recurring expenses.
- [x] Add "Process Payment" button on active expenses to manually trigger the transaction deduction for that cycle.

### Final Verification
- [x] Run full `npm run test` suite to guarantee no regressions.
- [x] Visually verify responsive, glassmorphic UI alignment.

## Phase 13: Admin Dashboard Bug Fixes [DONE]
- [x] **Fix Frontend Queries**: Remove `created_at` sorting from `fetchUsers` to fix Active Members list.
- [x] **Fix Database RLS Policies**: Add `20260309000003_admin_rls.sql` migration for Admin `is_admin()` checks and INSERT/UPDATE/DELETE policies.

## Phase 14: Admin Dashboard Enhancements [DONE]
- [x] **Admin Promotion**: Add `promoteUser` logic and "Promote" button to Active Members list.
- [x] **Fix Category Colors**: Create a static class mapping in `AdminDashboard.tsx` to prevent Tailwind purging.
- [x] **Editable Recurring Expenses**: Add `updateRecurringExpense` hook and inline editing to the Admin Dashboard.

## Phase 12: Voting System Refinement [DONE]

### Logic & Governance
- [x] **Fix Double Counting**: Update `evaluate_proposal` SQL to ensure direct votes override delegations (no double-counting). [x]
- [x] **Refine Pass Threshold**: Update SQL logic to pass if `Yes > No` AND `Quorum (40%)` met, rather than >50% of entire community. [x]
- [x] **Conviction/Time-Weighting**: 
  - [x] Migration: Add `quorum_reached_at` to `proposals`. [x]
  - [x] SQL: Update `evaluate_proposal` to track when quorum + majority Yes is first met. [x]
  - [x] SQL: Auto-pass if quorum + majority Yes is sustained for 24 hours. [x]
- [x] **Tests**: Write SQL tests for delegation-override and time-weighted passage. [x]

### Frontend Enhancements
- [x] **Contextual Power**: Update `useDashboardData.ts` to provide `getVotingPower(categoryId)`. [x]
- [x] **UI Feedback**: Update `ProposalsList.tsx` to display the specific weight of the user's vote for that proposal's category. [x]
- [x] **Governance Viz**: Add a "Quorum Met" progress indicator to proposal cards. [x]
- [x] **Vote Switching**: Allow direct Yes ↔ No switching without intermediate retraction. [x]
- [x] **Unit Testing**: Implement robust Proxy-based mocks for hook verification. [x]

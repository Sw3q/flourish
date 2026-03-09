# Tasks

Use this document to break down plans into atomic, checklist-style tasks with checkboxes for tracking progress.

## Phase 11: Recurring Expenses

### Database Schema
- [ ] Write SQL migration to create `recurring_expenses` table.
  - Fields: `id`, `title`, `amount`, `category_id` (foreign key), `is_active`, `created_at`.
- [ ] Add RLS Policies: Viewable by approved members, Insert/Update/Delete strictly restricted to Admin roles.
- [ ] Apply migration via Supabase SQL Editor.

### Admin Logic & State (`useAdminActions.ts`)
- [ ] Add state `recurringExpenses` and `fetchRecurringExpenses`.
- [ ] Implement `createRecurringExpense(title, amount, categoryId)`.
- [ ] Implement `toggleRecurringExpense(expenseId, isActive)`.
- [ ] Implement `processRecurringExpense(expenseId)`: Inserts a withdrawal transaction for the amount and logs it.
- [ ] Write Vitest unit tests verifying all the above actions in `useAdminActions.test.ts`.

### User Transparency & Analytics
- [ ] In `useDashboardData.ts`, fetch the active `recurring_expenses` to calculate `monthlyBurnRate`.
- [ ] Update `Dashboard.tsx` to display the Community "Monthly Burn Rate" next to the Current Balance.

### Admin Dashboard UI
- [ ] Add "Manage Recurring Expenses" segment to `AdminDashboard.tsx`.
- [ ] Build form to add a new recurring expense (Title, Amount, Category).
- [ ] Build the list view of active/inactive recurring expenses.
- [ ] Add "Process Payment" button on active expenses to manually trigger the transaction deduction for that cycle.

### Final Verification
- [ ] Run full `npm run test` suite to guarantee no regressions.
- [ ] Visually verify responsive, glassmorphic UI alignment.

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

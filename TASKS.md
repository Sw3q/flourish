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

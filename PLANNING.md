# Planning workspace

Use this workspace to draft and refine high-level plans, especially in Plan Mode.

## Current Objective
- **Implement Recurring Expenses:** The Flourish Fund currently supports one-off proposals, but the community has ongoing costs (e.g., internet, communal subscriptions, cleaning supplies). We need a mechanism to securely manage and track recurring expenses directly impacting the virtual fund balance.

## Discovery & Research
- Currently, all deductions are triggered by active one-off `proposals` passing via community vote.
- The `transactions` table tracks `deposits` (manual by admin) and `withdrawals` (automatic when proposal passes).
- Recurring expenses shouldn't require a monthly vote if they are pre-approved fundamental community costs.
- **Who manages them?** Admins should have the ability to create, edit, and cancel recurring expenses.
- **How are funds deducted?** 
  - Option A: Automatically run a Cron schedule (Supabase pg_cron) to deduct funds every month.
  - Option B: Admins manually trigger the "pay period" which deducts all active recurring expenses at once. Option B is safer for a purely virtual fund lacking Stripe auto-billing integrations.

## Proposed Approach
- **Backend Schema Changes**: 
  - Create a new `recurring_expenses` table tracking `title`, `amount`, `category_id`, `frequency` (monthly), and `next_due_date` or `is_active`.
- **Admin Action (Manual Processing)**: To keep things simple and avoid complex pg_cron setups on the free Supabase tier, we will let Admins see a list of "Due" recurring expenses on their dashboard and process them with a single click. Processing an expense will insert a `withdrawal` into the `transactions` table.
- **UI Integrations**:
  - Update `useAdminActions.ts` hook to fetch and manage recurring expenses.
  - Update `AdminDashboard.tsx` to include a new section: "Recurring Expenses".
  - Update regular User `Dashboard.tsx` to display the "Monthly Burn Rate" (sum of all active recurring expenses) so members have transparency on capital exhaustion.

## Phases
1. **Database Schema**: Create the table and RLS policies for `recurring_expenses`.
2. **Hook Subsystem**: Write the CRUD and processing logic inside `useAdminActions.ts`, alongside comprehensive tests.
3. **UI Implementation**: Build the "Recurring Expenses" manager in the Admin Dashboard, and the "Monthly Burn" transparency metric on the main user Dashboard.

## Open Questions
- Should recurring expenses require an initial community proposal to establish, or can admins create them immediately by decree? (Assuming Admin decree for simplicity initially, mirroring manual deposit powers).

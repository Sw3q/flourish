-- Add last_processed_at to recurring_expenses for automatic billing tracking.
-- next_billing_date is computed as: coalesce(last_processed_at, created_at) + interval '30 days'
alter table recurring_expenses
  add column if not exists last_processed_at timestamptz default null;

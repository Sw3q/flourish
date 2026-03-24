-- Add recurrence_interval column to recurring_expenses
-- Default to 'monthly' to match existing behavior
alter table recurring_expenses
  add column if not exists recurrence_interval text not null default 'monthly'
  check (recurrence_interval in ('daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly'));

-- Note: daily, biweekly, quarterly added for future-proofing since it costs nothing
-- but the UI will focus on Weekly, Monthly, Yearly for simplicity.

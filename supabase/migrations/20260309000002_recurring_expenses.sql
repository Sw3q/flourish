-- Create recurring_expenses table
create table recurring_expenses (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  amount numeric not null,
  category_id uuid references categories(id) on delete restrict not null,
  is_active boolean default true not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table recurring_expenses enable row level security;

-- Select Policy: Viewable by approved members or admin
create policy "Recurring expenses viewable by approved members."
  on recurring_expenses for select
  using (
    exists (select 1 from profiles where id = auth.uid() and (is_approved = true or role = 'admin'))
  );

-- Insert Policy: Admin only
create policy "Admins can insert recurring expenses."
  on recurring_expenses for insert
  with check (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- Update Policy: Admin only
create policy "Admins can update recurring expenses."
  on recurring_expenses for update
  using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- Delete Policy: Admin only
create policy "Admins can delete recurring expenses."
  on recurring_expenses for delete
  using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

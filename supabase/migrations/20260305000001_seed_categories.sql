-- Seed: Initial categories for Flourishing Floor common space
-- Run this against the Supabase database directly or via the dashboard SQL editor.

insert into categories (name, color_theme) values
  ('Kitchen & Food',     'amber'),
  ('Cleaning',           'emerald'),
  ('Furniture & Decor',  'blue'),
  ('Tech & Electronics', 'purple'),
  ('Events',             'rose');

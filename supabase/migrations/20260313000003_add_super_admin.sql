-- Migration: 20260313000003_add_super_admin.sql
-- Description: Add super_admin role to user_role enum

-- Postgres doesn't easily let you alter enum inside a transaction without committing.
-- By putting this in its own migration file, Supabase will commit it before running 
-- subsequent migrations that reference the new value.
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'super_admin';

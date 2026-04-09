-- Migration: 20260409000001_fix_balance_logic.sql
-- Description: Unifies floor balance as source of truth and implements audit logging.

-- 1. Ensure balance column exists (it should, but for safety)
ALTER TABLE floors ADD COLUMN IF NOT EXISTS balance numeric DEFAULT 0;

-- 2. Audit Function: Automatically logs balance changes into transactions
CREATE OR REPLACE FUNCTION public.handle_balance_change()
RETURNS trigger AS $$
DECLARE
  v_delta numeric;
  v_description text;
BEGIN
  -- Only fire if balance actually changed
  IF NEW.balance IS DISTINCT FROM OLD.balance THEN
    v_delta := NEW.balance - OLD.balance;
    
    -- Default description if nothing else is provided
    v_description := 'Balance Adjustment';
    
    -- In a real scenario, we could use session variables for descriptions, 
    -- but for now we focus on data integrity.
    
    INSERT INTO public.transactions (amount, type, description, floor_id)
    VALUES (
      ABS(v_delta),
      CASE WHEN v_delta > 0 THEN 'deposit' ELSE 'withdrawal' END::transaction_type,
      v_description,
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Trigger: Fire after every balance update on floors
DROP TRIGGER IF EXISTS on_balance_change ON floors;
CREATE TRIGGER on_balance_change
  AFTER UPDATE OF balance ON floors
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_balance_change();

-- 4. RLS: Allow admins to update floor balance
DROP POLICY IF EXISTS "Admins can update floors." ON floors;
CREATE POLICY "Admins can update floors." ON floors FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND role IN ('super_admin', 'admin')
  )
);

-- 5. Clean up any potential conflicting triggers on transactions (if they existed)
-- We remove any trigger that tries to update floors.balance when transactions are inserted,
-- as that would now cause an infinite loop.
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'sync_balance_from_transaction') THEN
        DROP TRIGGER sync_balance_from_transaction ON transactions;
    END IF;
END $$;

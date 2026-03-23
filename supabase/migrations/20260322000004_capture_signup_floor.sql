-- Update handle_new_user to capture floor_id from metadata
-- This ensures that the floor selected during signup is correctly saved to the profile

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, floor_id)
  VALUES (
    new.id, 
    new.email,
    COALESCE(
      (new.raw_user_meta_data->>'floor_id')::uuid,
      '00000000-0000-0000-0000-000000000000' -- fallback to Default Floor if missing
    )
  );
  RETURN new;
END;
$$;

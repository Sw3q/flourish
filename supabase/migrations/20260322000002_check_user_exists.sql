-- Function to check if a user exists by email, bypassing RLS for the signup flow
create or replace function public.check_user_exists(email_to_check text)
returns boolean as $$
begin
  return exists (
    select 1 from auth.users where email = email_to_check
  ) or exists (
    select 1 from public.profiles where email = email_to_check
  );
end;
$$ language plpgsql security definer;

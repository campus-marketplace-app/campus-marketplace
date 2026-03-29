-- Adds school_code to profiles table, linking users to their school theme.
-- This enables loading the correct theme for a logged-in user.

alter table public.profiles
    add column if not exists school_code integer references public.school_themes(school_code);

-- When a new user signs up, their school_code should be determined from their
-- email address domain and set on their profile.
create or replace function public.set_profile_school_code_from_email()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  user_email_domain text;
  matched_school_code integer;
begin
  -- Extract domain from the new user's email
  user_email_domain := split_part(new.email, '@', 2);

  -- Find the corresponding school_code from the school_themes table
  select school_code into matched_school_code
  from public.school_themes
  where email_domain = user_email_domain
  limit 1;

  -- If a match is found, update the new user's profile with the school_code
  if matched_school_code is not null then
    update public.profiles
    set school_code = matched_school_code
    where user_id = new.id;
  end if;

  return new;
end;
$$;

-- This trigger will fire after a new user is inserted into auth.users,
-- ensuring their profile is updated with the correct school_code.
drop trigger if exists on_auth_user_created_set_school_code on auth.users;
create trigger on_auth_user_created_set_school_code
  after insert on auth.users
  for each row execute function public.set_profile_school_code_from_email();

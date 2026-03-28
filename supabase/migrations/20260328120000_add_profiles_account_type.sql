-- Add account_type enum and column on profiles.
-- account_type is immutable after creation to prevent client-side tampering.

do $$
begin
    if not exists (select 1 from pg_type where typname = 'account_type') then
        create type account_type as enum ('student', 'business');
    end if;
end $$;

alter table public.profiles
    add column if not exists account_type account_type not null default 'student';

update public.profiles
set account_type = 'student'
where account_type is null;

create or replace function public.prevent_profile_account_type_change()
returns trigger
language plpgsql
as $$
begin
    if old.account_type is distinct from new.account_type then
        raise exception 'account_type cannot be changed once set';
    end if;

    return new;
end;
$$;

drop trigger if exists prevent_profile_account_type_change on public.profiles;
create trigger prevent_profile_account_type_change
before update on public.profiles
for each row
execute function public.prevent_profile_account_type_change();

-- Recreate signup trigger function so account_type can be set at user creation time
-- from auth metadata, with a safe default to student.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  requested_account_type text;
begin
  requested_account_type := coalesce(new.raw_user_meta_data->>'account_type', 'student');

  insert into public.profiles (user_id, display_name, first_name, last_name, account_type)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'display_name',
      split_part(new.email, '@', 1)
    ),
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'last_name',
    case
      when requested_account_type in ('student', 'business') then requested_account_type::account_type
      else 'student'::account_type
    end
  );
  return new;
end;
$$;

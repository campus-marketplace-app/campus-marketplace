-- Enable RLS on profiles
alter table public.profiles enable row level security;

-- Authenticated users can read any profile
create policy "Profiles are viewable by authenticated users"
  on public.profiles for select
  to authenticated
  using (true);

-- Authenticated users can update their own profile
create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Authenticated users can delete their own profile
create policy "Users can delete their own profile"
  on public.profiles for delete
  to authenticated
  using (auth.uid() = user_id);

-- Trigger function: creates a profile row when a new auth user is created.
-- Runs as SECURITY DEFINER so it bypasses RLS — no session needed.
-- Reads display_name / first_name / last_name from user metadata passed at sign-up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (user_id, display_name, first_name, last_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'display_name',
      split_part(new.email, '@', 1)
    ),
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'last_name'
  );
  return new;
end;
$$;

-- Fire the trigger after every new row in auth.users
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

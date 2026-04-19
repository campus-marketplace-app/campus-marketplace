-- CM-US-048: soft-delete support for accounts
-- Adds deactivated_at column and restricts profile visibility to non-deactivated rows.
-- The service-role key bypasses RLS, so backend admin operations always work.

alter table public.profiles
  add column if not exists deactivated_at timestamptz;

-- Replace the old unrestricted select policies with one that hides deactivated accounts.
drop policy if exists "profiles_select_all" on public.profiles;
drop policy if exists "Profiles are viewable by authenticated users" on public.profiles;

create policy "profiles_select_active"
  on public.profiles
  for select
  to authenticated
  using (
    deactivated_at is null
    or auth.uid() = user_id
  );

 -- CM-US-014 RLS for profiles and listings
 

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.listings enable row level security;


-- PROFILES
-- users can read profiles (MVP)
-- users can only update their own profile
-- users can only insert their own profile
-- users can only delete their own profile
drop policy if exists "profiles_select_all" on public.profiles;

create policy "profiles_select_all"
on public.profiles
for select
to authenticated, anon
using (true);


drop policy if exists "profiles_insert_own" on public.profiles;

create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check (
    auth.uid() is not null
    and auth.uid() = user_id
);


drop policy if exists "profiles_update_own" on public.profiles;

create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (
    auth.uid() is not null
    and auth.uid() = user_id
)
with check (
    auth.uid() is not null
    and auth.uid() = user_id
);


drop policy if exists "profiles_delete_own" on public.profiles;

create policy "profiles_delete_own"
on public.profiles
for delete
to authenticated
using (
    auth.uid() is not null
    and auth.uid() = user_id
);


-- LISTINGS
-- public can read active listings
-- owner can read their own listings
-- owner only write
drop policy if exists "listings_public_read" on public.listings;

create policy "listings_public_read"
on public.listings
for select
to anon, authenticated
using (
    deleted_at is null
    and status = 'active'
);


drop policy if exists "listings_select_own" on public.listings;

create policy "listings_select_own"
on public.listings
for select
to authenticated
using (
    auth.uid() is not null
    and auth.uid() = user_id
);


drop policy if exists "listings_insert_own" on public.listings;

create policy "listings_insert_own"
on public.listings
for insert
to authenticated
with check (
    auth.uid() is not null
    and auth.uid() = user_id
);


drop policy if exists "listings_update_own" on public.listings;

create policy "listings_update_own"
on public.listings
for update
to authenticated
using (
    auth.uid() is not null
    and auth.uid() = user_id
)
with check (
    auth.uid() is not null
    and auth.uid() = user_id
);


drop policy if exists "listings_delete_own" on public.listings;

create policy "listings_delete_own"
on public.listings
for delete
to authenticated
using (
    auth.uid() is not null
    and auth.uid() = user_id
);
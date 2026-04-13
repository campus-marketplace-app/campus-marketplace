-- Add RLS coverage for existing core tables that still had no DB-level protection.
-- Scope: existing tables only (no schema/table creation).

-- Enable RLS on remaining existing tables.
alter table public.item_details enable row level security;
alter table public.service_details enable row level security;
alter table public.listing_tags enable row level security;
alter table public.categories enable row level security;
alter table public.tags enable row level security;
alter table public.notifications enable row level security;
alter table public.favorites enable row level security;
alter table public.reports enable row level security;
alter table public.blocks enable row level security;
alter table public.school_themes enable row level security;

-- ---------------------------------------------------------------------------
-- item_details: visible when parent listing is visible; writable by listing owner.
-- ---------------------------------------------------------------------------
drop policy if exists "item_details_select_visible" on public.item_details;
create policy "item_details_select_visible"
on public.item_details
for select
to anon, authenticated
using (
  deleted_at is null
  and exists (
    select 1
    from public.listings l
    where l.id = listing_id
      and l.deleted_at is null
      and (
        l.status = 'active'
        or (auth.uid() is not null and auth.uid() = l.user_id)
      )
  )
);

drop policy if exists "item_details_insert_own" on public.item_details;
create policy "item_details_insert_own"
on public.item_details
for insert
to authenticated
with check (
  exists (
    select 1
    from public.listings l
    where l.id = listing_id
      and l.deleted_at is null
      and l.user_id = auth.uid()
  )
);

drop policy if exists "item_details_update_own" on public.item_details;
create policy "item_details_update_own"
on public.item_details
for update
to authenticated
using (
  exists (
    select 1
    from public.listings l
    where l.id = listing_id
      and l.deleted_at is null
      and l.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.listings l
    where l.id = listing_id
      and l.deleted_at is null
      and l.user_id = auth.uid()
  )
);

drop policy if exists "item_details_delete_own" on public.item_details;
create policy "item_details_delete_own"
on public.item_details
for delete
to authenticated
using (
  exists (
    select 1
    from public.listings l
    where l.id = listing_id
      and l.deleted_at is null
      and l.user_id = auth.uid()
  )
);

-- ---------------------------------------------------------------------------
-- service_details: visible when parent listing is visible; writable by owner.
-- ---------------------------------------------------------------------------
drop policy if exists "service_details_select_visible" on public.service_details;
create policy "service_details_select_visible"
on public.service_details
for select
to anon, authenticated
using (
  deleted_at is null
  and exists (
    select 1
    from public.listings l
    where l.id = listing_id
      and l.deleted_at is null
      and (
        l.status = 'active'
        or (auth.uid() is not null and auth.uid() = l.user_id)
      )
  )
);

drop policy if exists "service_details_insert_own" on public.service_details;
create policy "service_details_insert_own"
on public.service_details
for insert
to authenticated
with check (
  exists (
    select 1
    from public.listings l
    where l.id = listing_id
      and l.deleted_at is null
      and l.user_id = auth.uid()
  )
);

drop policy if exists "service_details_update_own" on public.service_details;
create policy "service_details_update_own"
on public.service_details
for update
to authenticated
using (
  exists (
    select 1
    from public.listings l
    where l.id = listing_id
      and l.deleted_at is null
      and l.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.listings l
    where l.id = listing_id
      and l.deleted_at is null
      and l.user_id = auth.uid()
  )
);

drop policy if exists "service_details_delete_own" on public.service_details;
create policy "service_details_delete_own"
on public.service_details
for delete
to authenticated
using (
  exists (
    select 1
    from public.listings l
    where l.id = listing_id
      and l.deleted_at is null
      and l.user_id = auth.uid()
  )
);

-- ---------------------------------------------------------------------------
-- listing_tags: visible when parent listing is visible; writable by owner.
-- ---------------------------------------------------------------------------
drop policy if exists "listing_tags_select_visible" on public.listing_tags;
create policy "listing_tags_select_visible"
on public.listing_tags
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.listings l
    where l.id = listing_id
      and l.deleted_at is null
      and (
        l.status = 'active'
        or (auth.uid() is not null and auth.uid() = l.user_id)
      )
  )
);

drop policy if exists "listing_tags_insert_own" on public.listing_tags;
create policy "listing_tags_insert_own"
on public.listing_tags
for insert
to authenticated
with check (
  exists (
    select 1
    from public.listings l
    where l.id = listing_id
      and l.deleted_at is null
      and l.user_id = auth.uid()
  )
);

drop policy if exists "listing_tags_delete_own" on public.listing_tags;
create policy "listing_tags_delete_own"
on public.listing_tags
for delete
to authenticated
using (
  exists (
    select 1
    from public.listings l
    where l.id = listing_id
      and l.deleted_at is null
      and l.user_id = auth.uid()
  )
);

-- ---------------------------------------------------------------------------
-- categories and tags: public read-only reference data.
-- ---------------------------------------------------------------------------
drop policy if exists "categories_public_read" on public.categories;
create policy "categories_public_read"
on public.categories
for select
to anon, authenticated
using (deleted_at is null);

drop policy if exists "tags_public_read" on public.tags;
create policy "tags_public_read"
on public.tags
for select
to anon, authenticated
using (deleted_at is null);

-- ---------------------------------------------------------------------------
-- notifications: private per user.
-- ---------------------------------------------------------------------------
drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own"
on public.notifications
for select
to authenticated
using (auth.uid() is not null and auth.uid() = user_id);

drop policy if exists "notifications_insert_own" on public.notifications;
create policy "notifications_insert_own"
on public.notifications
for insert
to authenticated
with check (auth.uid() is not null and auth.uid() = user_id);

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own"
on public.notifications
for update
to authenticated
using (auth.uid() is not null and auth.uid() = user_id)
with check (auth.uid() is not null and auth.uid() = user_id);

drop policy if exists "notifications_delete_own" on public.notifications;
create policy "notifications_delete_own"
on public.notifications
for delete
to authenticated
using (auth.uid() is not null and auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- favorites: private per user. Include UPDATE for upsert conflict-path safety.
-- ---------------------------------------------------------------------------
drop policy if exists "favorites_select_own" on public.favorites;
create policy "favorites_select_own"
on public.favorites
for select
to authenticated
using (auth.uid() is not null and auth.uid() = user_id);

drop policy if exists "favorites_insert_own" on public.favorites;
create policy "favorites_insert_own"
on public.favorites
for insert
to authenticated
with check (auth.uid() is not null and auth.uid() = user_id);

drop policy if exists "favorites_update_own" on public.favorites;
create policy "favorites_update_own"
on public.favorites
for update
to authenticated
using (auth.uid() is not null and auth.uid() = user_id)
with check (auth.uid() is not null and auth.uid() = user_id);

drop policy if exists "favorites_delete_own" on public.favorites;
create policy "favorites_delete_own"
on public.favorites
for delete
to authenticated
using (auth.uid() is not null and auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- reports: reporter-scoped read/write from frontend flows.
-- ---------------------------------------------------------------------------
drop policy if exists "reports_select_own" on public.reports;
create policy "reports_select_own"
on public.reports
for select
to authenticated
using (auth.uid() is not null and auth.uid() = reporter_id);

drop policy if exists "reports_insert_own" on public.reports;
create policy "reports_insert_own"
on public.reports
for insert
to authenticated
with check (auth.uid() is not null and auth.uid() = reporter_id);

-- ---------------------------------------------------------------------------
-- blocks: private per user. Include UPDATE for upsert conflict-path safety.
-- ---------------------------------------------------------------------------
drop policy if exists "blocks_select_own" on public.blocks;
create policy "blocks_select_own"
on public.blocks
for select
to authenticated
using (auth.uid() is not null and auth.uid() = user_id);

drop policy if exists "blocks_insert_own" on public.blocks;
create policy "blocks_insert_own"
on public.blocks
for insert
to authenticated
with check (auth.uid() is not null and auth.uid() = user_id);

drop policy if exists "blocks_update_own" on public.blocks;
create policy "blocks_update_own"
on public.blocks
for update
to authenticated
using (auth.uid() is not null and auth.uid() = user_id)
with check (auth.uid() is not null and auth.uid() = user_id);

drop policy if exists "blocks_delete_own" on public.blocks;
create policy "blocks_delete_own"
on public.blocks
for delete
to authenticated
using (auth.uid() is not null and auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- school_themes: public read-only theme data.
-- ---------------------------------------------------------------------------
drop policy if exists "school_themes_public_read" on public.school_themes;
create policy "school_themes_public_read"
on public.school_themes
for select
to anon, authenticated
using (true);

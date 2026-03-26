-- CM-US-019: Listing images storage bucket + RLS

-- 1) Storage bucket for listing images
insert into storage.buckets (id, name, public)
values ('listing-images', 'listing-images', true)
on conflict (id) do nothing;

-- Public read for objects in listing-images bucket (used with public URLs)
drop policy if exists "Listing images are publicly readable" on storage.objects;
create policy "Listing images are publicly readable"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'listing-images');

-- Only listing owners can upload objects under <listing_id>/<filename>
drop policy if exists "Listing owners can upload listing images" on storage.objects;
create policy "Listing owners can upload listing images"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'listing-images'
    and exists (
      select 1
      from public.listings l
      where l.id::text = (storage.foldername(name))[1]
        and l.user_id = auth.uid()
        and l.deleted_at is null
    )
  );

-- Only listing owners can update objects under their listing folder
drop policy if exists "Listing owners can update listing images" on storage.objects;
create policy "Listing owners can update listing images"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'listing-images'
    and exists (
      select 1
      from public.listings l
      where l.id::text = (storage.foldername(name))[1]
        and l.user_id = auth.uid()
        and l.deleted_at is null
    )
  )
  with check (
    bucket_id = 'listing-images'
    and exists (
      select 1
      from public.listings l
      where l.id::text = (storage.foldername(name))[1]
        and l.user_id = auth.uid()
        and l.deleted_at is null
    )
  );

-- Only listing owners can delete objects under their listing folder
drop policy if exists "Listing owners can delete listing images" on storage.objects;
create policy "Listing owners can delete listing images"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'listing-images'
    and exists (
      select 1
      from public.listings l
      where l.id::text = (storage.foldername(name))[1]
        and l.user_id = auth.uid()
        and l.deleted_at is null
    )
  );

-- 2) RLS policies for listing_images table
alter table public.listing_images enable row level security;

-- Public can read images for active, non-deleted listings; owner can also read their own
-- images for non-active listings.
drop policy if exists "listing_images_select_visible" on public.listing_images;
create policy "listing_images_select_visible"
on public.listing_images
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

-- Owners can insert image metadata for their own, non-deleted listings
drop policy if exists "listing_images_insert_own" on public.listing_images;
create policy "listing_images_insert_own"
on public.listing_images
for insert
to authenticated
with check (
  exists (
    select 1
    from public.listings l
    where l.id = listing_id
      and l.user_id = auth.uid()
      and l.deleted_at is null
  )
);

-- Owners can update image metadata for their own listings
drop policy if exists "listing_images_update_own" on public.listing_images;
create policy "listing_images_update_own"
on public.listing_images
for update
to authenticated
using (
  exists (
    select 1
    from public.listings l
    where l.id = listing_id
      and l.user_id = auth.uid()
      and l.deleted_at is null
  )
)
with check (
  exists (
    select 1
    from public.listings l
    where l.id = listing_id
      and l.user_id = auth.uid()
      and l.deleted_at is null
  )
);

-- Owners can delete image metadata for their own listings
drop policy if exists "listing_images_delete_own" on public.listing_images;
create policy "listing_images_delete_own"
on public.listing_images
for delete
to authenticated
using (
  exists (
    select 1
    from public.listings l
    where l.id = listing_id
      and l.user_id = auth.uid()
      and l.deleted_at is null
  )
);

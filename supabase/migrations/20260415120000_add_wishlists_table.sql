create table if not exists public.wishlists (
    id          uuid        primary key default gen_random_uuid(),
    user_id     uuid        not null references auth.users(id)      on delete cascade,
    listing_id  uuid        not null references public.listings(id)  on delete cascade,
    created_at  timestamptz not null default now(),
    constraint wishlists_user_listing_unique unique (user_id, listing_id)
);

create index idx_wishlists_user_id    on public.wishlists(user_id);
create index idx_wishlists_listing_id on public.wishlists(listing_id);

alter table public.wishlists enable row level security;

create policy "Users can view their own wishlist"
    on public.wishlists for select
    using (auth.uid() = user_id);

create policy "Users can add to wishlist"
    on public.wishlists for insert
    with check (auth.uid() = user_id);

create policy "Users can remove from wishlist"
    on public.wishlists for delete
    using (auth.uid() = user_id);

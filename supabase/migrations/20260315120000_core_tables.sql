-- Initial core schema for the campus marketplace app (Supabase / PostgreSQL)

-- used for password hashing, encryption, and unique UUID's for profiles
create extension if not exists pgcrypto;

-- enum types for all tables
do $$
begin
    if not exists (select 1 from pg_type where typname = 'listing_type') then
        create type listing_type as enum ('item', 'service');
    end if;

    if not exists (select 1 from pg_type where typname = 'listing_status') then
        create type listing_status as enum ('draft', 'active', 'closed', 'sold', 'archived');
    end if;

    if not exists (select 1 from pg_type where typname = 'item_condition') then
        create type item_condition as enum ('new', 'like_new', 'good', 'fair', 'poor');
    end if;

    if not exists (select 1 from pg_type where typname = 'report_status') then
        create type report_status as enum ('pending', 'in_review', 'resolved', 'dismissed');
    end if;
end $$;

-- utility trigger for updating rows
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

-- core tables
-- note: AUTH_USERS is already created by supabase

create table if not exists public.profiles (
    user_id uuid primary key references auth.users(id) on delete cascade,
    display_name text not null,
    first_name text,
    last_name text,
    bio text,
    avatar_path text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.categories (
    id uuid primary key default gen_random_uuid(),
    parent_id uuid references public.categories(id) on delete set null,
    name text not null,
    description text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz,
    constraint categories_parent_name_unique unique (parent_id, name)
);

create table if not exists public.tags (
    id uuid primary key default gen_random_uuid(),
    name text not null unique,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz
);

-- tsvector used for faster listing searching by keywords
create table if not exists public.listings (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    type listing_type not null default 'item',
    title text not null,
    description text not null default '',
    price numeric(10,2) check (price >= 0),
    price_unit text,
    category_id uuid references public.categories(id) on delete set null,
    status listing_status not null default 'draft',
    location text,
    tsv tsvector,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz
);

create table if not exists public.item_details (
    listing_id uuid primary key references public.listings(id) on delete cascade,
    quantity integer not null default 1 check (quantity > 0),
    condition item_condition not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz
);

create table if not exists public.service_details (
    listing_id uuid primary key references public.listings(id) on delete cascade,
    duration_minutes integer not null check (duration_minutes > 0),
    price_unit text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz,
    available_from time,
    available_to time
);

create table if not exists public.listing_images (
    id uuid primary key default gen_random_uuid(),
    listing_id uuid not null references public.listings(id) on delete cascade,
    path text not null,
    alt_text text,
    order_no integer not null default 0 check (order_no >= 0),
    created_at timestamptz not null default now(),
    deleted_at timestamptz
);

create table if not exists public.listing_tags (
    listing_id uuid not null references public.listings(id) on delete cascade,
    tag_id uuid not null references public.tags(id) on delete cascade,
    created_at timestamptz not null default now(),
    primary key (listing_id, tag_id)
);

create table if not exists public.conversations (
    id uuid primary key default gen_random_uuid(),
    listing_id uuid references public.listings(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz
);

create table if not exists public.conversation_participants (
    id uuid primary key default gen_random_uuid(),
    conversation_id uuid not null references public.conversations(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    joined_at timestamptz not null default now(),
    left_at timestamptz,
    constraint conversation_participants_unique unique (conversation_id, user_id)
);

create table if not exists public.messages (
    id uuid primary key default gen_random_uuid(),
    conversation_id uuid not null references public.conversations(id) on delete cascade,
    sender_id uuid not null references auth.users(id) on delete cascade,
    content text not null,
    created_at timestamptz not null default now(),
    deleted_at timestamptz
);

create table if not exists public.notifications (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    type text not null,
    payload jsonb not null default '{}'::jsonb,
    is_read boolean not null default false,
    read_at timestamptz,
    created_at timestamptz not null default now()
);

create table if not exists public.favorites (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    listing_id uuid not null references public.listings(id) on delete cascade,
    created_at timestamptz not null default now(),
    constraint favorites_user_listing_unique unique (user_id, listing_id)
);

create table if not exists public.reports (
    id uuid primary key default gen_random_uuid(),
    reporter_id uuid not null references auth.users(id) on delete cascade,
    reported_listing_id uuid references public.listings(id) on delete cascade,
    reported_user_id uuid references auth.users(id) on delete cascade,
    reason text not null,
    details text,
    status report_status not null default 'pending',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint reports_target_check check (
        reported_listing_id is not null or reported_user_id is not null
    )
);

create table if not exists public.blocks (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    blocked_user_id uuid not null references auth.users(id) on delete cascade,
    created_at timestamptz not null default now(),
    constraint blocks_user_pair_unique unique (user_id, blocked_user_id),
    constraint blocks_no_self_block check (user_id <> blocked_user_id)
);

-- indexes
create index if not exists idx_listings_user_id on public.listings(user_id);
create index if not exists idx_listings_category_id on public.listings(category_id);
create index if not exists idx_listings_status on public.listings(status);
create index if not exists idx_listings_type on public.listings(type);
create index if not exists idx_listings_tsv on public.listings using gin(tsv);

create index if not exists idx_listing_images_listing_id on public.listing_images(listing_id);
create index if not exists idx_conversations_listing_id on public.conversations(listing_id);
create index if not exists idx_conversation_participants_conversation_id on public.conversation_participants(conversation_id);
create index if not exists idx_conversation_participants_user_id on public.conversation_participants(user_id);
create index if not exists idx_messages_conversation_id on public.messages(conversation_id);
create index if not exists idx_messages_sender_id on public.messages(sender_id);
create index if not exists idx_notifications_user_id on public.notifications(user_id);
create index if not exists idx_notifications_is_read on public.notifications(is_read);
create index if not exists idx_favorites_user_id on public.favorites(user_id);
create index if not exists idx_favorites_listing_id on public.favorites(listing_id);
create index if not exists idx_reports_reporter_id on public.reports(reporter_id);
create index if not exists idx_reports_reported_listing_id on public.reports(reported_listing_id);
create index if not exists idx_reports_reported_user_id on public.reports(reported_user_id);
create index if not exists idx_blocks_user_id on public.blocks(user_id);
create index if not exists idx_blocks_blocked_user_id on public.blocks(blocked_user_id);

-- triggers
drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

drop trigger if exists set_categories_updated_at on public.categories;
create trigger set_categories_updated_at
before update on public.categories
for each row
execute function public.set_updated_at();

drop trigger if exists set_tags_updated_at on public.tags;
create trigger set_tags_updated_at
before update on public.tags
for each row
execute function public.set_updated_at();

drop trigger if exists set_listings_updated_at on public.listings;
create trigger set_listings_updated_at
before update on public.listings
for each row
execute function public.set_updated_at();

drop trigger if exists set_item_details_updated_at on public.item_details;
create trigger set_item_details_updated_at
before update on public.item_details
for each row
execute function public.set_updated_at();

drop trigger if exists set_service_details_updated_at on public.service_details;
create trigger set_service_details_updated_at
before update on public.service_details
for each row
execute function public.set_updated_at();

drop trigger if exists set_conversations_updated_at on public.conversations;
create trigger set_conversations_updated_at
before update on public.conversations
for each row
execute function public.set_updated_at();

drop trigger if exists set_reports_updated_at on public.reports;
create trigger set_reports_updated_at
before update on public.reports
for each row
execute function public.set_updated_at();

-- added school_themes table
create table if not exists public.school_themes (
    theme_id uuid primary key default gen_random_uuid(),
    school_name text not null unique,
    school_code text not null unique,
    primary_color text not null,
    secondary_color text not null,
    accent_color text,
    logo_url text,
    font_family text,
    button_style text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint school_themes_primary_color_hex check (primary_color ~ '^#[0-9A-Fa-f]{6}$'),
    constraint school_themes_secondary_color_hex check (secondary_color ~ '^#[0-9A-Fa-f]{6}$'),
    constraint school_themes_accent_color_hex check (accent_color is null or accent_color ~ '^#[0-9A-Fa-f]{6}$')
);

create index if not exists idx_school_themes_school_code on public.school_themes(school_code);

drop trigger if exists set_school_themes_updated_at on public.school_themes;
create trigger set_school_themes_updated_at
before update on public.school_themes
for each row
execute function public.set_updated_at();
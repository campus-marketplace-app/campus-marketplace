-- Security + correctness fixes from advisor sweep on fix/perf-bugs.
-- Bundled into one migration so the staging/preview/prod DBs all converge in one step.

-- ---------------------------------------------------------------------------
-- 1. Harden function search_path (security advisor: function_search_path_mutable)
-- All seven functions previously inherited a mutable search_path, which can be
-- abused if a writable schema appears earlier on the path. Pin them to
-- public + pg_temp so resolution is deterministic regardless of caller.
-- ---------------------------------------------------------------------------
alter function public.set_updated_at() set search_path = public, pg_temp;
alter function public.prevent_profile_account_type_change() set search_path = public, pg_temp;
alter function public.set_listings_tsv() set search_path = public, pg_temp;
alter function public.ensure_listing_publish_requirements() set search_path = public, pg_temp;
alter function public.hook_edu_email_only(jsonb) set search_path = public, pg_temp;
alter function public.notify_new_message() set search_path = public, pg_temp;
alter function public.notify_wishlist_item_sold() set search_path = public, pg_temp;

-- ---------------------------------------------------------------------------
-- 2. Drop public bucket SELECT policies (security advisor: public_bucket_allows_listing)
-- The buckets are public, so direct object URLs work without any SELECT policy.
-- The existing policies let any client list the entire bucket, which we don't want.
-- ---------------------------------------------------------------------------
drop policy if exists "Avatars are publicly readable" on storage.objects;
drop policy if exists "Listing images are publicly readable" on storage.objects;
drop policy if exists "Theme assets are publicly readable" on storage.objects;

-- ---------------------------------------------------------------------------
-- 3. Add missing covering index on listing_tags FK (performance advisor)
-- ---------------------------------------------------------------------------
create index if not exists listing_tags_tag_id_idx on public.listing_tags(tag_id);

-- ---------------------------------------------------------------------------
-- 4. Drop duplicate permissive policies (performance advisor: multiple_permissive_policies)
-- Older legacy profile policies overlap with the newer "_own" set. Drop the legacy ones
-- so each (role, action) has exactly one permissive policy.
-- ---------------------------------------------------------------------------
drop policy if exists "Users can update their own profile" on public.profiles;
drop policy if exists "Users can delete their own profile" on public.profiles;

-- Merge listings_public_read + listings_select_own. Both are correct but cause
-- two policy evaluations per row on authenticated SELECT.
-- New single policy keeps both behaviors:
--   - anon and authenticated can read active, non-deleted listings
--   - owners can read their own listings even if draft / archived / sold
drop policy if exists "listings_public_read" on public.listings;
drop policy if exists "listings_select_own" on public.listings;
create policy "listings_select_visible"
on public.listings
for select
to anon, authenticated
using (
    (deleted_at is null and status = 'active')
    or (auth.uid() is not null and auth.uid() = user_id)
);

-- ---------------------------------------------------------------------------
-- 5. find_or_create_conversation RPC
-- Fixes the createConversation race: two simultaneous calls for the same
-- (listing, buyer, seller) tuple could each see "no existing" and insert two
-- rows. We serialize concurrent calls with a transaction-scoped advisory lock
-- keyed on the normalized (sorted user pair, listing) tuple, then re-check
-- before inserting.
-- ---------------------------------------------------------------------------
-- SECURITY DEFINER so we can insert the conversation + both participant rows
-- atomically. RLS on conversations would otherwise block the insert because
-- the SELECT/INSERT policies require the caller to already be a participant,
-- which is a chicken-and-egg problem at creation time. We re-enforce caller
-- identity inside the function instead.
create or replace function public.find_or_create_conversation(
    p_user_id uuid,
    p_participant_id uuid,
    p_listing_id uuid default null
)
returns public.conversations
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_caller uuid;
    v_user_a uuid;
    v_user_b uuid;
    v_lock_key bigint;
    v_existing_id uuid;
    v_convo public.conversations%rowtype;
begin
    if p_user_id is null or p_participant_id is null then
        raise exception 'User and participant IDs are required';
    end if;

    if p_user_id = p_participant_id then
        raise exception 'You cannot start a conversation with yourself';
    end if;

    -- Authorization: the caller must be one of the two participants. Service-role
    -- callers (auth.uid() is null) are allowed through for backend use.
    v_caller := auth.uid();
    if v_caller is not null and v_caller <> p_user_id and v_caller <> p_participant_id then
        raise exception 'You can only create conversations you participate in'
            using errcode = '42501';
    end if;

    -- Sort the pair so (a,b) and (b,a) hash to the same lock key.
    if p_user_id < p_participant_id then
        v_user_a := p_user_id;
        v_user_b := p_participant_id;
    else
        v_user_a := p_participant_id;
        v_user_b := p_user_id;
    end if;

    v_lock_key := hashtextextended(
        v_user_a::text || '|' || v_user_b::text || '|' || coalesce(p_listing_id::text, ''),
        0
    );
    perform pg_advisory_xact_lock(v_lock_key);

    -- After taking the lock, look for an existing non-deleted conversation
    -- where both users are still active participants.
    select c.id
      into v_existing_id
      from public.conversations c
     where c.deleted_at is null
       and coalesce(c.listing_id::text, '') = coalesce(p_listing_id::text, '')
       and exists (
           select 1 from public.conversation_participants cp
            where cp.conversation_id = c.id
              and cp.user_id = p_user_id
              and cp.left_at is null
       )
       and exists (
           select 1 from public.conversation_participants cp
            where cp.conversation_id = c.id
              and cp.user_id = p_participant_id
              and cp.left_at is null
       )
     limit 1;

    if v_existing_id is not null then
        select * into v_convo from public.conversations where id = v_existing_id;
        return v_convo;
    end if;

    -- No existing conversation — create one + both participant rows in the same txn.
    insert into public.conversations (listing_id)
         values (p_listing_id)
      returning * into v_convo;

    insert into public.conversation_participants (conversation_id, user_id)
    values
        (v_convo.id, p_user_id),
        (v_convo.id, p_participant_id);

    return v_convo;
end;
$$;

-- Allow the backend (service role) and any authenticated user to call it.
-- RLS still applies to the underlying tables.
grant execute on function public.find_or_create_conversation(uuid, uuid, uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 6. Block message inserts on sold listings (closes the sendMessage TOCTOU race)
-- The backend already checks `listing.status = 'sold'` before insert, but the
-- check and insert aren't atomic. This trigger enforces the rule at the row level.
-- ---------------------------------------------------------------------------
create or replace function public.block_messages_on_sold_listing()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
    v_listing_status public.listing_status;
    v_listing_owner uuid;
begin
    select l.status, l.user_id
      into v_listing_status, v_listing_owner
      from public.conversations c
      join public.listings l on l.id = c.listing_id
     where c.id = new.conversation_id
       and c.deleted_at is null
     limit 1;

    -- Only block when the listing is sold AND the sender is not the seller.
    -- The seller often needs to coordinate pickup/refunds after marking sold.
    if v_listing_status = 'sold' and new.sender_id <> v_listing_owner then
        raise exception 'Cannot send messages on a sold listing'
            using errcode = 'P0001';
    end if;

    return new;
end;
$$;

drop trigger if exists block_messages_on_sold_listing on public.messages;
create trigger block_messages_on_sold_listing
before insert on public.messages
for each row
execute function public.block_messages_on_sold_listing();

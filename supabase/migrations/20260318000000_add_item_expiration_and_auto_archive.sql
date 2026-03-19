-- Item expiration and auto-archive functionality
-- Adds expires_at column to item_details table with check constraint
-- Sets up daily cron job to auto-archive expired listings

-- Add expires_at column to item_details (nullable, allows items without expiration)
alter table public.item_details 
add column if not exists expires_at timestamptz;

-- Add check constraint: expires_at must be in the future (or NULL)
alter table public.item_details 
add constraint item_details_expires_at_future 
check (expires_at is null or expires_at > now());

-- Enable pg_cron extension for scheduled jobs
create extension if not exists pg_cron;

-- Create scheduled job to auto-archive expired item listings
-- Runs daily at 00:00 UTC
-- Archives active, non-deleted listings whose items have passed their expiration date
select cron.schedule(
  'auto-archive-expired-listings',
  '0 0 * * *',
  $$
    update public.listings
    set status = 'archived'
    where id in (
      select l.id
      from public.listings l
      inner join public.item_details id on l.id = id.listing_id
      where l.type = 'item'
        and l.status = 'active'
        and l.deleted_at is null
        and id.expires_at is not null
        and id.expires_at < now()
    );
  $$
);
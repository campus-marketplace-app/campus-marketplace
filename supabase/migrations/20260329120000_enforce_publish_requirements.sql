-- Enforce listing completeness before status can become active (published).
-- This complements backend service validation and protects against direct DB writes.

create or replace function public.ensure_listing_publish_requirements()
returns trigger
language plpgsql
as $$
declare
    missing_fields text[] := array[]::text[];
    image_count integer := 0;
    item_qty integer;
    item_cond public.item_condition;
    service_duration integer;
begin
    -- Skip checks for soft-deleted listings or non-publish states.
    if new.deleted_at is not null or new.status <> 'active' then
        return new;
    end if;

    -- Enforce only when entering active:
    -- 1) INSERT with status=active
    -- 2) UPDATE transitions to active from any other status
    -- This avoids breaking legacy active rows that predate this migration.
    if tg_op = 'UPDATE' and old.status = 'active' and new.status = 'active' then
        return new;
    end if;

    if coalesce(btrim(new.title), '') = '' then
        missing_fields := array_append(missing_fields, 'title');
    end if;

    if new.category_id is null then
        missing_fields := array_append(missing_fields, 'category_id');
    end if;

    if new.price is null then
        missing_fields := array_append(missing_fields, 'price');
    end if;

    if coalesce(btrim(new.location), '') = '' then
        missing_fields := array_append(missing_fields, 'location');
    end if;

    select count(*)
      into image_count
      from public.listing_images li
     where li.listing_id = new.id
       and li.deleted_at is null;

    if image_count < 1 then
        missing_fields := array_append(missing_fields, 'images');
    end if;

    if new.type = 'item' then
        select idt.quantity, idt.condition
          into item_qty, item_cond
          from public.item_details idt
         where idt.listing_id = new.id
           and idt.deleted_at is null;

        if item_cond is null then
            missing_fields := array_append(missing_fields, 'item_condition');
        end if;

        if item_qty is null or item_qty < 1 then
            missing_fields := array_append(missing_fields, 'item_quantity');
        end if;
    elsif new.type = 'service' then
        select sdt.duration_minutes
          into service_duration
          from public.service_details sdt
         where sdt.listing_id = new.id
           and sdt.deleted_at is null;

        if service_duration is null or service_duration <= 0 then
            missing_fields := array_append(missing_fields, 'service_duration_minutes');
        end if;
    end if;

    if array_length(missing_fields, 1) is not null then
        raise exception 'Cannot publish listing. Missing required fields: %', array_to_string(missing_fields, ', ')
            using errcode = '23514', detail = array_to_string(missing_fields, ',');
    end if;

    return new;
end;
$$;

drop trigger if exists ensure_listing_publish_requirements on public.listings;
create trigger ensure_listing_publish_requirements
before insert or update of status, title, category_id, price, location, type, deleted_at
on public.listings
for each row
execute function public.ensure_listing_publish_requirements();

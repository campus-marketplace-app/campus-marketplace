-- Notify users when a listing they wishlisted is marked as sold.

create or replace function public.notify_wishlist_item_sold()
returns trigger language plpgsql security definer as $$
begin
  -- Only fire when status transitions TO 'sold'.
  if new.status = 'sold' and (old.status is distinct from 'sold') then
    insert into public.notifications (user_id, type, payload)
    select
      w.user_id,
      'wishlist_item_sold',
      jsonb_build_object(
        'listing_id',    new.id,
        'listing_title', new.title,
        'seller_id',     new.user_id
      )
    from public.wishlists w
    where w.listing_id = new.id
      and w.user_id != new.user_id;  -- don't notify the seller
  end if;

  return new;
end;
$$;

drop trigger if exists on_listing_sold on public.listings;

create trigger on_listing_sold
  after update of status on public.listings
  for each row
  when (new.status = 'sold' and old.status is distinct from 'sold')
  execute function public.notify_wishlist_item_sold();

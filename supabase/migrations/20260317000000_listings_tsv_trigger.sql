-- Adds a trigger to keep the listings.tsv tsvector column in sync with
-- title and description so that full-text search via GIN index works correctly.

create or replace function public.set_listings_tsv()
returns trigger
language plpgsql
as $$
begin
  new.tsv :=
    setweight(to_tsvector('english', coalesce(new.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(new.description, '')), 'B');
  return new;
end;
$$;

drop trigger if exists set_listings_tsv on public.listings;
create trigger set_listings_tsv
before insert or update of title, description
on public.listings
for each row
execute function public.set_listings_tsv();

-- Backfill existing rows so the index is immediately usable.
update public.listings
set tsv =
  setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(description, '')), 'B');

-- Add indexes for common sort/filter patterns that currently do full table scans.

-- "Newest first" sorts on the listings browse/search pages.
create index if not exists listings_created_at_idx
  on public.listings (created_at desc);

-- Hierarchical category lookups (parent → children).
create index if not exists categories_parent_id_idx
  on public.categories (parent_id);

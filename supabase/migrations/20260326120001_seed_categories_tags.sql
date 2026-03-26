-- Seed default categories and tags for the campus marketplace.
-- These populate the dropdowns in listing creation and search filters.

-- Categories (top-level)
insert into public.categories (name, description) values
  ('Textbooks',       'Course textbooks and study materials'),
  ('Electronics',     'Laptops, phones, calculators, and other electronics'),
  ('Furniture',       'Dorm and apartment furniture'),
  ('Clothing',        'Apparel, shoes, and accessories'),
  ('School Supplies', 'Notebooks, pens, backpacks, and other supplies'),
  ('Transportation',  'Bikes, scooters, skateboards, and car accessories'),
  ('Sports & Fitness','Gym equipment, sports gear, and outdoor items'),
  ('Services',        'Tutoring, moving help, and other student services'),
  ('Free Stuff',      'Items offered for free'),
  ('Other',           'Anything that does not fit the above categories')
on conflict do nothing;

-- Tags
insert into public.tags (name) values
  ('like-new'),
  ('negotiable'),
  ('pickup-only'),
  ('delivery-available'),
  ('urgent'),
  ('semester-end-sale'),
  ('OBO')
on conflict do nothing;

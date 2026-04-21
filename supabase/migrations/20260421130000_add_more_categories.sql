insert into public.categories (name, description) values
  ('Housing',       'Sublease listings, roommate searches, and housing accessories'),
  ('Food & Drinks', 'Meal plans, snacks, beverages, and kitchen items'),
  ('Gaming',        'Video games, consoles, controllers, and accessories'),
  ('Music',         'Instruments, equipment, sheet music, and audio gear')
on conflict do nothing;

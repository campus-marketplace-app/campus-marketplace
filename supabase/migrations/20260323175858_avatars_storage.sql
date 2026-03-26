-- Create public avatars bucket
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Anyone authenticated can read avatars
create policy "Avatars are publicly readable"
  on storage.objects for select
  using (bucket_id = 'avatars');

-- Users can only upload into their own folder (avatars/<user_id>/*)
create policy "Users can upload their own avatar"
  on storage.objects for insert
  with check (bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can update their own avatar"
  on storage.objects for update
  using (bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can delete their own avatar"
  on storage.objects for delete
  using (bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]);;
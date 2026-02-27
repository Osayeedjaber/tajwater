-- ============================================================
-- Avatars Storage Bucket + RLS Policies
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Create the public avatars bucket
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- 2. Public read (anyone can view avatars via public URL)
drop policy if exists "Public avatar read" on storage.objects;
create policy "Public avatar read"
  on storage.objects for select
  using (bucket_id = 'avatars');

-- 3. Authenticated users can upload their own avatar
--    Path must be: {user_id}/avatar.{ext}
drop policy if exists "Users upload own avatar" on storage.objects;
create policy "Users upload own avatar"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- 4. Authenticated users can overwrite their own avatar
drop policy if exists "Users update own avatar" on storage.objects;
create policy "Users update own avatar"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- 5. Authenticated users can delete their own avatar
drop policy if exists "Users delete own avatar" on storage.objects;
create policy "Users delete own avatar"
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

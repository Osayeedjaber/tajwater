-- Migration: Add image_url to services + create services-images storage bucket
-- Run this in the Supabase SQL Editor

-- 1. Add image_url column to services
alter table public.services add column if not exists image_url text;

-- 2. Create the services-images storage bucket (public)
insert into storage.buckets (id, name, public)
values ('services-images', 'services-images', true)
on conflict (id) do nothing;

-- 3. Storage policy: public read
drop policy if exists "Public can view service images" on storage.objects;
create policy "Public can view service images"
  on storage.objects for select
  using (bucket_id = 'services-images');

-- 4. Storage policy: admins can upload/delete
drop policy if exists "Admins can manage service images" on storage.objects;
create policy "Admins can manage service images"
  on storage.objects for all
  using (
    bucket_id = 'services-images'
    and exists (
      select 1 from public.admin_users
      where email = (auth.jwt()->>'email')
    )
  );

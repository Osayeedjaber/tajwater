-- Migration: Add image_url to about_team + create about-team storage bucket
-- Run this in the Supabase SQL Editor

-- 1. Add image_url column to about_team
alter table public.about_team add column if not exists image_url text;

-- 2. Create the about-team storage bucket (public)
insert into storage.buckets (id, name, public)
values ('about-team', 'about-team', true)
on conflict (id) do nothing;

-- 3. Storage policy: public read
drop policy if exists "Public can view team photos" on storage.objects;
create policy "Public can view team photos"
  on storage.objects for select
  using (bucket_id = 'about-team');

-- 4. Storage policy: admins can upload/delete
drop policy if exists "Admins can manage team photos" on storage.objects;
create policy "Admins can manage team photos"
  on storage.objects for all
  using (
    bucket_id = 'about-team'
    and exists (
      select 1 from public.admin_users
      where email = (auth.jwt()->>'email')
    )
  );

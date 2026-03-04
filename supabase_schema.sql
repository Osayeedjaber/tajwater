-- ============================================================
-- TajWater — Supabase Database Schema (idempotent — safe to re-run)
-- Run this in: supabase.com → your project → SQL Editor
-- ============================================================

-- ============================================================
-- Tables
-- ============================================================

-- User profiles (extends auth.users)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  name text,
  phone text,
  delivery_address text,
  zone_id text,
  avatar_url text,
  wallet_balance numeric default 0,
  customer_notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Migration: add columns if table already exists (idempotent)
alter table public.profiles add column if not exists customer_notes text;
alter table public.profiles add column if not exists updated_at timestamptz default now();

-- Delivery zones
create table if not exists public.zones (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  delivery_fee numeric default 0,
  schedule text,
  active boolean default true
);

-- Products
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  price numeric not null,
  image_url text,
  stock integer default 0,
  category text,
  active boolean default true,
  low_stock_threshold integer default 10,
  updated_at timestamptz default now()
);

-- Migration: add columns if table already exists (idempotent)
alter table public.products add column if not exists low_stock_threshold integer default 10;
alter table public.products add column if not exists updated_at timestamptz default now();

-- Orders
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete set null,
  status text default 'pending',
  payment_status text default 'pending',
  total numeric not null,
  delivery_address text,
  zone_id uuid references public.zones,
  driver_name text,
  customer_name text,
  customer_phone text,
  stripe_payment_intent_id text,
  refund_amount numeric default 0,
  tax_amount numeric default 0,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Migration: add columns if table already exists (idempotent)
alter table public.orders add column if not exists payment_status text default 'pending';
alter table public.orders add column if not exists customer_name text;
alter table public.orders add column if not exists customer_phone text;
alter table public.orders add column if not exists stripe_payment_intent_id text;
alter table public.orders add column if not exists refund_amount numeric default 0;
alter table public.orders add column if not exists tax_amount numeric default 0;
alter table public.orders add column if not exists notes text;
alter table public.orders add column if not exists updated_at timestamptz default now();

-- Order items
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders on delete cascade,
  product_id uuid references public.products,
  quantity integer not null,
  price numeric not null
);

-- Subscriptions
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  product_id uuid references public.products,
  frequency text default 'weekly',
  next_delivery date,
  status text default 'active',
  quantity integer default 1,
  zone_id uuid references public.zones,
  price numeric,
  created_at timestamptz default now()
);

-- Migration: add columns if table already exists (idempotent)
alter table public.subscriptions add column if not exists price numeric;
alter table public.subscriptions add column if not exists created_at timestamptz default now();

-- Support tickets
create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete set null,
  subject text,
  message text,
  status text default 'open',
  admin_reply text,
  replied_at timestamptz,
  replied_by text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Migration: add columns if table already exists (idempotent)
alter table public.tickets add column if not exists admin_reply text;
alter table public.tickets add column if not exists replied_at timestamptz;
alter table public.tickets add column if not exists replied_by text;
alter table public.tickets add column if not exists updated_at timestamptz default now();

-- Admin users (separate role table — email must match a Supabase auth user)
create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  role text default 'manager',  -- super_admin | manager | delivery
  name text,
  created_at timestamptz default now()
);

-- Services (editable via admin Content page)
create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  title text not null unique,
  description text,
  features text[] default '{}',
  pricing jsonb default '[]',
  icon text default 'Droplets',
  color text default '#0097a7',
  image_url text,
  sort_order integer default 0,
  active boolean default true
);

-- About page — team members
create table if not exists public.about_team (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text,
  bio text,
  initials text,
  color text default '#0097a7',
  image_url text,
  sort_order integer default 0,
  active boolean default true
);

-- About page / global — key-value content blocks
create table if not exists public.site_content (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  value text not null,
  updated_at timestamptz default now()
);

-- Email logs (tracks all emails sent — system + admin)
create table if not exists public.email_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  recipient_email text not null,
  email_type text not null,
  subject text not null,
  status text not null default 'sent',
  resend_id text,
  error_message text,
  sent_by text,
  metadata jsonb,
  sent_at timestamptz not null default now()
);

-- Newsletter subscribers
create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  subscribed_at timestamptz default now(),
  source text default 'homepage',
  active boolean default true,
  notes text
);

-- Migration: add columns if table already exists (idempotent)
alter table public.newsletter_subscribers add column if not exists notes text;

-- Discount codes (coupon system)
create table if not exists public.discount_codes (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  type text not null check (type in ('percent', 'fixed')),
  value numeric not null,
  min_order_amount numeric default 0,
  max_uses integer,
  uses_count integer default 0,
  expires_at timestamptz,
  active boolean default true,
  created_at timestamptz default now()
);

-- Customer tags (segmentation)
create table if not exists public.customer_tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  tag text not null,
  created_at timestamptz default now(),
  unique(user_id, tag)
);

-- Audit logs (admin action history)
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_email text not null,
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb,
  created_at timestamptz default now()
);

-- ============================================================
-- Row Level Security — enable on all tables
-- ============================================================

alter table public.profiles      enable row level security;
alter table public.orders        enable row level security;
alter table public.order_items   enable row level security;
alter table public.subscriptions enable row level security;
alter table public.tickets       enable row level security;
alter table public.products      enable row level security;
alter table public.zones         enable row level security;
alter table public.admin_users   enable row level security;
alter table public.services      enable row level security;
alter table public.about_team    enable row level security;
alter table public.site_content  enable row level security;
alter table public.email_logs    enable row level security;
alter table public.newsletter_subscribers enable row level security;
alter table public.discount_codes enable row level security;
alter table public.customer_tags  enable row level security;
alter table public.audit_logs     enable row level security;

-- ============================================================
-- Policies — drop first so re-runs never conflict
-- ============================================================

-- profiles
drop policy if exists "Users manage own profile"        on public.profiles;
create policy "Users manage own profile"
  on public.profiles for all using (auth.uid() = id);

-- orders
drop policy if exists "Users manage own orders"         on public.orders;
create policy "Users manage own orders"
  on public.orders for all using (auth.uid() = user_id);

-- order_items
drop policy if exists "Users manage own order items"    on public.order_items;
create policy "Users manage own order items"
  on public.order_items for all
  using (
    exists (
      select 1 from public.orders
      where orders.id = order_items.order_id
      and orders.user_id = auth.uid()
    )
  );

-- subscriptions
drop policy if exists "Users manage own subscriptions"  on public.subscriptions;
create policy "Users manage own subscriptions"
  on public.subscriptions for all using (auth.uid() = user_id);

-- tickets
drop policy if exists "Users manage own tickets"        on public.tickets;
create policy "Users manage own tickets"
  on public.tickets for all using (auth.uid() = user_id);

drop policy if exists "Admins manage all tickets" on public.tickets;
create policy "Admins manage all tickets"
  on public.tickets for all
  using (exists (select 1 from public.admin_users where email = (auth.jwt()->>'email')))
  with check (exists (select 1 from public.admin_users where email = (auth.jwt()->>'email')));

-- products — public read, admin write
drop policy if exists "Anyone can view active products" on public.products;
create policy "Anyone can view active products"
  on public.products for select using (active = true);

drop policy if exists "Admins can manage products"      on public.products;
create policy "Admins can manage products"
  on public.products for all
  using (exists (select 1 from public.admin_users where email = auth.email()));

-- zones — public read
drop policy if exists "Anyone can view active zones"    on public.zones;
create policy "Anyone can view active zones"
  on public.zones for select using (active = true);

-- admin_users — each admin can only read their own row
drop policy if exists "Admin users can read own record" on public.admin_users;
create policy "Admin users can read own record"
  on public.admin_users for select using (auth.email() = email);

-- services — public read, admin write
drop policy if exists "Anyone can view active services" on public.services;
create policy "Anyone can view active services"
  on public.services for select using (active = true);

drop policy if exists "Admins can manage services"      on public.services;
create policy "Admins can manage services"
  on public.services for all
  using (exists (select 1 from public.admin_users where email = auth.email()));

-- about_team — public read, admin write
drop policy if exists "Anyone can view team"            on public.about_team;
create policy "Anyone can view team"
  on public.about_team for select using (active = true);

drop policy if exists "Admins can manage team"          on public.about_team;
create policy "Admins can manage team"
  on public.about_team for all
  using (exists (select 1 from public.admin_users where email = auth.email()));

-- site_content — public read, admin write
drop policy if exists "Anyone can view site content"    on public.site_content;
create policy "Anyone can view site content"
  on public.site_content for select using (true);

drop policy if exists "Admins can manage site content"  on public.site_content;
create policy "Admins can manage site content"
  on public.site_content for all
  using (exists (select 1 from public.admin_users where email = auth.email()));

-- ============================================================
-- Storage — avatars bucket (run AFTER enabling Storage in Supabase)
-- ============================================================

-- Create public avatars bucket (public = URLs work without auth)
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Users can upload/update their own avatar (path must start with their user ID)
drop policy if exists "Users upload own avatar"  on storage.objects;
create policy "Users upload own avatar"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Users update own avatar"  on storage.objects;
create policy "Users update own avatar"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Public read for all avatars (bucket is public so this is redundant but explicit)
drop policy if exists "Public avatar read"       on storage.objects;
create policy "Public avatar read"
  on storage.objects for select
  using (bucket_id = 'avatars');

-- ============================================================
-- Auto-create profile on signup trigger
-- ============================================================

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, phone, delivery_address, zone_id)
  values (
    new.id,
    new.raw_user_meta_data->>'name',
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'address',
    new.raw_user_meta_data->>'zone_id'
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- Seed: Delivery Zones  (skips duplicates)
-- ============================================================

insert into public.zones (name, delivery_fee, schedule, active) values
  ('North Vancouver', 0.00, 'Mon, Wed, Fri',  true),
  ('West Vancouver',  2.00, 'Tue, Thu, Sat',  true),
  ('Vancouver',       0.00, 'Daily',           true),
  ('Richmond',        0.00, 'Mon – Sat',       true),
  ('Burnaby',         0.00, 'Mon – Sat',       true),
  ('Coquitlam',       1.50, 'Tue, Thu, Sat',  true),
  ('Port Moody',      1.50, 'Tue, Thu',        true),
  ('Surrey',          0.00, 'Mon – Sat',       true),
  ('Delta',           2.00, 'Mon, Wed, Fri',  true),
  ('Langley',         2.50, 'Tue, Thu, Sat',  true)
on conflict (name) do nothing;

-- ============================================================
-- Seed: Products  (skips duplicates by name)
-- ============================================================

insert into public.products (name, description, price, stock, category, active) values
  ('20L Spring Water Jug',          'Premium purified spring water. pH balanced 7.2. Perfect for home dispensers.',       8.99,  200, 'water',        true),
  ('20L Distilled Water Jug',       'Ultra-pure distilled water. Ideal for humidifiers and medical equipment.',            9.49,  150, 'water',        true),
  ('20L Alkaline Water Jug',        'Alkaline water at pH 8.5+. Antioxidant-rich for active lifestyles.',                 10.99, 120, 'water',        true),
  ('10L Spring Water Jug',          'Compact 10L jug for smaller households or countertop dispensers.',                    5.99,  180, 'water',        true),
  ('Water Dispenser (Bottom Load)', 'Elegant bottom-load dispenser. Hot & cold. Compatible with all 20L jugs.',          189.99,  30, 'equipment',    true),
  ('Water Dispenser (Top Load)',    'Classic top-load dispenser. Energy-saving mode. Includes tap lock.',                129.99,  45, 'equipment',    true),
  ('Monthly Subscription (8 jugs)','Auto-delivery of 8×20L jugs monthly. Save 15% vs one-time orders.',                  59.99, 999, 'subscription', true),
  ('Weekly Subscription (4 jugs)', 'Fresh water every week. 4×20L jugs. Priority delivery slots.',                       29.99, 999, 'subscription', true),
  ('Dispenser Cleaning Kit',        'Complete kit to sanitize your water dispenser. Includes cleaner and brushes.',       14.99,  80, 'accessories',  true)
on conflict (name) do nothing;

-- ============================================================
-- Seed: Services
-- ============================================================

insert into public.services (title, description, features, pricing, icon, color, sort_order, active) values
(
  '20L Water Delivery',
  'Our flagship service. Premium purified spring water in BPA-free 20-litre jugs, delivered to your home or office on a schedule that works for you.',
  array['NSF/ANSI certified purification','pH balanced 7.0–7.5','BPA-free containers','Same-day & scheduled delivery','Jug exchange on delivery'],
  '[{"label":"1–4 jugs","price":"$8.99/jug"},{"label":"5–9 jugs","price":"$7.99/jug"},{"label":"10+ jugs","price":"$6.99/jug"},{"label":"Subscription","price":"From $6.49/jug"}]',
  'Droplets', '#0097a7', 1, true
),
(
  'Filtration Installation',
  'Professional installation of under-sink and countertop water filtration systems. Unlimited clean water directly from your tap with zero hassle.',
  array['6-stage reverse osmosis','Professional installation included','2-year parts & labor warranty','Annual filter replacement service','Alkaline & mineral options'],
  '[{"label":"Basic (3-stage)","price":"$149 + install"},{"label":"Standard (5-stage)","price":"$229 + install"},{"label":"Premium (6-stage RO)","price":"$299 + install"},{"label":"Annual maintenance","price":"$89/year"}]',
  'Settings', '#1565c0', 2, true
),
(
  'Commercial Supply',
  'Tailored bulk water solutions for businesses of all sizes — restaurants, gyms, offices, construction sites, and industrial facilities.',
  array['Custom volume & frequency','Dedicated account manager','Net-30 invoicing available','COD & EFT payment options','Priority same-day service'],
  '[{"label":"Small business (10–25 jugs)","price":"From $5.99/jug"},{"label":"Medium (26–100 jugs)","price":"Custom quote"},{"label":"Enterprise (100+)","price":"Custom quote"},{"label":"Bulk tank delivery","price":"Contact us"}]',
  'Building2', '#006064', 3, true
)
on conflict (title) do nothing;

-- ============================================================
-- Seed: Team Members
-- ============================================================

insert into public.about_team (name, role, bio, initials, color, sort_order, active) values
  ('Taj Rahman',   'Founder & CEO',      '15 years in the water industry. Passionate about bringing clean water to every home.', 'TR', '#0097a7', 1, true),
  ('Sarah Kim',    'Operations Manager', 'Ensures every delivery is on time. Expert in route optimization and logistics.',       'SK', '#1565c0', 2, true),
  ('Marcus Chen',  'Head of Filtration', 'Certified water treatment technician with 10+ years of installation experience.',      'MC', '#006064', 3, true),
  ('Priya Sharma', 'Customer Success',   'Dedicated to making every customer experience exceptional, every single time.',        'PS', '#00acc1', 4, true)
on conflict do nothing;

-- ============================================================
-- Seed: Site Content
-- ============================================================

insert into public.site_content (key, value) values
  ('about_mission',      'To make clean, pure water accessible and affordable for every household and business in Metro Vancouver — delivered reliably, sustainably, and with genuine care.'),
  ('about_vision',       'A BC where no family goes without access to quality drinking water. We''re building the most trusted water delivery network in the province, one delivery at a time.'),
  ('about_hero_subtitle','Since 2010, TajWater has been Metro Vancouver''s trusted source for clean, fresh water. Family-owned, community-focused.')
on conflict (key) do nothing;

-- ============================================================
-- Admin policies — allow admins to read/write ALL records
-- (not just their own — required for admin panel to function)
-- ============================================================

-- Admin can manage ALL orders
drop policy if exists "Admins can manage all orders"      on public.orders;
create policy "Admins can manage all orders"
  on public.orders for all
  using (exists (select 1 from public.admin_users where email = auth.email()));

-- Admin can manage ALL order items
drop policy if exists "Admins can manage all order items" on public.order_items;
create policy "Admins can manage all order items"
  on public.order_items for all
  using (exists (select 1 from public.admin_users where email = auth.email()));

-- Admin can read ALL profiles (customer info for orders)
drop policy if exists "Admins can read all profiles"      on public.profiles;
create policy "Admins can read all profiles"
  on public.profiles for select
  using (exists (select 1 from public.admin_users where email = auth.email()));

-- ============================================================
-- Admin Users
-- ============================================================
-- HOW TO SET UP ADMIN ACCESS:
--   1. Go to Supabase Dashboard → Authentication → Users → Add user
--   2. Create the user with their email + password
--   3. Then run the INSERT below (replace the example emails)
--
-- Roles:  super_admin  — full access to all admin pages
--         manager      — orders, customers, products, payments, content
--         delivery     — deliveries page only
-- ============================================================

insert into public.admin_users (email, role, name) values
  ('osayeedjaber18@gmail.com', 'super_admin', 'Osayeed Zaber')
on conflict (email) do update set role = excluded.role, name = excluded.name;

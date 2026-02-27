# TajWater — Build To-Do List

## Phase 1 — Project Setup ✅
- [x] Initialize Next.js 14 project (TypeScript, Tailwind, App Router)
- [x] Install dependencies: framer-motion, @supabase/supabase-js, stripe, @stripe/stripe-js, lucide-react
- [x] Install and init shadcn/ui (button, card, input, label, badge, dialog, sheet, tabs, select)
- [x] Configure tailwind.config.ts with aqua/blue/white color palette
- [x] Set up app/globals.css with CSS variables and water animation keyframes
- [x] Create .env.example with all required keys documented
- [x] Create lib/supabase.ts (browser + server clients)
- [x] Create lib/stripe.ts
- [x] Create types/index.ts (TypeScript interfaces for all data models)

## Phase 2 — Layout & Shared Components ✅
- [x] Navbar.tsx — sticky, scroll blur effect, mobile hamburger menu, auth state aware
- [x] Footer.tsx — links, social icons, newsletter signup, zone list
- [x] WaterBackground.tsx — animated SVG waves / bubble particles
- [x] FloatingOrderButton.tsx — sticky CTA button visible on all public pages
- [x] app/layout.tsx — root layout wrapping Navbar + Footer
- [x] middleware.ts — protect /dashboard and /admin routes

## Phase 3 — Home Page ✅
- [x] Hero.tsx — animated water bg, headline, 2 CTA buttons (Order Now / Learn More)
- [x] ProductShowcase.tsx — 3 featured product cards, clickable to shop
- [x] HowItWorks.tsx — 3-step process with icons and connecting line
- [x] ServicesOverview.tsx — 3 service cards (Water Delivery, Filtration, Commercial)
- [x] DeliveryChecker.tsx — postal code / area name input with zone lookup
- [x] TrustSignals.tsx — animated counters (customers, areas, years in business)
- [x] Testimonials.tsx — auto-scrolling review carousel
- [x] Newsletter.tsx — email signup section
- [x] app/page.tsx — assemble all home sections

## Phase 4 — Public Pages ✅
- [x] app/services/page.tsx — service cards, pricing table, request quote, FAQ accordion
- [x] app/areas/page.tsx — Google Maps embed, 10 zones list, schedule table, area search, new area request form
- [x] app/about/page.tsx — company story, mission/vision, team grid, certifications, photo gallery
- [x] app/contact/page.tsx — contact form, click-to-call, WhatsApp button, Google Maps embed, business hours, social links

## Phase 5 — Shop & Checkout ✅
- [x] Cart context/store (Zustand with persist)
- [x] app/shop/page.tsx — product grid, filters, sort, search, cart icon with count
- [x] app/checkout/page.tsx — cart review, address selector, delivery slot picker, Stripe Elements payment form, order confirmation

## Phase 6 — Auth Pages ✅
- [x] app/auth/register/page.tsx — name, email, phone, password, delivery address, zone selector, Google OAuth
- [x] app/auth/login/page.tsx — email/phone login, password, remember me, forgot password, Google OAuth
- [x] app/auth/callback/route.ts — Supabase OAuth callback handler

## Phase 7 — Customer Dashboard ✅
- [x] app/dashboard/layout.tsx — sidebar with nav links, user welcome, logout
- [x] app/dashboard/page.tsx — overview: quick order, subscription status, recent orders
- [x] app/dashboard/orders/page.tsx — order history, status badges, reorder button, invoice download
- [x] app/dashboard/subscription/page.tsx — frequency editor, pause/resume, change delivery day, quantity
- [x] app/dashboard/profile/page.tsx — edit personal info, multiple delivery addresses, payment methods (Stripe), wallet balance, transaction history
- [x] app/dashboard/support/page.tsx — submit ticket form, ticket history list

## Phase 8 — Admin Panel ✅
- [x] app/admin/login/page.tsx — separate secure admin login form
- [x] app/admin/layout.tsx — admin sidebar, role-based nav visibility
- [x] app/admin/page.tsx — KPI cards (orders today, revenue, customers, pending deliveries), charts
- [x] app/admin/orders/page.tsx — orders table, filter by status/date, change status, print receipt, assign to driver
- [x] app/admin/customers/page.tsx — customer list, details modal, export CSV, ban/suspend
- [x] app/admin/products/page.tsx — product CRUD table, stock levels, low stock alerts, pricing tiers
- [x] app/admin/deliveries/page.tsx — zone management, delivery schedule planner, staff assignment
- [x] app/admin/payments/page.tsx — transaction log, refund button, payment method breakdown, COD tracking
- [x] app/admin/settings/page.tsx — business info, zone config, delivery charges, email templates
- [x] app/admin/content/page.tsx — manage about page team/content via Supabase

## Phase 9 — SEO ✅
- [x] app/layout.tsx — full metadata: title template, OG, Twitter card, JSON-LD LocalBusiness schema
- [x] app/sitemap.ts — dynamic sitemap for all public routes
- [x] app/robots.ts — robots.txt blocking admin/dashboard/auth
- [x] app/opengraph-image.tsx — generated OG image (1200×630, branded)
- [x] app/icon.tsx — generated favicon icon
- [x] app/services/layout.tsx — page-specific metadata
- [x] app/areas/layout.tsx — page-specific metadata (geo-targeted zones)
- [x] app/about/layout.tsx — page-specific metadata
- [x] app/contact/layout.tsx — page-specific metadata
- [x] app/shop/layout.tsx — page-specific metadata
- [x] app/auth/layout.tsx — noindex metadata
- [x] app/checkout/layout.tsx — noindex metadata
- [x] next.config.ts — X-Robots-Tag noindex headers + security headers

## Phase 10 — Polish & QA ✅
- [x] npm run build — zero errors, zero warnings, 30/30 pages generated
- [x] Fix TypeScript: dashboard/orders, dashboard/subscription product type
- [x] Fix TypeScript: all zones type in admin (orders/customers/deliveries/payments/page) — `{ name: string } | { name: string }[] | null`
- [x] Fix TypeScript: admin/customers CustomerOrder zones type + safe array access
- [x] Migrate middleware.ts → proxy.ts (Next.js 16 convention, real Supabase cookie detection)
- [x] Remove all console.error/log from production code (admin/orders, customers, deliveries, payments, settings)
- [x] Fix loyalty points stale closure in dashboard/page.tsx
- [x] Add loading skeleton to about/page.tsx
- [x] Add error handling to services/page.tsx and dashboard/support/page.tsx fetches
- [x] Replace fake card payment form with real Stripe Elements + PaymentElement (PCI compliant)
- [x] Create app/api/create-payment-intent/route.ts — creates Supabase order + Stripe PaymentIntent, links them
- [ ] Test responsive layout on mobile (375px) and desktop (1440px)
- [ ] Test full registration → login → dashboard flow with live Supabase
- [ ] Test admin login → admin panel
- [ ] Test add to cart → checkout → Stripe test payment (use test card 4242 4242 4242 4242)

## Phase 11 — Launch Prep (needs real business info)
- [ ] Add real phone number, email, address to JSON-LD in app/layout.tsx
- [ ] Add actual social media profile URLs to JSON-LD sameAs array
- [ ] Add Google Search Console verification code to metadata verification field
- [ ] Set NEXT_PUBLIC_SITE_URL in production .env to real domain (currently: https://tajwater.ca)
- [ ] Enable Google OAuth in Supabase Dashboard (Authentication → Providers → Google)
- [ ] Create first super_admin user in admin_users table
- [ ] Configure Stripe webhook endpoint in Stripe Dashboard
- [ ] Apply supabase_schema.sql RLS policies in Supabase SQL Editor
- [ ] Submit sitemap to Google Search Console at /sitemap.xml

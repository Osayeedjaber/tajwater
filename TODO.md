# TajWater — Build To-Do List

## Phase 1 — Project Setup
- [ ] Initialize Next.js 14 project (TypeScript, Tailwind, App Router)
- [ ] Install dependencies: framer-motion, @supabase/supabase-js, stripe, @stripe/stripe-js, lucide-react
- [ ] Install and init shadcn/ui (button, card, input, label, badge, dialog, sheet, tabs, select)
- [ ] Configure tailwind.config.ts with aqua/blue/white color palette
- [ ] Set up app/globals.css with CSS variables and water animation keyframes
- [ ] Create .env.example with all required keys documented
- [ ] Create lib/supabase.ts (browser + server clients)
- [ ] Create lib/stripe.ts
- [ ] Create types/index.ts (TypeScript interfaces for all data models)

## Phase 2 — Layout & Shared Components
- [ ] Navbar.tsx — sticky, scroll blur effect, mobile hamburger menu, auth state aware
- [ ] Footer.tsx — links, social icons, newsletter signup, zone list
- [ ] WaterBackground.tsx — animated SVG waves / bubble particles
- [ ] FloatingOrderButton.tsx — sticky CTA button visible on all public pages
- [ ] app/layout.tsx — root layout wrapping Navbar + Footer
- [ ] middleware.ts — protect /dashboard and /admin routes

## Phase 3 — Home Page
- [ ] Hero.tsx — animated water bg, headline, 2 CTA buttons (Order Now / Learn More)
- [ ] ProductShowcase.tsx — 3 featured product cards, clickable to shop
- [ ] HowItWorks.tsx — 3-step process with icons and connecting line
- [ ] ServicesOverview.tsx — 3 service cards (Water Delivery, Filtration, Commercial)
- [ ] DeliveryChecker.tsx — postal code / area name input with zone lookup
- [ ] TrustSignals.tsx — animated counters (customers, areas, years in business)
- [ ] Testimonials.tsx — auto-scrolling review carousel
- [ ] Newsletter.tsx — email signup section
- [ ] app/page.tsx — assemble all home sections

## Phase 4 — Public Pages
- [ ] app/services/page.tsx — service cards, pricing table, request quote, FAQ accordion
- [ ] app/areas/page.tsx — Google Maps embed, 10 zones list, schedule table, area search, new area request form
- [ ] app/about/page.tsx — company story, mission/vision, team grid, certifications, photo gallery
- [ ] app/contact/page.tsx — contact form, click-to-call, WhatsApp button, Google Maps embed, business hours, social links

## Phase 5 — Shop & Checkout
- [ ] Cart context/store (React Context or Zustand)
- [ ] app/shop/page.tsx — product grid, filters, sort, search, cart icon with count
- [ ] app/checkout/page.tsx — cart review, address selector, delivery slot picker, Stripe Elements payment form, order confirmation

## Phase 6 — Auth Pages
- [ ] app/auth/register/page.tsx — name, email, phone, password, delivery address, zone selector, email verification
- [ ] app/auth/login/page.tsx — email/phone login, password, remember me, forgot password

## Phase 7 — Customer Dashboard
- [ ] app/dashboard/layout.tsx — sidebar with nav links, user welcome, logout
- [ ] app/dashboard/page.tsx — overview: quick order, subscription status, recent orders
- [ ] app/dashboard/orders/page.tsx — order history, status badges, reorder button, invoice download
- [ ] app/dashboard/subscription/page.tsx — frequency editor, pause/resume, change delivery day, quantity
- [ ] app/dashboard/profile/page.tsx — edit personal info, multiple delivery addresses, payment methods (Stripe), wallet balance, transaction history
- [ ] app/dashboard/support/page.tsx — submit ticket form, ticket history list

## Phase 8 — Admin Panel
- [ ] app/admin/login/page.tsx — separate secure admin login form
- [ ] app/admin/layout.tsx — admin sidebar, role-based nav visibility
- [ ] app/admin/page.tsx — KPI cards (orders today, revenue, customers, pending deliveries), charts
- [ ] app/admin/orders/page.tsx — orders table, filter by status/date, change status, print receipt, assign to driver
- [ ] app/admin/customers/page.tsx — customer list, details modal, export CSV, ban/suspend
- [ ] app/admin/products/page.tsx — product CRUD table, stock levels, low stock alerts, pricing tiers
- [ ] app/admin/deliveries/page.tsx — zone management, delivery schedule planner, staff assignment
- [ ] app/admin/payments/page.tsx — transaction log, refund button, payment method breakdown, COD tracking
- [ ] app/admin/settings/page.tsx — business info, zone config, delivery charges, email templates

## Phase 9 — Polish & QA
- [ ] Verify all pages render without 404s
- [ ] Test responsive layout on mobile (375px) and desktop (1440px)
- [ ] Test full registration → login → dashboard flow
- [ ] Test admin login → admin panel with mock data
- [ ] Test add to cart → checkout → Stripe test payment
- [ ] Check all animations are smooth (no jank)
- [ ] Add loading states / skeletons for data-fetching pages
- [ ] SEO: add metadata exports to all pages
- [ ] Add favicon and Open Graph image

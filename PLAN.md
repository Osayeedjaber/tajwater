# TajWater Website — Full Build Plan

## Tech Stack
- **Framework**: Next.js 15 (App Router, TypeScript)
- **Styling**: Tailwind CSS v4 with custom aqua/blue/white palette
- **Animations**: Framer Motion (subtle water-inspired)
- **UI Components**: shadcn/ui
- **Auth + Database**: Supabase (credentials via .env)
- **Payments**: Stripe (credentials via .env)
- **Map**: Google Maps iframe embed (no API key needed)
- **Icons**: Lucide React
- **State**: Zustand (cart with persist)

---

## Color Palette
| Token | Value | Use |
|---|---|---|
| Primary | `#0097A7` | Buttons, headings, accents |
| Primary Light | `#00BCD4` | Hover states, highlights |
| Primary Dark | `#006064` | Footer, dark sections |
| Secondary | `#1565C0` | Deep blue accents |
| Accent | `#B3E5FC` | Backgrounds, cards |
| Background | `#F0F9FF` | Page background |

---

## Project Structure
```
tajwater/
├── app/
│   ├── layout.tsx                  # Root layout — Navbar, Footer, JSON-LD, full SEO metadata
│   ├── page.tsx                    # Home
│   ├── sitemap.ts                  # /sitemap.xml (dynamic)
│   ├── robots.ts                   # /robots.txt
│   ├── icon.tsx                    # Generated favicon (edge runtime)
│   ├── opengraph-image.tsx         # Generated OG image 1200×630 (edge runtime)
│   ├── services/
│   │   ├── layout.tsx              # SEO metadata for /services
│   │   └── page.tsx                # Our Services (client component)
│   ├── areas/
│   │   ├── layout.tsx              # SEO metadata for /areas (geo-targeted)
│   │   └── page.tsx                # Delivery Areas (client component)
│   ├── about/
│   │   ├── layout.tsx              # SEO metadata for /about
│   │   └── page.tsx                # About Us (client component)
│   ├── contact/
│   │   ├── layout.tsx              # SEO metadata for /contact
│   │   └── page.tsx                # Contact (client component)
│   ├── shop/
│   │   ├── layout.tsx              # SEO metadata for /shop
│   │   └── page.tsx                # Shop/Products (client component)
│   ├── checkout/
│   │   ├── layout.tsx              # noindex metadata
│   │   └── page.tsx                # Checkout (client component)
│   ├── auth/
│   │   ├── layout.tsx              # noindex metadata
│   │   ├── login/page.tsx          # Customer Login
│   │   ├── register/page.tsx       # Customer Register
│   │   └── callback/route.ts       # Supabase OAuth callback
│   ├── dashboard/
│   │   ├── layout.tsx              # Dashboard sidebar layout (client)
│   │   ├── page.tsx                # Dashboard overview
│   │   ├── orders/page.tsx         # My Orders
│   │   ├── subscription/page.tsx   # Subscription management
│   │   ├── profile/page.tsx        # My Profile + addresses
│   │   └── support/page.tsx        # Support tickets
│   └── admin/
│       ├── login/page.tsx          # Admin Login (separate)
│       ├── layout.tsx              # Admin sidebar layout (client)
│       ├── page.tsx                # Admin KPI dashboard
│       ├── orders/page.tsx         # Order management
│       ├── customers/page.tsx      # Customer management
│       ├── products/page.tsx       # Product/inventory management
│       ├── deliveries/page.tsx     # Delivery zones & schedule
│       ├── payments/page.tsx       # Payment/transaction log
│       ├── settings/page.tsx       # Site & business settings
│       └── content/page.tsx        # About/services content editor
├── components/
│   ├── layout/
│   │   ├── Navbar.tsx
│   │   └── Footer.tsx
│   ├── home/
│   │   ├── Hero.tsx
│   │   ├── ProductShowcase.tsx
│   │   ├── HowItWorks.tsx
│   │   ├── ServicesOverview.tsx
│   │   ├── DeliveryChecker.tsx
│   │   ├── TrustSignals.tsx
│   │   ├── Testimonials.tsx
│   │   └── Newsletter.tsx
│   └── shared/
│       ├── FloatingOrderButton.tsx
│       └── WaterBackground.tsx
├── lib/
│   ├── supabase.ts
│   ├── stripe.ts
│   └── utils.ts
├── store/
│   └── cartStore.ts
├── types/index.ts
├── middleware.ts                   # Auth route protection
├── next.config.ts                  # noindex headers + security headers
├── supabase_schema.sql             # Full DB schema + RLS policies
├── .env.example
└── tailwind.config.ts
```

---

## SEO Architecture
| File | Purpose |
|---|---|
| `app/layout.tsx` | Root metadata, JSON-LD LocalBusiness schema |
| `app/sitemap.ts` | `/sitemap.xml` — all public routes |
| `app/robots.ts` | `/robots.txt` — blocks admin/dashboard/auth |
| `app/icon.tsx` | Edge-rendered favicon (32×32) |
| `app/opengraph-image.tsx` | Edge-rendered OG image (1200×630) |
| `app/*/layout.tsx` | Per-page title, description, keywords, OG, canonical |
| `next.config.ts` | `X-Robots-Tag: noindex` headers for private routes + security headers |

**SEO Note**: All public `page.tsx` files are `'use client'` (for animations/interactivity).
Metadata is exported from their sibling `layout.tsx` Server Components instead.

---

## Database Schema (Supabase)
```sql
profiles        (id, name, phone, delivery_address, zone_id, wallet_balance, created_at)
zones           (id, name, delivery_fee, schedule, active)
products        (id, name, description, price, image_url, stock, category, active)
orders          (id, user_id, status, total, delivery_address, zone_id, created_at)
order_items     (id, order_id, product_id, quantity, price)
subscriptions   (id, user_id, frequency, next_delivery, status, quantity, zone_id)
tickets         (id, user_id, subject, message, status, created_at)
admin_users     (id, email, role, name)
about_team      (id, name, role, bio, image_url, order)
site_content    (id, key, value, updated_at)
services        (id, name, description, price, features, active)
```
Full schema + RLS policies in `supabase_schema.sql`.

---

## Delivery Zones
North Vancouver, West Vancouver, Vancouver, Richmond, Burnaby,
Coquitlam, Port Moody, Surrey, Delta, Langley

---

## Environment Variables (.env.example)
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
NEXT_PUBLIC_SITE_URL=https://tajwater.ca
```

---

## Admin Roles
| Role | Access |
|---|---|
| `super_admin` | Full access to all admin pages |
| `manager` | Orders, customers, products, deliveries, payments |
| `delivery` | Deliveries page only |

Setup: Create auth users in Supabase, then insert into `admin_users` table with role.

---

## Animation Strategy
- **Hero**: SVG wave animation + floating water droplet particles
- **Scroll reveals**: Framer Motion `whileInView` fade-in for each section
- **Counters**: Animated number count-up on TrustSignals section
- **Cards**: Subtle hover lift (`translateY -4px`) with aqua shadow
- **Navbar**: Backdrop blur + shadow appear on scroll
- **Page transitions**: Framer Motion `AnimatePresence`

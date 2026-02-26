# TajWater Website — Full Build Plan

## Tech Stack
- **Framework**: Next.js 14 (App Router, TypeScript)
- **Styling**: Tailwind CSS with custom aqua/blue/white palette
- **Animations**: Framer Motion (subtle water-inspired)
- **UI Components**: shadcn/ui
- **Auth + Database**: Supabase (credentials via .env)
- **Payments**: Stripe (credentials via .env)
- **Map**: Google Maps embed (API key via .env)
- **Icons**: Lucide React

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
│   ├── layout.tsx                  # Root layout (Navbar + Footer)
│   ├── page.tsx                    # Home
│   ├── services/page.tsx           # Our Services
│   ├── areas/page.tsx              # Area of Sales / Delivery Coverage
│   ├── about/page.tsx              # About Us
│   ├── contact/page.tsx            # Contact
│   ├── shop/page.tsx               # Product/Shop
│   ├── checkout/page.tsx           # Checkout
│   ├── auth/
│   │   ├── login/page.tsx          # Customer Login
│   │   └── register/page.tsx       # Customer Register
│   ├── dashboard/
│   │   ├── layout.tsx              # Dashboard sidebar layout
│   │   ├── page.tsx                # Dashboard overview
│   │   ├── orders/page.tsx         # My Orders
│   │   ├── subscription/page.tsx   # Subscription management
│   │   ├── profile/page.tsx        # My Profile + addresses
│   │   └── support/page.tsx        # Support tickets
│   └── admin/
│       ├── login/page.tsx          # Admin Login (separate)
│       ├── layout.tsx              # Admin sidebar layout
│       ├── page.tsx                # Admin KPI dashboard
│       ├── orders/page.tsx         # Order management
│       ├── customers/page.tsx      # Customer management
│       ├── products/page.tsx       # Product/inventory management
│       ├── deliveries/page.tsx     # Delivery zones & schedule
│       ├── payments/page.tsx       # Payment/transaction log
│       └── settings/page.tsx       # Site & business settings
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
├── types/index.ts
├── middleware.ts                   # Auth route protection
├── .env.example
├── tailwind.config.ts
└── next.config.ts
```

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
```

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
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

---

## Animation Strategy
- **Hero**: SVG wave animation + floating water droplet particles
- **Scroll reveals**: Framer Motion `whileInView` fade-in for each section
- **Counters**: Animated number count-up on TrustSignals section
- **Cards**: Subtle hover lift (`translateY -4px`) with aqua shadow
- **Navbar**: Backdrop blur + shadow appear on scroll
- **Page transitions**: Framer Motion `AnimatePresence`

<div align="center">

<img src="public/logo/tajcyan.svg" alt="TajWater Logo" width="120" />

# TajWater

**Premium water delivery platform for Metro Vancouver**

[![Next.js](https://img.shields.io/badge/Next.js_16-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_v4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com)
[![Square](https://img.shields.io/badge/Square-000000?style=for-the-badge&logo=square&logoColor=white)](https://squareup.com)

[Live Demo](https://tajwater.ca) · [Report Bug](https://github.com/Osayeedjaber/tajwater/issues)

</div>

---

## Overview

TajWater is a full-stack e-commerce platform built for a water delivery company operating across 10 Metro Vancouver zones. Customers can browse products, place one-time or recurring subscription orders, and track deliveries — all from a polished storefront. A role-gated admin panel handles everything from order fulfillment to customer support.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16 (App Router, TypeScript) |
| **Styling** | Tailwind CSS v4, shadcn/ui, Framer Motion |
| **State** | Zustand (cart — localStorage persist) |
| **Database** | Supabase (PostgreSQL + RLS) |
| **Auth** | Supabase Auth (email/password + Google OAuth) |
| **Payments** | Square (Web Payments SDK + Webhooks) |
| **Email** | Resend (transactional HTML emails) |
| **Deployment** | Vercel |

---

## Features

### Storefront
- Product catalog with category filtering and real-time stock display
- Delivery zone checker — confirms coverage before checkout
- Cart with persistent state across sessions
- Checkout with Stripe card payments and order confirmation email

### Customer Dashboard
- Order history with status tracking
- Subscription management (pause, resume, cancel)
- Support ticket system with admin replies
- Profile management

### Admin Panel (role-gated)
| Role | Access |
|---|---|
| **Super Admin** | Full access — settings, access management, all data |
| **Manager** | Orders, customers, products, content, tickets, analytics |
| **Delivery** | Dashboard and delivery schedule only |

- Orders management with status updates and driver assignment
- Customer CRM with order history
- Product inventory management
- Delivery schedule and zone management
- Payments dashboard with Stripe integration
- Support ticket queue with reply system
- Analytics overview (revenue, orders, customers)
- Content editor for services and about page
- Email logs and notification preferences

---

## Project Structure

```
app/
  (public)/       Home, Services, Areas, About, Contact, Shop, Checkout
  auth/           Login, Register, Forgot, Reset, OAuth Callback
  dashboard/      Customer portal (orders, subscription, profile, support)
  admin/          Admin portal (10 sub-pages, role-gated)
  api/            create-payment, square/webhook, invoice/[orderId]

components/
  layout/         Navbar, Footer
  shared/         WaterBackground, FloatingOrderButton
  home/           Hero, HowItWorks, ProductShowcase, DeliveryChecker, etc.
  ui/             shadcn primitives

lib/              supabase.ts, stripe.ts, email.ts
store/            cartStore.ts (Zustand)
types/            index.ts (all shared interfaces)
supabase/         migrations/
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) project
- A [Square](https://squareup.com) developer account
- A [Resend](https://resend.com) account

### Installation

```bash
git clone https://github.com/Osayeedjaber/tajwater.git
cd tajwater
npm install
```

### Environment Variables

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

SQUARE_ACCESS_TOKEN=
SQUARE_ENVIRONMENT=sandbox
SQUARE_WEBHOOK_SIGNATURE_KEY=
NEXT_PUBLIC_SQUARE_APPLICATION_ID=
NEXT_PUBLIC_SQUARE_LOCATION_ID=

RESEND_API_KEY=
RESEND_FROM_EMAIL=TajWater <orders@yourdomain.com>

NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_COMPANY_PHONE=
NEXT_PUBLIC_COMPANY_EMAIL=
```

### Database

Run the schema in your Supabase SQL Editor:

```bash
# Open supabase_schema.sql and run it in Supabase Dashboard → SQL Editor
```

### Run

```bash
npm run dev       # Development server
npm run build     # Production build
npm run start     # Serve production build
npm run lint      # ESLint
```

---

## Delivery Zones

North Vancouver · West Vancouver · Vancouver · Richmond · Burnaby · Coquitlam · Port Moody · Surrey · Delta · Langley

---

## License

Private — all rights reserved.

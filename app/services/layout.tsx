import type { Metadata } from 'next'
import Script from 'next/script'

export const metadata: Metadata = {
  title: 'Water Delivery Services — TajWater Vancouver',
  description: 'Premium water delivery services in Metro Vancouver: 20L spring, alkaline & distilled jug delivery, whole-home filtration installation, and commercial bulk water supply. Flexible scheduling, competitive pricing. Order today.',
  keywords: [
    'water delivery services Vancouver',
    '20L water jug delivery Metro Vancouver',
    'water filtration installation Vancouver',
    'commercial water supply BC',
    'bulk water delivery Vancouver',
    'spring water delivery Vancouver',
    'alkaline water delivery BC',
    'water dispenser installation Vancouver',
    'under-sink filtration Vancouver',
    'residential water delivery BC',
  ],
  openGraph: {
    title: 'Water Delivery Services — TajWater Vancouver',
    description: 'Premium water delivery, filtration installation, and commercial supply across Metro Vancouver. Flexible scheduling and competitive pricing.',
    url: '/services',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'TajWater Water Delivery Services' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Water Delivery Services — TajWater Vancouver',
    description: 'Premium water delivery, filtration, and commercial supply across Metro Vancouver.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: '/services',
  },
}

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'How quickly can I get my first water delivery?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'For most zones, TajWater offers same-day delivery if you order before 12pm. Otherwise, next-day delivery is always available across Metro Vancouver.',
      },
    },
    {
      '@type': 'Question',
      name: 'What is the price of 20L water jug delivery in Vancouver?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'TajWater\'s 20L water jugs start at $8.99/jug for 1–4 jugs, $7.99/jug for 5–9 jugs, and $6.99/jug for 10+ jugs. Subscription customers get jugs from $6.49/jug.',
      },
    },
    {
      '@type': 'Question',
      name: 'Can I pause or cancel my water delivery subscription?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. You can pause, change frequency, or cancel your subscription anytime from your customer dashboard — no fees, no questions asked.',
      },
    },
    {
      '@type': 'Question',
      name: 'What areas does TajWater deliver to?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'TajWater delivers to 10 zones across Metro Vancouver: North Vancouver, West Vancouver, Vancouver, Richmond, Burnaby, Coquitlam, Port Moody, Surrey, Delta, and Langley.',
      },
    },
    {
      '@type': 'Question',
      name: 'Does TajWater offer commercial water delivery?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. TajWater offers dedicated commercial accounts with custom pricing, Net-30 invoicing, and a dedicated account manager for businesses needing 10+ jugs per delivery.',
      },
    },
  ],
}

export default function ServicesLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Script
        id="faq-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      {children}
    </>
  )
}

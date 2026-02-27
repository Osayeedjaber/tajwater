import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Contact TajWater — Call, WhatsApp or Email Us',
  description: 'Get in touch with TajWater for water delivery orders, filtration quotes, or customer support. Call or WhatsApp us, or fill out our contact form. Serving Metro Vancouver including Vancouver, Burnaby, Richmond, Surrey, and Langley.',
  keywords: [
    'contact TajWater',
    'TajWater phone number',
    'water delivery Vancouver contact',
    'order water delivery Vancouver',
    'water delivery customer service BC',
    'water filtration quote Vancouver',
    'commercial water delivery inquiry',
    'TajWater WhatsApp',
    'water delivery support Vancouver',
  ],
  openGraph: {
    title: 'Contact TajWater — Call, WhatsApp or Email Us',
    description: 'Reach TajWater by phone, WhatsApp, or email for water delivery orders, filtration quotes, and support across Metro Vancouver.',
    url: '/contact',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Contact TajWater — Metro Vancouver Water Delivery' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Contact TajWater — Call, WhatsApp or Email Us',
    description: 'Call, WhatsApp, or email TajWater for delivery orders and support across Metro Vancouver.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: '/contact',
  },
}

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children
}

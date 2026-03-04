import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'
import ConditionalShell from '@/components/layout/ConditionalShell'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist-sans' })

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://tajwater.ca'

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: 'TajWater — Pure Water Delivered to Your Door | Metro Vancouver',
    template: '%s | TajWater',
  },
  description: 'Premium water delivery across Metro Vancouver. 20L spring, alkaline & distilled jugs, water dispenser installation, filtration systems, and commercial bulk supply. Same-day & scheduled delivery. Serving Vancouver, Burnaby, Richmond, Surrey, Langley and more. Order now.',
  keywords: [
    'water delivery Vancouver',
    '20L water jug delivery BC',
    'water filtration installation Vancouver',
    'bulk water delivery Metro Vancouver',
    'water delivery Burnaby',
    'water delivery Richmond',
    'water delivery Surrey',
    'water delivery North Vancouver',
    'water delivery Langley',
    'water delivery Coquitlam',
    'commercial water delivery Vancouver',
    'drinking water delivery BC',
    'water dispenser delivery Vancouver',
    'alkaline water delivery Vancouver',
    'same day water delivery Vancouver',
    'TajWater',
  ],
  authors: [{ name: 'TajWater' }],
  creator: 'TajWater',
  publisher: 'TajWater',
  category: 'Water Delivery Service',
  formatDetection: {
    telephone: true,
    email: true,
    address: true,
  },
  openGraph: {
    type: 'website',
    locale: 'en_CA',
    url: BASE_URL,
    siteName: 'TajWater',
    title: 'TajWater — Pure Water Delivered to Your Door | Metro Vancouver',
    description: 'Premium water delivery across Metro Vancouver. 20L jugs, filtration installation, commercial supply. Same-day delivery available.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'TajWater — Pure Water Delivered to Your Door in Metro Vancouver',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TajWater — Pure Water Delivered to Your Door | Metro Vancouver',
    description: 'Premium water delivery across Metro Vancouver. 20L jugs, filtration, and commercial supply. Order now.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: BASE_URL,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

const localBusinessJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'LocalBusiness',
  '@id': `${BASE_URL}/#business`,
  name: 'TajWater',
  alternateName: 'Taj Water',
  description: 'Premium water delivery service across Metro Vancouver. 20L spring, alkaline & distilled jugs, water filtration installation, and commercial bulk water supply.',
  url: BASE_URL,
  logo: `${BASE_URL}/logo/tajcyan.svg`,
  image: `${BASE_URL}/og-image.png`,
  telephone: process.env.NEXT_PUBLIC_COMPANY_PHONE ?? '+16041234567',
  email: process.env.NEXT_PUBLIC_COMPANY_EMAIL ?? 'info@tajwater.ca',
  priceRange: '$$',
  currenciesAccepted: 'CAD',
  paymentAccepted: 'Cash, Credit Card, Debit Card, Online Payment',
  areaServed: [
    { '@type': 'City', name: 'Vancouver', '@id': 'https://www.wikidata.org/wiki/Q24639' },
    { '@type': 'City', name: 'Burnaby' },
    { '@type': 'City', name: 'Richmond' },
    { '@type': 'City', name: 'Surrey' },
    { '@type': 'City', name: 'North Vancouver' },
    { '@type': 'City', name: 'West Vancouver' },
    { '@type': 'City', name: 'Coquitlam' },
    { '@type': 'City', name: 'Port Moody' },
    { '@type': 'City', name: 'Delta' },
    { '@type': 'City', name: 'Langley' },
  ],
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Vancouver',
    addressRegion: 'BC',
    addressCountry: 'CA',
    postalCode: 'V5K 0A1',
  },
  geo: {
    '@type': 'GeoCoordinates',
    latitude: 49.2827,
    longitude: -123.1207,
  },
  openingHoursSpecification: [
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      opens: '07:00',
      closes: '19:00',
    },
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: 'Saturday',
      opens: '08:00',
      closes: '18:00',
    },
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: 'Sunday',
      opens: '09:00',
      closes: '17:00',
    },
  ],
  sameAs: [],
  hasOfferCatalog: {
    '@type': 'OfferCatalog',
    name: 'Water Delivery & Filtration Services',
    itemListElement: [
      {
        '@type': 'Offer',
        name: '20L Water Jug Delivery',
        description: 'Premium 20L spring, alkaline & distilled water jug delivery to your home or office across Metro Vancouver',
        price: '8.99',
        priceCurrency: 'CAD',
        availability: 'https://schema.org/InStock',
        url: `${BASE_URL}/shop`,
        itemOffered: {
          '@type': 'Product',
          name: '20L Spring Water Jug',
          category: 'Water',
        },
      },
      {
        '@type': 'Offer',
        itemOffered: {
          '@type': 'Service',
          name: 'Water Filtration Installation',
          description: 'Professional under-sink and whole-home water filtration system installation with 2-year warranty',
        },
      },
      {
        '@type': 'Offer',
        itemOffered: {
          '@type': 'Service',
          name: 'Commercial Water Supply',
          description: 'Bulk water supply and recurring delivery for restaurants, offices, gyms, and industrial facilities',
        },
      },
    ],
  },
}

const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': `${BASE_URL}/#website`,
  name: 'TajWater',
  url: BASE_URL,
  description: 'Premium water delivery across Metro Vancouver',
  publisher: { '@id': `${BASE_URL}/#business` },
  potentialAction: {
    '@type': 'SearchAction',
    target: { '@type': 'EntryPoint', urlTemplate: `${BASE_URL}/shop?search={search_term_string}` },
    'query-input': 'required name=search_term_string',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={geist.variable}>
      <head>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessJsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }} />
      </head>
      <body className="antialiased bg-[#f0f9ff]">
        <ConditionalShell>{children}</ConditionalShell>
      </body>
    </html>
  )
}

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'About TajWater — Pure Water, Delivered with Care',
  description: 'TajWater has been Metro Vancouver\'s trusted water delivery company since 2010. Family-owned, community-focused. Learn about our mission, certified team, and commitment to bringing clean, safe water to every home and business in BC.',
  keywords: [
    'about TajWater',
    'TajWater company Vancouver',
    'water delivery company BC',
    'family owned water delivery Vancouver',
    'NSF certified water Vancouver',
    'pure water company Metro Vancouver',
    'water delivery team Vancouver',
    'water company history BC',
    'trusted water delivery Vancouver',
  ],
  openGraph: {
    title: 'About TajWater — Pure Water, Delivered with Care',
    description: 'Family-owned since 2010, TajWater is Metro Vancouver\'s trusted source for clean, fresh water. Learn about our mission, team, and certifications.',
    url: '/about',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'About TajWater — Pure Water Delivered with Care' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'About TajWater — Pure Water, Delivered with Care',
    description: 'Family-owned since 2010. Metro Vancouver\'s trusted water delivery company.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: '/about',
  },
}

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children
}

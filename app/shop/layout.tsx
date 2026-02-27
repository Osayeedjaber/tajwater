import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Shop — Order Water Online | TajWater Vancouver',
  description: 'Order 20L spring, alkaline, and distilled water jugs online. Plus dispensers, filtration systems, and accessories. Fast delivery across Metro Vancouver. Subscribe and save 15% on regular deliveries.',
  keywords: [
    'buy water online Vancouver',
    'order 20L water jug Vancouver',
    'water dispenser buy Vancouver',
    'alkaline water buy Metro Vancouver',
    'distilled water delivery BC',
    'spring water order online Vancouver',
    'water subscription delivery Vancouver',
    'buy water dispenser Vancouver',
    'water filtration products BC',
    'online water store Vancouver',
  ],
  openGraph: {
    title: 'Shop — Order Water Online | TajWater Vancouver',
    description: 'Order 20L spring, alkaline & distilled water jugs, dispensers, and accessories. Fast Metro Vancouver delivery. Subscribe and save 15%.',
    url: '/shop',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'TajWater Shop — Order Water Online Vancouver' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Shop — Order Water Online | TajWater Vancouver',
    description: 'Order 20L jugs, dispensers, and filtration products. Fast Metro Vancouver delivery.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: '/shop',
  },
}

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return children
}

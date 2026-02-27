import Hero from '@/components/home/Hero'
import ProductShowcase from '@/components/home/ProductShowcase'
import HowItWorks from '@/components/home/HowItWorks'
import ServicesOverview from '@/components/home/ServicesOverview'
import DeliveryChecker from '@/components/home/DeliveryChecker'
import TrustSignals from '@/components/home/TrustSignals'
import Testimonials from '@/components/home/Testimonials'
import Newsletter from '@/components/home/Newsletter'

export default function HomePage() {
  return (
    <>
      <Hero />
      <ProductShowcase />
      <HowItWorks />
      <TrustSignals />
      <ServicesOverview />
      <DeliveryChecker />
      <Testimonials />
      <Newsletter />
    </>
  )
}

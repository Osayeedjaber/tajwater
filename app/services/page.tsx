'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Droplets, Settings, Building2, Clock, Shield, CheckCircle2, ChevronDown, Phone, ArrowRight, LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

const iconMap: Record<string, LucideIcon> = {
  Droplets, Settings, Building2, Clock, Shield,
}

const bgMap: Record<string, string> = {
  '#0097a7': '#e0f7fa',
  '#1565c0': '#e3f2fd',
  '#006064': '#e0f2f1',
  '#00acc1': '#e0f7fa',
}

const faqs = [
  { q: 'How quickly can I get my first delivery?', a: 'For most zones, we offer same-day delivery if you order before 12pm. Otherwise, next-day delivery is always available. Scheduling takes only 2 minutes online.' },
  { q: 'What makes TajWater different from store-bought water?', a: 'Our water goes through a 6-step purification process including reverse osmosis, UV sterilization, and pH balancing. It\'s fresher, cleaner, and far more cost-effective than bottled water.' },
  { q: 'Can I pause or cancel my subscription?', a: 'Absolutely. You can pause, change frequency, or cancel your subscription anytime from your customer dashboard — no fees, no questions asked.' },
  { q: 'Do you service commercial/industrial clients?', a: 'Yes! We have dedicated commercial accounts with custom pricing, invoicing, and a dedicated account manager for businesses needing 10+ jugs per delivery.' },
  { q: 'What areas do you cover?', a: 'We currently deliver to North Vancouver, West Vancouver, Vancouver, Richmond, Burnaby, Coquitlam, Port Moody, Surrey, Delta, and Langley. More zones coming soon.' },
  { q: 'How do I pay?', a: 'We accept Visa, Mastercard, American Express, e-Transfer, and cash on delivery. Business accounts can apply for Net-30 invoicing.' },
]

interface Service {
  id: string
  title: string
  description: string
  features: string[]
  pricing: { label: string; price: string }[]
  icon: string
  color: string
  image_url?: string | null
  sort_order: number
}

export default function ServicesPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchServices = async () => {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('active', true)
        .order('sort_order')
      if (!error && data) setServices(data)
      setLoading(false)
    }
    fetchServices()
  }, [])

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative py-28 hero-gradient overflow-hidden">
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 80" className="w-full" preserveAspectRatio="none">
            <path d="M0,40 C240,80 480,0 720,40 C960,80 1200,0 1440,40 L1440,80 L0,80 Z" fill="#f0f9ff" />
          </svg>
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span className="inline-block px-4 py-1.5 rounded-full bg-white/20 text-white text-sm font-semibold mb-4">Our Services</span>
            <h1 className="text-3xl sm:text-5xl font-extrabold text-white mb-5">
              Water Solutions for<br /><span className="gradient-text-light">Every Need</span>
            </h1>
            <p className="text-[#b3e5fc] text-xl max-w-2xl mx-auto">
              From single-household deliveries to enterprise supply chains — we have you covered across Metro Vancouver.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Services */}
      <section className="py-20 bg-[#f0f9ff]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          {loading ? (
            <div className="space-y-16">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                  <div className="space-y-4">
                    <div className="h-10 bg-white rounded-xl animate-pulse w-2/3" />
                    <div className="h-4 bg-white rounded animate-pulse" />
                    <div className="h-4 bg-white rounded animate-pulse w-5/6" />
                    <div className="h-4 bg-white rounded animate-pulse w-3/4" />
                  </div>
                  <div className="h-64 bg-white rounded-3xl animate-pulse" />
                </div>
              ))}
            </div>
          ) : (
            services.map((svc, i) => {
              const Icon = iconMap[svc.icon] ?? Droplets
              const bg = bgMap[svc.color] ?? '#e0f7fa'
              return (
                <motion.div
                  key={svc.id}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-70px' }}
                  transition={{ delay: i * 0.1 }}
                  className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center"
                >
                  <div className={i % 2 === 1 ? 'lg:order-2' : ''}>
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg" style={{ background: bg }}>
                        <Icon className="w-7 h-7" style={{ color: svc.color }} />
                      </div>
                      <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0c2340]">{svc.title}</h2>
                    </div>
                    <p className="text-[#4a7fa5] text-lg leading-relaxed mb-6">{svc.description}</p>
                    <ul className="space-y-2 mb-8">
                      {svc.features.map((f) => (
                        <li key={f} className="flex items-center gap-2 text-[#0c2340]">
                          <CheckCircle2 className="w-5 h-5 shrink-0" style={{ color: svc.color }} />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <div className="flex gap-3">
                      <Link href="/shop">
                        <Button className="gap-2" style={{ background: `linear-gradient(135deg, ${svc.color}, #1565c0)` }}>
                          Order Now <ArrowRight className="w-4 h-4" />
                        </Button>
                      </Link>
                      <Link href="/contact">
                        <Button variant="outline" className="gap-2 border-[#cce7f0]" style={{ color: svc.color }}>
                          <Phone className="w-4 h-4" /> Request Quote
                        </Button>
                      </Link>
                    </div>
                  </div>

                  {/* Image or Pricing card */}
                  <div className={i % 2 === 1 ? 'lg:order-1' : ''}>
                    {svc.image_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={svc.image_url}
                        alt={svc.title}
                        className="w-full h-52 object-cover rounded-3xl shadow-lg mb-4"
                      />
                    )}
                    <div className="bg-white rounded-3xl border border-[#cce7f0] shadow-lg overflow-hidden">
                      <div className="p-5 border-b border-[#cce7f0]" style={{ background: bg }}>
                        <h3 className="font-bold text-[#0c2340]">Pricing</h3>
                      </div>
                      <div className="divide-y divide-[#cce7f0]">
                        {svc.pricing.map((p) => (
                          <div key={p.label} className="flex justify-between items-center px-5 py-3.5">
                            <span className="text-[#4a7fa5] text-sm">{p.label}</span>
                            <span className="font-bold text-[#0c2340]">{p.price}</span>
                          </div>
                        ))}
                      </div>
                      <div className="p-5 bg-[#f0f9ff]">
                        <p className="text-xs text-[#4a7fa5]">* Delivery fee may apply based on zone. Volume discounts auto-applied at checkout.</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )
            })
          )}
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-70px' }} className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0c2340] mb-3">Frequently Asked <span className="gradient-text">Questions</span></h2>
          </motion.div>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-70px' }}
                transition={{ delay: i * 0.06 }}
                className="bg-[#f0f9ff] rounded-2xl border border-[#cce7f0] overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left"
                >
                  <span className="font-semibold text-[#0c2340]">{faq.q}</span>
                  <motion.div animate={{ rotate: openFaq === i ? 180 : 0 }} transition={{ duration: 0.2 }}>
                    <ChevronDown className="w-5 h-5 text-[#0097a7] shrink-0" />
                  </motion.div>
                </button>
                <AnimatePresence>
                  {openFaq === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <p className="px-5 pb-4 text-[#4a7fa5] text-sm leading-relaxed">{faq.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

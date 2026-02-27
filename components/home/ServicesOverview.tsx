'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { Droplets, Settings, Building2, RefreshCw, Clock, Shield } from 'lucide-react'

const services = [
  {
    icon: Droplets,
    title: '20L Water Delivery',
    desc: 'Regular scheduled or on-demand delivery of purified 20-litre water jugs to your home or office.',
    href: '/services',
    color: '#0097a7',
    bg: '#e0f7fa',
  },
  {
    icon: Settings,
    title: 'Filtration Installation',
    desc: 'Professional installation of under-sink and counter-top water filtration systems with full warranty.',
    href: '/services',
    color: '#1565c0',
    bg: '#e3f2fd',
  },
  {
    icon: Building2,
    title: 'Commercial Supply',
    desc: 'Bulk water supply for restaurants, offices, gyms, and industrial facilities with flexible billing.',
    href: '/services',
    color: '#006064',
    bg: '#e0f2f1',
  },
  {
    icon: RefreshCw,
    title: 'Subscription Plans',
    desc: 'Set and forget with weekly, bi-weekly, or monthly delivery plans. Pause or cancel anytime.',
    href: '/services',
    color: '#00acc1',
    bg: '#e0f7fa',
  },
  {
    icon: Clock,
    title: 'Same-Day Delivery',
    desc: 'Need water urgently? Order before noon and we\'ll have it at your door the same afternoon.',
    href: '/services',
    color: '#1976d2',
    bg: '#e3f2fd',
  },
  {
    icon: Shield,
    title: 'Quality Certified',
    desc: 'Every batch is tested and certified. Our water meets Health Canada standards and NSF/ANSI certifications.',
    href: '/about',
    color: '#004d40',
    bg: '#e0f2f1',
  },
]

export default function ServicesOverview() {
  return (
    <section className="py-24 bg-[#f0f9ff]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-[#e0f7fa] text-[#0097a7] text-sm font-semibold mb-3">Our Services</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0c2340] mb-4">
            Complete Water <span className="gradient-text">Solutions</span>
          </h2>
          <p className="text-[#4a7fa5] text-lg max-w-xl mx-auto">
            More than just delivery — we&apos;re your full-service water partner.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((svc, i) => {
            const Icon = svc.icon
            return (
              <motion.div
                key={svc.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ delay: i * 0.07, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ y: -3 }}
              >
                <Link href={svc.href} className="group block h-full">
                  <div className="h-full water-card bg-white rounded-2xl p-6 border border-[#cce7f0] hover:border-[#0097a7]/40 transition-colors duration-200">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300"
                      style={{ background: svc.bg }}
                    >
                      <Icon className="w-6 h-6" style={{ color: svc.color }} />
                    </div>
                    <h3 className="font-bold text-[#0c2340] mb-2 group-hover:text-[#0097a7] transition-colors">{svc.title}</h3>
                    <p className="text-[#4a7fa5] text-sm leading-relaxed">{svc.desc}</p>
                  </div>
                </Link>
              </motion.div>
            )
          })}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6 }}
          className="text-center mt-12"
        >
          <Link href="/services">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl border-2 border-[#0097a7] text-[#0097a7] font-semibold hover:bg-[#0097a7] hover:text-white transition-all duration-300"
            >
              View All Services
            </motion.button>
          </Link>
        </motion.div>
      </div>
    </section>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Droplets, Settings, Building2, RefreshCw, Clock, Shield, type LucideIcon } from 'lucide-react'
import { supabase } from '@/lib/supabase'

const iconMap: Record<string, LucideIcon> = {
  Droplets, Settings, Building2, RefreshCw, Clock, Shield,
}

const bgMap: Record<string, string> = {
  '#0097a7': '#e0f7fa',
  '#1565c0': '#e3f2fd',
  '#006064': '#e0f2f1',
  '#00acc1': '#e0f7fa',
  '#1976d2': '#e3f2fd',
  '#004d40': '#e0f2f1',
}

type ServiceRow = {
  id: string
  title: string
  description: string
  icon: string
  color: string
  sort_order: number
}

export default function ServicesOverview() {
  const [services, setServices] = useState<ServiceRow[]>([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    supabase
      .from('services')
      .select('id, title, description, icon, color, sort_order')
      .eq('active', true)
      .order('sort_order')
      .limit(6)
      .then(({ data }) => {
        if (data && data.length > 0) setServices(data)
        setLoading(false)
      })
  }, [])

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

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 border border-[#cce7f0] animate-pulse">
                <div className="w-12 h-12 rounded-xl bg-[#e0f7fa] mb-4" />
                <div className="h-5 bg-[#e0f7fa] rounded w-3/4 mb-3" />
                <div className="space-y-1.5">
                  <div className="h-3 bg-[#f0f9ff] rounded w-full" />
                  <div className="h-3 bg-[#f0f9ff] rounded w-5/6" />
                  <div className="h-3 bg-[#f0f9ff] rounded w-4/6" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((svc, i) => {
              const Icon = iconMap[svc.icon] ?? Droplets
              const color = svc.color || '#0097a7'
              const bg = bgMap[color] ?? '#e0f7fa'
              return (
                <motion.div
                  key={svc.id}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-60px' }}
                  transition={{ delay: i * 0.07, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  whileHover={{ y: -3 }}
                >
                  <Link href="/services" className="group block h-full">
                    <div className="h-full water-card bg-white rounded-2xl p-6 border border-[#cce7f0] hover:border-[#0097a7]/40 transition-colors duration-200">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300"
                        style={{ background: bg }}
                      >
                        <Icon className="w-6 h-6" style={{ color }} />
                      </div>
                      <h3 className="font-bold text-[#0c2340] mb-2 group-hover:text-[#0097a7] transition-colors">{svc.title}</h3>
                      <p className="text-[#4a7fa5] text-sm leading-relaxed">{svc.description}</p>
                    </div>
                  </Link>
                </motion.div>
              )
            })}
          </div>
        )}

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

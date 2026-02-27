'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useInView } from 'framer-motion'
import { Users, MapPin, Award, Droplets, Star, Shield } from 'lucide-react'

function Counter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0)
  const ref = useRef(null)
  const inView = useInView(ref, { once: true })

  useEffect(() => {
    if (!inView) return
    const duration = 2000
    const step = target / (duration / 16)
    let current = 0
    const timer = setInterval(() => {
      current += step
      if (current >= target) {
        setCount(target)
        clearInterval(timer)
      } else {
        setCount(Math.floor(current))
      }
    }, 16)
    return () => clearInterval(timer)
  }, [inView, target])

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>
}

const stats = [
  { icon: Users, value: 5000, suffix: '+', label: 'Happy Customers', color: '#0097a7' },
  { icon: MapPin, value: 10, suffix: '', label: 'Delivery Zones', color: '#1565c0' },
  { icon: Droplets, value: 50000, suffix: '+', label: 'Jugs Delivered', color: '#00acc1' },
  { icon: Award, value: 15, suffix: '+', label: 'Years in Business', color: '#006064' },
  { icon: Star, value: 4.9, suffix: '★', label: 'Average Rating', color: '#0097a7' },
  { icon: Shield, value: 100, suffix: '%', label: 'Quality Certified', color: '#1565c0' },
]

export default function TrustSignals() {
  return (
    <section className="py-20 bg-gradient-to-br from-[#006064] to-[#1565c0] relative overflow-hidden">
      {/* Background bubbles */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full border border-white/10 animate-float-bubble"
            style={{
              width: `${Math.random() * 80 + 30}px`,
              height: `${Math.random() * 80 + 30}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${i * 0.7}s`,
              animationDuration: `${4 + i}s`,
            }}
          />
        ))}
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-14"
        >
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-3">Trusted Across Metro Vancouver</h2>
          <p className="text-[#b3e5fc] text-lg">Numbers that speak for our commitment to quality</p>
        </motion.div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6">
          {stats.map((stat, i) => {
            const Icon = stat.icon
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ delay: i * 0.07, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ y: -4 }}
                className="glass-dark rounded-2xl p-5 text-center"
              >
                <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center mx-auto mb-3">
                  <Icon className="w-5 h-5 text-[#00bcd4]" />
                </div>
                <p className="text-3xl font-extrabold text-white">
                  <Counter target={stat.value} suffix={stat.suffix} />
                </p>
                <p className="text-xs text-[#b3e5fc] mt-1">{stat.label}</p>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

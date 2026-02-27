'use client'

import { motion } from 'framer-motion'
import { ClipboardList, Truck, CheckCircle2, ArrowRight } from 'lucide-react'

const steps = [
  {
    icon: ClipboardList,
    step: '01',
    title: 'Place Your Order',
    desc: 'Choose your water products online or call us. Select your delivery frequency and preferred delivery window.',
    color: '#0097a7',
  },
  {
    icon: Truck,
    step: '02',
    title: 'We Prepare & Deliver',
    desc: 'Our team fills and quality-checks every jug. Your order is dispatched and arrives within your selected window.',
    color: '#1565c0',
  },
  {
    icon: CheckCircle2,
    step: '03',
    title: 'Enjoy Pure Water',
    desc: 'Fresh water at your doorstep. Track your delivery in real-time and enjoy hassle-free reordering.',
    color: '#006064',
  },
]

export default function HowItWorks() {
  return (
    <section className="py-24 section-gradient">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-[#e0f7fa] text-[#0097a7] text-sm font-semibold mb-3">How It Works</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0c2340] mb-4">
            Pure Water in <span className="gradient-text">3 Simple Steps</span>
          </h2>
          <p className="text-[#4a7fa5] text-lg max-w-xl mx-auto">
            From order to doorstep — we&apos;ve made it effortless to stay hydrated.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-10 relative">
          {/* Connecting line */}
          <div className="hidden md:block absolute top-16 left-[calc(16.66%+2rem)] right-[calc(16.66%+2rem)] h-0.5 bg-gradient-to-r from-[#0097a7] via-[#1565c0] to-[#006064] opacity-30" />

          {steps.map((step, i) => {
            const Icon = step.icon
            return (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ delay: i * 0.12, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ y: -4 }}
                className="relative water-card bg-white rounded-3xl p-8 text-center shadow-sm border border-[#cce7f0] cursor-default"
              >
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="px-3 py-1 rounded-full text-xs font-bold text-white" style={{ background: step.color }}>
                    STEP {step.step}
                  </span>
                </div>
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 mt-4"
                  style={{ background: `linear-gradient(135deg, ${step.color}22, ${step.color}44)` }}
                >
                  <Icon className="w-8 h-8" style={{ color: step.color }} />
                </div>
                <h3 className="text-xl font-bold text-[#0c2340] mb-3">{step.title}</h3>
                <p className="text-[#4a7fa5] text-sm leading-relaxed">{step.desc}</p>
              </motion.div>
            )
          })}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
          className="text-center mt-12"
        >
          <a href="/shop" className="inline-flex items-center gap-2 text-[#0097a7] font-semibold hover:gap-3 transition-all duration-200">
            Start your first order <ArrowRight className="w-4 h-4" />
          </a>
        </motion.div>
      </div>
    </section>
  )
}

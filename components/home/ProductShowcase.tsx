'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { ShoppingCart, Droplets, Zap, Building2, ArrowRight } from 'lucide-react'

const products = [
  {
    id: '1',
    name: '20L Water Jug',
    description: 'Premium spring water, purified and pH-balanced. Perfect for home dispensers and office coolers.',
    price: 8.99,
    icon: Droplets,
    badge: 'Best Seller',
    badgeColor: '#0097a7',
    gradient: 'from-[#e0f7fa] to-[#b3e5fc]',
    iconColor: '#0097a7',
    features: ['Purified & pH balanced', 'BPA-free container', 'Same-day delivery'],
  },
  {
    id: '2',
    name: 'Filtration System',
    description: 'Professional under-sink water filtration installation. Unlimited clean water straight from your tap.',
    price: 299.99,
    icon: Zap,
    badge: 'Popular',
    badgeColor: '#1565c0',
    gradient: 'from-[#e3f2fd] to-[#bbdefb]',
    iconColor: '#1565c0',
    features: ['Professional install', '6-stage filtration', '2-year warranty'],
  },
  {
    id: '3',
    name: 'Commercial Supply',
    description: 'Bulk water supply solutions for businesses, offices, restaurants, and industrial use.',
    price: null,
    icon: Building2,
    badge: 'Enterprise',
    badgeColor: '#006064',
    gradient: 'from-[#e0f2f1] to-[#b2dfdb]',
    iconColor: '#006064',
    features: ['Custom volumes', 'Dedicated account manager', 'Net-30 billing'],
  },
]

export default function ProductShowcase() {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-[#e0f7fa] text-[#0097a7] text-sm font-semibold mb-3">Our Products</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0c2340] mb-4">
            Everything You Need to <span className="gradient-text">Stay Hydrated</span>
          </h2>
          <p className="text-[#4a7fa5] text-lg max-w-xl mx-auto">
            From individual households to large enterprises — we have the right water solution for you.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {products.map((product, i) => {
            const Icon = product.icon
            return (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ delay: i * 0.1, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ y: -5 }}
                className="group relative bg-white rounded-3xl border border-[#cce7f0] shadow-sm hover:shadow-xl hover:shadow-[#0097a7]/10 transition-all duration-300 overflow-hidden"
              >
                {/* Card top gradient zone */}
                <div className={`h-40 bg-gradient-to-br ${product.gradient} flex items-center justify-center relative overflow-hidden`}>
                  <motion.div
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    className="w-20 h-20 rounded-2xl bg-white/60 backdrop-blur-sm flex items-center justify-center shadow-lg"
                  >
                    <Icon className="w-10 h-10" style={{ color: product.iconColor }} />
                  </motion.div>
                  {/* Ripple effect on hover */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full border-2 animate-ripple" style={{ borderColor: product.iconColor + '40' }} />
                  </div>
                  <span
                    className="absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-bold text-white"
                    style={{ background: product.badgeColor }}
                  >
                    {product.badge}
                  </span>
                </div>

                <div className="p-6">
                  <h3 className="text-xl font-bold text-[#0c2340] mb-2">{product.name}</h3>
                  <p className="text-[#4a7fa5] text-sm leading-relaxed mb-4">{product.description}</p>

                  <ul className="space-y-2 mb-5">
                    {product.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm text-[#0c2340]">
                        <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] text-white flex-shrink-0" style={{ background: product.iconColor }}>✓</span>
                        {f}
                      </li>
                    ))}
                  </ul>

                  <div className="flex items-center justify-between">
                    <div>
                      {product.price ? (
                        <>
                          <p className="text-2xl font-extrabold" style={{ color: product.iconColor }}>${product.price}</p>
                          <p className="text-xs text-[#4a7fa5]">per unit</p>
                        </>
                      ) : (
                        <>
                          <p className="text-lg font-bold text-[#006064]">Custom Pricing</p>
                          <p className="text-xs text-[#4a7fa5]">contact us</p>
                        </>
                      )}
                    </div>
                    <Link href={product.price ? '/shop' : '/contact'}>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.97 }}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold"
                        style={{ background: `linear-gradient(135deg, ${product.iconColor}, ${product.badgeColor})` }}
                      >
                        <ShoppingCart className="w-4 h-4" />
                        {product.price ? 'Add to Cart' : 'Get Quote'}
                      </motion.button>
                    </Link>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
          className="text-center mt-10"
        >
          <Link href="/shop">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-[#0097a7] to-[#1565c0] text-white font-semibold shadow-lg shadow-[#0097a7]/25 hover:shadow-xl transition-all duration-300"
            >
              View All Products <ArrowRight className="w-4 h-4" />
            </motion.button>
          </Link>
        </motion.div>
      </div>
    </section>
  )
}

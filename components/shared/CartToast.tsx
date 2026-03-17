'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { ShoppingCart, Check } from 'lucide-react'
import Link from 'next/link'
import { useRef } from 'react'
import type { Product } from '@/types'

export default function CartToast({ product, visible }: { product: Product | null; visible: boolean }) {
  // Keep a ref to the last non-null product so the exit animation still has data to render
  const lastProduct = useRef<Product | null>(null)
  if (product) lastProduct.current = product
  const display = lastProduct.current

  return (
    <AnimatePresence>
      {visible && display && (
        <motion.div
          key="cart-toast"
          initial={{ opacity: 0, y: -40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 420, damping: 32 }}
          className="fixed top-20 right-4 z-[9999] w-72 rounded-2xl bg-white shadow-2xl border border-[#cce7f0] overflow-hidden"
        >
          {/* Accent bar */}
          <div className="h-1 w-full bg-gradient-to-r from-[#0097a7] to-[#1565c0]" />

          <div className="flex items-center gap-3 px-4 py-3">
            {/* Product thumbnail */}
            <div className="w-12 h-12 rounded-xl bg-[#e0f7fa] flex items-center justify-center shrink-0 overflow-hidden">
              {display.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={display.image_url} alt={display.name} className="w-full h-full object-contain p-1" />
              ) : (
                <span className="text-2xl">💧</span>
              )}
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-[#0097a7] mb-0.5 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Added to cart!
              </p>
              <p className="text-sm font-bold text-[#0c2340] truncate">{display.name}</p>
              <p className="text-xs text-[#4a7fa5]">${display.price.toFixed(2)}</p>
            </div>
          </div>

          <div className="px-4 pb-3 flex gap-2">
            <Link href="/checkout" className="flex-1">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-2 rounded-xl bg-gradient-to-r from-[#0097a7] to-[#1565c0] text-white text-xs font-semibold"
              >
                View Cart & Checkout →
              </motion.button>
            </Link>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

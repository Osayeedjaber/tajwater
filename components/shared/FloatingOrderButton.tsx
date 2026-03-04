'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Droplets, ShoppingCart } from 'lucide-react'
import { useCart } from '@/store/cartStore'

export default function FloatingOrderButton() {
  const pathname = usePathname()
  const [visible, setVisible] = useState(false)
  const count = useCart((s) => s.count())
  const cartHydrated = useCart((s) => s._hasHydrated)

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  if (pathname.startsWith('/admin') || pathname.startsWith('/auth')) return null

  const hasItems = cartHydrated && count > 0
  const href = hasItems ? '/checkout' : '/shop'

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          className="fixed bottom-8 right-6 z-50"
        >
          <Link href={href}>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className="relative flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-[#0097a7] to-[#1565c0] text-white font-semibold shadow-2xl shadow-[#0097a7]/40 animate-pulse-glow"
            >
              {hasItems ? (
                <>
                  <ShoppingCart className="w-5 h-5" />
                  <span className="text-sm">View Cart</span>
                  <span className="absolute -top-2 -right-2 w-5 h-5 bg-white text-[#0097a7] text-[10px] font-bold rounded-full flex items-center justify-center shadow">
                    {count}
                  </span>
                </>
              ) : (
                <>
                  <Droplets className="w-5 h-5" />
                  <span className="text-sm">Quick Order</span>
                </>
              )}
            </motion.button>
          </Link>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

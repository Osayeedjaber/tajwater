'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Droplets } from 'lucide-react'

export default function FloatingOrderButton() {
  const pathname = usePathname()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  if (pathname.startsWith('/admin') || pathname.startsWith('/auth')) return null

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          className="fixed bottom-8 right-6 z-50"
        >
          <Link href="/shop">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-[#0097a7] to-[#1565c0] text-white font-semibold shadow-2xl shadow-[#0097a7]/40 animate-pulse-glow"
            >
              <Droplets className="w-5 h-5" />
              <span className="text-sm">Quick Order</span>
            </motion.button>
          </Link>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Mail, ArrowRight, CheckCircle2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function Newsletter() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (email) setSubmitted(true)
  }

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0097a7] to-[#1565c0] p-10 sm:p-14 text-center"
        >
          {/* Decorative circles */}
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/5" />
          <div className="absolute -bottom-10 -left-10 w-56 h-56 rounded-full bg-white/5" />
          <div className="absolute top-1/2 left-1/4 w-24 h-24 rounded-full bg-white/5 animate-float-bubble" />

          <div className="relative">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/20 mb-5">
              <Mail className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-3">
              Stay Fresh — Get Our Newsletter
            </h2>
            <p className="text-[#b3e5fc] text-lg mb-8 max-w-lg mx-auto">
              Special offers, new zones, seasonal deals, and hydration tips straight to your inbox.
            </p>

            {submitted ? (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="inline-flex items-center gap-3 px-6 py-3.5 rounded-2xl bg-white/20 text-white font-semibold"
              >
                <CheckCircle2 className="w-5 h-5" />
                You&apos;re subscribed! Welcome to the TajWater family.
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="flex-1 h-12 rounded-xl bg-white/20 border-white/30 text-white placeholder:text-white/60 focus:bg-white/25 focus:border-white"
                />
                <Button type="submit" className="h-12 px-6 rounded-xl bg-white text-[#0097a7] font-bold hover:bg-[#e0f7fa] transition-all gap-2">
                  Subscribe <ArrowRight className="w-4 h-4" />
                </Button>
              </form>
            )}
            <p className="text-white/50 text-xs mt-3">No spam. Unsubscribe at any time.</p>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

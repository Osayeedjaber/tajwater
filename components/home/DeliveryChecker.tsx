'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MapPin, Search, CheckCircle2, XCircle, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import { DELIVERY_ZONES } from '@/lib/constants'

const capitalize = (s: string) => s.split(' ').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ')

type Result = { found: boolean; zone: string } | null

export default function DeliveryChecker() {
  const [query, setQuery] = useState('')
  const [result, setResult] = useState<Result>(null)
  const [checking, setChecking] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const suggestions = query.trim().length > 0
    ? DELIVERY_ZONES.filter((z) => z.toLowerCase().includes(query.toLowerCase().trim()))
    : []

  const check = async (override?: string) => {
    const q = (override ?? query).trim()
    if (!q) return
    setShowSuggestions(false)
    setChecking(true)
    setResult(null)
    await new Promise((r) => setTimeout(r, 500))
    const lower = q.toLowerCase()
    const match = DELIVERY_ZONES.find((z) => z.toLowerCase().includes(lower) || lower.includes(z.toLowerCase().split(' ')[0]))
    setResult(match ? { found: true, zone: match } : { found: false, zone: '' })
    setChecking(false)
  }

  const selectSuggestion = (zone: string) => {
    setQuery(zone)
    setShowSuggestions(false)
    check(zone)
  }

  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#0097a7] to-[#1565c0] mb-6 shadow-lg shadow-[#0097a7]/30">
              <MapPin className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0c2340] mb-3">
              Do We Deliver to <span className="gradient-text">Your Area?</span>
            </h2>
            <p className="text-[#4a7fa5] mb-8">
              Enter your neighbourhood or city to check if we deliver to you.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="flex gap-3 mb-6"
          >
            <div className="relative flex-1">
              <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#0097a7] z-10 pointer-events-none" />
              <Input
                ref={inputRef}
                value={query}
                onChange={(e) => { setQuery(e.target.value); setShowSuggestions(true); setResult(null) }}
                onKeyDown={(e) => { if (e.key === 'Enter') check(); if (e.key === 'Escape') setShowSuggestions(false) }}
                onFocus={() => query.trim() && setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                placeholder="e.g. Vancouver, Surrey, Burnaby..."
                className="pl-10 h-12 rounded-xl border-[#cce7f0] focus:border-[#0097a7] focus:ring-[#0097a7]/20"
              />
              {/* Suggestions dropdown */}
              <AnimatePresence>
                {showSuggestions && suggestions.length > 0 && (
                  <motion.ul
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.15 }}
                    className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-[#cce7f0] rounded-xl shadow-xl overflow-hidden text-left"
                  >
                    {suggestions.map((zone) => (
                      <li key={zone}>
                        <button
                          type="button"
                          onMouseDown={() => selectSuggestion(zone)}
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#0c2340] hover:bg-[#e0f7fa] transition-colors"
                        >
                          <MapPin className="w-3.5 h-3.5 text-[#0097a7] shrink-0" />
                          {zone}
                        </button>
                      </li>
                    ))}
                  </motion.ul>
                )}
              </AnimatePresence>
            </div>
            <Button
              onClick={() => check()}
              disabled={checking}
              className="h-12 px-6 rounded-xl bg-gradient-to-r from-[#0097a7] to-[#1565c0] hover:from-[#006064] hover:to-[#0d47a1] text-white font-semibold"
            >
              {checking ? (
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                  <Search className="w-5 h-5" />
                </motion.div>
              ) : (
                <><Search className="w-4 h-4 mr-2" /> Check</>
              )}
            </Button>
          </motion.div>

          <AnimatePresence>
            {result && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className={`rounded-2xl p-5 mb-6 border ${
                  result.found
                    ? 'bg-[#e0f7fa] border-[#0097a7]/30'
                    : 'bg-[#fff3f0] border-red-200'
                }`}
              >
                {result.found ? (
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-6 h-6 text-[#0097a7] shrink-0" />
                    <div className="text-left">
                      <p className="font-semibold text-[#006064]">Great news! We deliver to {result.zone} ✓</p>
                      <p className="text-sm text-[#0097a7]">Same-day and scheduled delivery available in your area.</p>
                    </div>
                    <Link href="/shop" className="ml-auto shrink-0">
                      <Button size="sm" className="bg-[#0097a7] hover:bg-[#006064] text-white rounded-lg gap-1">
                        Order <ArrowRight className="w-3 h-3" />
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <XCircle className="w-6 h-6 text-red-500 shrink-0" />
                    <div className="text-left">
                      <p className="font-semibold text-red-700">We don&apos;t deliver there yet</p>
                      <p className="text-sm text-red-500">Submit a request and we&apos;ll expand to your area soon.</p>
                    </div>
                    <Link href="/areas" className="ml-auto shrink-0">
                      <Button size="sm" variant="outline" className="border-red-300 text-red-600 rounded-lg gap-1">
                        Request <ArrowRight className="w-3 h-3" />
                      </Button>
                    </Link>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Zone chips */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
          >
            <p className="text-xs uppercase tracking-widest text-[#4a7fa5] mb-3">Current delivery zones</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {['North Vancouver', 'West Vancouver', 'Vancouver', 'Richmond', 'Burnaby',
                'Coquitlam', 'Port Moody', 'Surrey', 'Delta', 'Langley'].map((zone) => (
                <button
                  key={zone}
                  onClick={() => { setQuery(zone); check(zone) }}
                  className="px-3 py-1.5 rounded-full bg-[#e0f7fa] text-[#0097a7] text-xs font-medium hover:bg-[#0097a7] hover:text-white transition-all duration-200"
                >
                  {zone}
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

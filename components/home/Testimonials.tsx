'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Star, Quote, ChevronLeft, ChevronRight } from 'lucide-react'

const testimonials = [
  {
    name: 'Sarah Mitchell',
    location: 'North Vancouver',
    rating: 5,
    text: "TajWater has been delivering to us for 3 years. Never missed a delivery, always on time, and the water quality is excellent. Best service in Metro Vancouver!",
    avatar: 'SM',
    color: '#0097a7',
  },
  {
    name: 'Ahmed Hassan',
    location: 'Surrey',
    rating: 5,
    text: "We switched our office of 40 people to TajWater's commercial supply. The account manager is amazing and billing is so easy. Highly recommend for any business.",
    avatar: 'AH',
    color: '#1565c0',
  },
  {
    name: 'Jennifer Park',
    location: 'Richmond',
    rating: 5,
    text: "The filtration installation was done in under 2 hours. Clean, professional, and the water tastes incredible. Worth every penny!",
    avatar: 'JP',
    color: '#006064',
  },
  {
    name: 'Michael Torres',
    location: 'Burnaby',
    rating: 5,
    text: "I love the subscription plan. I set it up once and it just works. The app makes it easy to pause or adjust when we travel.",
    avatar: 'MT',
    color: '#00acc1',
  },
  {
    name: 'Lisa Chen',
    location: 'Vancouver',
    rating: 5,
    text: "As a new mom, having reliable clean water delivered is so important. TajWater's team is always friendly and the water is always fresh.",
    avatar: 'LC',
    color: '#0097a7',
  },
]

export default function Testimonials() {
  const [current, setCurrent] = useState(0)
  const [auto, setAuto] = useState(true)

  useEffect(() => {
    if (!auto) return
    const t = setInterval(() => setCurrent((c) => (c + 1) % testimonials.length), 4500)
    return () => clearInterval(t)
  }, [auto])

  const prev = () => { setAuto(false); setCurrent((c) => (c - 1 + testimonials.length) % testimonials.length) }
  const next = () => { setAuto(false); setCurrent((c) => (c + 1) % testimonials.length) }

  const t = testimonials[current]

  return (
    <section className="py-24 bg-gradient-to-br from-[#e0f7fa] to-[#e3f2fd]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-white text-[#0097a7] text-sm font-semibold mb-3 shadow-sm">Customer Stories</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0c2340] mb-4">
            What Our Customers <span className="gradient-text">Love</span>
          </h2>
        </motion.div>

        <div className="max-w-3xl mx-auto">
          <div className="relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={current}
                initial={{ opacity: 0, y: 20, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.97 }}
                transition={{ duration: 0.4 }}
                className="bg-white rounded-3xl p-8 sm:p-10 shadow-xl shadow-[#0097a7]/10 border border-white relative"
              >
                <Quote className="absolute top-6 right-8 w-12 h-12 text-[#0097a7]/10" />

                <div className="flex gap-1 mb-5">
                  {[...Array(t.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-amber-400 fill-amber-400" />
                  ))}
                </div>

                <p className="text-[#0c2340] text-lg leading-relaxed mb-8 italic">&ldquo;{t.text}&rdquo;</p>

                <div className="flex items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-sm shadow-md"
                    style={{ background: `linear-gradient(135deg, ${t.color}, ${t.color}99)` }}
                  >
                    {t.avatar}
                  </div>
                  <div>
                    <p className="font-bold text-[#0c2340]">{t.name}</p>
                    <div className="flex items-center gap-1 text-xs text-[#4a7fa5]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#0097a7]" />
                      {t.location}
                    </div>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Controls */}
            <div className="flex items-center justify-between mt-6">
              <div className="flex gap-2">
                {testimonials.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => { setAuto(false); setCurrent(i) }}
                    className={`h-2 rounded-full transition-all duration-300 ${i === current ? 'w-6 bg-[#0097a7]' : 'w-2 bg-[#cce7f0]'}`}
                  />
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={prev}
                  className="w-10 h-10 rounded-xl border border-[#cce7f0] bg-white hover:bg-[#e0f7fa] hover:border-[#0097a7] flex items-center justify-center transition-all"
                >
                  <ChevronLeft className="w-4 h-4 text-[#0097a7]" />
                </button>
                <button
                  onClick={next}
                  className="w-10 h-10 rounded-xl bg-[#0097a7] hover:bg-[#006064] flex items-center justify-center transition-all"
                >
                  <ChevronRight className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

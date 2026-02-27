'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MapPin, Search, CheckCircle2, XCircle, ArrowRight, Clock, DollarSign, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

const zones = [
  { name: 'North Vancouver', fee: 'Free', schedule: 'Mon, Wed, Fri', color: '#0097a7', districts: ['Lynn Valley', 'Capilano', 'Deep Cove', 'Seymour'] },
  { name: 'West Vancouver', fee: '$2.00', schedule: 'Tue, Thu, Sat', color: '#1565c0', districts: ['Dundarave', 'Ambleside', 'Horseshoe Bay', 'Caulfeild'] },
  { name: 'Vancouver', fee: 'Free', schedule: 'Daily', color: '#006064', districts: ['Downtown', 'Kitsilano', 'East Van', 'Marpole', 'Kerrisdale'] },
  { name: 'Richmond', fee: 'Free', schedule: 'Mon–Sat', color: '#00acc1', districts: ['Steveston', 'City Centre', 'Brighouse', 'Shellmont'] },
  { name: 'Burnaby', fee: 'Free', schedule: 'Mon–Sat', color: '#0097a7', districts: ['Metrotown', 'Brentwood', 'Heights', 'South Slope'] },
  { name: 'Coquitlam', fee: '$1.50', schedule: 'Tue, Thu, Sat', color: '#1565c0', districts: ['Port Coquitlam', 'Maillardville', 'Burke Mountain'] },
  { name: 'Port Moody', fee: '$1.50', schedule: 'Tue, Thu', color: '#006064', districts: ['Inlet Centre', 'Heritage Woods', 'Glenayre'] },
  { name: 'Surrey', fee: 'Free', schedule: 'Mon–Sat', color: '#00acc1', districts: ['City Centre', 'Newton', 'Fleetwood', 'Cloverdale', 'White Rock'] },
  { name: 'Delta', fee: '$2.00', schedule: 'Mon, Wed, Fri', color: '#0097a7', districts: ['Ladner', 'Tsawwassen', 'North Delta'] },
  { name: 'Langley', fee: '$2.50', schedule: 'Tue, Thu, Sat', color: '#1565c0', districts: ['Langley City', 'Township', 'Willoughby', 'Brookswood'] },
]

export default function AreasPage() {
  const [search, setSearch] = useState('')
  const [result, setResult] = useState<typeof zones[0] | null | 'notfound'>(null)
  const [checking, setChecking] = useState(false)
  const [requestForm, setRequestForm] = useState({ name: '', email: '', area: '', message: '' })
  const [sent, setSent] = useState(false)

  const checkArea = async () => {
    if (!search.trim()) return
    setChecking(true)
    await new Promise((r) => setTimeout(r, 600))
    const q = search.toLowerCase()
    const found = zones.find((z) =>
      z.name.toLowerCase().includes(q) ||
      z.districts.some((d) => d.toLowerCase().includes(q))
    )
    setResult(found ?? 'notfound')
    setChecking(false)
  }

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative py-28 hero-gradient overflow-hidden">
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 80" className="w-full" preserveAspectRatio="none">
            <path d="M0,40 C240,80 480,0 720,40 C960,80 1200,0 1440,40 L1440,80 L0,80 Z" fill="#f0f9ff" />
          </svg>
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
            <span className="inline-block px-4 py-1.5 rounded-full bg-white/20 text-white text-sm font-semibold mb-4">Delivery Coverage</span>
            <h1 className="text-3xl sm:text-5xl font-extrabold text-white mb-5">
              We Deliver Across<br /><span className="gradient-text-light">Metro Vancouver</span>
            </h1>
            <p className="text-[#b3e5fc] text-xl max-w-2xl mx-auto">
              10 zones covered and growing. Check your area and see our delivery schedule.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Search */}
      <section className="py-16 bg-white">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-2xl font-bold text-[#0c2340] mb-6">Check Your Delivery Area</h2>
            <div className="flex gap-3 mb-4">
              <div className="relative flex-1">
                <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#0097a7]" />
                <Input
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setResult(null) }}
                  onKeyDown={(e) => e.key === 'Enter' && checkArea()}
                  placeholder="Enter your city or neighbourhood..."
                  className="pl-10 h-12 rounded-xl border-[#cce7f0] focus:border-[#0097a7]"
                />
              </div>
              <Button onClick={checkArea} disabled={checking} className="h-12 px-6 rounded-xl bg-gradient-to-r from-[#0097a7] to-[#1565c0] text-white font-semibold">
                {checking ? '...' : <><Search className="w-4 h-4 mr-2" />Check</>}
              </Button>
            </div>

            <AnimatePresence>
              {result && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={`rounded-2xl p-5 border text-left ${result !== 'notfound' ? 'bg-[#e0f7fa] border-[#0097a7]/30' : 'bg-red-50 border-red-200'}`}
                >
                  {result !== 'notfound' ? (
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-6 h-6 text-[#0097a7] mt-0.5 shrink-0" />
                      <div className="flex-1">
                        <p className="font-bold text-[#006064] mb-2">Yes! We deliver to {result.name}</p>
                        <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
                          <div className="flex items-center gap-1.5 text-[#0097a7]"><Clock className="w-3.5 h-3.5 shrink-0" /><span>{result.schedule}</span></div>
                          <div className="flex items-center gap-1.5 text-[#0097a7]"><DollarSign className="w-3.5 h-3.5 shrink-0" /><span>Delivery: {result.fee}</span></div>
                        </div>
                      </div>
                      <Button size="sm" className="bg-[#0097a7] hover:bg-[#006064] text-white rounded-lg shrink-0">Order <ArrowRight className="w-3 h-3 ml-1" /></Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <XCircle className="w-6 h-6 text-red-500 shrink-0" />
                      <div>
                        <p className="font-bold text-red-700">Not in our coverage yet</p>
                        <p className="text-sm text-red-500">Submit a request below and we&apos;ll expand soon!</p>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </section>

      {/* Map embed */}
      <section className="py-4 bg-[#f0f9ff]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl overflow-hidden border border-[#cce7f0] shadow-lg h-80 sm:h-96 lg:h-[480px]">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d173028.49782386647!2d-122.97750944003897!3d49.21270083478497!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e0!3m2!1sen!2sca!4v1700000000000!5m2!1sen!2sca"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="TajWater Metro Vancouver Delivery Map"
            />
          </div>
        </div>
      </section>

      {/* Zone cards */}
      <section className="py-20 bg-[#f0f9ff]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
            <h2 className="text-3xl font-extrabold text-[#0c2340] mb-3">All Delivery Zones</h2>
            <p className="text-[#4a7fa5]">10 zones across Metro Vancouver with competitive delivery fees</p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
            {zones.map((zone, i) => (
              <motion.div
                key={zone.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
                className="water-card bg-white rounded-2xl p-5 border border-[#cce7f0]"
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: zone.color + '22' }}>
                    <MapPin className="w-4 h-4" style={{ color: zone.color }} />
                  </div>
                  <h3 className="font-bold text-[#0c2340] text-sm">{zone.name}</h3>
                </div>
                <div className="space-y-1.5 text-xs text-[#4a7fa5]">
                  <div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {zone.schedule}</div>
                  <div className="flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5" /> Delivery: {zone.fee}</div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1">
                  {zone.districts.slice(0, 3).map((d) => (
                    <span key={d} className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: zone.color + '18', color: zone.color }}>{d}</span>
                  ))}
                  {zone.districts.length > 3 && <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#f0f9ff] text-[#4a7fa5]">+{zone.districts.length - 3}</span>}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Request new area */}
      <section className="py-20 bg-white">
        <div className="max-w-xl mx-auto px-4 sm:px-6 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-[#0097a7] to-[#1565c0] mb-5">
              <Send className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-2xl font-extrabold text-[#0c2340] mb-3">Request a New Area</h2>
            <p className="text-[#4a7fa5] mb-8">Not in our zone yet? Let us know and we&apos;ll prioritize your area for expansion.</p>
            {sent ? (
              <div className="p-6 rounded-2xl bg-[#e0f7fa] border border-[#0097a7]/30 text-[#006064]">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2" />
                <p className="font-semibold">Request received! We&apos;ll be in touch soon.</p>
              </div>
            ) : (
              <form onSubmit={(e) => { e.preventDefault(); setSent(true) }} className="space-y-4 text-left">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-[#0c2340] mb-1 block">Name</label>
                    <Input placeholder="Your name" className="border-[#cce7f0]" required onChange={(e) => setRequestForm({ ...requestForm, name: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-[#0c2340] mb-1 block">Email</label>
                    <Input type="email" placeholder="your@email.com" className="border-[#cce7f0]" required onChange={(e) => setRequestForm({ ...requestForm, email: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-[#0c2340] mb-1 block">Your Area / City</label>
                  <Input placeholder="e.g. Maple Ridge, White Rock..." className="border-[#cce7f0]" required onChange={(e) => setRequestForm({ ...requestForm, area: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-medium text-[#0c2340] mb-1 block">Additional Notes</label>
                  <Textarea placeholder="Any additional information..." className="border-[#cce7f0]" rows={3} onChange={(e) => setRequestForm({ ...requestForm, message: e.target.value })} />
                </div>
                <Button type="submit" className="w-full h-11 rounded-xl bg-gradient-to-r from-[#0097a7] to-[#1565c0] text-white font-semibold">
                  Submit Request
                </Button>
              </form>
            )}
          </motion.div>
        </div>
      </section>
    </div>
  )
}

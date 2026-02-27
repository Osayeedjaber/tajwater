'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { RefreshCw, Pause, Play, Calendar, Droplets, CheckCircle2, Plus, Minus, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

interface SubData {
  id: string
  quantity: number
  frequency: string
  status: string
  next_delivery: string | null
  product: { name: string; price: number } | null
}

export default function SubscriptionPage() {
  const [sub, setSub] = useState<SubData | null>(null)
  const [loading, setLoading] = useState(true)
  const [qty, setQty] = useState(4)
  const [freq, setFreq] = useState('weekly')
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toggling, setToggling] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { data } = await supabase
        .from('subscriptions')
        .select('id, quantity, frequency, status, next_delivery, product:products(name, price)')
        .eq('user_id', session.user.id)
        .neq('status', 'cancelled')
        .order('id', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (data) {
        setSub(data as unknown as SubData)
        setQty(data.quantity)
        setFreq(data.frequency)
      }
      setLoading(false)
    }
    load()
  }, [])

  const getNextDates = () => {
    if (!sub?.next_delivery) return []
    const dates: string[] = []
    const base = new Date(sub.next_delivery)
    const intervalDays = freq === 'weekly' ? 7 : freq === 'biweekly' ? 14 : 30
    for (let i = 0; i < 4; i++) {
      const d = new Date(base)
      d.setDate(d.getDate() + i * intervalDays)
      dates.push(d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' }))
    }
    return dates
  }

  const productData = sub?.product ?? null
  const pricePerJug = productData?.price ?? 7.49
  const monthlyCost = qty * pricePerJug * (freq === 'weekly' ? 4 : freq === 'biweekly' ? 2 : 1)

  const handleSave = async () => {
    if (!sub) return
    setSaving(true)
    setError('')
    const { error: err } = await supabase
      .from('subscriptions')
      .update({ quantity: qty, frequency: freq })
      .eq('id', sub.id)
    if (err) {
      setError('Failed to save. Please try again.')
    } else {
      setSub({ ...sub, quantity: qty, frequency: freq })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    }
    setSaving(false)
  }

  const handleTogglePause = async () => {
    if (!sub) return
    setToggling(true)
    const newStatus = sub.status === 'active' ? 'paused' : 'active'
    const { error: err } = await supabase
      .from('subscriptions')
      .update({ status: newStatus })
      .eq('id', sub.id)
    if (!err) setSub({ ...sub, status: newStatus })
    setToggling(false)
  }

  const handleCancel = async () => {
    if (!sub) return
    if (!confirm('Are you sure you want to cancel your subscription? This cannot be undone.')) return
    const { error: err } = await supabase
      .from('subscriptions')
      .update({ status: 'cancelled' })
      .eq('id', sub.id)
    if (!err) setSub(null)
  }

  if (loading) {
    return (
      <div className="space-y-6 max-w-2xl">
        <div className="h-8 w-48 bg-[#e0f7fa] rounded-xl animate-pulse" />
        <div className="bg-gradient-to-br from-[#0097a7] to-[#1565c0] rounded-3xl h-36 animate-pulse" />
        <div className="bg-white rounded-3xl border border-[#cce7f0] h-64 animate-pulse" />
      </div>
    )
  }

  if (!sub) {
    return (
      <div className="max-w-2xl">
        <h2 className="text-2xl font-extrabold text-[#0c2340] mb-6">My Subscription</h2>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl border border-[#cce7f0] shadow-sm p-12 text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-[#e0f7fa] flex items-center justify-center mx-auto mb-4">
            <RefreshCw className="w-8 h-8 text-[#0097a7]" />
          </div>
          <h3 className="font-bold text-[#0c2340] text-lg mb-2">No active subscription</h3>
          <p className="text-sm text-[#4a7fa5] mb-6 max-w-xs mx-auto">
            Set up a recurring delivery and save up to 15% on every order. Fresh water, always on time.
          </p>
          <Link href="/shop">
            <Button className="bg-gradient-to-r from-[#0097a7] to-[#1565c0] text-white gap-2">
              <Droplets className="w-4 h-4" /> Browse Subscription Plans
            </Button>
          </Link>
        </motion.div>
      </div>
    )
  }

  const nextDates = getNextDates()

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-extrabold text-[#0c2340]">My Subscription</h2>
        <Badge className={sub.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}>
          {sub.status === 'active' ? 'Active' : 'Paused'}
        </Badge>
      </div>

      {/* Current plan */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-br from-[#0097a7] to-[#1565c0] rounded-3xl p-6 text-white relative overflow-hidden">
        <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-white/10" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-4">
            <RefreshCw className="w-5 h-5" />
            <h3 className="font-bold">Current Plan</h3>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            <div>
              <p className="text-[#b3e5fc] text-xs mb-1">Quantity</p>
              <p className="text-xl sm:text-2xl font-extrabold">{qty}</p>
              <p className="text-[#b3e5fc] text-xs">jugs</p>
            </div>
            <div>
              <p className="text-[#b3e5fc] text-xs mb-1">Frequency</p>
              <p className="font-bold capitalize text-sm sm:text-base">{freq}</p>
            </div>
            <div>
              <p className="text-[#b3e5fc] text-xs mb-1">Monthly Cost</p>
              <p className="text-lg sm:text-xl font-extrabold">${monthlyCost.toFixed(2)}</p>
            </div>
          </div>
          {productData && (
            <p className="text-[#b3e5fc] text-xs mt-3">{productData.name}</p>
          )}
        </div>
      </motion.div>

      {/* Edit */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-3xl border border-[#cce7f0] shadow-sm p-6 space-y-5">
        <h3 className="font-bold text-[#0c2340]">Edit Subscription</h3>

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-3">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        <div>
          <label className="text-sm font-medium text-[#0c2340] mb-3 block">Jugs per Delivery</label>
          <div className="flex items-center gap-4">
            <button onClick={() => setQty(Math.max(1, qty - 1))} className="w-10 h-10 rounded-xl border border-[#cce7f0] flex items-center justify-center hover:border-[#0097a7] transition-colors">
              <Minus className="w-4 h-4 text-[#0097a7]" />
            </button>
            <div className="flex items-center gap-2">
              <Droplets className="w-5 h-5 text-[#0097a7]" />
              <span className="text-2xl font-extrabold text-[#0c2340] w-6 text-center">{qty}</span>
              <span className="text-[#4a7fa5] text-sm">jugs</span>
            </div>
            <button onClick={() => setQty(qty + 1)} className="w-10 h-10 rounded-xl bg-[#0097a7] flex items-center justify-center text-white hover:bg-[#006064] transition-colors">
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-[#0c2340] mb-3 block">Delivery Frequency</label>
          <div className="flex gap-2">
            {['weekly', 'biweekly', 'monthly'].map((f) => (
              <button
                key={f}
                onClick={() => setFreq(f)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  freq === f ? 'bg-[#0097a7] text-white shadow-md' : 'border border-[#cce7f0] text-[#4a7fa5] hover:border-[#0097a7]'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-gradient-to-r from-[#0097a7] to-[#1565c0] text-white gap-2"
        >
          {saved ? (
            <><CheckCircle2 className="w-4 h-4" /> Saved!</>
          ) : saving ? (
            <><motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" /> Saving...</>
          ) : (
            'Save Changes'
          )}
        </Button>
      </motion.div>

      {/* Upcoming deliveries */}
      {nextDates.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white rounded-3xl border border-[#cce7f0] shadow-sm p-6">
          <h3 className="font-bold text-[#0c2340] mb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#0097a7]" /> Upcoming Deliveries
          </h3>
          <div className="space-y-2">
            {nextDates.map((date, i) => (
              <div key={date} className="flex items-center justify-between py-2 border-b border-[#f0f9ff] last:border-0">
                <div className="flex items-center gap-3">
                  <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-[#0097a7] text-white' : 'bg-[#e0f7fa] text-[#0097a7]'}`}>{i + 1}</span>
                  <span className="text-sm text-[#0c2340]">{date}</span>
                </div>
                <span className="text-sm text-[#4a7fa5]">{qty} jugs · ${(qty * pricePerJug).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Pause/Cancel */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="flex gap-3">
        <Button
          onClick={handleTogglePause}
          disabled={toggling}
          variant="outline"
          className="flex-1 border-[#cce7f0] gap-2"
          style={{ color: sub.status === 'paused' ? '#0097a7' : '#f59e0b' }}
        >
          {sub.status === 'paused' ? <><Play className="w-4 h-4" /> Resume</> : <><Pause className="w-4 h-4" /> Pause</>}
        </Button>
        <Button
          onClick={handleCancel}
          variant="outline"
          className="flex-1 border-red-200 text-red-500 hover:bg-red-50"
        >
          Cancel Subscription
        </Button>
      </motion.div>
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { RefreshCw, Pause, Play, XCircle, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase'

type SubRow = {
  id: string
  status: string
  frequency: string
  quantity: number
  next_delivery: string | null
  created_at: string
  price: number | null
  profile: { name: string | null; email: string | null } | null
  product: { name: string; price: number } | null
}

const statusBadge = (s: string) => {
  if (s === 'active')    return 'bg-green-100 text-green-700'
  if (s === 'paused')    return 'bg-amber-100 text-amber-700'
  if (s === 'cancelled') return 'bg-red-100 text-red-700'
  return 'bg-gray-100 text-gray-600'
}

export default function AdminSubscriptionsPage() {
  const [subs, setSubs] = useState<SubRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'active' | 'paused' | 'cancelled'>('active')

  const fetchSubs = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('subscriptions')
      .select('id, status, frequency, quantity, next_delivery, created_at, price, profile:profiles(name, email), product:products(name, price)')
      .order('created_at', { ascending: false })
    if (data) setSubs(data as unknown as SubRow[])
    setLoading(false)
  }

  useEffect(() => { fetchSubs() }, [])

  const updateStatus = async (id: string, newStatus: string) => {
    await supabase.from('subscriptions').update({ status: newStatus }).eq('id', id)
    setSubs((prev) => prev.map((s) => s.id === id ? { ...s, status: newStatus } : s))
  }

  const filtered = subs.filter((s) => {
    const matchStatus = filter === 'all' || s.status === filter
    const customer = `${s.profile?.name ?? ''} ${s.profile?.email ?? ''}`.toLowerCase()
    const matchSearch = !search || customer.includes(search.toLowerCase()) || (s.product?.name ?? '').toLowerCase().includes(search.toLowerCase())
    return matchStatus && matchSearch
  })

  const activeCnt   = subs.filter(s => s.status === 'active').length
  const pausedCnt   = subs.filter(s => s.status === 'paused').length
  const cancelledCnt = subs.filter(s => s.status === 'cancelled').length

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0c2340]">Subscriptions</h1>
          <p className="text-sm text-[#4a7fa5]">{activeCnt} active · {pausedCnt} paused · {cancelledCnt} cancelled</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Active', count: activeCnt, color: 'bg-green-100 text-green-700' },
          { label: 'Paused', count: pausedCnt, color: 'bg-amber-100 text-amber-700' },
          { label: 'Cancelled', count: cancelledCnt, color: 'bg-red-100 text-red-700' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-[#cce7f0] p-4 text-center">
            <p className="text-2xl font-extrabold text-[#0c2340]">{s.count}</p>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.color}`}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#0097a7]" />
          <Input placeholder="Search customer or product..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 border-[#cce7f0]" />
        </div>
        <div className="flex gap-2">
          {(['all', 'active', 'paused', 'cancelled'] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${filter === f ? 'bg-[#0097a7] text-white' : 'border border-[#cce7f0] text-[#4a7fa5] hover:border-[#0097a7]'}`}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl border border-[#cce7f0] shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-[#4a7fa5]">Loading subscriptions...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <RefreshCw className="w-8 h-8 text-[#cce7f0] mx-auto mb-3" />
            <p className="text-[#4a7fa5]">No subscriptions found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#f0f9ff] text-xs text-[#4a7fa5] uppercase tracking-wider">
                  <th className="px-4 py-3 text-left">Customer</th>
                  <th className="px-4 py-3 text-left">Product</th>
                  <th className="px-4 py-3 text-left">Frequency</th>
                  <th className="px-4 py-3 text-left">Qty</th>
                  <th className="px-4 py-3 text-left">Next Delivery</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((sub) => (
                  <tr key={sub.id} className="border-t border-[#f0f9ff] hover:bg-[#f8fbfe]">
                    <td className="px-4 py-3">
                      <p className="font-medium text-[#0c2340]">{sub.profile?.name ?? '—'}</p>
                      <p className="text-xs text-[#4a7fa5]">{sub.profile?.email ?? ''}</p>
                    </td>
                    <td className="px-4 py-3 text-[#4a7fa5]">{sub.product?.name ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className="capitalize text-[#4a7fa5]">{sub.frequency}</span>
                    </td>
                    <td className="px-4 py-3 text-[#0c2340] font-medium">{sub.quantity}</td>
                    <td className="px-4 py-3 text-[#4a7fa5] text-xs">
                      {sub.next_delivery
                        ? new Date(sub.next_delivery).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={statusBadge(sub.status)}>{sub.status}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5">
                        {sub.status === 'active' && (
                          <button onClick={() => updateStatus(sub.id, 'paused')} title="Pause"
                            className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center hover:bg-amber-100 transition-colors">
                            <Pause className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {sub.status === 'paused' && (
                          <button onClick={() => updateStatus(sub.id, 'active')} title="Resume"
                            className="w-7 h-7 rounded-lg bg-green-50 text-green-600 flex items-center justify-center hover:bg-green-100 transition-colors">
                            <Play className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {sub.status !== 'cancelled' && (
                          <button onClick={() => updateStatus(sub.id, 'cancelled')} title="Cancel"
                            className="w-7 h-7 rounded-lg bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100 transition-colors">
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { RefreshCw, TrendingUp, ShoppingBag, MapPin, BarChart2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'

type OrderRow = {
  id: string
  total: number
  payment_status: string | null
  status: string
  created_at: string
  zone_id: string | null
  zones: { name: string } | { name: string }[] | null
}

type OrderItemRow = {
  quantity: number
  products: { name: string } | null
}

const RANGE_OPTIONS = [
  { label: '7d',  days: 7 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
]

const CHART_COLORS = ['#0097a7', '#1565c0', '#00bcd4', '#006064', '#1976d2', '#0d47a1', '#4a7fa5', '#003d40']

function zoneName(zones: OrderRow['zones']): string {
  if (!zones) return 'Unknown'
  return Array.isArray(zones) ? (zones[0]?.name ?? 'Unknown') : (zones.name ?? 'Unknown')
}

function toDateStr(ts: string) {
  return new Date(ts).toISOString().slice(0, 10)
}

function getDayRange(days: number): string[] {
  const result: string[] = []
  const now = new Date()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(now.getDate() - i)
    result.push(d.toISOString().slice(0, 10))
  }
  return result
}

export default function AnalyticsPage() {
  const [range, setRange]         = useState(30)
  const [orders, setOrders]       = useState<OrderRow[]>([])
  const [topItems, setTopItems]   = useState<{ name: string; units: number }[]>([])
  const [loading, setLoading]     = useState(true)

  const fetchData = async () => {
    setLoading(true)
    const since = new Date()
    since.setDate(since.getDate() - 90) // always fetch 90d, slice in JS

    const { data: orderData } = await supabase
      .from('orders')
      .select('id, total, payment_status, status, created_at, zone_id, zones(name)')
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: true })

    const { data: itemData } = await supabase
      .from('order_items')
      .select('quantity, products(name)')

    setOrders((orderData ?? []) as OrderRow[])

    // Aggregate top products
    const productMap: Record<string, number> = {}
    for (const item of (itemData ?? []) as unknown as OrderItemRow[]) {
      const name = item.products?.name ?? 'Unknown'
      productMap[name] = (productMap[name] ?? 0) + (item.quantity ?? 0)
    }
    const sorted = Object.entries(productMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, units]) => ({ name, units }))
    setTopItems(sorted)
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  // ── Filtered orders by selected range ──────────────────────────────────
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - range)
  const rangeOrders = orders.filter(o => new Date(o.created_at) >= cutoff)

  // ── Revenue chart (paid only, daily) ───────────────────────────────────
  const days = getDayRange(range)
  const revenueMap: Record<string, number> = {}
  for (const d of days) revenueMap[d] = 0
  for (const o of rangeOrders) {
    if (o.payment_status === 'paid') {
      const d = toDateStr(o.created_at)
      if (d in revenueMap) revenueMap[d] = (revenueMap[d] ?? 0) + o.total
    }
  }
  const revenueData = days.map(d => ({
    date: range <= 14 ? d.slice(5) : d.slice(5), // MM-DD
    revenue: parseFloat(revenueMap[d].toFixed(2)),
  }))

  // ── Order volume trend (daily, all statuses) ───────────────────────────
  const volumeMap: Record<string, number> = {}
  for (const d of days) volumeMap[d] = 0
  for (const o of rangeOrders) {
    const d = toDateStr(o.created_at)
    if (d in volumeMap) volumeMap[d] = (volumeMap[d] ?? 0) + 1
  }
  const volumeData = days.map(d => ({
    date: d.slice(5),
    orders: volumeMap[d],
  }))

  // ── Zone breakdown (pie) ────────────────────────────────────────────────
  const zoneMap: Record<string, { orders: number; revenue: number }> = {}
  for (const o of rangeOrders) {
    const z = zoneName(o.zones)
    if (!zoneMap[z]) zoneMap[z] = { orders: 0, revenue: 0 }
    zoneMap[z].orders += 1
    zoneMap[z].revenue += o.payment_status === 'paid' ? o.total : 0
  }
  const zoneData = Object.entries(zoneMap)
    .sort((a, b) => b[1].orders - a[1].orders)
    .map(([name, v]) => ({ name, orders: v.orders, revenue: parseFloat(v.revenue.toFixed(2)) }))

  // ── Summary KPIs ───────────────────────────────────────────────────────
  const totalRevenue = rangeOrders.filter(o => o.payment_status === 'paid').reduce((s, o) => s + o.total, 0)
  const totalOrders  = rangeOrders.length
  const avgOrder     = totalOrders > 0 ? totalRevenue / totalOrders : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-[#0c2340]">Analytics</h2>
          <p className="text-sm text-[#4a7fa5]">Live data from Supabase · {totalOrders} orders in range</p>
        </div>
        <Button size="sm" variant="outline" onClick={fetchData} className="border-[#cce7f0] text-[#4a7fa5]">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Range toggle */}
      <div className="flex gap-2">
        {RANGE_OPTIONS.map(r => (
          <button
            key={r.days}
            onClick={() => setRange(r.days)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              range === r.days
                ? 'bg-[#0097a7] text-white'
                : 'bg-white border border-[#cce7f0] text-[#4a7fa5] hover:border-[#0097a7]'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* KPI strip */}
      {!loading && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Revenue',    value: `$${totalRevenue.toFixed(2)}`,  icon: TrendingUp,  color: '#0097a7', bg: '#e0f7fa' },
            { label: 'Orders',     value: String(totalOrders),            icon: ShoppingBag, color: '#1565c0', bg: '#e3f2fd' },
            { label: 'Avg. Order', value: `$${avgOrder.toFixed(2)}`,      icon: BarChart2,   color: '#006064', bg: '#e0f2f1' },
          ].map((s, i) => {
            const Icon = s.icon
            return (
              <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                className="bg-white rounded-2xl p-4 border border-[#cce7f0] shadow-sm flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: s.bg }}>
                  <Icon className="w-5 h-5" style={{ color: s.color }} />
                </div>
                <div>
                  <p className="text-xl font-extrabold text-[#0c2340]">{s.value}</p>
                  <p className="text-xs text-[#4a7fa5]">{s.label}</p>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-72 bg-white rounded-3xl border border-[#cce7f0] animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* 1 — Revenue trend */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="bg-white rounded-3xl border border-[#cce7f0] shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-[#0097a7]" />
              <h3 className="font-bold text-[#0c2340] text-sm">Revenue (paid orders)</h3>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={revenueData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#0097a7" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#0097a7" stopOpacity={0}    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f9ff" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#4a7fa5' }} tickLine={false} axisLine={false}
                  interval={Math.floor(days.length / 6)} />
                <YAxis tick={{ fontSize: 10, fill: '#4a7fa5' }} tickLine={false} axisLine={false}
                  tickFormatter={v => `$${v}`} width={48} />
                <Tooltip formatter={(v: number | undefined) => v !== undefined ? [`$${v.toFixed(2)}`, 'Revenue'] : ['—', 'Revenue']}
                  contentStyle={{ borderRadius: 12, border: '1px solid #e0f7fa', fontSize: 12 }} />
                <Area type="monotone" dataKey="revenue" stroke="#0097a7" strokeWidth={2}
                  fill="url(#revenueGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>

          {/* 2 — Order volume */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="bg-white rounded-3xl border border-[#cce7f0] shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <BarChart2 className="w-4 h-4 text-[#1565c0]" />
              <h3 className="font-bold text-[#0c2340] text-sm">Order Volume</h3>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={volumeData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f9ff" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#4a7fa5' }} tickLine={false} axisLine={false}
                  interval={Math.floor(days.length / 6)} />
                <YAxis tick={{ fontSize: 10, fill: '#4a7fa5' }} tickLine={false} axisLine={false}
                  allowDecimals={false} width={32} />
                <Tooltip formatter={(v: number | undefined) => [v ?? 0, 'Orders']}
                  contentStyle={{ borderRadius: 12, border: '1px solid #e0f7fa', fontSize: 12 }} />
                <Bar dataKey="orders" fill="#1565c0" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>

          {/* 3 — Best-selling products */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="bg-white rounded-3xl border border-[#cce7f0] shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <ShoppingBag className="w-4 h-4 text-[#0097a7]" />
              <h3 className="font-bold text-[#0c2340] text-sm">Best-Selling Products (all time)</h3>
            </div>
            {topItems.length === 0 ? (
              <div className="h-[220px] flex items-center justify-center text-[#4a7fa5] text-sm">No order item data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={topItems} layout="vertical" margin={{ top: 0, right: 12, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f9ff" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#4a7fa5' }} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#4a7fa5' }} tickLine={false}
                    axisLine={false} width={110} />
                  <Tooltip formatter={(v: number | undefined) => [v ?? 0, 'Units sold']}
                    contentStyle={{ borderRadius: 12, border: '1px solid #e0f7fa', fontSize: 12 }} />
                  <Bar dataKey="units" radius={[0, 4, 4, 0]}>
                    {topItems.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </motion.div>

          {/* 4 — Zone breakdown */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
            className="bg-white rounded-3xl border border-[#cce7f0] shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="w-4 h-4 text-[#006064]" />
              <h3 className="font-bold text-[#0c2340] text-sm">Orders by Zone</h3>
            </div>
            {zoneData.length === 0 ? (
              <div className="h-[220px] flex items-center justify-center text-[#4a7fa5] text-sm">No zone data yet</div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={zoneData} dataKey="orders" nameKey="name" cx="50%" cy="50%"
                      innerRadius={50} outerRadius={80} paddingAngle={3}>
                      {zoneData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number | undefined, name: string | undefined) => [(v ?? 0) + ' orders', name ?? '']}
                      contentStyle={{ borderRadius: 12, border: '1px solid #e0f7fa', fontSize: 12 }} />
                    <Legend iconType="circle" iconSize={8}
                      formatter={(value: string) => <span style={{ fontSize: 11, color: '#4a7fa5' }}>{value}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
            {/* Zone table */}
            {zoneData.length > 0 && (
              <div className="mt-2 space-y-1">
                {zoneData.slice(0, 5).map((z, i) => (
                  <div key={z.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                      <span className="text-[#0c2340] font-medium">{z.name}</span>
                    </div>
                    <div className="flex gap-4 text-[#4a7fa5]">
                      <span>{z.orders} orders</span>
                      <span className="font-semibold text-[#0097a7]">${z.revenue.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

        </div>
      )}
    </div>
  )
}

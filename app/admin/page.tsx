'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  ShoppingBag, Users, DollarSign, Truck,
  AlertTriangle, Clock, CheckCircle2, Package, RefreshCw,
  TrendingUp, TrendingDown, Minus, RefreshCcw, Tag, MessageSquare,
  BarChart2, FileEdit, Plus, UserPlus
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type RecentOrder = {
  id: string
  user_id: string | null
  status: string
  total: number
  created_at: string
  customer_name: string | null
  zones: { name: string } | { name: string }[] | null
  profile: { name: string } | null
}

const STATUS_COLOR: Record<string, string> = {
  pending:          'bg-amber-100 text-amber-700',
  processing:       'bg-blue-100 text-blue-700',
  out_for_delivery: 'bg-[#e0f7fa] text-[#0097a7]',
  delivered:        'bg-green-100 text-green-700',
  cancelled:        'bg-red-100 text-red-600',
}

function shortId(id: string) { return '#TW-' + id.slice(-6).toUpperCase() }
function timeAgo(ts: string) {
  const mins = Math.floor((Date.now() - new Date(ts).getTime()) / 60000)
  if (mins < 60)   return `${mins}m ago`
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`
  return `${Math.floor(mins / 1440)}d ago`
}

function DeltaBadge({ curr, prev }: { curr: number; prev: number }) {
  if (prev === 0) return null
  const pct = ((curr - prev) / prev) * 100
  const abs = Math.abs(pct)
  if (abs < 0.5) return <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-gray-400"><Minus className="w-2.5 h-2.5" />0%</span>
  const up = pct > 0
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold ${up ? 'text-green-600' : 'text-red-500'}`}>
      {up ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
      {abs.toFixed(0)}% vs last month
    </span>
  )
}

const QUICK_ACTIONS = [
  { icon: Plus,         label: 'New Order',       href: '/shop',                  color: '#0097a7', bg: '#e0f7fa' },
  { icon: UserPlus,     label: 'Add Customer',    href: '/admin/access',          color: '#1565c0', bg: '#e3f2fd' },
  { icon: Package,      label: 'Manage Products', href: '/admin/products',        color: '#006064', bg: '#e0f2f1' },
  { icon: Truck,        label: 'Deliveries',      href: '/admin/deliveries',      color: '#f59e0b', bg: '#fef3c7' },
  { icon: MessageSquare, label: 'Tickets',        href: '/admin/tickets',         color: '#7c3aed', bg: '#ede9fe' },
  { icon: Tag,          label: 'Discounts',       href: '/admin/discounts',       color: '#0891b2', bg: '#cffafe' },
  { icon: BarChart2,    label: 'Analytics',       href: '/admin/analytics',       color: '#059669', bg: '#d1fae5' },
  { icon: FileEdit,     label: 'Content',         href: '/admin/content',         color: '#d97706', bg: '#fef3c7' },
]

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    ordersToday: 0, revenueToday: 0, customers: 0, activeOrders: 0,
    revenueMTD: 0, revenuePrevMTD: 0, activeSubs: 0, openTickets: 0,
  })
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([])
  const [lowStock, setLowStock] = useState<Array<{ name: string; stock: number }>>([])
  const [unassigned, setUnassigned] = useState(0)

  const fetchData = async () => {
    setLoading(true)

    const now           = new Date()
    const todayStart    = new Date(now); todayStart.setHours(0, 0, 0, 0)
    const mtdStart      = new Date(now.getFullYear(), now.getMonth(), 1)
    const prevMtdStart  = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const prevMtdEnd    = new Date(now.getFullYear(), now.getMonth(), 1)

    const [
      todayRes, activeRes, custRes, recentRes, stockRes,
      mtdRes, prevMtdRes, subsRes, ticketsRes,
    ] = await Promise.all([
      supabase.from('orders').select('id, total').gte('created_at', todayStart.toISOString()).eq('payment_status', 'paid'),
      supabase.from('orders').select('id, driver_name').in('status', ['pending', 'processing', 'out_for_delivery']),
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('orders').select('id, user_id, status, total, created_at, customer_name, zones(name)').order('created_at', { ascending: false }).limit(6),
      supabase.from('products').select('name, stock').eq('active', true).lt('stock', 20).gt('stock', 0).order('stock'),
      supabase.from('orders').select('total').gte('created_at', mtdStart.toISOString()).eq('payment_status', 'paid'),
      supabase.from('orders').select('total').gte('created_at', prevMtdStart.toISOString()).lt('created_at', prevMtdEnd.toISOString()).eq('payment_status', 'paid'),
      supabase.from('subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('tickets').select('id', { count: 'exact', head: true }).eq('status', 'open'),
    ])

    const todayOrders  = todayRes.data  ?? []
    const activeOrders = activeRes.data ?? []
    const mtdOrders    = mtdRes.data    ?? []
    const prevOrders   = prevMtdRes.data ?? []

    setStats({
      ordersToday:    todayOrders.length,
      revenueToday:   todayOrders.reduce((s, o) => s + (o.total ?? 0), 0),
      customers:      custRes.count ?? 0,
      activeOrders:   activeOrders.length,
      revenueMTD:     mtdOrders.reduce((s, o) => s + (o.total ?? 0), 0),
      revenuePrevMTD: prevOrders.reduce((s, o) => s + (o.total ?? 0), 0),
      activeSubs:     subsRes.count ?? 0,
      openTickets:    ticketsRes.count ?? 0,
    })
    setUnassigned(activeOrders.filter(o => !o.driver_name).length)
    setLowStock(stockRes.data ?? [])

    const recent = (recentRes.data ?? []) as Omit<RecentOrder, 'profile'>[]
    const uids   = [...new Set(recent.map(o => o.user_id).filter(Boolean))] as string[]
    const profMap: Record<string, { name: string }> = {}
    if (uids.length > 0) {
      const { data: profs } = await supabase.from('profiles').select('id, name').in('id', uids)
      profs?.forEach((p: { id: string; name: string }) => { profMap[p.id] = p })
    }
    setRecentOrders(recent.map(o => ({ ...o, profile: o.user_id ? (profMap[o.user_id] ?? null) : null })))
    setLoading(false)
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchData() }, [])

  const today = new Date().toLocaleDateString('en-CA', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  })

  const kpis = [
    {
      icon: ShoppingBag, label: 'Orders Today',
      value: loading ? '—' : String(stats.ordersToday),
      sub: null, color: '#0097a7', bg: '#e0f7fa',
    },
    {
      icon: DollarSign, label: 'Revenue Today',
      value: loading ? '—' : `$${stats.revenueToday.toFixed(2)}`,
      sub: null, color: '#1565c0', bg: '#e3f2fd',
    },
    {
      icon: TrendingUp, label: 'Revenue MTD',
      value: loading ? '—' : `$${stats.revenueMTD.toFixed(2)}`,
      sub: !loading ? <DeltaBadge curr={stats.revenueMTD} prev={stats.revenuePrevMTD} /> : null,
      color: '#006064', bg: '#e0f2f1',
    },
    {
      icon: Users, label: 'Customers',
      value: loading ? '—' : String(stats.customers),
      sub: null, color: '#7c3aed', bg: '#ede9fe',
    },
    {
      icon: Truck, label: 'Active Orders',
      value: loading ? '—' : String(stats.activeOrders),
      sub: null, color: '#f59e0b', bg: '#fef3c7',
    },
    {
      icon: RefreshCcw, label: 'Active Subs',
      value: loading ? '—' : String(stats.activeSubs),
      sub: null, color: '#059669', bg: '#d1fae5',
    },
    {
      icon: MessageSquare, label: 'Open Tickets',
      value: loading ? '—' : String(stats.openTickets),
      sub: null, color: stats.openTickets > 0 ? '#dc2626' : '#4a7fa5', bg: stats.openTickets > 0 ? '#fef2f2' : '#f0f9ff',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0c2340]">Admin Dashboard</h1>
          <p className="text-sm text-[#4a7fa5]">{today}</p>
        </div>
        <Button size="sm" variant="outline" onClick={fetchData} className="border-[#cce7f0] text-[#4a7fa5] gap-2">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {kpis.map((kpi, i) => {
          const Icon = kpi.icon
          return (
            <motion.div
              key={kpi.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className="bg-white rounded-2xl p-4 border border-[#cce7f0] shadow-sm"
            >
              <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-2" style={{ background: kpi.bg }}>
                <Icon className="w-4 h-4" style={{ color: kpi.color }} />
              </div>
              <p className={`text-xl font-extrabold text-[#0c2340] ${loading ? 'opacity-40' : ''}`}>{kpi.value}</p>
              <p className="text-[11px] text-[#4a7fa5] mt-0.5 leading-tight">{kpi.label}</p>
              {kpi.sub && <div className="mt-1">{kpi.sub}</div>}
            </motion.div>
          )
        })}
      </div>

      {/* Quick Actions */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="bg-white rounded-3xl border border-[#cce7f0] shadow-sm p-5">
        <h3 className="font-bold text-[#0c2340] text-sm mb-4">Quick Actions</h3>
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon
            return (
              <Link key={action.href} href={action.href}
                className="flex flex-col items-center gap-2 group">
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110"
                  style={{ background: action.bg }}>
                  <Icon className="w-5 h-5" style={{ color: action.color }} />
                </div>
                <span className="text-[10px] text-[#4a7fa5] text-center font-medium leading-tight group-hover:text-[#0097a7]">{action.label}</span>
              </Link>
            )
          })}
        </div>
      </motion.div>

      {/* Alerts */}
      <div className="space-y-2">
        {!loading && lowStock.slice(0, 3).map((p, i) => (
          <motion.div
            key={p.name}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + i * 0.06 }}
            className="flex items-center gap-3 px-4 py-3 rounded-xl border bg-amber-50 border-amber-200"
          >
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
            <p className="text-sm font-medium text-amber-600 flex-1">
              {p.name} — low stock ({p.stock} left)
            </p>
            <Link href="/admin/products" className="text-xs text-amber-600 underline underline-offset-2">
              Manage
            </Link>
          </motion.div>
        ))}

        {!loading && unassigned > 0 && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.45 }}
            className="flex items-center gap-3 px-4 py-3 rounded-xl border bg-blue-50 border-blue-200"
          >
            <Clock className="w-4 h-4 shrink-0 text-blue-600" />
            <p className="text-sm font-medium text-blue-600 flex-1">
              {unassigned} active order{unassigned > 1 ? 's' : ''} with no driver assigned
            </p>
            <Link href="/admin/orders" className="text-xs text-blue-600 underline underline-offset-2">
              Assign
            </Link>
          </motion.div>
        )}

        {!loading && unassigned === 0 && lowStock.length === 0 && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="flex items-center gap-3 px-4 py-3 rounded-xl border bg-green-50 border-green-200"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0 text-green-600" />
            <p className="text-sm font-medium text-green-600">All systems normal — no alerts right now</p>
          </motion.div>
        )}
      </div>

      {/* Recent Orders */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-white rounded-3xl border border-[#cce7f0] shadow-sm overflow-hidden"
      >
        <div className="flex items-center justify-between p-5 border-b border-[#cce7f0]">
          <h3 className="font-bold text-[#0c2340]">Recent Orders</h3>
          <Link href="/admin/orders" className="text-xs text-[#0097a7] hover:underline font-medium">
            View all →
          </Link>
        </div>

        {loading ? (
          <div className="p-5 space-y-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-10 bg-[#f0f9ff] rounded-xl animate-pulse" />
            ))}
          </div>
        ) : recentOrders.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="w-8 h-8 text-[#cce7f0] mx-auto mb-2" />
            <p className="text-sm text-[#4a7fa5]">No orders yet — they&apos;ll appear here once customers start ordering</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#f0f9ff] border-b border-[#cce7f0]">
                <tr>
                  {[
                    { label: 'Order',    cls: '' },
                    { label: 'Customer', cls: '' },
                    { label: 'Zone',     cls: 'hidden sm:table-cell' },
                    { label: 'Status',   cls: '' },
                    { label: 'Total',    cls: '' },
                    { label: 'Time',     cls: 'hidden sm:table-cell' },
                  ].map(h => (
                    <th key={h.label} className={`px-4 py-3 text-left text-xs font-semibold text-[#4a7fa5] uppercase tracking-wider ${h.cls}`}>{h.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f9ff]">
                {recentOrders.map(order => (
                  <tr key={order.id} className="hover:bg-[#f0f9ff] transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-bold text-[#0097a7]">{shortId(order.id)}</td>
                    <td className="px-4 py-3 font-medium text-[#0c2340] max-w-[120px] truncate">{order.profile?.name ?? order.customer_name ?? 'Guest'}</td>
                    <td className="hidden sm:table-cell px-4 py-3 text-[#4a7fa5] text-xs">{(Array.isArray(order.zones) ? order.zones[0]?.name : order.zones?.name) ?? '—'}</td>
                    <td className="px-4 py-3">
                      <Badge className={`text-[10px] ${STATUS_COLOR[order.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {order.status.replace(/_/g, ' ')}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 font-bold text-[#0c2340] whitespace-nowrap">${order.total.toFixed(2)}</td>
                    <td className="hidden sm:table-cell px-4 py-3 text-xs text-[#4a7fa5]">{timeAgo(order.created_at)}</td>
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

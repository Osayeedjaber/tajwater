'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Download, Mail, Phone, MapPin, ShoppingBag,
  RefreshCw, Users, DollarSign, CheckCircle2, Eye, Calendar,
  MessageSquare, RefreshCcw, User, ArrowDownUp
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { exportCSV } from '@/lib/csv'

type CustomerRow = {
  id: string
  name: string | null
  email: string | null
  phone: string | null
  delivery_address: string | null
  zone_id: string | null
  zoneName: string | null
  wallet_balance: number
  created_at: string
  // aggregated
  orderCount: number
  lifetimeValue: number
  lastOrderDate: string | null
  subscriptionStatus: string | null
  ticketCount: number
}

type CustomerOrder = {
  id: string
  status: string
  total: number
  created_at: string
  zones: { name: string } | { name: string }[] | null
}

const STATUS_COLOR: Record<string, string> = {
  pending:          'bg-amber-100 text-amber-700',
  processing:       'bg-blue-100 text-blue-700',
  out_for_delivery: 'bg-[#e0f7fa] text-[#0097a7]',
  delivered:        'bg-green-100 text-green-700',
  cancelled:        'bg-red-100 text-red-600',
}

function shortOrderId(id: string) { return '#TW-' + id.slice(-6).toUpperCase() }
function fmtDate(ts: string) {
  return new Date(ts).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })
}
function initials(name: string | null) {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
}

export default function CustomersPage() {
  const [customers,  setCustomers]  = useState<CustomerRow[]>([])
  const [loading,    setLoading]    = useState(true)
  const [search,     setSearch]     = useState('')
  const [sortByLTV,  setSortByLTV]  = useState(false)
  const [selected,   setSelected]   = useState<CustomerRow | null>(null)
  const [orders,     setOrders]     = useState<CustomerOrder[]>([])
  const [loadingOrders, setLoadingOrders] = useState(false)
  const [toast,      setToast]      = useState('')

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const fetchCustomers = async () => {
    setLoading(true)

    // Fetch all profiles
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, name, email, phone, delivery_address, zone_id, wallet_balance, created_at, zones:zone_id(name)')
      .order('created_at', { ascending: false })

    if (error) { setLoading(false); return }

    // Fetch all paid orders to aggregate per customer
    const { data: allOrders } = await supabase
      .from('orders')
      .select('user_id, total, created_at')
      .eq('payment_status', 'paid')
      .order('created_at', { ascending: false })

    // Build aggregation map
    const agg: Record<string, { count: number; total: number; lastDate: string | null }> = {}
    for (const o of (allOrders ?? [])) {
      if (!o.user_id) continue
      if (!agg[o.user_id]) agg[o.user_id] = { count: 0, total: 0, lastDate: null }
      agg[o.user_id].count += 1
      agg[o.user_id].total += o.total ?? 0
      if (!agg[o.user_id].lastDate) agg[o.user_id].lastDate = o.created_at
    }

    // Fetch subscriptions
    const { data: subscriptions } = await supabase
      .from('subscriptions')
      .select('user_id, status')
    const subMap: Record<string, string> = {}
    for (const s of (subscriptions ?? [])) {
      if (s.user_id) subMap[s.user_id] = s.status
    }

    // Fetch support tickets
    const { data: tickets } = await supabase
      .from('tickets')
      .select('user_id')
    const ticketMap: Record<string, number> = {}
    for (const t of (tickets ?? [])) {
      if (t.user_id) ticketMap[t.user_id] = (ticketMap[t.user_id] ?? 0) + 1
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setCustomers((profiles ?? []).map((p: any) => ({
      ...p,
      zoneName:           (Array.isArray(p.zones) ? p.zones[0]?.name : p.zones?.name) ?? null,
      orderCount:         agg[p.id]?.count ?? 0,
      lifetimeValue:      agg[p.id]?.total ?? 0,
      lastOrderDate:      agg[p.id]?.lastDate ?? null,
      subscriptionStatus: subMap[p.id] ?? null,
      ticketCount:        ticketMap[p.id] ?? 0,
    })))
    setLoading(false)
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchCustomers() }, [])

  const openCustomer = async (customer: CustomerRow) => {
    setSelected(customer)
    setLoadingOrders(true)
    const { data } = await supabase
      .from('orders')
      .select('id, status, total, created_at, zones(name)')
      .eq('user_id', customer.id)
      .order('created_at', { ascending: false })
      .limit(20)
    setOrders((data ?? []) as CustomerOrder[])
    setLoadingOrders(false)
  }

  const filtered = customers
    .filter(c => {
      const q = search.toLowerCase()
      return (
        (c.name ?? '').toLowerCase().includes(q) ||
        (c.email ?? '').toLowerCase().includes(q) ||
        (c.phone ?? '').toLowerCase().includes(q) ||
        (c.zoneName ?? '').toLowerCase().includes(q)
      )
    })
    .sort((a, b) => sortByLTV ? b.lifetimeValue - a.lifetimeValue : 0)

  // Stats
  const totalRevenue   = customers.reduce((s, c) => s + c.lifetimeValue, 0)
  const activeCustomers = customers.filter(c => c.orderCount > 0).length

  return (
    <div className="space-y-5 relative">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 right-6 z-50 flex items-center gap-2 bg-[#0097a7] text-white px-4 py-3 rounded-2xl shadow-xl text-sm font-medium">
            <CheckCircle2 className="w-4 h-4" /> {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-[#0c2340]">Customers</h2>
          <p className="text-sm text-[#4a7fa5]">{customers.length} registered · live from Supabase</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={fetchCustomers} className="border-[#cce7f0] text-[#4a7fa5]">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            size="sm" variant="outline"
            onClick={() => setSortByLTV(v => !v)}
            className={`border-[#cce7f0] gap-1.5 ${sortByLTV ? 'bg-[#e0f7fa] text-[#0097a7] border-[#0097a7]' : 'text-[#4a7fa5]'}`}
          >
            <ArrowDownUp className="w-3.5 h-3.5" /> Sort by LTV
          </Button>
          <Button
            size="sm" variant="outline" className="border-[#cce7f0] text-[#4a7fa5] gap-2"
            onClick={() => exportCSV('customers.csv', filtered.map(c => ({
              name: c.name ?? '',
              email: c.email ?? '',
              phone: c.phone ?? '',
              zone: c.zoneName ?? '',
              orders: c.orderCount,
              lifetime_value: c.lifetimeValue.toFixed(2),
              last_order: c.lastOrderDate ? fmtDate(c.lastOrderDate) : '',
              subscription: c.subscriptionStatus ?? 'none',
              tickets: c.ticketCount,
              joined: fmtDate(c.created_at),
            })))}
          >
            <Download className="w-4 h-4" /> Export
          </Button>
        </div>
      </div>

      {/* KPI Strip */}
      {!loading && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { icon: Users,      label: 'Total Customers',  value: customers.length,           color: '#0097a7', bg: '#e0f7fa', fmt: (v: number) => String(v) },
            { icon: ShoppingBag, label: 'With Orders',     value: activeCustomers,            color: '#1565c0', bg: '#e3f2fd', fmt: (v: number) => String(v) },
            { icon: DollarSign, label: 'Total Revenue',    value: totalRevenue,               color: '#006064', bg: '#e0f2f1', fmt: (v: number) => `$${v.toFixed(2)}` },
          ].map((s, i) => {
            const Icon = s.icon
            return (
              <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                className="bg-white rounded-2xl p-4 border border-[#cce7f0] shadow-sm flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: s.bg }}>
                  <Icon className="w-5 h-5" style={{ color: s.color }} />
                </div>
                <div>
                  <p className="text-xl font-extrabold text-[#0c2340]">{s.fmt(s.value)}</p>
                  <p className="text-xs text-[#4a7fa5]">{s.label}</p>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#0097a7]" />
        <Input
          placeholder="Search by name, email, phone, zone..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-10 border-[#cce7f0] bg-white"
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-white rounded-2xl border border-[#cce7f0] animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-3xl border border-[#cce7f0] p-16 text-center">
          <Users className="w-10 h-10 text-[#cce7f0] mx-auto mb-3" />
          <p className="text-[#4a7fa5] font-medium">No customers yet</p>
          <p className="text-xs text-[#4a7fa5] mt-1">Customers will appear here once they register on the site</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((customer, i) => (
            <motion.div
              key={customer.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="bg-white rounded-2xl border border-[#cce7f0] shadow-sm p-5"
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                {/* Avatar */}
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0097a7] to-[#1565c0] flex items-center justify-center text-white font-bold shrink-0">
                  {initials(customer.name)}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-bold text-[#0c2340] truncate">{customer.name ?? 'No name'}</h3>
                    {customer.orderCount > 0
                      ? <Badge className="bg-green-100 text-green-700 text-[10px] shrink-0">Active</Badge>
                      : <Badge className="bg-[#f0f9ff] text-[#4a7fa5] text-[10px] shrink-0">No orders</Badge>
                    }
                    {customer.subscriptionStatus && (
                      <Badge className={`text-[10px] shrink-0 ${
                        customer.subscriptionStatus === 'active' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        <RefreshCcw className="w-2.5 h-2.5 mr-1 inline" />
                        Sub: {customer.subscriptionStatus}
                      </Badge>
                    )}
                    {customer.ticketCount > 0 && (
                      <Badge className="bg-amber-100 text-amber-700 text-[10px] shrink-0">
                        <MessageSquare className="w-2.5 h-2.5 mr-1 inline" />
                        {customer.ticketCount} ticket{customer.ticketCount > 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#4a7fa5]">
                    {customer.email  && <span className="flex items-center gap-1"><Mail    className="w-3 h-3" />{customer.email}</span>}
                    {customer.phone  && <span className="flex items-center gap-1"><Phone   className="w-3 h-3" />{customer.phone}</span>}
                    {customer.zoneName && <span className="flex items-center gap-1"><MapPin  className="w-3 h-3" />{customer.zoneName}</span>}
                    <span className="flex items-center gap-1"><ShoppingBag className="w-3 h-3" />{customer.orderCount} order{customer.orderCount !== 1 ? 's' : ''}</span>
                    {customer.lastOrderDate && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />Last order {fmtDate(customer.lastOrderDate)}</span>}
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />Joined {fmtDate(customer.created_at)}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <p className="font-extrabold text-[#0097a7]">${customer.lifetimeValue.toFixed(2)}</p>
                    <p className="text-xs text-[#4a7fa5]">lifetime value</p>
                  </div>
                  {customer.email && (
                    <a href={`mailto:${customer.email}`} title="Send email">
                      <Button size="sm" variant="outline" className="border-[#cce7f0] text-[#4a7fa5] gap-1">
                        <Mail className="w-3 h-3" /> Contact
                      </Button>
                    </a>
                  )}
                  <Button size="sm" variant="outline" onClick={() => openCustomer(customer)} className="border-[#cce7f0] text-[#4a7fa5] gap-1">
                    <Eye className="w-3 h-3" /> Quick View
                  </Button>
                  <Link href={`/admin/customers/${customer.id}`}>
                    <Button size="sm" className="bg-gradient-to-r from-[#0097a7] to-[#1565c0] text-white gap-1">
                      <User className="w-3 h-3" /> Profile
                    </Button>
                  </Link>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Customer Detail Modal */}
      <Dialog open={!!selected} onOpenChange={() => { setSelected(null); setOrders([]) }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="text-[#0c2340]">
                  {selected.name ?? 'Customer'} — {selected.orderCount} orders
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 mt-2">
                {/* Contact info */}
                <div className="bg-[#f0f9ff] rounded-2xl p-4 space-y-1.5">
                  {selected.email   && <p className="text-sm text-[#4a7fa5] flex items-center gap-2"><Mail    className="w-4 h-4 text-[#0097a7]" />{selected.email}</p>}
                  {selected.phone   && <p className="text-sm text-[#4a7fa5] flex items-center gap-2"><Phone   className="w-4 h-4 text-[#0097a7]" />{selected.phone}</p>}
                  {selected.zoneName && <p className="text-sm text-[#4a7fa5] flex items-center gap-2"><MapPin  className="w-4 h-4 text-[#0097a7]" />{selected.zoneName}</p>}
                  {selected.delivery_address && (
                    <p className="text-sm text-[#4a7fa5] flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-[#0097a7] mt-0.5 shrink-0" />
                      {selected.delivery_address}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-4 pt-1">
                    <div>
                      <p className="text-xs text-[#4a7fa5]">Lifetime Value</p>
                      <p className="font-extrabold text-[#0097a7]">${selected.lifetimeValue.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#4a7fa5]">Wallet Balance</p>
                      <p className="font-extrabold text-[#0c2340]">${(selected.wallet_balance ?? 0).toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#4a7fa5]">Member Since</p>
                      <p className="font-semibold text-[#0c2340] text-sm">{fmtDate(selected.created_at)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#4a7fa5]">Subscription</p>
                      <p className="font-semibold text-[#0c2340] text-sm capitalize">{selected.subscriptionStatus ?? 'None'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#4a7fa5]">Support Tickets</p>
                      <p className="font-semibold text-[#0c2340] text-sm">{selected.ticketCount}</p>
                    </div>
                  </div>
                  {selected.email && (
                    <a href={`mailto:${selected.email}`} className="mt-2 inline-flex items-center gap-2 text-xs text-[#0097a7] font-medium hover:underline">
                      <Mail className="w-3.5 h-3.5" /> Contact customer
                    </a>
                  )}
                </div>

                {/* Order history */}
                <div>
                  <p className="text-xs font-semibold text-[#4a7fa5] uppercase tracking-wider mb-2">Order History</p>
                  {loadingOrders ? (
                    <div className="space-y-2">
                      {[...Array(3)].map((_, i) => <div key={i} className="h-10 bg-[#f0f9ff] rounded-xl animate-pulse" />)}
                    </div>
                  ) : orders.length === 0 ? (
                    <p className="text-sm text-[#4a7fa5] p-3">No orders yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {orders.map(order => (
                        <div key={order.id} className="flex items-center justify-between bg-[#f0f9ff] rounded-xl px-4 py-2.5">
                          <div>
                            <p className="font-mono text-xs font-bold text-[#0097a7]">{shortOrderId(order.id)}</p>
                            <p className="text-xs text-[#4a7fa5]">{fmtDate(order.created_at)} · {(Array.isArray(order.zones) ? order.zones[0]?.name : order.zones?.name) ?? '—'}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={`text-[10px] ${STATUS_COLOR[order.status] ?? 'bg-gray-100 text-gray-600'}`}>
                              {order.status.replace(/_/g, ' ')}
                            </Badge>
                            <p className="font-bold text-[#0c2340] text-sm">${order.total.toFixed(2)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

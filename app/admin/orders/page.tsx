'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Download, Eye, Truck, CheckCircle2, Clock, Package,
  XCircle, RefreshCw, User, MapPin, ShoppingBag, FileText, UserCheck
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { supabase } from '@/lib/supabase'
import { exportCSV } from '@/lib/csv'
import Image from 'next/image'

type OrderItem = {
  id: string
  quantity: number
  price: number
  products: { name: string; image_url?: string | null } | null
}

type OrderRow = {
  id: string
  user_id: string | null
  status: string
  payment_status: string | null
  total: number
  delivery_address: string | null
  zone_id: string | null
  driver_name: string | null
  customer_name: string | null
  customer_phone: string | null
  notes: string | null
  created_at: string
  zones: { name: string } | { name: string }[] | null
  order_items: OrderItem[]
  profile: { name: string; phone: string } | null
}

const STATUS_OPTIONS = ['all', 'pending', 'processing', 'out_for_delivery', 'delivered', 'cancelled']

const STATUS_STYLE: Record<string, { color: string; icon: React.ElementType; next: string | null; nextLabel: string }> = {
  pending:          { color: 'bg-amber-100 text-amber-700',       icon: Clock,         next: 'processing',       nextLabel: 'Processing' },
  processing:       { color: 'bg-blue-100 text-blue-700',         icon: Package,       next: 'out_for_delivery', nextLabel: 'Out for Delivery' },
  out_for_delivery: { color: 'bg-[#e0f7fa] text-[#0097a7]',      icon: Truck,         next: 'delivered',        nextLabel: 'Delivered' },
  delivered:        { color: 'bg-green-100 text-green-700',       icon: CheckCircle2,  next: null,               nextLabel: '' },
  cancelled:        { color: 'bg-red-100 text-red-600',           icon: XCircle,       next: null,               nextLabel: '' },
}

function shortId(id: string) { return '#TW-' + id.slice(-6).toUpperCase() }
function fmtDate(ts: string)  { return new Date(ts).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' }) }
function itemsSummary(items: OrderItem[]) {
  return items.map(i => `${i.quantity}× ${i.products?.name ?? 'Item'}`).join(', ') || '—'
}

export default function AdminOrdersPage() {
  const [orders,   setOrders]   = useState<OrderRow[]>([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [filter,   setFilter]   = useState('all')
  const [selected, setSelected] = useState<OrderRow | null>(null)
  const [updating, setUpdating] = useState<string | null>(null)
  const [toast,    setToast]    = useState('')
  const [driverDialog, setDriverDialog] = useState<{ orderId: string; current: string } | null>(null)
  const [driverInput, setDriverInput] = useState('')

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const fetchOrders = async () => {
    setLoading(true)

    // 1. Fetch orders with zone + order_items + products joined
    const { data: rows, error } = await supabase
      .from('orders')
      .select(`
        id, user_id, status, payment_status, total, delivery_address, zone_id,
        driver_name, customer_name, customer_phone, notes, created_at,
        zones ( name ),
        order_items ( id, quantity, price, products ( name, image_url ) )
      `)
      .order('created_at', { ascending: false })
      .limit(300)

    if (error) { setLoading(false); return }

    const orderRows = (rows ?? []) as unknown as Omit<OrderRow, 'profile'>[]

    // 2. Fetch profiles for all unique user_ids
    const userIds = [...new Set(orderRows.map(o => o.user_id).filter(Boolean))] as string[]
    const profileMap: Record<string, { name: string; phone: string }> = {}

    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, phone')
        .in('id', userIds)
      profiles?.forEach((p: { id: string; name: string; phone: string }) => { profileMap[p.id] = p })
    }

    setOrders(orderRows.map(o => ({ ...o, profile: o.user_id ? (profileMap[o.user_id] ?? null) : null })))
    setLoading(false)
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchOrders() }, [])

  const advanceStatus = async (order: OrderRow) => {
    const next = STATUS_STYLE[order.status]?.next
    if (!next) return
    setUpdating(order.id)
    const { error } = await supabase.from('orders').update({ status: next }).eq('id', order.id)
    if (!error) {
      setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: next } : o))
      setSelected(prev => prev?.id === order.id ? { ...prev, status: next } : prev)
      showToast(`Order → ${next.replace(/_/g, ' ')}`)
      if (next === 'out_for_delivery' || next === 'delivered') {
        fetch('/api/admin/send-status-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: order.id, newStatus: next }),
        }).catch(() => {})
      }
    }
    setUpdating(null)
  }

  const cancelOrder = async (order: OrderRow) => {
    if (!confirm('Cancel this order? If already paid, a full Stripe refund will be issued.')) return
    setUpdating(order.id)

    // If paid, trigger Stripe refund via API (also updates order status)
    if (order.payment_status === 'paid') {
      try {
        const res = await fetch('/api/admin/refund', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order_id: order.id }),
        })
        const data = await res.json()
        if (!res.ok) {
          showToast(data.error ?? 'Refund failed')
          setUpdating(null)
          return
        }
        setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'cancelled', payment_status: 'refunded' } : o))
        setSelected(prev => prev?.id === order.id ? { ...prev, status: 'cancelled', payment_status: 'refunded' } : prev)
        showToast('Order cancelled & refunded.')
      } catch {
        showToast('Failed to process refund.')
      }
    } else {
      // Not paid — just cancel
      const { error } = await supabase.from('orders').update({ status: 'cancelled' }).eq('id', order.id)
      if (!error) {
        setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'cancelled' } : o))
        setSelected(prev => prev?.id === order.id ? { ...prev, status: 'cancelled' } : prev)
        showToast('Order cancelled.')
      }
    }
    setUpdating(null)
  }

  const assignDriver = async (orderId: string, driver: string) => {
    await supabase.from('orders').update({ driver_name: driver || null }).eq('id', orderId)
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, driver_name: driver || null } : o))
    setDriverDialog(null)
    showToast(driver ? `Driver assigned: ${driver}` : 'Driver removed')
  }

  const openDriverDialog = (orderId: string, current: string | null) => {
    setDriverInput(current ?? '')
    setDriverDialog({ orderId, current: current ?? '' })
  }

  const filtered = orders
    .filter(o => filter === 'all' || o.status === filter)
    .filter(o => {
      const q = search.toLowerCase()
      return (
        shortId(o.id).toLowerCase().includes(q) ||
        o.id.toLowerCase().includes(q) ||
        (o.profile?.name ?? '').toLowerCase().includes(q) ||
        ((Array.isArray(o.zones) ? o.zones[0]?.name : o.zones?.name) ?? '').toLowerCase().includes(q) ||
        (o.delivery_address ?? '').toLowerCase().includes(q)
      )
    })

  const counts = STATUS_OPTIONS.reduce((acc, s) => {
    acc[s] = s === 'all' ? orders.length : orders.filter(o => o.status === s).length
    return acc
  }, {} as Record<string, number>)

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
          <h2 className="text-2xl font-extrabold text-[#0c2340]">Order Management</h2>
          <p className="text-sm text-[#4a7fa5]">{orders.length} total orders · live from Supabase</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={fetchOrders} className="border-[#cce7f0] text-[#4a7fa5]">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            size="sm" variant="outline" className="border-[#cce7f0] text-[#4a7fa5] gap-2"
            onClick={() => exportCSV('orders.csv', filtered.map(o => ({
              id: shortId(o.id),
              customer: o.profile?.name ?? o.customer_name ?? 'Guest',
              zone: (Array.isArray(o.zones) ? o.zones[0]?.name : o.zones?.name) ?? '—',
              status: o.status,
              payment_status: o.payment_status ?? '—',
              total: o.total.toFixed(2),
              driver: o.driver_name ?? '—',
              date: fmtDate(o.created_at),
            })))}
          >
            <Download className="w-4 h-4" /> Export
          </Button>
        </div>
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#0097a7]" />
          <Input
            placeholder="Search by customer, order ID, or zone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10 border-[#cce7f0] bg-white"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {STATUS_OPTIONS.map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                filter === s ? 'bg-[#0097a7] text-white' : 'bg-white border border-[#cce7f0] text-[#4a7fa5] hover:border-[#0097a7]'
              }`}
            >
              {s === 'all' ? 'All' : s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
              {counts[s] > 0 && (
                <span className={`ml-1.5 text-[10px] ${filter === s ? 'opacity-70' : 'text-[#0097a7]'}`}>
                  {counts[s]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-14 bg-white rounded-2xl border border-[#cce7f0] animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-3xl border border-[#cce7f0] p-16 text-center">
          <Package className="w-10 h-10 text-[#cce7f0] mx-auto mb-3" />
          <p className="text-[#4a7fa5] font-medium">No orders found</p>
          <p className="text-xs text-[#4a7fa5] mt-1">Orders placed through the shop will appear here in real time</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-[#cce7f0] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#f0f9ff] border-b border-[#cce7f0]">
                <tr>
                  {[
                    { label: 'Order ID',  cls: '' },
                    { label: 'Customer',  cls: '' },
                    { label: 'Zone',      cls: 'hidden md:table-cell' },
                    { label: 'Items',     cls: 'hidden lg:table-cell' },
                    { label: 'Delivery',  cls: '' },
                    { label: 'Payment',   cls: 'hidden sm:table-cell' },
                    { label: 'Total',     cls: '' },
                    { label: 'Driver',    cls: 'hidden lg:table-cell' },
                    { label: 'Date',      cls: 'hidden md:table-cell' },
                    { label: 'Actions',   cls: '' },
                  ].map(h => (
                    <th key={h.label} className={`px-4 py-3 text-left text-xs font-semibold text-[#4a7fa5] uppercase tracking-wider whitespace-nowrap ${h.cls}`}>{h.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f9ff]">
                {filtered.map((order, i) => {
                  const s = STATUS_STYLE[order.status] ?? STATUS_STYLE.pending
                  const StatusIcon = s.icon
                  const busy = updating === order.id
                  return (
                    <motion.tr
                      key={order.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className="hover:bg-[#f0f9ff] transition-colors"
                    >
                      <td className="px-4 py-3 font-mono text-xs font-bold text-[#0097a7]">{shortId(order.id)}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-[#0c2340] max-w-[100px] truncate">{order.profile?.name ?? order.customer_name ?? 'Guest'}</p>
                        <p className="text-xs text-[#4a7fa5]">{order.profile?.phone ?? order.customer_phone ?? '—'}</p>
                      </td>
                      <td className="hidden md:table-cell px-4 py-3 text-[#4a7fa5] whitespace-nowrap text-xs">{(Array.isArray(order.zones) ? order.zones[0]?.name : order.zones?.name) ?? '—'}</td>
                      <td className="hidden lg:table-cell px-4 py-3 text-[#4a7fa5] text-xs max-w-[130px] truncate">{itemsSummary(order.order_items)}</td>
                      <td className="px-4 py-3">
                        <Badge className={`text-[10px] flex items-center gap-1 w-fit ${s.color}`}>
                          <StatusIcon className="w-2.5 h-2.5" />
                          {order.status.replace(/_/g, ' ')}
                        </Badge>
                      </td>
                      <td className="hidden sm:table-cell px-4 py-3">
                        {order.payment_status && (
                          <Badge className={`text-[10px] w-fit ${
                            order.payment_status === 'paid'     ? 'bg-green-100 text-green-700' :
                            order.payment_status === 'failed'   ? 'bg-red-100 text-red-600' :
                            order.payment_status === 'refunded' ? 'bg-red-100 text-red-600' :
                            order.payment_status === 'disputed' ? 'bg-orange-100 text-orange-700' :
                            'bg-amber-100 text-amber-700'
                          }`}>
                            {order.payment_status}
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 font-bold text-[#0c2340] whitespace-nowrap">${order.total.toFixed(2)}</td>
                      <td className="hidden lg:table-cell px-4 py-3">
                        <button
                          onClick={() => openDriverDialog(order.id, order.driver_name)}
                          className="text-xs text-[#4a7fa5] hover:text-[#0097a7] flex items-center gap-1 transition-colors"
                        >
                          <UserCheck className="w-3 h-3" />
                          {order.driver_name ?? 'Assign…'}
                        </button>
                      </td>
                      <td className="hidden md:table-cell px-4 py-3 text-xs text-[#4a7fa5] whitespace-nowrap">{fmtDate(order.created_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5">
                          {s.next && (
                            <Button
                              size="sm"
                              disabled={busy}
                              onClick={() => advanceStatus(order)}
                              className="h-7 text-[10px] bg-[#0097a7] text-white px-2 gap-1 whitespace-nowrap"
                            >
                              <Truck className="w-3 h-3" /> {s.nextLabel}
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelected(order)}
                            className="h-7 text-[10px] border-[#cce7f0] text-[#4a7fa5] px-2"
                          >
                            <Eye className="w-3 h-3" />
                          </Button>
                          <a
                            href={`/api/invoice/${order.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Download Invoice"
                          >
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-[10px] border-[#cce7f0] text-[#4a7fa5] px-2"
                            >
                              <FileText className="w-3 h-3" />
                            </Button>
                          </a>
                          {order.status !== 'delivered' && order.status !== 'cancelled' && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busy}
                              onClick={() => cancelOrder(order)}
                              className="h-7 text-[10px] border-red-200 text-red-500 px-2 hover:bg-red-50"
                            >
                              <XCircle className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Assign Driver Dialog */}
      <Dialog open={!!driverDialog} onOpenChange={() => setDriverDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-[#0c2340]">Assign Driver</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Driver name"
            value={driverInput}
            onChange={e => setDriverInput(e.target.value)}
            className="border-[#cce7f0]"
            onKeyDown={e => { if (e.key === 'Enter' && driverDialog) assignDriver(driverDialog.orderId, driverInput) }}
            autoFocus
          />
          <DialogFooter className="gap-2 mt-2">
            <Button variant="outline" onClick={() => setDriverDialog(null)} className="border-[#cce7f0]">Cancel</Button>
            <Button
              onClick={() => driverDialog && assignDriver(driverDialog.orderId, driverInput)}
              className="bg-[#0097a7] text-white"
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Order Detail Modal */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3 pr-6">
                  <span className="text-[#0c2340]">Order {shortId(selected.id)}</span>
                  <Badge className={`text-[11px] ${(STATUS_STYLE[selected.status] ?? STATUS_STYLE.pending).color}`}>
                    {selected.status.replace(/_/g, ' ')}
                  </Badge>
                  {selected.payment_status && (
                    <Badge className={`text-[11px] ${
                      selected.payment_status === 'paid'     ? 'bg-green-100 text-green-700' :
                      selected.payment_status === 'failed'   ? 'bg-red-100 text-red-600' :
                      selected.payment_status === 'refunded' ? 'bg-red-100 text-red-600' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {selected.payment_status}
                    </Badge>
                  )}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 mt-2">
                {/* Customer */}
                <div className="bg-[#f0f9ff] rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="w-4 h-4 text-[#0097a7]" />
                    <p className="text-xs font-semibold text-[#4a7fa5] uppercase tracking-wider">Customer</p>
                  </div>
                  <p className="font-bold text-[#0c2340]">{selected.profile?.name ?? selected.customer_name ?? 'Guest Customer'}</p>
                  <p className="text-sm text-[#4a7fa5]">{selected.profile?.phone ?? selected.customer_phone ?? '—'}</p>
                </div>

                {/* Delivery */}
                <div className="bg-[#f0f9ff] rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="w-4 h-4 text-[#0097a7]" />
                    <p className="text-xs font-semibold text-[#4a7fa5] uppercase tracking-wider">Delivery Info</p>
                  </div>
                  <p className="font-medium text-[#0c2340]">{(Array.isArray(selected.zones) ? selected.zones[0]?.name : selected.zones?.name) ?? '—'}</p>
                  <p className="text-sm text-[#4a7fa5]">{selected.delivery_address ?? 'No address on file'}</p>
                  <p className="text-xs text-[#4a7fa5] mt-1">Placed: {fmtDate(selected.created_at)}</p>
                  {selected.driver_name && (
                    <p className="text-xs text-[#0097a7] font-medium mt-1">Driver: {selected.driver_name}</p>
                  )}
                  {selected.notes && (
                    <div className="mt-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                      <p className="text-xs font-semibold text-amber-700 mb-0.5">Delivery Instructions</p>
                      <p className="text-xs text-amber-800 whitespace-pre-wrap">{selected.notes}</p>
                    </div>
                  )}
                </div>

                {/* Items */}
                <div className="bg-[#f0f9ff] rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <ShoppingBag className="w-4 h-4 text-[#0097a7]" />
                    <p className="text-xs font-semibold text-[#4a7fa5] uppercase tracking-wider">Items Ordered</p>
                  </div>
                  {selected.order_items.length === 0 ? (
                    <p className="text-sm text-[#4a7fa5]">No items found</p>
                  ) : (
                    <div className="space-y-2">
                      {selected.order_items.map(item => (
                        <div key={item.id} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-[#e0f7fa] flex items-center justify-center text-sm overflow-hidden shrink-0">
                              {item.products?.image_url ? (
                                <Image src={item.products.image_url} alt={item.products.name} width={28} height={28} className="w-full h-full object-cover" />
                              ) : (
                                <span>💧</span>
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-[#0c2340]">{item.products?.name ?? 'Product'}</p>
                              <p className="text-xs text-[#4a7fa5]">Qty: {item.quantity} × ${item.price.toFixed(2)}</p>
                            </div>
                          </div>
                          <p className="font-bold text-[#0c2340]">${(item.price * item.quantity).toFixed(2)}</p>
                        </div>
                      ))}
                      <div className="border-t border-[#cce7f0] pt-2 flex justify-between mt-2">
                        <p className="font-bold text-[#0c2340]">Order Total</p>
                        <p className="font-extrabold text-[#0097a7] text-lg">${selected.total.toFixed(2)}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  {STATUS_STYLE[selected.status]?.next && (
                    <Button
                      onClick={() => advanceStatus(selected)}
                      disabled={updating === selected.id}
                      className="flex-1 bg-gradient-to-r from-[#0097a7] to-[#1565c0] text-white gap-2"
                    >
                      <Truck className="w-4 h-4" />
                      Mark as {STATUS_STYLE[selected.status].nextLabel}
                    </Button>
                  )}
                  {selected.status !== 'delivered' && selected.status !== 'cancelled' && (
                    <Button
                      variant="outline"
                      onClick={() => cancelOrder(selected)}
                      className="border-red-200 text-red-500 hover:bg-red-50 gap-2"
                    >
                      <XCircle className="w-4 h-4" /> Cancel
                    </Button>
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

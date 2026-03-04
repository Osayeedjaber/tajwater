'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Package, Truck, CheckCircle2, Clock, XCircle,
  Download, MapPin, User, Phone, Mail, Pencil, Save, X,
  AlertTriangle, Send, RefreshCw, ChevronRight, CreditCard,
  StickyNote, CalendarDays,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type OrderItem = {
  id: string
  quantity: number
  price: number
  products: { name: string; image_url?: string | null; category?: string } | null
}

interface OrderDetail {
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
  updated_at: string | null
  zones: { name: string } | { name: string }[] | null
  order_items: OrderItem[]
  profile: { name: string; email: string; phone: string } | null
}

const STATUS_STYLE: Record<string, { color: string; icon: React.ElementType; next: string | null; nextLabel: string }> = {
  pending:          { color: 'bg-amber-100 text-amber-700',       icon: Clock,         next: 'processing',       nextLabel: 'Mark Processing' },
  processing:       { color: 'bg-blue-100 text-blue-700',         icon: Package,       next: 'out_for_delivery', nextLabel: 'Out for Delivery' },
  out_for_delivery: { color: 'bg-[#e0f7fa] text-[#0097a7]',      icon: Truck,         next: 'delivered',        nextLabel: 'Mark Delivered' },
  delivered:        { color: 'bg-green-100 text-green-700',       icon: CheckCircle2,  next: null,               nextLabel: '' },
  cancelled:        { color: 'bg-red-100 text-red-600',           icon: XCircle,       next: null,               nextLabel: '' },
}

const STEPS = [
  { key: 'pending',          label: 'Order Placed' },
  { key: 'processing',       label: 'Processing' },
  { key: 'out_for_delivery', label: 'Out for Delivery' },
  { key: 'delivered',        label: 'Delivered' },
]

const categoryEmoji: Record<string, string> = {
  drinking: '💧', cooler: '🧊', subscription: '🔄', accessory: '🛠️', refill: '♻️',
}

function fmtDate(ts: string) {
  return new Date(ts).toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function shortId(id: string) { return '#TW-' + id.slice(-6).toUpperCase() }

export default function AdminOrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState('')
  const [updating, setUpdating] = useState(false)

  // Driver editing
  const [editDriver, setEditDriver] = useState(false)
  const [driverInput, setDriverInput] = useState('')

  // Notes editing
  const [editNotes, setEditNotes] = useState(false)
  const [notesInput, setNotesInput] = useState('')

  // Email sending
  const [sendingEmail, setSendingEmail] = useState(false)

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3500) }

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id, user_id, status, payment_status, total, delivery_address, zone_id,
          driver_name, customer_name, customer_phone, notes, created_at, updated_at,
          zones ( name ),
          order_items ( id, quantity, price, products ( name, image_url, category ) )
        `)
        .eq('id', id)
        .maybeSingle()

      if (error || !data) { router.push('/admin/orders'); return }

      const row = data as unknown as Omit<OrderDetail, 'profile'>

      // Fetch profile if user_id exists
      let profile: { name: string; email: string; phone: string } | null = null
      if (row.user_id) {
        const { data: p } = await supabase
          .from('profiles')
          .select('name, email, phone')
          .eq('id', row.user_id)
          .maybeSingle()
        profile = p ?? null
      }

      const full: OrderDetail = { ...row, profile }
      setOrder(full)
      setDriverInput(full.driver_name ?? '')
      setNotesInput(full.notes ?? '')
      setLoading(false)
    }
    load()
  }, [id, router])

  const advanceStatus = async () => {
    if (!order) return
    const next = STATUS_STYLE[order.status]?.next
    if (!next) return
    setUpdating(true)
    const { error } = await supabase.from('orders').update({ status: next }).eq('id', order.id)
    if (!error) {
      setOrder(prev => prev ? { ...prev, status: next } : prev)
      showToast(`Status → ${next.replace(/_/g, ' ')}`)
      if (next === 'out_for_delivery' || next === 'delivered') {
        fetch('/api/admin/send-status-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: order.id, newStatus: next }),
        }).catch(() => {})
      }
    }
    setUpdating(false)
  }

  const cancelOrder = async () => {
    if (!order) return
    if (!confirm('Cancel this order? If already paid, a full Stripe refund will be issued.')) return
    setUpdating(true)

    if (order.payment_status === 'paid') {
      const res = await fetch('/api/admin/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: order.id }),
      })
      const data = await res.json()
      if (!res.ok) { showToast(data.error ?? 'Refund failed'); setUpdating(false); return }
      setOrder(prev => prev ? { ...prev, status: 'cancelled', payment_status: 'refunded' } : prev)
      showToast('Order cancelled & refunded.')
    } else {
      await supabase.from('orders').update({ status: 'cancelled' }).eq('id', order.id)
      setOrder(prev => prev ? { ...prev, status: 'cancelled' } : prev)
      showToast('Order cancelled.')
    }
    setUpdating(false)
  }

  const saveDriver = async () => {
    if (!order) return
    await supabase.from('orders').update({ driver_name: driverInput.trim() || null }).eq('id', order.id)
    setOrder(prev => prev ? { ...prev, driver_name: driverInput.trim() || null } : prev)
    setEditDriver(false)
    showToast(driverInput.trim() ? `Driver set: ${driverInput.trim()}` : 'Driver removed')
  }

  const saveNotes = async () => {
    if (!order) return
    await supabase.from('orders').update({ notes: notesInput.trim() || null }).eq('id', order.id)
    setOrder(prev => prev ? { ...prev, notes: notesInput.trim() || null } : prev)
    setEditNotes(false)
    showToast('Notes updated')
  }

  const sendEmailToCustomer = async () => {
    if (!order) return
    setSendingEmail(true)
    const res = await fetch('/api/admin/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: order.id }),
    })
    setSendingEmail(false)
    showToast(res.ok ? 'Email sent to customer' : 'Failed to send email')
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-6 w-48 bg-[#e0f7fa] rounded-lg animate-pulse" />
        <div className="h-24 bg-white rounded-3xl border border-[#cce7f0] animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="h-40 bg-white rounded-3xl border border-[#cce7f0] animate-pulse" />
            <div className="h-64 bg-white rounded-3xl border border-[#cce7f0] animate-pulse" />
          </div>
          <div className="space-y-4">
            <div className="h-40 bg-white rounded-3xl border border-[#cce7f0] animate-pulse" />
            <div className="h-32 bg-white rounded-3xl border border-[#cce7f0] animate-pulse" />
          </div>
        </div>
      </div>
    )
  }

  if (!order) return null

  const s = STATUS_STYLE[order.status] ?? STATUS_STYLE.pending
  const StatusIcon = s.icon
  const currentStep = STEPS.findIndex(st => st.key === order.status)
  const subtotal = order.order_items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const deliveryFee = subtotal > 0 ? Number(order.total) - subtotal : 0
  const zoneName = order.zones ? (Array.isArray(order.zones) ? order.zones[0]?.name : (order.zones as { name: string }).name) : null
  const displayName = order.profile?.name ?? order.customer_name ?? '—'
  const displayPhone = order.profile?.phone ?? order.customer_phone ?? '—'
  const displayEmail = order.profile?.email ?? '—'

  return (
    <div className="space-y-5">
      {/* Toast */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 bg-[#0c2340] text-white px-4 py-2.5 rounded-2xl shadow-xl text-sm font-medium animate-in fade-in slide-in-from-top-2">
          {toast}
        </div>
      )}

      {/* Breadcrumb + header row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav className="flex items-center gap-1.5 text-sm text-[#4a7fa5]">
          <Link href="/admin/orders" className="hover:text-[#0097a7] transition-colors flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Orders
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-[#cce7f0]" />
          <span className="font-semibold text-[#0c2340]">{shortId(order.id)}</span>
        </nav>

        {/* Status pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-semibold ${s.color}`}>
            <StatusIcon className="w-3 h-3" /> {order.status.replace(/_/g, ' ')}
          </span>
          {order.payment_status && (
            <span className={`text-xs px-3 py-1.5 rounded-full font-semibold ${
              order.payment_status === 'paid'     ? 'bg-green-100 text-green-700' :
              order.payment_status === 'refunded' ? 'bg-rose-100 text-rose-600' :
              order.payment_status === 'failed'   ? 'bg-red-100 text-red-600' :
              'bg-amber-100 text-amber-700'
            }`}>
              {order.payment_status === 'paid'     ? '✓ Paid' :
               order.payment_status === 'refunded' ? 'Refunded' :
               order.payment_status === 'failed'   ? 'Failed' : 'Pending payment'}
            </span>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2">
          {s.next && (
            <Button size="sm" onClick={advanceStatus} disabled={updating}
              className="bg-gradient-to-r from-[#0097a7] to-[#1565c0] text-white gap-1.5 shadow-sm">
              {updating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              {s.nextLabel}
            </Button>
          )}
          {order.status !== 'cancelled' && order.status !== 'delivered' && (
            <Button size="sm" variant="outline" onClick={cancelOrder} disabled={updating}
              className="border-rose-200 text-rose-600 hover:bg-rose-50 gap-1.5">
              <XCircle className="w-3.5 h-3.5" /> Cancel &amp; Refund
            </Button>
          )}
          {order.payment_status === 'paid' && (
            <a href={`/api/invoice/${order.id}`} target="_blank" rel="noreferrer">
              <Button size="sm" variant="outline" className="border-[#cce7f0] text-[#4a7fa5] hover:text-[#0097a7] gap-1.5">
                <Download className="w-3.5 h-3.5" /> Invoice
              </Button>
            </a>
          )}
          {order.profile?.email && (
            <Button size="sm" variant="outline" onClick={sendEmailToCustomer} disabled={sendingEmail}
              className="border-[#cce7f0] text-[#4a7fa5] hover:text-[#0097a7] gap-1.5">
              {sendingEmail ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Email Customer
            </Button>
          )}
        </div>
      </div>

      {/* 2-column body */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">

        {/* ── LEFT COLUMN (col-span-2) ── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Fulfillment / progress card */}
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl border border-[#cce7f0] shadow-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-[#0c2340] flex items-center gap-2">
                <Truck className="w-4 h-4 text-[#0097a7]" /> Fulfillment
              </h3>
              {order.status === 'cancelled' && (
                <span className="flex items-center gap-1.5 text-xs font-medium text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full">
                  <AlertTriangle className="w-3 h-3" /> Cancelled
                </span>
              )}
            </div>

            {order.status !== 'cancelled' ? (
              <div className="flex items-center gap-0 mb-2">
                {STEPS.map((step, idx) => {
                  const done   = idx < currentStep || order.status === 'delivered'
                  const active = idx === currentStep && order.status !== 'delivered'
                  const last   = idx === STEPS.length - 1
                  return (
                    <div key={step.key} className="flex items-center flex-1 last:flex-none">
                      <div className="flex flex-col items-center gap-1.5">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center border-2 transition-all
                          ${done   ? 'bg-[#0097a7] border-[#0097a7]' :
                            active ? 'bg-white border-[#1565c0] ring-2 ring-[#1565c0]/20' :
                                     'bg-[#f0f9ff] border-[#cce7f0]'}`}>
                          {done
                            ? <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                            : active
                              ? <div className="w-2.5 h-2.5 rounded-full bg-[#1565c0] animate-pulse" />
                              : <div className="w-2 h-2 rounded-full bg-[#cce7f0]" />
                          }
                        </div>
                        <span className={`text-[10px] font-medium text-center leading-tight w-16
                          ${active ? 'text-[#1565c0]' : done ? 'text-[#0097a7]' : 'text-[#4a7fa5]'}`}>
                          {step.label}
                        </span>
                      </div>
                      {!last && (
                        <div className={`flex-1 h-0.5 mb-5 mx-1 rounded-full transition-all
                          ${idx < currentStep ? 'bg-[#0097a7]' : 'bg-[#e0f7fa]'}`} />
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-rose-500 flex items-center gap-2">
                <XCircle className="w-4 h-4" /> This order has been cancelled.
              </p>
            )}
          </motion.div>

          {/* Order items table */}
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="bg-white rounded-3xl border border-[#cce7f0] shadow-sm overflow-hidden">
            <div className="px-6 pt-6 pb-3 border-b border-[#f0f9ff]">
              <h3 className="font-bold text-[#0c2340] flex items-center gap-2">
                <Package className="w-4 h-4 text-[#0097a7]" /> Items ({order.order_items.length})
              </h3>
            </div>

            {/* Table header */}
            <div className="hidden sm:grid grid-cols-12 px-6 py-2.5 bg-[#f8fcff] text-[10px] font-semibold text-[#4a7fa5] uppercase tracking-widest">
              <div className="col-span-6">Product</div>
              <div className="col-span-2 text-right">Price</div>
              <div className="col-span-2 text-right">Qty</div>
              <div className="col-span-2 text-right">Total</div>
            </div>

            {/* Table rows */}
            <div className="divide-y divide-[#f0f9ff]">
              {order.order_items.map((item, i) => {
                const product = item.products
                const emoji = product?.category ? (categoryEmoji[product.category] ?? '💧') : '💧'
                return (
                  <div key={i} className="grid grid-cols-12 items-center gap-2 px-6 py-4">
                    <div className="col-span-12 sm:col-span-6 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#e0f7fa] flex items-center justify-center shrink-0 overflow-hidden">
                        {product?.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={product.image_url} alt={product.name ?? ''} className="w-full h-full object-contain" />
                        ) : (
                          <span className="text-lg">{emoji}</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-[#0c2340] text-sm truncate">{product?.name ?? 'Product'}</p>
                        {product?.category && (
                          <p className="text-xs text-[#4a7fa5] capitalize">{product.category}</p>
                        )}
                      </div>
                    </div>
                    <div className="col-span-4 sm:col-span-2 sm:text-right text-sm text-[#4a7fa5]">
                      <span className="sm:hidden text-[10px] font-semibold uppercase text-[#4a7fa5]/60 mr-1">Price</span>
                      ${item.price.toFixed(2)}
                    </div>
                    <div className="col-span-4 sm:col-span-2 sm:text-right text-sm text-[#4a7fa5]">
                      <span className="sm:hidden text-[10px] font-semibold uppercase text-[#4a7fa5]/60 mr-1">Qty</span>
                      ×{item.quantity}
                    </div>
                    <div className="col-span-4 sm:col-span-2 sm:text-right font-bold text-sm text-[#0c2340]">
                      ${(item.price * item.quantity).toFixed(2)}
                    </div>
                  </div>
                )
              })}
            </div>
          </motion.div>

          {/* Payment breakdown */}
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="bg-white rounded-3xl border border-[#cce7f0] shadow-sm p-6">
            <h3 className="font-bold text-[#0c2340] flex items-center gap-2 mb-4">
              <CreditCard className="w-4 h-4 text-[#0097a7]" /> Payment Summary
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-[#4a7fa5]">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              {deliveryFee > 0 && (
                <div className="flex justify-between text-[#4a7fa5]">
                  <span>Delivery fee{zoneName ? ` (${zoneName})` : ''}</span>
                  <span>${deliveryFee.toFixed(2)}</span>
                </div>
              )}
              {deliveryFee === 0 && (
                <div className="flex justify-between text-[#4a7fa5]">
                  <span>Delivery</span>
                  <span className="text-green-600 font-medium">Included</span>
                </div>
              )}
              <div className="border-t border-[#e0f7fa] pt-2 flex justify-between font-extrabold text-base text-[#0c2340]">
                <span>Total</span>
                <span className="text-[#0097a7]">${Number(order.total).toFixed(2)}</span>
              </div>
              <div className="border-t border-[#e0f7fa] pt-2 flex justify-between text-sm">
                <span className="text-[#4a7fa5]">Payment status</span>
                <span className={`font-semibold ${
                  order.payment_status === 'paid'     ? 'text-green-600' :
                  order.payment_status === 'refunded' ? 'text-rose-500' :
                  order.payment_status === 'failed'   ? 'text-red-500' :
                  'text-amber-600'
                }`}>
                  {order.payment_status === 'paid'     ? '✓ Paid' :
                   order.payment_status === 'refunded' ? 'Refunded' :
                   order.payment_status === 'failed'   ? 'Failed' : 'Pending'}
                </span>
              </div>
              {order.payment_status === 'paid' && order.status !== 'cancelled' && order.status !== 'refunded' && (
                <div className="flex justify-between text-sm">
                  <span className="text-[#4a7fa5]">Balance owing</span>
                  <span className="font-semibold text-green-600">$0.00</span>
                </div>
              )}
            </div>
          </motion.div>

        </div>

        {/* ── RIGHT SIDEBAR ── */}
        <div className="space-y-4">

          {/* Customer card */}
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.07 }}
            className="bg-white rounded-3xl border border-[#cce7f0] shadow-sm p-5">
            <h3 className="font-bold text-[#0c2340] text-sm mb-3 flex items-center gap-2">
              <User className="w-4 h-4 text-[#0097a7]" /> Customer
            </h3>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#0097a7] to-[#1565c0] flex items-center justify-center shrink-0">
                <span className="text-white text-sm font-bold">{displayName.charAt(0).toUpperCase()}</span>
              </div>
              <div>
                <p className="font-semibold text-[#0c2340] text-sm">{displayName}</p>
              </div>
            </div>
            {order.user_id && (
              <Link href={`/admin/customers/${order.user_id}`}
                className="inline-flex items-center gap-1 text-xs text-[#0097a7] hover:text-[#1565c0] font-semibold transition-colors">
                View full profile <ChevronRight className="w-3 h-3" />
              </Link>
            )}
          </motion.div>

          {/* Contact info */}
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="bg-white rounded-3xl border border-[#cce7f0] shadow-sm p-5">
            <h3 className="font-bold text-[#0c2340] text-sm mb-3">Contact Information</h3>
            <div className="space-y-2.5 text-sm">
              {displayEmail !== '—' && (
                <div className="flex items-center gap-2.5 text-[#4a7fa5]">
                  <Mail className="w-3.5 h-3.5 text-[#0097a7] shrink-0" />
                  <a href={`mailto:${displayEmail}`} className="hover:text-[#0097a7] truncate transition-colors">
                    {displayEmail}
                  </a>
                </div>
              )}
              <div className="flex items-center gap-2.5 text-[#4a7fa5]">
                <Phone className="w-3.5 h-3.5 text-[#0097a7] shrink-0" />
                <span>{displayPhone}</span>
              </div>
            </div>
          </motion.div>

          {/* Shipping address */}
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.13 }}
            className="bg-white rounded-3xl border border-[#cce7f0] shadow-sm p-5">
            <h3 className="font-bold text-[#0c2340] text-sm mb-3">Shipping Address</h3>
            <div className="flex items-start gap-2.5 text-sm text-[#4a7fa5]">
              <MapPin className="w-3.5 h-3.5 text-[#0097a7] mt-0.5 shrink-0" />
              <div>
                <p>{order.delivery_address ?? '—'}</p>
                {zoneName && (
                  <span className="inline-block mt-1.5 text-xs bg-[#e0f7fa] text-[#0097a7] px-2 py-0.5 rounded-full font-medium">
                    {zoneName}
                  </span>
                )}
              </div>
            </div>
          </motion.div>

          {/* Driver assignment */}
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}
            className="bg-white rounded-3xl border border-[#cce7f0] shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-[#0c2340] text-sm flex items-center gap-2">
                <Truck className="w-4 h-4 text-[#0097a7]" /> Driver
              </h3>
              {!editDriver && (
                <button onClick={() => setEditDriver(true)} className="text-[#0097a7] hover:text-[#1565c0] transition-colors">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            {editDriver ? (
              <div className="space-y-2">
                <Input value={driverInput} onChange={e => setDriverInput(e.target.value)}
                  placeholder="Driver name" className="h-8 text-sm border-[#cce7f0]" />
                <div className="flex gap-2">
                  <Button size="sm" onClick={saveDriver} className="h-7 bg-[#0097a7] text-white text-xs gap-1">
                    <Save className="w-3 h-3" /> Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { setEditDriver(false); setDriverInput(order.driver_name ?? '') }} className="h-7 border-[#cce7f0] text-xs">
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ) : (
              <p className={`text-sm ${order.driver_name ? 'text-[#0c2340] font-medium' : 'text-[#4a7fa5] italic'}`}>
                {order.driver_name ?? 'Not assigned'}
              </p>
            )}
          </motion.div>

          {/* Admin notes */}
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.19 }}
            className="bg-white rounded-3xl border border-[#cce7f0] shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-[#0c2340] text-sm flex items-center gap-2">
                <StickyNote className="w-4 h-4 text-[#0097a7]" /> Notes
              </h3>
              {!editNotes && (
                <button onClick={() => setEditNotes(true)} className="text-[#0097a7] hover:text-[#1565c0] transition-colors">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            {editNotes ? (
              <div className="space-y-2">
                <Textarea value={notesInput} onChange={e => setNotesInput(e.target.value)}
                  placeholder="Internal notes…" rows={3}
                  className="border-[#cce7f0] resize-none text-sm" />
                <div className="flex gap-2">
                  <Button size="sm" onClick={saveNotes} className="h-7 bg-[#0097a7] text-white text-xs gap-1">
                    <Save className="w-3 h-3" /> Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { setEditNotes(false); setNotesInput(order.notes ?? '') }} className="h-7 border-[#cce7f0] text-xs">
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <p className={`text-sm leading-relaxed ${order.notes ? 'text-[#0c2340]' : 'text-[#4a7fa5] italic'}`}>
                {order.notes ?? 'No notes added'}
              </p>
            )}
          </motion.div>

          {/* Order meta */}
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}
            className="bg-white rounded-3xl border border-[#cce7f0] shadow-sm p-5">
            <h3 className="font-bold text-[#0c2340] text-sm mb-3 flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-[#0097a7]" /> Order Details
            </h3>
            <div className="space-y-2 text-xs text-[#4a7fa5]">
              <div className="flex justify-between gap-2">
                <span>Created</span>
                <span className="text-[#0c2340] font-medium text-right">{fmtDate(order.created_at)}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span>Updated</span>
                <span className="text-[#0c2340] font-medium text-right">{fmtDate(order.updated_at ?? order.created_at)}</span>
              </div>
              <div className="flex justify-between gap-2 pt-1 border-t border-[#f0f9ff]">
                <span>Order ID</span>
                <span className="font-mono text-[10px] text-[#0c2340] truncate max-w-[120px]" title={order.id}>
                  {order.id.slice(-12)}
                </span>
              </div>
            </div>
          </motion.div>

        </div>{/* end sidebar */}
      </div>{/* end 2-col grid */}
    </div>
  )
}

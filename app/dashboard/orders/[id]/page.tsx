'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Package, Truck, CheckCircle2, Clock, XCircle,
  Download, RotateCcw, MapPin, MessageSquare, Droplets,
  CreditCard, User, Phone, Mail, CalendarDays, ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useCart } from '@/store/cartStore'

// ── Types ─────────────────────────────────────────────────────────────────────
interface OrderItem {
  quantity: number
  price: number
  product: {
    id: string; name: string; price: number
    description: string | null; category: string
    stock: number; active: boolean; image_url: string | null
  } | null
}

interface OrderDetail {
  id: string
  user_id: string
  status: string
  payment_status: string | null
  total: number
  tax_amount: number | null
  delivery_address: string
  notes: string | null
  driver_name: string | null
  customer_name: string | null
  customer_phone: string | null
  created_at: string
  updated_at: string | null
  zones: { name: string; delivery_fee: number } | null
  order_items: OrderItem[]
}

// ── Config ────────────────────────────────────────────────────────────────────
const STATUS_META: Record<string, { label: string; icon: React.ElementType; pill: string }> = {
  pending:          { label: 'Pending',          icon: Clock,        pill: 'bg-amber-50 text-amber-700 border border-amber-200'  },
  processing:       { label: 'Processing',        icon: Package,      pill: 'bg-blue-50 text-blue-700 border border-blue-200'     },
  out_for_delivery: { label: 'Out for Delivery',  icon: Truck,        pill: 'bg-cyan-50 text-[#0097a7] border border-cyan-200'   },
  delivered:        { label: 'Delivered',         icon: CheckCircle2, pill: 'bg-green-50 text-green-700 border border-green-200'  },
  cancelled:        { label: 'Cancelled',         icon: XCircle,      pill: 'bg-red-50 text-red-600 border border-red-200'        },
}

const PAY_PILL: Record<string, string> = {
  paid:      'bg-green-50 text-green-700 border border-green-200',
  pending:   'bg-amber-50 text-amber-700 border border-amber-200',
  failed:    'bg-red-50 text-red-600 border border-red-200',
  refunded:  'bg-red-50 text-red-600 border border-red-200',
  disputed:  'bg-orange-50 text-orange-700 border border-orange-200',
}
const PAY_LABEL: Record<string, string> = {
  paid: 'Paid', pending: 'Payment pending', failed: 'Payment failed',
  refunded: 'Refunded', disputed: 'Disputed',
}

const STEPS = [
  { key: 'pending',          label: 'Order placed',     desc: 'We received your order'       },
  { key: 'processing',       label: 'Processing',        desc: 'Being prepared for delivery'  },
  { key: 'out_for_delivery', label: 'Out for delivery',  desc: 'On the way to you'            },
  { key: 'delivered',        label: 'Delivered',         desc: 'Enjoy your fresh water!'      },
]

function fmtDate(ts: string) {
  return new Date(ts).toLocaleDateString('en-CA', {
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

// ── Horizontal stepper ────────────────────────────────────────────────────────
function FulfillmentStepper({ status }: { status: string }) {
  if (status === 'cancelled') return null
  const currentIdx = STEPS.findIndex(s => s.key === status)
  return (
    <div className="flex items-start">
      {STEPS.map((step, idx) => {
        const done   = idx < currentIdx || status === 'delivered'
        const active = idx === currentIdx && status !== 'delivered'
        const last   = idx === STEPS.length - 1
        return (
          <div key={step.key} className="flex items-center flex-1 min-w-0">
            <div className="flex flex-col items-center min-w-0">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all
                ${done   ? 'bg-[#0097a7] text-white' :
                  active ? 'bg-[#1565c0] text-white ring-4 ring-[#1565c0]/15' :
                  'bg-gray-100 text-gray-300 border border-gray-200'}`}>
                {done   ? <CheckCircle2 className="w-4 h-4" />
                        : active ? <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                        : <span className="text-[10px] font-bold">{idx + 1}</span>}
              </div>
              <p className={`text-[10px] font-medium mt-1.5 text-center leading-tight max-w-[64px]
                ${done ? 'text-[#0097a7]' : active ? 'text-[#1565c0]' : 'text-gray-400'}`}>
                {step.label}
              </p>
            </div>
            {!last && <div className={`flex-1 h-px mx-2 mb-5 ${done ? 'bg-[#0097a7]' : 'bg-gray-200'}`} />}
          </div>
        )
      })}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function OrderDetailPage() {
  const { id }  = useParams<{ id: string }>()
  const router  = useRouter()
  const { addItem } = useCart()

  const [order,     setOrder]     = useState<OrderDetail | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [reordered, setReordered] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/auth/login'); return }

      const { data, error } = await supabase
        .from('orders')
        .select(`
          id, user_id, status, payment_status, total, tax_amount,
          delivery_address, notes, driver_name, customer_name, customer_phone,
          created_at, updated_at,
          zones ( name, delivery_fee ),
          order_items ( quantity, price, product:products ( id, name, price, description, category, stock, active, image_url ) )
        `)
        .eq('id', id)
        .eq('user_id', session.user.id)   // ← security: own orders only
        .maybeSingle()

      if (error || !data) { router.push('/dashboard/orders'); return }
      setOrder(data as unknown as OrderDetail)
      setLoading(false)
    }
    load()
  }, [id, router])

  // Real-time status updates
  useEffect(() => {
    if (!order) return
    const channel = supabase
      .channel(`order-detail-${id}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${id}`,
      }, payload => {
        const u = payload.new as Partial<OrderDetail>
        setOrder(prev => prev ? { ...prev, ...u } : prev)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [id, order])

  const handleReorder = () => {
    if (!order) return
    order.order_items.forEach(item => {
      if (item.product?.active) {
        addItem({ ...item.product, description: item.product.description ?? '', image_url: item.product.image_url ?? '' }, undefined)
      }
    })
    setReordered(true)
    setTimeout(() => setReordered(false), 3000)
  }

  if (loading) {
    return (
      <div className="space-y-3 max-w-5xl">
        <div className="h-8 w-48 bg-gray-100 rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-4">
            {[...Array(3)].map((_, i) => <div key={i} className="bg-white rounded-2xl border border-gray-200 h-36 animate-pulse" />)}
          </div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => <div key={i} className="bg-white rounded-2xl border border-gray-200 h-28 animate-pulse" />)}
          </div>
        </div>
      </div>
    )
  }

  if (!order) return null

  const sm       = STATUS_META[order.status] ?? STATUS_META.pending
  const SIcon    = sm.icon
  const payKey   = order.payment_status ?? 'pending'
  const subtotal = order.order_items.reduce((s, i) => s + i.price * i.quantity, 0)
  const tax      = Number(order.tax_amount ?? 0)
  const delivery = Number(order.zones?.delivery_fee ?? 0)
  const balance  = payKey === 'paid' ? 0 : Number(order.total)
  const totalQty = order.order_items.reduce((s, i) => s + i.quantity, 0)

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 max-w-5xl">

        {/* Breadcrumb + actions */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Link href="/dashboard/orders" className="flex items-center gap-1.5 text-sm text-[#4a7fa5] hover:text-[#0097a7] transition-colors">
              <ArrowLeft className="w-4 h-4" /> Orders
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
            <span className="text-sm font-semibold text-[#0c2340]">#{order.id.slice(-6).toUpperCase()}</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {order.payment_status === 'paid' && (
              <a href={`/api/invoice/${order.id}`} target="_blank" rel="noreferrer">
                <Button size="sm" variant="outline" className="h-8 gap-1.5 border-gray-200 text-gray-600 hover:border-[#cce7f0] hover:text-[#0097a7]">
                  <Download className="w-3.5 h-3.5" /> Download invoice
                </Button>
              </a>
            )}
            <Button size="sm" onClick={handleReorder}
              className={`h-8 gap-1.5 transition-all ${reordered ? 'bg-green-500 text-white' : 'bg-gradient-to-r from-[#0097a7] to-[#1565c0] text-white'}`}>
              {reordered ? <><CheckCircle2 className="w-3.5 h-3.5" /> Added!</> : <><RotateCcw className="w-3.5 h-3.5" /> Reorder</>}
            </Button>
          </div>
        </div>

        {/* Page heading */}
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-2xl font-extrabold text-[#0c2340]">Order #{order.id.slice(-6).toUpperCase()}</h1>
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${sm.pill}`}>
            <SIcon className="w-3 h-3" /> {sm.label}
          </span>
          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${PAY_PILL[payKey] ?? PAY_PILL.pending}`}>
            {PAY_LABEL[payKey] ?? 'Pending'}
          </span>
          <span className="text-xs text-gray-400 ml-1">{fmtDate(order.created_at)}</span>
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">

          {/* ── LEFT ─────────────────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-4">

            {/* Fulfilment / progress */}
            {order.status !== 'cancelled' ? (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="flex items-center gap-2 px-5 py-3.5 border-b border-gray-100">
                  <div className={`w-2 h-2 rounded-full ${order.status === 'delivered' ? 'bg-green-500' : 'bg-[#0097a7] animate-pulse'}`} />
                  <span className="font-semibold text-sm text-[#0c2340]">{sm.label}</span>
                  {order.driver_name && (
                    <span className="ml-auto text-xs text-gray-400 flex items-center gap-1">
                      <Truck className="w-3 h-3" /> {order.driver_name}
                    </span>
                  )}
                </div>
                <div className="px-6 py-5">
                  <FulfillmentStepper status={order.status} />
                </div>
              </div>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4 flex items-center gap-3">
                <XCircle className="w-5 h-5 text-red-500 shrink-0" />
                <div>
                  <p className="font-semibold text-red-700 text-sm">Order cancelled</p>
                  <p className="text-xs text-red-400 mt-0.5">If you were charged, a refund will appear in 3–7 business days.</p>
                </div>
              </div>
            )}

            {/* Items */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-100">
                <p className="font-semibold text-sm text-[#0c2340]">
                  {order.status === 'delivered' ? 'Delivered' : order.status === 'out_for_delivery' ? 'Out for delivery' : 'Unfulfilled'}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">Standard delivery</p>
              </div>

              {order.order_items.map((item, i) => {
                const p = item.product
                return (
                  <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-gray-100 last:border-b-0">
                    <div className="w-14 h-14 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-center shrink-0 overflow-hidden">
                      {p?.image_url
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                        : <Droplets className="w-6 h-6 text-[#b3e5fc]" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-[#0c2340] truncate">{p?.name ?? 'Product'}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{p?.category}</p>
                    </div>
                    <div className="text-sm text-gray-500 shrink-0">
                      ${item.price.toFixed(2)} <span className="text-gray-400">×</span> {item.quantity}
                    </div>
                    <div className="w-24 text-right shrink-0">
                      <p className="font-semibold text-[#0c2340] text-sm">${(item.price * item.quantity).toFixed(2)}</p>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Payment breakdown */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${PAY_PILL[payKey] ?? PAY_PILL.pending}`}>
                  {PAY_LABEL[payKey] ?? 'Pending'}
                </span>
              </div>
              <div className="px-5 py-4 space-y-2.5 text-sm">
                <div className="flex justify-between text-gray-500">
                  <span>Subtotal · {totalQty} item{totalQty !== 1 ? 's' : ''}</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>Shipping {order.zones?.name ? `(${order.zones.name})` : ''}</span>
                  <span>{delivery > 0 ? `$${delivery.toFixed(2)}` : 'Free'}</span>
                </div>
                {tax > 0 && (
                  <div className="flex justify-between text-gray-500">
                    <span>Tax (GST + PST 12%)</span>
                    <span>${tax.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-[#0c2340] text-base pt-2 border-t border-gray-100">
                  <span>Total</span><span>${Number(order.total).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>Paid</span>
                  <span>{payKey === 'paid' ? `$${Number(order.total).toFixed(2)}` : '$0.00'}</span>
                </div>
                {balance > 0 && (
                  <div className="flex justify-between font-semibold text-amber-700">
                    <span>Balance owing</span><span>${balance.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── RIGHT (sidebar) ─────────────────────────────────────── */}
          <div className="space-y-4">

            {order.notes && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3.5 border-b border-gray-100">
                  <p className="font-semibold text-sm text-[#0c2340]">Notes</p>
                </div>
                <div className="px-5 py-4">
                  <p className="text-sm text-gray-600">{order.notes}</p>
                </div>
              </div>
            )}

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-100">
                <p className="font-semibold text-sm text-[#0c2340]">Contact information</p>
              </div>
              <div className="px-5 py-4 space-y-2">
                {order.customer_name && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />{order.customer_name}
                  </div>
                )}
                {order.customer_phone && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />{order.customer_phone}
                  </div>
                )}
                {!order.customer_name && !order.customer_phone && (
                  <p className="text-xs text-gray-400 italic">No contact info on file</p>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-100">
                <p className="font-semibold text-sm text-[#0c2340]">Shipping address</p>
              </div>
              <div className="px-5 py-4">
                <div className="flex items-start gap-2 text-sm text-gray-600">
                  <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                  {order.delivery_address || 'No address provided'}
                </div>
                {order.zones?.name && (
                  <p className="text-xs text-gray-400 mt-1.5 ml-5">Zone: {order.zones.name}</p>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-100">
                <p className="font-semibold text-sm text-[#0c2340]">Payment</p>
              </div>
              <div className="px-5 py-4 space-y-1.5 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-3.5 h-3.5 text-gray-400 shrink-0" /> Online payment
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <CalendarDays className="w-3.5 h-3.5 shrink-0" /> {fmtDate(order.created_at)}
                </div>
              </div>
            </div>

            {/* Help CTA */}
            <div className="bg-gradient-to-br from-[#e0f7fa] to-[#f0f9ff] rounded-2xl border border-[#cce7f0] px-5 py-4">
              <p className="font-semibold text-sm text-[#0c2340] mb-0.5">Need help?</p>
              <p className="text-xs text-[#4a7fa5] mb-3">Our team typically replies within a few hours.</p>
              <Link href="/dashboard/support">
                <Button size="sm" className="w-full bg-[#0097a7] hover:bg-[#1565c0] text-white gap-1.5 h-8">
                  <MessageSquare className="w-3.5 h-3.5" /> Contact Support
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

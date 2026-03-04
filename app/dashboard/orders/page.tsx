'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Search, RefreshCw, Package, Truck, CheckCircle2, Clock, XCircle, Droplets, ShoppingBag, Download, RotateCcw, Eye } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useCart } from '@/store/cartStore'

const statusConfig = {
  pending: { label: 'Pending', icon: Clock, color: 'bg-amber-100 text-amber-700' },
  processing: { label: 'Processing', icon: Package, color: 'bg-blue-100 text-blue-700' },
  out_for_delivery: { label: 'Out for Delivery', icon: Truck, color: 'bg-[#e0f7fa] text-[#0097a7]' },
  delivered: { label: 'Delivered', icon: CheckCircle2, color: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Cancelled', icon: XCircle, color: 'bg-red-100 text-red-700' },
}

const DELIVERY_STEPS = [
  { key: 'pending',          label: 'Placed' },
  { key: 'processing',       label: 'Processing' },
  { key: 'out_for_delivery', label: 'On the Way' },
  { key: 'delivered',        label: 'Delivered' },
]

function DeliveryProgress({ status }: { status: string }) {
  if (status === 'cancelled') return null
  const currentIdx = DELIVERY_STEPS.findIndex(s => s.key === status)
  return (
    <div className="flex items-center gap-0 mt-3 pt-3 border-t border-[#f0f9ff]">
      {DELIVERY_STEPS.map((step, idx) => {
        const done   = idx < currentIdx || status === 'delivered'
        const active = idx === currentIdx && status !== 'delivered'
        const last   = idx === DELIVERY_STEPS.length - 1
        return (
          <div key={step.key} className="flex items-center flex-1 min-w-0">
            <div className="flex flex-col items-center shrink-0">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-all
                ${done   ? 'bg-[#0097a7] text-white' :
                  active ? 'bg-[#1565c0] text-white ring-2 ring-[#1565c0]/25 ring-offset-1' :
                  'bg-[#f0f9ff] text-[#4a7fa5] border border-[#cce7f0]'}`}>
                {done ? <CheckCircle2 className="w-3 h-3" /> : <span className="text-[9px] font-bold">{idx + 1}</span>}
              </div>
              <span className={`text-[9px] mt-1 font-medium text-center leading-tight max-w-[52px]
                ${active ? 'text-[#1565c0]' : done ? 'text-[#0097a7]' : 'text-[#4a7fa5]'}`}>
                {step.label}
              </span>
            </div>
            {!last && (
              <div className={`flex-1 h-0.5 mx-1 mb-3 ${idx < currentIdx || status === 'delivered' ? 'bg-[#0097a7]' : 'bg-[#e0f7fa]'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

interface OrderRow {
  id: string
  status: string
  payment_status: string | null
  total: number
  delivery_address: string
  created_at: string
  order_items: {
    quantity: number
    price: number
    product: { id: string; name: string; price: number; description: string | null; category: string; stock: number; active: boolean; image_url: string | null } | null
  }[]
}

export default function OrdersPage() {
  const [search, setSearch] = useState('')
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const { addItem } = useCart()

  const reorder = (order: OrderRow) => {
    order.order_items.forEach(item => {
      if (item.product && item.product.active) addItem({ ...item.product, description: item.product.description ?? '', image_url: item.product.image_url ?? '' }, undefined)
    })
  }

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      setUserId(session.user.id)

      const { data } = await supabase
        .from('orders')
        .select('id, status, payment_status, total, delivery_address, created_at, order_items(quantity, price, product:products(id, name, price, description, category, stock, active, image_url))')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })

      setOrders((data as unknown as OrderRow[]) || [])
      setLoading(false)
    }
    load()
  }, [])

  // Real-time order status updates
  useEffect(() => {
    if (!userId) return
    const channel = supabase
      .channel('my-orders-status')
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'orders',
        filter: `user_id=eq.${userId}`,
      }, payload => {
        const updated = payload.new as { id: string; status: string; payment_status: string }
        setOrders(prev => prev.map(o => o.id === updated.id ? { ...o, status: updated.status, payment_status: updated.payment_status } : o))
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [userId])

  const getItemsText = (order: OrderRow) => {
    if (!order.order_items || order.order_items.length === 0) return 'No items'
    return order.order_items
      .map((item) => `${item.quantity}× ${item.product?.name ?? 'Item'}`)
      .join(', ')
  }

  const formatDate = (str: string) =>
    new Date(str).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })

  const filtered = orders.filter((o) => {
    const itemsText = getItemsText(o).toLowerCase()
    const idShort = o.id.slice(0, 8).toUpperCase()
    const q = search.toLowerCase()
    return idShort.includes(q) || itemsText.includes(q) || o.delivery_address?.toLowerCase().includes(q)
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-extrabold text-[#0c2340]">My Orders</h2>
        <Link href="/shop">
          <Button size="sm" className="bg-gradient-to-r from-[#0097a7] to-[#1565c0] text-white gap-2">
            <RefreshCw className="w-4 h-4" /> Order Again
          </Button>
        </Link>
      </div>

      {!loading && orders.length > 0 && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#0097a7]" />
          <Input
            placeholder="Search orders..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 border-[#cce7f0] bg-white"
          />
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-[#cce7f0] h-20 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl border border-[#cce7f0] shadow-sm p-12 text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-[#e0f7fa] flex items-center justify-center mx-auto mb-4">
            <ShoppingBag className="w-8 h-8 text-[#0097a7]" />
          </div>
          <h3 className="font-bold text-[#0c2340] mb-2">
            {orders.length === 0 ? 'No orders yet' : 'No orders match your search'}
          </h3>
          <p className="text-sm text-[#4a7fa5] mb-6">
            {orders.length === 0 ? 'Place your first order and enjoy fresh water delivered to your door.' : 'Try a different search term.'}
          </p>
          {orders.length === 0 && (
            <Link href="/shop">
              <Button className="bg-gradient-to-r from-[#0097a7] to-[#1565c0] text-white gap-2">
                <Droplets className="w-4 h-4" /> Shop Now
              </Button>
            </Link>
          )}
        </motion.div>
      ) : (
        <div className="space-y-3">
          {filtered.map((order, i) => {
            const statusKey = order.status as keyof typeof statusConfig
            const s = statusConfig[statusKey] || statusConfig.pending
            const StatusIcon = s.icon
            return (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-white rounded-2xl border border-[#cce7f0] shadow-sm p-5"
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-[#e0f7fa] flex items-center justify-center shrink-0">
                    <Package className="w-6 h-6 text-[#0097a7]" />
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-bold text-[#0c2340]">#{order.id.slice(0, 8).toUpperCase()}</span>
                      <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium ${s.color}`}>
                        <StatusIcon className="w-3 h-3" /> {s.label}
                      </span>
                      {order.payment_status && (
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                          order.payment_status === 'paid'     ? 'bg-green-100 text-green-700' :
                          order.payment_status === 'failed'   ? 'bg-red-100 text-red-600' :
                          order.payment_status === 'refunded' ? 'bg-red-100 text-red-600' :
                          order.payment_status === 'disputed' ? 'bg-orange-100 text-orange-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {order.payment_status === 'paid' ? 'Paid' :
                           order.payment_status === 'failed' ? 'Payment Failed' :
                           order.payment_status === 'refunded' ? 'Refunded' :
                           order.payment_status === 'disputed' ? 'Disputed' :
                           'Awaiting Payment'}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-[#4a7fa5]">{getItemsText(order)}</p>
                    <p className="text-xs text-[#4a7fa5] mt-0.5">
                      {formatDate(order.created_at)}
                      {order.delivery_address && ` · ${order.delivery_address}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 flex-wrap">
                    <span className="text-lg font-extrabold text-[#0097a7]">${Number(order.total).toFixed(2)}</span>
                    {order.payment_status === 'paid' && (
                      <a href={`/api/invoice/${order.id}`} target="_blank" rel="noreferrer" title="Download Invoice">
                        <Button size="sm" variant="outline" className="border-[#cce7f0] text-[#4a7fa5] gap-1 h-8">
                          <Download className="w-3.5 h-3.5" /> Invoice
                        </Button>
                      </a>
                    )}
                    <Button size="sm" variant="outline" onClick={() => reorder(order)}
                      className="border-[#cce7f0] text-[#4a7fa5] gap-1 h-8" title="Add items to cart">
                      <RotateCcw className="w-3.5 h-3.5" /> Reorder
                    </Button>
                    <Link href={`/dashboard/orders/${order.id}`}>
                      <Button size="sm" variant="outline" className="border-[#cce7f0] text-[#0097a7] gap-1 h-8">
                        <Eye className="w-3.5 h-3.5" /> Details
                      </Button>
                    </Link>
                  </div>
                </div>
                <DeliveryProgress status={order.status} />
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}

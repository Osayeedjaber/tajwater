'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Search, RefreshCw, Package, Truck, CheckCircle2, Clock, XCircle, Droplets, ShoppingBag } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

const statusConfig = {
  pending: { label: 'Pending', icon: Clock, color: 'bg-amber-100 text-amber-700' },
  processing: { label: 'Processing', icon: Package, color: 'bg-blue-100 text-blue-700' },
  out_for_delivery: { label: 'Out for Delivery', icon: Truck, color: 'bg-[#e0f7fa] text-[#0097a7]' },
  delivered: { label: 'Delivered', icon: CheckCircle2, color: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Cancelled', icon: XCircle, color: 'bg-red-100 text-red-700' },
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
    product: { name: string } | null
  }[]
}

export default function OrdersPage() {
  const [search, setSearch] = useState('')
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { data } = await supabase
        .from('orders')
        .select('id, status, payment_status, total, delivery_address, created_at, order_items(quantity, price, product:products(name))')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })

      setOrders((data as unknown as OrderRow[]) || [])
      setLoading(false)
    }
    load()
  }, [])

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
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-lg font-extrabold text-[#0097a7]">${Number(order.total).toFixed(2)}</span>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}

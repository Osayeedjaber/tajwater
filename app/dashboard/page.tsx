'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { ShoppingBag, RefreshCw, Droplets, ArrowRight, Truck, Package, CheckCircle2, Wallet, XCircle, Clock, DollarSign, Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'

type OrderItem = { quantity: number; product: { name: string } | null }
type Order = {
  id: string
  status: string
  payment_status: string | null
  total: number
  delivery_address: string | null
  created_at: string
  order_items: OrderItem[]
}
type Subscription = {
  status: string
  quantity: number
  frequency: string
  next_delivery: string | null
  product: { name: string; price: number } | null
}

const statusConfig = {
  pending: { label: 'Pending', color: 'bg-amber-100 text-amber-700', icon: Clock },
  processing: { label: 'Processing', color: 'bg-blue-100 text-blue-700', icon: Package },
  out_for_delivery: { label: 'Out for Delivery', color: 'bg-[#e0f7fa] text-[#0097a7]', icon: Truck },
  delivered: { label: 'Delivered', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700', icon: XCircle },
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}


export default function DashboardPage() {
  const [userName, setUserName] = useState('Customer')
  const [walletBalance, setWalletBalance] = useState<number>(0)
  const [orderCount, setOrderCount] = useState(0)
  const [jugsOrdered, setJugsOrdered] = useState(0)
  const [totalSpent, setTotalSpent] = useState(0)
  const [recentOrders, setRecentOrders] = useState<Order[]>([])
  const [latestActiveOrder, setLatestActiveOrder] = useState<Order | null>(null)
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [statusDismissed, setStatusDismissed] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          setLoading(false)
          return
        }

        const userId = session.user.id
        const name = session.user.user_metadata?.name || session.user.email || 'Customer'
        setUserName(name.split(' ')[0])

        // Load profile and orders in parallel
        const [profileRes, ordersRes] = await Promise.all([
          supabase.from('profiles').select('wallet_balance').eq('id', userId).maybeSingle(),
          supabase
            .from('orders')
            .select('id, status, payment_status, total, delivery_address, created_at, order_items(quantity, product:products(name))')
            .eq('user_id', userId)
            .order('created_at', { ascending: false }),
        ])

        setWalletBalance(profileRes.data?.wallet_balance ?? 0)

        const orders = ordersRes.data ?? []
        setOrderCount(orders.length)

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const totalJugs = (orders as any[]).reduce((sum: number, o: any) => {
          return sum + (Array.isArray(o.order_items) ? o.order_items : []).reduce((s: number, item: any) => s + (item.quantity ?? 0), 0)
        }, 0)
        setJugsOrdered(totalJugs)

        // Count all orders toward totalSpent, not just 'paid' — paid status relies on webhook
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const spent = (orders as unknown as any[])
          .filter((o) => o.payment_status === 'paid' || o.payment_status === 'processing')
          .reduce((s: number, o: { total: number }) => s + Number(o.total ?? 0), 0)
        setTotalSpent(spent)
        setRecentOrders(orders.slice(0, 3) as unknown as Order[])

        const activeStatuses = ['pending', 'processing', 'out_for_delivery']
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const activeOrder = (orders as unknown as any[]).find((o: { status: string }) => activeStatuses.includes(o.status))
        if (activeOrder) setLatestActiveOrder(activeOrder as Order)

        // Load subscription (active OR paused — anything not cancelled)
        const { data: sub } = await supabase
          .from('subscriptions')
          .select('*, product:products(name, price)')
          .eq('user_id', userId)
          .neq('status', 'cancelled')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        // Normalise product field — Supabase FK join can return array or object
        if (sub) {
          const rawProduct = (sub as { product: Subscription['product'] | Subscription['product'][] }).product
          setSubscription({ ...sub, product: Array.isArray(rawProduct) ? (rawProduct[0] ?? null) : rawProduct } as Subscription)
        } else {
          setSubscription(null)
        }
      } catch (err) {
        console.error('Dashboard load error:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const getOrderItems = (order: Order) => {
    if (!order.order_items || order.order_items.length === 0) return 'No items'
    return order.order_items
      .map((item) => `${item.quantity}× ${item.product?.name ?? 'Item'}`)
      .join(', ')
  }

  const getNextDelivery = () => {
    if (!subscription?.next_delivery) return null
    return new Date(subscription.next_delivery).toLocaleDateString('en-CA', { weekday: 'long', month: 'short', day: 'numeric' })
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-br from-[#0097a7] to-[#1565c0] rounded-3xl p-8 h-40 animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="bg-white rounded-2xl h-24 animate-pulse border border-[#cce7f0]" />)}
        </div>
      </div>
    )
  }

  const nextDelivery = getNextDelivery()

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-[#0097a7] to-[#1565c0] rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden"
      >
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/10 animate-float-bubble" />
        <div className="absolute -bottom-4 -left-4 w-24 h-24 rounded-full bg-white/5" />
        <div className="relative">
          <p className="text-[#b3e5fc] text-sm mb-1">{getGreeting()} 👋</p>
          <h1 className="text-2xl sm:text-3xl font-extrabold mb-3">Welcome back, {userName}!</h1>
          {nextDelivery ? (
            <p className="text-[#b3e5fc] text-sm mb-5">
              Your next delivery is scheduled for <strong className="text-white">{nextDelivery}</strong>
            </p>
          ) : (
            <p className="text-[#b3e5fc] text-sm mb-5">
              You have no upcoming scheduled delivery. <strong className="text-white">Set up a subscription!</strong>
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            <Link href="/shop">
              <Button size="sm" className="bg-white text-[#0097a7] hover:bg-[#e0f7fa] font-semibold gap-2">
                <Droplets className="w-4 h-4" /> Quick Order
              </Button>
            </Link>
            <Link href="/dashboard/orders">
              <Button size="sm" className="bg-transparent border border-white/40 text-white hover:bg-white/15 gap-2">
                <Package className="w-4 h-4" /> Track Orders
              </Button>
            </Link>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { icon: Package,    label: 'Total Orders',   value: String(orderCount),           color: '#0097a7', bg: '#e0f7fa' },
          { icon: Droplets,   label: 'Jugs Ordered',   value: String(jugsOrdered),          color: '#1565c0', bg: '#e3f2fd' },
          { icon: DollarSign, label: 'Total Spent',     value: `$${totalSpent.toFixed(2)}`,  color: '#006064', bg: '#e0f2f1' },
          { icon: Wallet,     label: 'Wallet Balance',  value: `$${walletBalance.toFixed(2)}`, color: '#f59e0b', bg: '#fef3c7' },
        ].map((stat, i) => {
          const Icon = stat.icon
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="bg-white rounded-2xl p-5 border border-[#cce7f0] shadow-sm"
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: stat.bg }}>
                <Icon className="w-5 h-5" style={{ color: stat.color }} />
              </div>
              <p className="text-2xl font-extrabold text-[#0c2340]">{stat.value}</p>
              <p className="text-xs text-[#4a7fa5] mt-0.5">{stat.label}</p>
            </motion.div>
          )
        })}
      </div>

      {/* Active Order Status Alert */}
      <AnimatePresence>
        {latestActiveOrder && !statusDismissed && (() => {
          const statusKey = latestActiveOrder.status as keyof typeof statusConfig
          const s = statusConfig[statusKey] || statusConfig.pending
          const StatusIcon = s.icon
          const steps = [
            { key: 'pending',          label: 'Order Placed' },
            { key: 'processing',       label: 'Processing' },
            { key: 'out_for_delivery', label: 'Out for Delivery' },
            { key: 'delivered',        label: 'Delivered' },
          ]
          const currentStep = steps.findIndex(st => st.key === latestActiveOrder.status)
          return (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-white border border-[#cce7f0] rounded-2xl p-4 shadow-sm"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-[#0097a7]" />
                  <span className="text-sm font-bold text-[#0c2340]">Active Order #{latestActiveOrder.id.slice(0, 8).toUpperCase()}</span>
                  <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium ${s.color}`}>
                    <StatusIcon className="w-2.5 h-2.5" /> {s.label}
                  </span>
                </div>
                <button onClick={() => setStatusDismissed(true)} className="text-[#4a7fa5] hover:text-[#0c2340] text-xs">✕</button>
              </div>
              {/* Step tracker */}
              <div className="flex items-center gap-0">
                {steps.map((step, idx) => {
                  const done    = idx < currentStep
                  const active  = idx === currentStep
                  const last    = idx === steps.length - 1
                  return (
                    <div key={step.key} className="flex items-center flex-1 min-w-0">
                      <div className="flex flex-col items-center shrink-0">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all
                          ${done   ? 'bg-[#0097a7] text-white' :
                            active ? 'bg-[#1565c0] text-white ring-2 ring-[#1565c0]/30 ring-offset-1' :
                            'bg-[#f0f9ff] text-[#4a7fa5] border border-[#cce7f0]'}`}>
                          {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : idx + 1}
                        </div>
                        <span className={`text-[9px] mt-1 font-medium text-center leading-tight max-w-[60px]
                          ${active ? 'text-[#1565c0]' : done ? 'text-[#0097a7]' : 'text-[#4a7fa5]'}`}>
                          {step.label}
                        </span>
                      </div>
                      {!last && (
                        <div className={`flex-1 h-0.5 mx-1 mt-[-14px] ${idx < currentStep ? 'bg-[#0097a7]' : 'bg-[#e0f7fa]'}`} />
                      )}
                    </div>
                  )
                })}
              </div>
            </motion.div>
          )
        })()}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-2 bg-white rounded-3xl border border-[#cce7f0] shadow-sm overflow-hidden"
        >
          <div className="flex items-center justify-between p-5 border-b border-[#cce7f0]">
            <h3 className="font-bold text-[#0c2340] flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-[#0097a7]" /> Recent Orders
            </h3>
            <Link href="/dashboard/orders" className="text-xs text-[#0097a7] hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {recentOrders.length === 0 ? (
            <div className="p-8 text-center">
              <Package className="w-10 h-10 text-[#cce7f0] mx-auto mb-3" />
              <p className="text-sm text-[#4a7fa5]">No orders yet</p>
              <Link href="/shop">
                <Button size="sm" className="mt-3 bg-gradient-to-r from-[#0097a7] to-[#1565c0] text-white gap-2">
                  <Droplets className="w-3 h-3" /> Shop Now
                </Button>
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-[#f0f9ff]">
              {recentOrders.map((order) => {
                const statusKey = order.status as keyof typeof statusConfig
                const status = statusConfig[statusKey] || statusConfig.pending
                return (
                  <div key={order.id} className="flex items-center gap-4 px-5 py-3.5">
                    <div className="w-9 h-9 rounded-xl bg-[#e0f7fa] flex items-center justify-center shrink-0">
                      <Droplets className="w-4 h-4 text-[#0097a7]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[#0c2340] text-sm">#{order.id.slice(0, 8).toUpperCase()}</p>
                      <p className="text-xs text-[#4a7fa5] truncate">{getOrderItems(order)}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-[#0c2340] text-sm">${Number(order.total).toFixed(2)}</p>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${status.color}`}>{status.label}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </motion.div>

        {/* Subscription status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-3xl border border-[#cce7f0] shadow-sm overflow-hidden"
        >
          <div className="p-5 border-b border-[#cce7f0]">
            <h3 className="font-bold text-[#0c2340] flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-[#0097a7]" /> My Subscription
            </h3>
          </div>
          {subscription ? (
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#4a7fa5]">Status</span>
                <Badge className={subscription.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}>
                  {subscription.status === 'active' ? 'Active' : 'Paused'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#4a7fa5]">Plan</span>
                <span className="text-sm font-semibold text-[#0c2340]">{subscription.quantity} jugs / {subscription.frequency}</span>
              </div>
              {subscription.next_delivery && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#4a7fa5]">Next Delivery</span>
                  <span className="text-sm font-semibold text-[#0c2340]">
                    {new Date(subscription.next_delivery).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              )}
              {subscription.product && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#4a7fa5]">Per Delivery</span>
                  <span className="text-sm font-semibold text-[#0097a7]">
                    ${(subscription.quantity * Number(subscription.product.price)).toFixed(2)}
                  </span>
                </div>
              )}
              <div className="bg-[#e0f7fa] rounded-xl p-3 flex items-center gap-2">
                <Truck className="w-4 h-4 text-[#0097a7] shrink-0" />
                <p className="text-xs text-[#0097a7] capitalize">{subscription.frequency} delivery</p>
              </div>
              <Link href="/dashboard/subscription">
                <Button variant="outline" size="sm" className="w-full border-[#cce7f0] text-[#0097a7]">Manage Subscription</Button>
              </Link>
            </div>
          ) : (
            <div className="p-5 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-[#e0f7fa] flex items-center justify-center mx-auto">
                <RefreshCw className="w-6 h-6 text-[#0097a7]" />
              </div>
              <div>
                <p className="font-semibold text-[#0c2340] text-sm">No active subscription</p>
                <p className="text-xs text-[#4a7fa5] mt-1">Set up auto-delivery and save up to 15%</p>
              </div>
              <Link href="/shop">
                <Button size="sm" className="w-full bg-gradient-to-r from-[#0097a7] to-[#1565c0] text-white">
                  Start Subscription
                </Button>
              </Link>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}

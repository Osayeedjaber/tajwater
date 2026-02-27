'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { ShoppingBag, RefreshCw, Droplets, ArrowRight, Truck, Package, CheckCircle2, Wallet, Star, XCircle, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'

type OrderItem = { quantity: number; product: { name: string } | null }
type Order = {
  id: string
  status: string
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
  const [loyaltyPoints, setLoyaltyPoints] = useState<number>(0)
  const [orderCount, setOrderCount] = useState(0)
  const [jugsOrdered, setJugsOrdered] = useState(0)
  const [recentOrders, setRecentOrders] = useState<Order[]>([])
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const userId = session.user.id
      const name = session.user.user_metadata?.name || session.user.email || 'Customer'
      setUserName(name.split(' ')[0])

      // Load profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('wallet_balance')
        .eq('id', userId)
        .single()

      const walletBal = profile?.wallet_balance ?? 0
      if (profile) setWalletBalance(walletBal)

      // Load orders with items for stats + recent
      const { data: orders } = await supabase
        .from('orders')
        .select('id, status, total, delivery_address, created_at, order_items(quantity, product:products(name))')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (orders) {
        setOrderCount(orders.length)
        const totalJugs = orders.reduce((sum, o) => {
          return sum + (o.order_items || []).reduce((s, item) => s + item.quantity, 0)
        }, 0)
        setJugsOrdered(totalJugs)
        setLoyaltyPoints(Math.floor(walletBal * 10 + orders.length * 20))
        setRecentOrders(orders.slice(0, 3) as unknown as Order[])
      }

      // Load subscription
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('*, product:products(name, price)')
        .eq('user_id', userId)
        .eq('status', 'active')
        .maybeSingle()

      setSubscription(sub || null)
      setLoading(false)
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
          { icon: Package, label: 'Total Orders', value: String(orderCount), color: '#0097a7', bg: '#e0f7fa' },
          { icon: Droplets, label: 'Jugs Ordered', value: String(jugsOrdered), color: '#1565c0', bg: '#e3f2fd' },
          { icon: Wallet, label: 'Wallet Balance', value: `$${walletBalance.toFixed(2)}`, color: '#006064', bg: '#e0f2f1' },
          { icon: Star, label: 'Loyalty Points', value: String(loyaltyPoints), color: '#00acc1', bg: '#e0f7fa' },
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

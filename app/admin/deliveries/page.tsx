'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Truck, MapPin, Calendar, Users, Clock, RefreshCw, CheckCircle2, Package, Printer, Filter } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'

type DeliveryOrder = {
  id: string
  status: string
  driver_name: string | null
  zones: { name: string } | { name: string }[] | null
  total: number
  delivery_address: string | null
  notes: string | null
  created_at: string
}

function getZoneName(zones: DeliveryOrder['zones']): string {
  if (!zones) return 'Unknown'
  return Array.isArray(zones) ? (zones[0]?.name ?? 'Unknown') : (zones.name ?? 'Unknown')
}

type ZoneStat = {
  name: string
  total: number
  delivered: number
  inTransit: number
  pending: number
  drivers: string[]
}

type DriverStat = {
  name: string
  delivered: number
  inTransit: number
  pending: number
}

const STATUS_STYLE: Record<string, string> = {
  delivered:        'bg-green-100 text-green-700',
  out_for_delivery: 'bg-[#e0f7fa] text-[#0097a7]',
  processing:       'bg-blue-100 text-blue-700',
  pending:          'bg-amber-100 text-amber-700',
  cancelled:        'bg-red-100 text-red-600',
}

function fmtDate(ts: string) {
  return new Date(ts).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}
function shortId(id: string) { return '#TW-' + id.slice(-6).toUpperCase() }

export default function DeliveriesPage() {
  const [orders,       setOrders]       = useState<DeliveryOrder[]>([])
  const [loading,      setLoading]      = useState(true)
  const [todayOnly,    setTodayOnly]    = useState(false)

  const fetchData = async () => {
    setLoading(true)

    // Fetch ALL active orders (not just today — show everything in the pipeline)
    const { data, error } = await supabase
      .from('orders')
      .select('id, status, driver_name, total, delivery_address, notes, created_at, zones(name)')
      .in('status', ['pending', 'processing', 'out_for_delivery', 'delivered'])
      .order('created_at', { ascending: false })
      .limit(300)

    if (error) { setLoading(false); return }
    setOrders((data ?? []) as unknown as DeliveryOrder[])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)

  // "Today" filter: today's orders + all out_for_delivery regardless of date
  const displayOrders = todayOnly
    ? orders.filter(o => new Date(o.created_at) >= todayStart || o.status === 'out_for_delivery')
    : orders

  // KPIs from displayed orders
  const stats = {
    total:      displayOrders.length,
    delivered:  displayOrders.filter(o => o.status === 'delivered').length,
    inTransit:  displayOrders.filter(o => o.status === 'out_for_delivery').length,
    pending:    displayOrders.filter(o => o.status === 'pending' || o.status === 'processing').length,
  }

  // Zone breakdown (respects filter)
  const zoneMap: Record<string, ZoneStat> = {}
  for (const o of displayOrders) {
    const zone = getZoneName(o.zones)
    if (!zoneMap[zone]) zoneMap[zone] = { name: zone, total: 0, delivered: 0, inTransit: 0, pending: 0, drivers: [] }
    zoneMap[zone].total += 1
    if (o.status === 'delivered')        zoneMap[zone].delivered  += 1
    if (o.status === 'out_for_delivery') zoneMap[zone].inTransit  += 1
    if (o.status === 'pending' || o.status === 'processing') zoneMap[zone].pending += 1
    if (o.driver_name && !zoneMap[zone].drivers.includes(o.driver_name)) {
      zoneMap[zone].drivers.push(o.driver_name)
    }
  }
  const zones = Object.values(zoneMap).sort((a, b) => b.total - a.total)

  // Driver breakdown (respects filter)
  const driverMap: Record<string, DriverStat> = {}
  for (const o of displayOrders) {
    const d = o.driver_name?.trim() || null
    if (!d) continue
    if (!driverMap[d]) driverMap[d] = { name: d, delivered: 0, inTransit: 0, pending: 0 }
    if (o.status === 'delivered')        driverMap[d].delivered  += 1
    if (o.status === 'out_for_delivery') driverMap[d].inTransit  += 1
    if (o.status === 'pending' || o.status === 'processing') driverMap[d].pending += 1
  }
  const drivers = Object.values(driverMap)

  const unassigned = displayOrders.filter(o =>
    ['pending', 'processing', 'out_for_delivery'].includes(o.status) && !o.driver_name
  )

  // Manifest orders: today's deliveries grouped by zone (for printing)
  const manifestOrders = orders.filter(o =>
    new Date(o.created_at) >= todayStart || o.status === 'out_for_delivery'
  )
  const manifestByZone: Record<string, DeliveryOrder[]> = {}
  for (const o of manifestOrders) {
    const z = getZoneName(o.zones)
    if (!manifestByZone[z]) manifestByZone[z] = []
    manifestByZone[z].push(o)
  }

  return (
    <div className="space-y-6 print:space-y-0">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 print:hidden">
        <div>
          <h2 className="text-2xl font-extrabold text-[#0c2340]">Delivery Management</h2>
          <p className="text-sm text-[#4a7fa5]">Live order pipeline · {orders.length} active orders tracked</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={() => setTodayOnly(v => !v)}
            className={`border-[#cce7f0] gap-1.5 ${todayOnly ? 'bg-[#0097a7] text-white border-[#0097a7]' : 'text-[#4a7fa5]'}`}>
            <Filter className="w-3.5 h-3.5" /> Today Only
          </Button>
          <Button size="sm" variant="outline" onClick={() => window.print()}
            className="border-[#cce7f0] text-[#4a7fa5] gap-1.5">
            <Printer className="w-3.5 h-3.5" /> Print Manifest
          </Button>
          <Button size="sm" variant="outline" onClick={fetchData} className="border-[#cce7f0] text-[#4a7fa5]">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Print-only manifest */}
      <div className="hidden print:block text-black text-sm font-sans">
        <div className="flex items-center justify-between border-b-2 border-black pb-2 mb-4">
          <div>
            <h1 className="text-xl font-bold">TajWater — Delivery Manifest</h1>
            <p className="text-xs">{new Date().toLocaleDateString('en-CA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
          <div className="text-right text-xs">
            <p>Total orders: {manifestOrders.length}</p>
            <p>Printed: {new Date().toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
        </div>
        {Object.entries(manifestByZone).map(([zone, zoneOrders]) => (
          <div key={zone} className="mb-5">
            <h2 className="font-bold text-base border-b border-gray-300 pb-1 mb-2">{zone} ({zoneOrders.length} stops)</h2>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="text-left p-1.5 border border-gray-300 w-20">Order</th>
                  <th className="text-left p-1.5 border border-gray-300">Address</th>
                  <th className="text-left p-1.5 border border-gray-300">Driver</th>
                  <th className="text-left p-1.5 border border-gray-300">Status</th>
                  <th className="text-left p-1.5 border border-gray-300">Notes</th>
                  <th className="text-right p-1.5 border border-gray-300 w-16">Total</th>
                </tr>
              </thead>
              <tbody>
                {zoneOrders.map(o => (
                  <tr key={o.id} className="border border-gray-200">
                    <td className="p-1.5 border border-gray-200 font-mono font-bold">{shortId(o.id)}</td>
                    <td className="p-1.5 border border-gray-200">{o.delivery_address ?? '—'}</td>
                    <td className="p-1.5 border border-gray-200">{o.driver_name ?? '—'}</td>
                    <td className="p-1.5 border border-gray-200 capitalize">{o.status.replace(/_/g, ' ')}</td>
                    <td className="p-1.5 border border-gray-200 text-gray-600">{o.notes ?? ''}</td>
                    <td className="p-1.5 border border-gray-200 text-right font-bold">${o.total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
        <p className="text-xs text-gray-500 mt-6 border-t pt-2">Driver signature: _________________________ Date: __________</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
        {[
          { label: "Today's Orders",  value: stats.total,     icon: Truck,        color: '#0097a7', bg: '#e0f7fa' },
          { label: 'Delivered',       value: stats.delivered, icon: CheckCircle2, color: '#22c55e', bg: '#f0fdf4' },
          { label: 'In Transit',      value: stats.inTransit, icon: MapPin,       color: '#1565c0', bg: '#e3f2fd' },
          { label: 'Pending',         value: stats.pending,   icon: Clock,        color: '#f59e0b', bg: '#fef3c7' },
        ].map((s, i) => {
          const Icon = s.icon
          return (
            <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
              className="bg-white rounded-2xl p-4 border border-[#cce7f0] shadow-sm">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-2" style={{ background: s.bg }}>
                <Icon className="w-4 h-4" style={{ color: s.color }} />
              </div>
              <p className={`text-2xl font-extrabold text-[#0c2340] ${loading ? 'opacity-40' : ''}`}>{loading ? '—' : s.value}</p>
              <p className="text-xs text-[#4a7fa5]">{s.label}</p>
            </motion.div>
          )
        })}
      </div>

      {/* Unassigned alert */}
      {!loading && unassigned.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border bg-amber-50 border-amber-200 print:hidden">
          <Clock className="w-4 h-4 shrink-0 text-amber-600" />
          <p className="text-sm font-medium text-amber-600">
            {unassigned.length} order{unassigned.length > 1 ? 's' : ''} with no driver assigned —
            go to <a href="/admin/orders" className="underline">Orders</a> to assign drivers
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:hidden">
        {/* Zone breakdown */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-[#cce7f0] shadow-sm overflow-hidden">
          <div className="p-5 border-b border-[#cce7f0]">
            <h3 className="font-bold text-[#0c2340]">Zone Breakdown</h3>
            <p className="text-xs text-[#4a7fa5] mt-0.5">All active & pending orders per zone</p>
          </div>
          {loading ? (
            <div className="p-4 space-y-2">
              {[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-[#f0f9ff] rounded-xl animate-pulse" />)}
            </div>
          ) : zones.length === 0 ? (
            <div className="p-12 text-center">
              <Package className="w-8 h-8 text-[#cce7f0] mx-auto mb-2" />
              <p className="text-sm text-[#4a7fa5]">No orders in pipeline yet</p>
            </div>
          ) : (
            <div className="divide-y divide-[#f0f9ff]">
              {zones.map((zone, i) => {
                const pct = zone.total > 0 ? Math.round((zone.delivered / zone.total) * 100) : 0
                return (
                  <motion.div key={zone.name} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                    className="flex items-center gap-4 px-5 py-3.5">
                    <div className="w-8 h-8 rounded-lg bg-[#e0f7fa] flex items-center justify-center shrink-0">
                      <MapPin className="w-4 h-4 text-[#0097a7]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[#0c2340] text-sm">{zone.name}</p>
                      <p className="text-xs text-[#4a7fa5] truncate">
                        {zone.drivers.length > 0 ? zone.drivers.join(', ') : 'No driver assigned'}
                      </p>
                      <div className="w-full h-1 bg-[#e0f7fa] rounded-full mt-1.5">
                        <div className="h-full bg-[#0097a7] rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-[#0c2340] text-sm">{zone.delivered}/{zone.total}</p>
                      <p className="text-xs text-[#4a7fa5]">{pct}% done</p>
                    </div>
                    <div className="flex gap-1 flex-col items-end shrink-0">
                      {zone.inTransit > 0 && (
                        <Badge className="text-[10px] bg-[#e0f7fa] text-[#0097a7]">{zone.inTransit} transit</Badge>
                      )}
                      {zone.pending > 0 && (
                        <Badge className="text-[10px] bg-amber-100 text-amber-700">{zone.pending} pending</Badge>
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>

        {/* Driver summary */}
        <div className="bg-white rounded-3xl border border-[#cce7f0] shadow-sm overflow-hidden">
          <div className="p-5 border-b border-[#cce7f0]">
            <h3 className="font-bold text-[#0c2340] flex items-center gap-2">
              <Users className="w-4 h-4 text-[#0097a7]" /> Drivers
            </h3>
            <p className="text-xs text-[#4a7fa5] mt-0.5">Assigned via Orders page</p>
          </div>
          <div className="p-4 space-y-3">
            {loading ? (
              [...Array(3)].map((_, i) => <div key={i} className="h-14 bg-[#f0f9ff] rounded-xl animate-pulse" />)
            ) : drivers.length === 0 ? (
              <p className="text-sm text-[#4a7fa5] p-2">No drivers assigned yet. Assign drivers from the Orders page.</p>
            ) : (
              drivers.map((d, i) => {
                const total = d.delivered + d.inTransit + d.pending
                const pct = total > 0 ? Math.round((d.delivered / total) * 100) : 0
                return (
                  <motion.div key={d.name} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.07 }}
                    className="p-3 rounded-xl bg-[#f0f9ff]">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#0097a7] to-[#1565c0] flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {d.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-[#0c2340] text-sm truncate">{d.name}</p>
                        <p className="text-xs text-[#4a7fa5]">{d.delivered} done · {d.inTransit} transit · {d.pending} pending</p>
                      </div>
                    </div>
                    <div className="w-full h-1.5 bg-[#e0f7fa] rounded-full">
                      <div className="h-full bg-[#0097a7] rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </motion.div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* Orders in transit */}
      {!loading && displayOrders.filter(o => o.status === 'out_for_delivery').length > 0 && (
        <div className="bg-white rounded-3xl border border-[#cce7f0] shadow-sm overflow-hidden print:hidden">
          <div className="p-5 border-b border-[#cce7f0]">
            <h3 className="font-bold text-[#0c2340] flex items-center gap-2">
              <Truck className="w-4 h-4 text-[#0097a7]" /> Currently Out for Delivery
            </h3>
          </div>
          <div className="divide-y divide-[#f0f9ff]">
            {displayOrders.filter(o => o.status === 'out_for_delivery').map((o, i) => (
              <motion.div key={o.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                className="flex items-center gap-4 px-5 py-3">
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-xs font-bold text-[#0097a7]">{shortId(o.id)}</p>
                  <p className="text-xs text-[#4a7fa5]">{getZoneName(o.zones) === 'Unknown' ? '—' : getZoneName(o.zones)} · {o.delivery_address ?? 'No address'}</p>
                  {o.notes && <p className="text-xs text-amber-700 bg-amber-50 rounded px-1.5 py-0.5 mt-0.5 truncate max-w-xs">📋 {o.notes}</p>}
                </div>
                <p className="text-xs text-[#4a7fa5] shrink-0">{o.driver_name ?? 'Unassigned'}</p>
                <p className="font-bold text-[#0c2340] text-sm shrink-0">${o.total.toFixed(2)}</p>
                <Badge className="text-[10px] bg-[#e0f7fa] text-[#0097a7] shrink-0">In Transit</Badge>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

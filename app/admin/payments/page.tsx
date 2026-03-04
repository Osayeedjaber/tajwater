'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  DollarSign, TrendingUp, Clock, XCircle, Download,
  RefreshCw, Search, CheckCircle2, Package, CreditCard,
  RotateCcw, AlertTriangle, ExternalLink
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase'
import { exportCSV } from '@/lib/csv'

type TxnRow = {
  id: string
  user_id: string | null
  status: string
  payment_status: string | null
  total: number
  refund_amount: number | null
  created_at: string
  customer_name: string | null
  stripe_payment_intent_id: string | null
  zones: { name: string } | { name: string }[] | null
  profile: { name: string } | null
}

function getZoneName(zones: TxnRow['zones']): string {
  if (!zones) return '—'
  return Array.isArray(zones) ? (zones[0]?.name ?? '—') : (zones.name ?? '—')
}
function shortId(id: string) { return '#TW-' + id.slice(-6).toUpperCase() }
function fmtDate(ts: string) {
  return new Date(ts).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })
}

function paymentBadge(ps: string | null): { label: string; color: string } {
  switch (ps) {
    case 'paid':     return { label: 'Paid',     color: 'bg-green-100 text-green-700' }
    case 'refunded': return { label: 'Refunded', color: 'bg-red-100 text-red-600' }
    case 'failed':   return { label: 'Failed',   color: 'bg-gray-100 text-gray-500' }
    case 'disputed': return { label: 'Disputed', color: 'bg-orange-100 text-orange-700' }
    default:         return { label: 'Pending',  color: 'bg-amber-100 text-amber-700' }
  }
}

const FILTER_OPTIONS = ['all', 'paid', 'pending', 'failed', 'refunded', 'disputed']

type RefundDialog = { orderId: string; total: number; amount: string; loading: boolean; error: string }

export default function PaymentsPage() {
  const [txns,        setTxns]        = useState<TxnRow[]>([])
  const [loading,     setLoading]     = useState(true)
  const [search,      setSearch]      = useState('')
  const [filter,      setFilter]      = useState('all')
  const [toast,       setToast]       = useState('')
  const [refundDlg,   setRefundDlg]   = useState<RefundDialog | null>(null)

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const openRefund = (txn: TxnRow) => {
    setRefundDlg({ orderId: txn.id, total: txn.total, amount: txn.total.toFixed(2), loading: false, error: '' })
  }

  const submitRefund = async () => {
    if (!refundDlg) return
    const amt = parseFloat(refundDlg.amount)
    if (isNaN(amt) || amt <= 0 || amt > refundDlg.total) {
      setRefundDlg(d => d ? { ...d, error: `Amount must be between $0.01 and $${refundDlg.total.toFixed(2)}` } : null)
      return
    }
    setRefundDlg(d => d ? { ...d, loading: true, error: '' } : null)
    const res = await fetch('/api/admin/refund', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_id: refundDlg.orderId, amount: amt }),
    })
    const json = await res.json()
    if (!res.ok) {
      setRefundDlg(d => d ? { ...d, loading: false, error: json.error ?? 'Refund failed' } : null)
      return
    }
    setTxns(prev => prev.map(t =>
      t.id === refundDlg.orderId
        ? { ...t, payment_status: 'refunded', status: 'cancelled', refund_amount: amt }
        : t
    ))
    setRefundDlg(null)
    showToast(`Refund of $${amt.toFixed(2)} processed`)
  }

  const fetchData = async () => {
    setLoading(true)

    const { data: rows, error } = await supabase
      .from('orders')
      .select('id, user_id, status, payment_status, total, refund_amount, created_at, customer_name, stripe_payment_intent_id, zones(name)')
      .order('created_at', { ascending: false })
      .limit(300)

    if (error) { console.error(error); setLoading(false); return }

    const orderRows = (rows ?? []) as Omit<TxnRow, 'profile'>[]

    // Resolve profile names for logged-in customers
    const uids = [...new Set(orderRows.map(o => o.user_id).filter(Boolean))] as string[]
    const profMap: Record<string, { name: string }> = {}
    if (uids.length > 0) {
      const { data: profs } = await supabase.from('profiles').select('id, name').in('id', uids)
      profs?.forEach((p: { id: string; name: string }) => { profMap[p.id] = p })
    }

    setTxns(orderRows.map(o => ({
      ...o,
      profile: o.user_id ? (profMap[o.user_id] ?? null) : null,
    })))
    setLoading(false)
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchData() }, [])

  // ── Revenue stats ────────────────────────────────────────────────────────
  const now        = new Date()
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const paidTxns      = txns.filter(t => t.payment_status === 'paid')
  const todayRevenue  = paidTxns.filter(t => new Date(t.created_at) >= todayStart).reduce((s, t) => s + t.total, 0)
  const monthRevenue  = paidTxns.filter(t => new Date(t.created_at) >= monthStart).reduce((s, t) => s + t.total, 0)
  const pendingAmount = txns.filter(t => !t.payment_status || t.payment_status === 'pending').reduce((s, t) => s + t.total, 0)
  const refundAmount  = txns.filter(t => t.payment_status === 'refunded' && new Date(t.created_at) >= monthStart).reduce((s, t) => s + (t.refund_amount ?? t.total), 0)

  // ── Filter ───────────────────────────────────────────────────────────────
  const filtered = txns
    .filter(t => filter === 'all' || (t.payment_status ?? 'pending') === filter)
    .filter(t => {
      const q = search.toLowerCase()
      return (
        shortId(t.id).toLowerCase().includes(q) ||
        (t.profile?.name ?? t.customer_name ?? '').toLowerCase().includes(q) ||
        getZoneName(t.zones).toLowerCase().includes(q) ||
        (t.stripe_payment_intent_id ?? '').toLowerCase().includes(q)
      )
    })

  const filterCounts = FILTER_OPTIONS.reduce((acc, f) => {
    acc[f] = f === 'all' ? txns.length : txns.filter(t => (t.payment_status ?? 'pending') === f).length
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="space-y-5 relative">
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 right-6 z-50 flex items-center gap-2 bg-[#0097a7] text-white px-4 py-3 rounded-2xl shadow-xl text-sm font-medium">
            <CheckCircle2 className="w-4 h-4" /> {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Refund Dialog */}
      <AnimatePresence>
        {refundDlg && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => !refundDlg.loading && setRefundDlg(null)}
              className="fixed inset-0 bg-black/40 z-40" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl shadow-2xl border border-[#cce7f0] p-6 w-full max-w-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                  <RotateCcw className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <h3 className="font-bold text-[#0c2340]">Issue Refund</h3>
                  <p className="text-xs text-[#4a7fa5]">Order total: ${refundDlg.total.toFixed(2)}</p>
                </div>
              </div>
              <label className="text-xs font-medium text-[#4a7fa5] mb-1.5 block">Refund amount ($)</label>
              <Input
                type="number"
                min="0.01"
                max={refundDlg.total}
                step="0.01"
                value={refundDlg.amount}
                onChange={e => setRefundDlg(d => d ? { ...d, amount: e.target.value, error: '' } : null)}
                className="border-[#cce7f0] mb-3"
              />
              {refundDlg.error && (
                <p className="text-xs text-red-500 mb-3 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{refundDlg.error}</p>
              )}
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setRefundDlg(null)} disabled={refundDlg.loading}
                  className="flex-1 border-[#cce7f0] text-[#4a7fa5]">Cancel</Button>
                <Button size="sm" onClick={submitRefund} disabled={refundDlg.loading}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white">
                  {refundDlg.loading ? 'Processing…' : 'Confirm Refund'}
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-[#0c2340]">Payments</h2>
          <p className="text-sm text-[#4a7fa5]">Stripe-powered · auto-updated via webhooks · live from Supabase</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={fetchData} className="border-[#cce7f0] text-[#4a7fa5]">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            size="sm" variant="outline" className="border-[#cce7f0] text-[#4a7fa5] gap-2"
            onClick={() => exportCSV('payments.csv', filtered.map(t => ({
              id: shortId(t.id),
              customer: t.profile?.name ?? t.customer_name ?? 'Guest',
              zone: getZoneName(t.zones),
              amount: t.total.toFixed(2),
              payment_status: t.payment_status ?? 'pending',
              stripe_pi: t.stripe_payment_intent_id ?? '—',
              date: fmtDate(t.created_at),
            })))}
          >
            <Download className="w-4 h-4" /> Export
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Today's Revenue",  value: `$${todayRevenue.toFixed(2)}`,  icon: DollarSign, color: '#0097a7', bg: '#e0f7fa' },
          { label: 'This Month',       value: `$${monthRevenue.toFixed(2)}`,  icon: TrendingUp, color: '#1565c0', bg: '#e3f2fd' },
          { label: 'Awaiting Payment', value: `$${pendingAmount.toFixed(2)}`, icon: Clock,      color: '#f59e0b', bg: '#fef3c7' },
          { label: 'Refunds (month)',  value: `$${refundAmount.toFixed(2)}`,  icon: XCircle,    color: '#ef4444', bg: '#fef2f2' },
        ].map((s, i) => {
          const Icon = s.icon
          return (
            <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
              className="bg-white rounded-2xl p-4 border border-[#cce7f0] shadow-sm">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-2" style={{ background: s.bg }}>
                <Icon className="w-4 h-4" style={{ color: s.color }} />
              </div>
              <p className={`text-xl font-extrabold text-[#0c2340] ${loading ? 'opacity-40' : ''}`}>{loading ? '—' : s.value}</p>
              <p className="text-xs text-[#4a7fa5]">{s.label}</p>
            </motion.div>
          )
        })}
      </div>

      {/* Stripe note */}
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#f0f9ff] border border-[#cce7f0] text-xs text-[#4a7fa5]">
        <CreditCard className="w-4 h-4 text-[#0097a7] shrink-0" />
        Payment statuses update automatically when Stripe fires webhooks (<code className="bg-white px-1 py-0.5 rounded text-[#0097a7]">payment_intent.succeeded</code>, <code className="bg-white px-1 py-0.5 rounded text-[#0097a7]">charge.refunded</code>). Configure your webhook at <strong className="text-[#0c2340]">stripe.com/webhooks</strong> → endpoint: <code className="text-[#0097a7]">/api/stripe/webhook</code>
      </div>

      {/* Disputes alert */}
      {txns.filter(t => t.payment_status === 'disputed').length > 0 && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-orange-50 border border-orange-200 text-xs text-orange-700">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">
              {txns.filter(t => t.payment_status === 'disputed').length} disputed payment{txns.filter(t => t.payment_status === 'disputed').length > 1 ? 's' : ''} require attention
            </p>
            <p className="mt-0.5 text-orange-600">
              Use the &quot;Stripe&quot; button on each disputed row to submit evidence in the Stripe Dashboard. Disputes must be responded to within 7–10 days.
            </p>
          </div>
        </div>
      )}

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#0097a7]" />
          <Input
            placeholder="Search by order ID, customer, zone, or Stripe PI..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10 border-[#cce7f0] bg-white"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {FILTER_OPTIONS.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-2 rounded-xl text-xs font-medium transition-all capitalize ${
                filter === f ? 'bg-[#0097a7] text-white' : 'bg-white border border-[#cce7f0] text-[#4a7fa5] hover:border-[#0097a7]'
              }`}>
              {f}
              {filterCounts[f] > 0 && (
                <span className={`ml-1.5 text-[10px] ${filter === f ? 'opacity-70' : 'text-[#0097a7]'}`}>
                  {filterCounts[f]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Transaction table */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => <div key={i} className="h-12 bg-white rounded-2xl border border-[#cce7f0] animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-3xl border border-[#cce7f0] p-16 text-center">
          <Package className="w-10 h-10 text-[#cce7f0] mx-auto mb-3" />
          <p className="text-[#4a7fa5] font-medium">No transactions yet</p>
          <p className="text-xs text-[#4a7fa5] mt-1">Transactions appear here automatically once customers place orders and pay via Stripe</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-[#cce7f0] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#f0f9ff] border-b border-[#cce7f0]">
                <tr>
                  {[
                    { label: 'Order',     cls: '' },
                    { label: 'Customer',  cls: '' },
                    { label: 'Zone',      cls: 'hidden sm:table-cell' },
                    { label: 'Amount',    cls: '' },
                    { label: 'Payment',   cls: '' },
                    { label: 'Stripe PI', cls: 'hidden lg:table-cell' },
                    { label: 'Date',      cls: 'hidden sm:table-cell' },
                    { label: 'Actions',   cls: '' },
                  ].map(h => (
                    <th key={h.label} className={`px-4 py-3 text-left text-xs font-semibold text-[#4a7fa5] uppercase tracking-wider whitespace-nowrap ${h.cls}`}>{h.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f9ff]">
                {filtered.map((txn, i) => {
                  const pb = paymentBadge(txn.payment_status)
                  const customerName = txn.profile?.name ?? txn.customer_name ?? 'Guest'
                  return (
                    <motion.tr key={txn.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                      className="hover:bg-[#f0f9ff] transition-colors">
                      <td className="px-4 py-3 font-mono text-xs font-bold text-[#0097a7]">{shortId(txn.id)}</td>
                      <td className="px-4 py-3 font-medium text-[#0c2340] max-w-[110px] truncate">{customerName}</td>
                      <td className="hidden sm:table-cell px-4 py-3 text-[#4a7fa5] text-xs">{getZoneName(txn.zones)}</td>
                      <td className="px-4 py-3 font-bold text-[#0c2340] whitespace-nowrap">${txn.total.toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <Badge className={`text-[10px] ${pb.color}`}>{pb.label}</Badge>
                      </td>
                      <td className="hidden lg:table-cell px-4 py-3 font-mono text-[10px] text-[#4a7fa5] max-w-[140px] truncate">
                        {txn.stripe_payment_intent_id ?? '—'}
                      </td>
                      <td className="hidden sm:table-cell px-4 py-3 text-xs text-[#4a7fa5] whitespace-nowrap">{fmtDate(txn.created_at)}</td>
                      <td className="px-4 py-3">
                        {txn.payment_status === 'paid' && (
                          <Button size="sm" variant="outline" onClick={() => openRefund(txn)}
                            className="border-red-200 text-red-500 hover:bg-red-50 h-7 text-xs gap-1">
                            <RotateCcw className="w-3 h-3" /> Refund
                          </Button>
                        )}
                        {txn.payment_status === 'disputed' && txn.stripe_payment_intent_id && (
                          <a href={`https://dashboard.stripe.com/payments/${txn.stripe_payment_intent_id}`}
                            target="_blank" rel="noreferrer">
                            <Button size="sm" variant="outline"
                              className="border-orange-200 text-orange-600 hover:bg-orange-50 h-7 text-xs gap-1">
                              <ExternalLink className="w-3 h-3" /> Stripe
                            </Button>
                          </a>
                        )}
                      </td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Footer totals */}
          <div className="px-5 py-3 border-t border-[#cce7f0] bg-[#f0f9ff] flex items-center justify-between">
            <p className="text-xs text-[#4a7fa5]">{filtered.length} transactions</p>
            <p className="text-sm font-bold text-[#0c2340]">
              Shown total: <span className="text-[#0097a7]">
                ${filtered.reduce((s, t) => s + t.total, 0).toFixed(2)}
              </span>
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

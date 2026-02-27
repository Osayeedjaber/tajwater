'use client'

import { useState, useEffect, use } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Mail, Phone, MapPin, ShoppingBag, Send,
  Package, CheckCircle2, Clock, Truck, XCircle,
  MessageSquare, AlertCircle, User, Calendar, Wallet,
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { supabase } from '@/lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Profile {
  id: string
  name: string | null
  email: string | null
  phone: string | null
  delivery_address: string | null
  zone_id: string | null
  wallet_balance: number
  created_at: string
}

interface OrderRow {
  id: string
  status: string
  payment_status: string | null
  total: number
  delivery_address: string | null
  created_at: string
  order_items: { quantity: number; price: number; products: { name: string } | null }[]
}

interface EmailLog {
  id: string
  email_type: string
  subject: string
  status: string
  sent_by: string | null
  sent_at: string
}

interface Ticket {
  id: string
  subject: string
  message: string
  status: string
  created_at: string
  admin_reply: string | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(ts: string) {
  return new Date(ts).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })
}
function fmtDateTime(ts: string) {
  return new Date(ts).toLocaleString('en-CA', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}

const ORDER_STATUS: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  pending:          { label: 'Pending',         icon: Clock,        color: 'bg-amber-100 text-amber-700' },
  processing:       { label: 'Processing',      icon: Package,      color: 'bg-blue-100 text-blue-700' },
  out_for_delivery: { label: 'Out for Delivery', icon: Truck,       color: 'bg-[#e0f7fa] text-[#0097a7]' },
  delivered:        { label: 'Delivered',       icon: CheckCircle2, color: 'bg-green-100 text-green-700' },
  cancelled:        { label: 'Cancelled',       icon: XCircle,      color: 'bg-red-100 text-red-600' },
}

const TICKET_STATUS: Record<string, string> = {
  open:        'bg-amber-100 text-amber-700',
  in_progress: 'bg-blue-100 text-blue-700',
  resolved:    'bg-green-100 text-green-700',
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CustomerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)

  const [profile,  setProfile]  = useState<Profile | null>(null)
  const [orders,   setOrders]   = useState<OrderRow[]>([])
  const [emails,   setEmails]   = useState<EmailLog[]>([])
  const [tickets,  setTickets]  = useState<Ticket[]>([])
  const [loading,  setLoading]  = useState(true)

  // Compose modal
  const [composing,  setComposing]  = useState(false)
  const [subject,    setSubject]    = useState('')
  const [body,       setBody]       = useState('')
  const [sending,    setSending]    = useState(false)
  const [sendError,  setSendError]  = useState('')
  const [sendSuccess,setSendSuccess]= useState(false)
  const [adminEmail, setAdminEmail] = useState('')

  // Toast
  const [toast, setToast] = useState('')
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  // Load everything in parallel
  useEffect(() => {
    const load = async () => {
      // Get admin email for sent_by
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user?.email) setAdminEmail(session.user.email)

      const [profileRes, ordersRes, emailsRes, ticketsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', id).single(),
        supabase.from('orders')
          .select('id, status, payment_status, total, delivery_address, created_at, order_items(quantity, price, products(name))')
          .eq('user_id', id)
          .order('created_at', { ascending: false }),
        supabase.from('email_logs')
          .select('id, email_type, subject, status, sent_by, sent_at')
          .eq('user_id', id)
          .order('sent_at', { ascending: false }),
        supabase.from('tickets')
          .select('id, subject, message, status, created_at, admin_reply')
          .eq('user_id', id)
          .order('created_at', { ascending: false }),
      ])

      if (profileRes.data) setProfile(profileRes.data as Profile)
      setOrders((ordersRes.data as unknown as OrderRow[]) ?? [])
      setEmails((emailsRes.data ?? []) as EmailLog[])
      setTickets((ticketsRes.data ?? []) as Ticket[])
      setLoading(false)
    }
    load()
  }, [id])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile?.email) return
    setSending(true)
    setSendError('')

    const res = await fetch('/api/admin/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id:        profile.id,
        recipient_email: profile.email,
        recipient_name:  profile.name ?? '',
        subject,
        body,
        sent_by: adminEmail,
      }),
    })
    const data = await res.json()

    if (!res.ok) {
      setSendError(data.error ?? 'Failed to send')
      setSending(false)
      return
    }

    // Add to local emails list immediately
    setEmails(prev => [{
      id:         crypto.randomUUID(),
      email_type: 'admin_custom',
      subject,
      status:     'sent',
      sent_by:    adminEmail,
      sent_at:    new Date().toISOString(),
    }, ...prev])

    setSendSuccess(true)
    setSending(false)
    setSubject('')
    setBody('')
    setTimeout(() => { setSendSuccess(false); setComposing(false) }, 1500)
    showToast('Email sent successfully')
  }

  // ─── KPIs ────────────────────────────────────────────────────────────────

  const totalSpent   = orders.reduce((s, o) => s + Number(o.total), 0)
  const unpaidOrders = orders.filter(o => o.payment_status !== 'paid' && o.status !== 'cancelled')

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
          className="w-8 h-8 border-2 border-[#cce7f0] border-t-[#0097a7] rounded-full" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="text-center py-20">
        <p className="text-[#4a7fa5] font-medium">Customer not found.</p>
        <Link href="/admin/customers"><Button className="mt-4 bg-[#0097a7] text-white">Back to Customers</Button></Link>
      </div>
    )
  }

  const memberSince = fmtDate(profile.created_at)
  const ini = profile.name
    ? profile.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : (profile.email?.[0]?.toUpperCase() ?? '?')

  return (
    <div className="space-y-6 relative">

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 right-6 z-50 flex items-center gap-2 bg-[#0097a7] text-white px-4 py-3 rounded-2xl shadow-xl text-sm font-medium">
            <CheckCircle2 className="w-4 h-4" /> {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Back */}
      <Link href="/admin/customers">
        <Button variant="ghost" size="sm" className="gap-1 text-[#4a7fa5] -ml-2">
          <ArrowLeft className="w-4 h-4" /> Back to Customers
        </Button>
      </Link>

      {/* Header card */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl border border-[#cce7f0] shadow-sm p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#0097a7] to-[#1565c0] flex items-center justify-center text-white font-extrabold text-xl shrink-0">
            {ini}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-extrabold text-[#0c2340]">{profile.name ?? 'No name'}</h2>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-[#4a7fa5]">
              {profile.email   && <span className="flex items-center gap-1.5"><Mail    className="w-3.5 h-3.5 text-[#0097a7]" />{profile.email}</span>}
              {profile.phone   && <span className="flex items-center gap-1.5"><Phone   className="w-3.5 h-3.5 text-[#0097a7]" />{profile.phone}</span>}
              {profile.zone_id && <span className="flex items-center gap-1.5"><MapPin  className="w-3.5 h-3.5 text-[#0097a7]" />{profile.zone_id}</span>}
              <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-[#0097a7]" />Since {memberSince}</span>
            </div>
          </div>
          {profile.email && (
            <Button onClick={() => setComposing(true)} className="bg-gradient-to-r from-[#0097a7] to-[#1565c0] text-white gap-2 shrink-0">
              <Mail className="w-4 h-4" /> Compose
            </Button>
          )}
        </div>

        {/* KPI chips */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
          {[
            { icon: ShoppingBag, label: 'Orders',  value: orders.length,          color: '#0097a7', bg: '#e0f7fa' },
            { icon: User,        label: 'Spent',   value: `$${totalSpent.toFixed(2)}`, color: '#1565c0', bg: '#e3f2fd' },
            { icon: Mail,        label: 'Emails',  value: emails.length,           color: '#006064', bg: '#e0f2f1' },
            { icon: MessageSquare, label: 'Tickets', value: tickets.length,        color: '#00acc1', bg: '#e0f7fa' },
          ].map(k => {
            const Icon = k.icon
            return (
              <div key={k.label} className="flex items-center gap-3 bg-[#f8fbfe] rounded-2xl p-3 border border-[#cce7f0]">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: k.bg }}>
                  <Icon className="w-4 h-4" style={{ color: k.color }} />
                </div>
                <div>
                  <p className="font-extrabold text-[#0c2340] text-sm">{k.value}</p>
                  <p className="text-[10px] text-[#4a7fa5]">{k.label}</p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Outstanding payment banner */}
        {unpaidOrders.length > 0 && (
          <div className="mt-4 flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-3 text-sm">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="text-amber-700 font-medium">
              {unpaidOrders.length} outstanding payment{unpaidOrders.length > 1 ? 's' : ''} — total ${unpaidOrders.reduce((s, o) => s + Number(o.total), 0).toFixed(2)}
            </span>
          </div>
        )}

        {/* Extra profile details */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
          {profile.delivery_address && (
            <div className="bg-[#f0f9ff] rounded-xl p-3">
              <p className="text-[10px] text-[#4a7fa5] font-medium mb-0.5">Delivery Address</p>
              <p className="text-[#0c2340] font-medium text-xs">{profile.delivery_address}</p>
            </div>
          )}
          <div className="bg-[#f0f9ff] rounded-xl p-3">
            <p className="text-[10px] text-[#4a7fa5] font-medium mb-0.5 flex items-center gap-1"><Wallet className="w-3 h-3" /> Wallet Balance</p>
            <p className="text-[#0097a7] font-extrabold">${(profile.wallet_balance ?? 0).toFixed(2)}</p>
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <Tabs defaultValue="orders">
        <TabsList className="bg-[#e0f7fa] text-[#0097a7]">
          <TabsTrigger value="orders"  className="data-[state=active]:bg-[#0097a7] data-[state=active]:text-white">
            Orders ({orders.length})
          </TabsTrigger>
          <TabsTrigger value="emails"  className="data-[state=active]:bg-[#0097a7] data-[state=active]:text-white">
            Emails ({emails.length})
          </TabsTrigger>
          <TabsTrigger value="tickets" className="data-[state=active]:bg-[#0097a7] data-[state=active]:text-white">
            Tickets ({tickets.length})
          </TabsTrigger>
        </TabsList>

        {/* ── Orders tab ── */}
        <TabsContent value="orders" className="mt-4">
          {orders.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#cce7f0] p-10 text-center text-[#4a7fa5]">
              <ShoppingBag className="w-8 h-8 mx-auto mb-2 text-[#cce7f0]" />
              No orders yet
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((order, i) => {
                const s = ORDER_STATUS[order.status] ?? ORDER_STATUS.pending
                const Icon = s.icon
                const items = (order.order_items ?? []) as { quantity: number; price: number; products: { name: string } | null }[]
                return (
                  <motion.div key={order.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                    className="bg-white rounded-2xl border border-[#cce7f0] shadow-sm p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#e0f7fa] flex items-center justify-center shrink-0">
                        <Package className="w-5 h-5 text-[#0097a7]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="font-bold text-[#0c2340] font-mono text-sm">#{order.id.slice(0, 8).toUpperCase()}</span>
                          <Badge className={`text-[10px] flex items-center gap-1 ${s.color}`}>
                            <Icon className="w-3 h-3" /> {s.label}
                          </Badge>
                          {order.payment_status && (
                            <Badge className={`text-[10px] ${
                              order.payment_status === 'paid'     ? 'bg-green-100 text-green-700' :
                              order.payment_status === 'failed'   ? 'bg-red-100 text-red-600' :
                              order.payment_status === 'refunded' ? 'bg-red-100 text-red-600' :
                              'bg-amber-100 text-amber-700'
                            }`}>
                              {order.payment_status === 'paid' ? 'Paid' :
                               order.payment_status === 'failed' ? 'Failed' :
                               order.payment_status === 'refunded' ? 'Refunded' : 'Unpaid'}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-[#4a7fa5]">
                          {items.map(it => `${it.quantity}× ${it.products?.name ?? 'Item'}`).join(', ')}
                        </p>
                        <p className="text-xs text-[#4a7fa5] mt-0.5">{fmtDate(order.created_at)}</p>
                      </div>
                      <span className="font-extrabold text-[#0097a7]">${Number(order.total).toFixed(2)}</span>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* ── Emails tab ── */}
        <TabsContent value="emails" className="mt-4">
          {emails.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#cce7f0] p-10 text-center text-[#4a7fa5]">
              <Mail className="w-8 h-8 mx-auto mb-2 text-[#cce7f0]" />
              No emails sent yet
            </div>
          ) : (
            <div className="space-y-2">
              {emails.map((email, i) => (
                <motion.div key={email.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                  className="bg-white rounded-2xl border border-[#cce7f0] shadow-sm p-4 flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${email.status === 'sent' ? 'bg-green-100' : 'bg-red-100'}`}>
                    <Mail className={`w-4 h-4 ${email.status === 'sent' ? 'text-green-600' : 'text-red-500'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-0.5">
                      <span className="font-semibold text-[#0c2340] text-sm truncate">{email.subject}</span>
                      <Badge className={`text-[10px] shrink-0 ${email.status === 'sent' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                        {email.status === 'sent' ? '✓ Sent' : '✗ Failed'}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-x-3 text-[11px] text-[#4a7fa5]">
                      <span>{fmtDateTime(email.sent_at)}</span>
                      <span>·</span>
                      <span className="capitalize">{email.email_type.replace(/_/g, ' ')}</span>
                      <span>·</span>
                      <span>{email.sent_by ? `Sent by ${email.sent_by}` : 'System'}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Tickets tab ── */}
        <TabsContent value="tickets" className="mt-4">
          {tickets.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#cce7f0] p-10 text-center text-[#4a7fa5]">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 text-[#cce7f0]" />
              No support tickets
            </div>
          ) : (
            <div className="space-y-3">
              {tickets.map((ticket, i) => (
                <motion.div key={ticket.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  className="bg-white rounded-2xl border border-[#cce7f0] shadow-sm p-4">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="font-semibold text-[#0c2340] text-sm">{ticket.subject}</span>
                    <Badge className={`text-[10px] ${TICKET_STATUS[ticket.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {ticket.status.replace(/_/g, ' ')}
                    </Badge>
                    <span className="text-[11px] text-[#4a7fa5] ml-auto">{fmtDate(ticket.created_at)}</span>
                  </div>
                  <p className="text-xs text-[#4a7fa5] bg-[#f0f9ff] rounded-xl p-3">{ticket.message}</p>
                  {ticket.admin_reply && (
                    <p className="text-xs text-[#0097a7] bg-[#e0f7fa] border border-[#b3e5fc] rounded-xl p-3 mt-2">
                      <span className="font-semibold">Reply:</span> {ticket.admin_reply}
                    </p>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Compose modal */}
      <AnimatePresence>
        {composing && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
            onClick={(e) => { if (e.target === e.currentTarget) setComposing(false) }}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-6">
              <h3 className="font-extrabold text-[#0c2340] mb-1 flex items-center gap-2">
                <Mail className="w-5 h-5 text-[#0097a7]" /> Compose Email
              </h3>
              <p className="text-xs text-[#4a7fa5] mb-5">To: {profile.name ?? ''} &lt;{profile.email}&gt;</p>

              {sendError && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {sendError}
                </div>
              )}

              {sendSuccess ? (
                <div className="flex items-center justify-center gap-2 text-green-700 bg-green-50 rounded-2xl p-6">
                  <CheckCircle2 className="w-5 h-5" /> Email sent!
                </div>
              ) : (
                <form onSubmit={handleSend} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-[#0c2340] mb-1.5 block">Subject</label>
                    <Input
                      value={subject}
                      onChange={e => setSubject(e.target.value)}
                      placeholder="e.g. Delivery update for your area"
                      className="border-[#cce7f0]"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-[#0c2340] mb-1.5 block">Message</label>
                    <textarea
                      value={body}
                      onChange={e => setBody(e.target.value)}
                      rows={6}
                      placeholder="Type your message here..."
                      required
                      className="w-full rounded-xl border border-[#cce7f0] px-3 py-2.5 text-sm text-[#0c2340] focus:outline-none focus:border-[#0097a7] resize-none"
                    />
                  </div>
                  <div className="flex gap-3 pt-1">
                    <Button type="button" variant="outline" onClick={() => setComposing(false)} className="flex-1 border-[#cce7f0]">
                      Cancel
                    </Button>
                    <Button type="submit" disabled={sending} className="flex-1 bg-gradient-to-r from-[#0097a7] to-[#1565c0] text-white gap-2">
                      {sending ? (
                        <span className="flex items-center gap-2">
                          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                            className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                          Sending...
                        </span>
                      ) : (
                        <><Send className="w-4 h-4" /> Send Email</>
                      )}
                    </Button>
                  </div>
                </form>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

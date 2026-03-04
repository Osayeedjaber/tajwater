'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, RefreshCw, MessageSquare, CheckCircle2, Clock,
  AlertCircle, Send, User, ChevronDown, ChevronUp
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { supabase } from '@/lib/supabase'

type TicketRow = {
  id: string
  user_id: string | null
  subject: string
  message: string
  status: string
  admin_reply: string | null
  replied_at: string | null
  replied_by: string | null
  created_at: string
  profile: { name: string; email: string } | null
}

const STATUS_OPTIONS = ['all', 'open', 'in_progress', 'resolved']

const STATUS_STYLE: Record<string, { color: string; icon: React.ElementType }> = {
  open:        { color: 'bg-amber-100 text-amber-700',   icon: AlertCircle  },
  in_progress: { color: 'bg-blue-100 text-blue-700',     icon: Clock        },
  resolved:    { color: 'bg-green-100 text-green-700',   icon: CheckCircle2 },
}

function fmtDate(ts: string) {
  return new Date(ts).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function AdminTicketsPage() {
  const [tickets,   setTickets]   = useState<TicketRow[]>([])
  const [loading,   setLoading]   = useState(true)
  const [search,    setSearch]    = useState('')
  const [filter,    setFilter]    = useState('all')
  const [expanded,  setExpanded]  = useState<string | null>(null)
  const [reply,     setReply]     = useState<Record<string, string>>({})
  const [sending,   setSending]   = useState<string | null>(null)
  const [toast,     setToast]     = useState('')
  const [adminName, setAdminName] = useState('Admin')

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const fetchTickets = async () => {
    setLoading(true)
    const { data: rows, error } = await supabase
      .from('tickets')
      .select('id, user_id, subject, message, status, admin_reply, replied_at, replied_by, created_at')
      .order('created_at', { ascending: false })
      .limit(500)

    if (error) { setLoading(false); return }

    const ticketRows = (rows ?? []) as Omit<TicketRow, 'profile'>[]

    // Fetch profiles for all unique user_ids
    const userIds = [...new Set(ticketRows.map(t => t.user_id).filter(Boolean))] as string[]
    const profileMap: Record<string, { name: string; email: string }> = {}

    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, email')
        .in('id', userIds)
      profiles?.forEach((p: { id: string; name: string; email: string }) => {
        profileMap[p.id] = p
      })
    }

    setTickets(ticketRows.map(t => ({
      ...t,
      profile: t.user_id ? (profileMap[t.user_id] ?? null) : null
    })))
    setLoading(false)
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAdminName(localStorage.getItem('admin_name') || 'Admin')
     
    fetchTickets()
  }, [])

  const updateStatus = async (ticketId: string, status: string) => {
    const { error } = await supabase.from('tickets').update({ status }).eq('id', ticketId)
    if (!error) {
      setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status } : t))
      showToast(`Status → ${status.replace(/_/g, ' ')}`)
    }
  }

  const sendReply = async (ticket: TicketRow) => {
    const text = reply[ticket.id]?.trim()
    if (!text) return
    setSending(ticket.id)
    const now = new Date().toISOString()
    const { error } = await supabase.from('tickets').update({
      admin_reply: text,
      replied_at: now,
      replied_by: adminName,
      status: ticket.status === 'open' ? 'in_progress' : ticket.status,
    }).eq('id', ticket.id)

    if (!error) {
      setTickets(prev => prev.map(t => t.id === ticket.id ? {
        ...t,
        admin_reply: text,
        replied_at: now,
        replied_by: adminName,
        status: t.status === 'open' ? 'in_progress' : t.status,
      } : t))
      setReply(prev => ({ ...prev, [ticket.id]: '' }))
      showToast('Reply sent!')
      if (ticket.profile?.email) {
        fetch('/api/admin/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: ticket.profile.email,
            subject: `We replied to your support ticket: ${ticket.subject}`,
            body: text,
            ticketSubject: ticket.subject,
            customerName: ticket.profile.name ?? 'Customer',
            useTicketTemplate: true,
          }),
        }).catch(() => {})
      }
    }
    setSending(null)
  }

  const filtered = tickets
    .filter(t => filter === 'all' || t.status === filter)
    .filter(t => {
      const q = search.toLowerCase()
      return (
        t.subject.toLowerCase().includes(q) ||
        t.id.slice(0, 8).toUpperCase().includes(q.toUpperCase()) ||
        (t.profile?.name ?? '').toLowerCase().includes(q) ||
        (t.profile?.email ?? '').toLowerCase().includes(q)
      )
    })

  const counts = STATUS_OPTIONS.reduce((acc, s) => {
    acc[s] = s === 'all' ? tickets.length : tickets.filter(t => t.status === s).length
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
          <h2 className="text-2xl font-extrabold text-[#0c2340]">Support Tickets</h2>
          <p className="text-sm text-[#4a7fa5]">{tickets.length} total · {counts['open'] ?? 0} open</p>
        </div>
        <Button size="sm" variant="outline" onClick={fetchTickets} className="border-[#cce7f0] text-[#4a7fa5]">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#0097a7]" />
          <Input
            placeholder="Search by subject, customer name, or ticket ID..."
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

      {/* Tickets */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-white rounded-2xl border border-[#cce7f0] animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-3xl border border-[#cce7f0] p-16 text-center">
          <MessageSquare className="w-10 h-10 text-[#cce7f0] mx-auto mb-3" />
          <p className="text-[#4a7fa5] font-medium">No tickets found</p>
          <p className="text-xs text-[#4a7fa5] mt-1">Customer support tickets will appear here in real time</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((ticket, i) => {
            const s = STATUS_STYLE[ticket.status] ?? STATUS_STYLE.open
            const StatusIcon = s.icon
            const isOpen = expanded === ticket.id
            return (
              <motion.div
                key={ticket.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="bg-white rounded-2xl border border-[#cce7f0] shadow-sm overflow-hidden"
              >
                {/* Ticket header row */}
                <button
                  className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-[#f0f9ff] transition-colors"
                  onClick={() => setExpanded(isOpen ? null : ticket.id)}
                >
                  <div className="w-10 h-10 rounded-xl bg-[#e0f7fa] flex items-center justify-center shrink-0">
                    <MessageSquare className="w-5 h-5 text-[#0097a7]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-0.5">
                      <span className="text-xs font-bold text-[#4a7fa5]">#{ticket.id.slice(0, 8).toUpperCase()}</span>
                      <Badge className={`text-[10px] flex items-center gap-1 w-fit ${s.color}`}>
                        <StatusIcon className="w-2.5 h-2.5" />
                        {ticket.status.replace(/_/g, ' ')}
                      </Badge>
                      {ticket.admin_reply && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#e0f7fa] text-[#0097a7] font-medium">
                          Replied
                        </span>
                      )}
                    </div>
                    <p className="font-semibold text-[#0c2340] truncate text-sm">{ticket.subject}</p>
                    <p className="text-xs text-[#4a7fa5]">
                      {ticket.profile?.name ?? 'Guest'} · {fmtDate(ticket.created_at)}
                    </p>
                  </div>
                  {isOpen ? <ChevronUp className="w-4 h-4 text-[#4a7fa5] shrink-0" /> : <ChevronDown className="w-4 h-4 text-[#4a7fa5] shrink-0" />}
                </button>

                {/* Expanded detail */}
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-5 space-y-4 border-t border-[#f0f9ff]">
                        {/* Customer info */}
                        <div className="pt-4 flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-[#e0f7fa] flex items-center justify-center">
                            <User className="w-4 h-4 text-[#0097a7]" />
                          </div>
                          <div>
                            <p className="font-semibold text-[#0c2340] text-sm">{ticket.profile?.name ?? 'Guest Customer'}</p>
                            <p className="text-xs text-[#4a7fa5]">{ticket.profile?.email ?? 'No email on file'}</p>
                          </div>
                        </div>

                        {/* Customer message */}
                        <div className="bg-[#f0f9ff] rounded-xl p-4">
                          <p className="text-xs font-semibold text-[#4a7fa5] uppercase tracking-wider mb-2">Customer Message</p>
                          <p className="text-sm text-[#0c2340] whitespace-pre-wrap">{ticket.message}</p>
                        </div>

                        {/* Admin reply if present */}
                        {ticket.admin_reply && (
                          <div className="bg-[#e0f7fa] rounded-xl p-4">
                            <p className="text-xs font-semibold text-[#0097a7] uppercase tracking-wider mb-2">
                              Your Reply · {ticket.replied_by} · {ticket.replied_at ? fmtDate(ticket.replied_at) : ''}
                            </p>
                            <p className="text-sm text-[#0c2340] whitespace-pre-wrap">{ticket.admin_reply}</p>
                          </div>
                        )}

                        {/* Status change */}
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-[#4a7fa5]">Set status:</span>
                          {['open', 'in_progress', 'resolved'].map(st => (
                            <button
                              key={st}
                              onClick={() => updateStatus(ticket.id, st)}
                              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
                                ticket.status === st
                                  ? 'bg-[#0097a7] text-white'
                                  : 'bg-white border border-[#cce7f0] text-[#4a7fa5] hover:border-[#0097a7]'
                              }`}
                            >
                              {st.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                            </button>
                          ))}
                        </div>

                        {/* Reply box */}
                        <div className="space-y-2">
                          <Textarea
                            placeholder="Type your reply to the customer..."
                            rows={3}
                            value={reply[ticket.id] ?? ''}
                            onChange={e => setReply(prev => ({ ...prev, [ticket.id]: e.target.value }))}
                            className="border-[#cce7f0] resize-none text-sm"
                          />
                          <Button
                            onClick={() => sendReply(ticket)}
                            disabled={!reply[ticket.id]?.trim() || sending === ticket.id}
                            className="bg-gradient-to-r from-[#0097a7] to-[#1565c0] text-white gap-2"
                            size="sm"
                          >
                            <Send className="w-4 h-4" />
                            {sending === ticket.id ? 'Sending...' : ticket.admin_reply ? 'Update Reply' : 'Send Reply'}
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}

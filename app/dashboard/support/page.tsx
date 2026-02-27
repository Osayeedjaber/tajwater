'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { HeadphonesIcon, Send, CheckCircle2, MessageCircle, Clock, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { supabase } from '@/lib/supabase'

const statusConfig = {
  open: { label: 'Open', color: 'bg-amber-100 text-amber-700', icon: AlertCircle },
  in_progress: { label: 'In Progress', color: 'bg-blue-100 text-blue-700', icon: Clock },
  resolved: { label: 'Resolved', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
}

interface Ticket {
  id: string
  subject: string
  message: string
  status: string
  admin_reply: string | null
  replied_at: string | null
  created_at: string
}

export default function SupportPage() {
  const [form, setForm] = useState({ subject: '', message: '' })
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loadingTickets, setLoadingTickets] = useState(true)
  const [userId, setUserId] = useState('')
  const [phone, setPhone] = useState(process.env.NEXT_PUBLIC_COMPANY_PHONE ?? '')

  useEffect(() => {
    supabase
      .from('site_content')
      .select('key, value')
      .eq('key', 'settings_phone')
      .then(({ data }) => {
        const val = data?.[0]?.value
        if (val) setPhone(val)
      })
  }, [])

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      setUserId(session.user.id)

      const { data, error } = await supabase
        .from('tickets')
        .select('id, subject, message, status, admin_reply, replied_at, created_at')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })

      if (!error && data) setTickets(data)
      setLoadingTickets(false)
    }
    load()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.subject.trim() || !form.message.trim()) return
    setSubmitting(true)
    setSubmitError('')

    const { data: newTicket, error } = await supabase
      .from('tickets')
      .insert({ user_id: userId, subject: form.subject, message: form.message, status: 'open' })
      .select()
      .single()

    if (error) {
      setSubmitError('Failed to submit ticket. Please try again.')
      setSubmitting(false)
      return
    }

    if (newTicket) {
      setTickets([newTicket, ...tickets])
    }
    setSubmitted(true)
    setSubmitting(false)
  }

  const formatDate = (str: string) =>
    new Date(str).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })

  return (
    <div className="space-y-6 max-w-2xl">
      <h2 className="text-2xl font-extrabold text-[#0c2340]">Support</h2>

      {/* Quick contact */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <a href={`tel:${phone}`} className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-[#cce7f0] shadow-sm hover:border-[#0097a7] transition-colors group">
          <div className="w-10 h-10 rounded-xl bg-[#e0f7fa] flex items-center justify-center group-hover:bg-[#0097a7] transition-colors">
            <HeadphonesIcon className="w-5 h-5 text-[#0097a7] group-hover:text-white" />
          </div>
          <div>
            <p className="font-semibold text-[#0c2340] text-sm">Call Support</p>
            <p className="text-xs text-[#4a7fa5]">Mon–Sat 7am–7pm</p>
          </div>
        </a>
        <a href={`https://wa.me/${phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-[#cce7f0] shadow-sm hover:border-[#25d366] transition-colors group">
          <div className="w-10 h-10 rounded-xl bg-[#f0fdf4] flex items-center justify-center group-hover:bg-[#25d366] transition-colors">
            <MessageCircle className="w-5 h-5 text-[#25d366] group-hover:text-white" />
          </div>
          <div>
            <p className="font-semibold text-[#0c2340] text-sm">WhatsApp</p>
            <p className="text-xs text-[#4a7fa5]">Usually replies in minutes</p>
          </div>
        </a>
      </div>

      {/* Submit ticket */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-3xl border border-[#cce7f0] shadow-sm p-6">
        <h3 className="font-bold text-[#0c2340] mb-4">Submit a Ticket</h3>

        {submitError && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {submitError}
          </div>
        )}

        {submitted ? (
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center py-6">
            <div className="w-14 h-14 rounded-2xl bg-[#e0f7fa] flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-7 h-7 text-[#0097a7]" />
            </div>
            <p className="font-semibold text-[#0c2340]">Ticket submitted!</p>
            <p className="text-sm text-[#4a7fa5] mt-1">We&apos;ll respond within 2–4 business hours.</p>
            <Button
              size="sm"
              variant="outline"
              className="mt-4 border-[#cce7f0] text-[#0097a7]"
              onClick={() => { setSubmitted(false); setForm({ subject: '', message: '' }) }}
            >
              Submit Another
            </Button>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-[#0c2340] mb-1.5 block">Subject</label>
              <Input
                placeholder="Brief description of your issue"
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                className="border-[#cce7f0]"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium text-[#0c2340] mb-1.5 block">Message</label>
              <Textarea
                placeholder="Please describe your issue in detail..."
                rows={4}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                className="border-[#cce7f0] resize-none"
                required
              />
            </div>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-gradient-to-r from-[#0097a7] to-[#1565c0] text-white gap-2"
            >
              {submitting ? (
                <>
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                  Submitting...
                </>
              ) : (
                <><Send className="w-4 h-4" /> Submit Ticket</>
              )}
            </Button>
          </form>
        )}
      </motion.div>

      {/* Ticket history */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-3xl border border-[#cce7f0] shadow-sm overflow-hidden">
        <div className="p-5 border-b border-[#cce7f0]">
          <h3 className="font-bold text-[#0c2340]">Ticket History</h3>
        </div>

        {loadingTickets ? (
          <div className="p-6 space-y-3">
            {[...Array(2)].map((_, i) => <div key={i} className="h-14 bg-[#f0f9ff] rounded-xl animate-pulse" />)}
          </div>
        ) : tickets.length === 0 ? (
          <div className="p-8 text-center">
            <HeadphonesIcon className="w-8 h-8 text-[#cce7f0] mx-auto mb-2" />
            <p className="text-sm text-[#4a7fa5]">No support tickets yet</p>
          </div>
        ) : (
          <div className="divide-y divide-[#f0f9ff]">
            {tickets.map((ticket) => {
              const statusKey = ticket.status as keyof typeof statusConfig
              const s = statusConfig[statusKey] || statusConfig.open
              const StatusIcon = s.icon
              return (
                <div key={ticket.id} className="px-5 py-4 space-y-3">
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <span className="text-xs font-bold text-[#4a7fa5]">#{ticket.id.slice(0, 8).toUpperCase()}</span>
                        <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium ${s.color}`}>
                          <StatusIcon className="w-2.5 h-2.5" />{s.label}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-[#0c2340]">{ticket.subject}</p>
                      <p className="text-xs text-[#4a7fa5] mt-0.5">{formatDate(ticket.created_at)}</p>
                    </div>
                  </div>
                  {ticket.admin_reply && (
                    <div className="bg-[#e0f7fa] rounded-xl p-3 ml-0">
                      <p className="text-[10px] font-semibold text-[#0097a7] uppercase tracking-wider mb-1">
                        Support Reply · {ticket.replied_at ? formatDate(ticket.replied_at) : ''}
                      </p>
                      <p className="text-sm text-[#0c2340] whitespace-pre-wrap">{ticket.admin_reply}</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </motion.div>
    </div>
  )
}

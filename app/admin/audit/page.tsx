'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Shield, Search, RefreshCw, Clock, Filter, ChevronDown } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'

type AuditRow = {
  id: string
  admin_email: string
  action: string
  entity_type: string
  entity_id: string | null
  details: Record<string, unknown> | null
  created_at: string
}

const ACTION_COLOR: Record<string, string> = {
  refund:        'bg-red-100 text-red-700',
  cancel:        'bg-orange-100 text-orange-700',
  status_change: 'bg-blue-100 text-blue-700',
  reply:         'bg-purple-100 text-purple-700',
  login:         'bg-green-100 text-green-700',
  price_edit:    'bg-amber-100 text-amber-700',
}

function fmtDate(ts: string) {
  return new Date(ts).toLocaleString('en-CA', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function shortId(id: string | null) {
  return id ? '#' + id.slice(-6).toUpperCase() : '—'
}

export default function AuditPage() {
  const [logs,    setLogs]    = useState<AuditRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')
  const [days,    setDays]    = useState(7)
  const [expanded, setExpanded] = useState<string | null>(null)

  const fetchData = async (d = days) => {
    setLoading(true)
    const since = new Date(Date.now() - d * 24 * 60 * 60 * 1000).toISOString()
    const { data } = await supabase
      .from('audit_logs')
      .select('id, admin_email, action, entity_type, entity_id, details, created_at')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(500)
    setLogs((data ?? []) as AuditRow[])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [days])

  const filtered = logs.filter(l => {
    const q = search.toLowerCase()
    return (
      l.admin_email.toLowerCase().includes(q) ||
      l.action.toLowerCase().includes(q) ||
      l.entity_type.toLowerCase().includes(q) ||
      (l.entity_id ?? '').toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-extrabold text-[#0c2340]">Audit Log</h2>
          <p className="text-sm text-[#4a7fa5]">All admin actions — refunds, status changes, logins, replies</p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          {/* Date range */}
          <div className="flex gap-1">
            {[7, 14, 30].map(d => (
              <button key={d} onClick={() => setDays(d)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  days === d ? 'bg-[#0097a7] text-white' : 'bg-white border border-[#cce7f0] text-[#4a7fa5] hover:border-[#0097a7]'
                }`}>
                {d}d
              </button>
            ))}
          </div>
          <Button size="sm" variant="outline" onClick={() => fetchData()} className="border-[#cce7f0] text-[#4a7fa5]">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#0097a7]" />
        <Input
          placeholder="Search by admin, action, entity..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-10 border-[#cce7f0] bg-white"
        />
      </div>

      {/* Stats */}
      {!loading && (
        <div className="flex gap-4 flex-wrap text-xs">
          {Object.entries(
            filtered.reduce((acc, l) => { acc[l.action] = (acc[l.action] ?? 0) + 1; return acc }, {} as Record<string, number>)
          ).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([action, count]) => (
            <div key={action} className={`px-2.5 py-1 rounded-full font-medium ${ACTION_COLOR[action] ?? 'bg-gray-100 text-gray-600'}`}>
              {action.replace(/_/g, ' ')}: {count}
            </div>
          ))}
        </div>
      )}

      {/* Log entries */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => <div key={i} className="h-12 bg-white rounded-2xl border border-[#cce7f0] animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-3xl border border-[#cce7f0] p-16 text-center">
          <Shield className="w-10 h-10 text-[#cce7f0] mx-auto mb-3" />
          <p className="text-[#4a7fa5] font-medium">No audit log entries found</p>
          <p className="text-xs text-[#4a7fa5] mt-1">
            Admin actions (refunds, status changes, replies) are logged automatically.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-[#cce7f0] shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-[#cce7f0] bg-[#f0f9ff] flex items-center justify-between">
            <p className="text-xs font-semibold text-[#4a7fa5]">{filtered.length} entries (last {days} days)</p>
            <Filter className="w-3.5 h-3.5 text-[#4a7fa5]" />
          </div>
          <div className="divide-y divide-[#f0f9ff]">
            {filtered.map((log, i) => {
              const isOpen = expanded === log.id
              return (
                <motion.div key={log.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.01 }}>
                  <button
                    onClick={() => setExpanded(isOpen ? null : log.id)}
                    className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-[#f0f9ff] transition-colors text-left"
                  >
                    <div className="w-8 h-8 rounded-lg bg-[#e0f7fa] flex items-center justify-center shrink-0">
                      <Shield className="w-4 h-4 text-[#0097a7]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${ACTION_COLOR[log.action] ?? 'bg-gray-100 text-gray-600'}`}>
                          {log.action.replace(/_/g, ' ')}
                        </span>
                        <span className="text-xs font-medium text-[#0c2340] capitalize">{log.entity_type}</span>
                        <span className="text-xs font-mono text-[#0097a7]">{shortId(log.entity_id)}</span>
                      </div>
                      <p className="text-xs text-[#4a7fa5] mt-0.5 truncate">{log.admin_email}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-[#4a7fa5] flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {fmtDate(log.created_at)}
                      </span>
                      <ChevronDown className={`w-4 h-4 text-[#4a7fa5] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </div>
                  </button>
                  {isOpen && log.details && (
                    <div className="px-5 pb-3 pt-0">
                      <pre className="text-xs bg-[#f0f9ff] rounded-xl p-3 text-[#4a7fa5] overflow-x-auto">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    </div>
                  )}
                </motion.div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

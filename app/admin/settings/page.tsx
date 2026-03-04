'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Building2, MapPin, DollarSign, Bell, CheckCircle2, RefreshCw, Mail, Download, Share2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { supabase } from '@/lib/supabase'

// ── Types ────────────────────────────────────────────────────────────────────
type Subscriber = {
  id: string
  email: string
  source: string
  subscribed_at: string
  active: boolean
  notes: string | null
}

type Zone = {
  id: string
  name: string
  delivery_fee: number
  schedule: string
  active: boolean
}

type BusinessInfo = {
  company:  string
  phone:    string
  email:    string
  address:  string
  hours:    string
}

const NOTIF_KEYS = [
  { key: 'notif_order_confirmation',  label: 'Order confirmation to customer',  defaultOn: true  },
  { key: 'notif_delivery_reminder',   label: 'Delivery scheduled reminder',      defaultOn: true  },
  { key: 'notif_delivery_completed',  label: 'Delivery completed notification',  defaultOn: true  },
  { key: 'notif_low_stock',           label: 'Low stock alerts to admin',        defaultOn: true  },
  { key: 'notif_new_customer',        label: 'New customer registration',        defaultOn: false },
  { key: 'notif_payment_failed',      label: 'Payment failed alerts',            defaultOn: true  },
]

const BUSINESS_DEFAULTS: BusinessInfo = {
  company: 'TajWater Inc.',
  phone:   process.env.NEXT_PUBLIC_COMPANY_PHONE ?? '',
  email:   process.env.NEXT_PUBLIC_COMPANY_EMAIL ?? '',
  address: 'Metro Vancouver, BC, Canada',
  hours:   'Mon–Fri: 7am–7pm\nSaturday: 8am–6pm\nSunday: 9am–5pm',
}

// ── Component ────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const [zones,         setZones]         = useState<Zone[]>([])
  const [business,      setBusiness]      = useState<BusinessInfo>(BUSINESS_DEFAULTS)
  const [notifs,        setNotifs]        = useState<Record<string, boolean>>({})
  const [subscribers,   setSubscribers]   = useState<Subscriber[]>([])
  const [revenueGoal,   setRevenueGoal]   = useState('')
  const [socials,       setSocialsState]  = useState({ facebook: '', instagram: '', twitter: '' })
  const [loading,       setLoading]       = useState(true)
  const [saving,        setSaving]        = useState(false)
  const [toast,         setToast]         = useState('')

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500) }

  // ── Load ──────────────────────────────────────────────────────────────────
  const fetchAll = async () => {
    setLoading(true)

    const allContentKeys = [
      'settings_company', 'settings_phone', 'settings_email', 'settings_address', 'settings_hours',
      'monthly_revenue_goal',
      'social_facebook', 'social_instagram', 'social_twitter',
      ...NOTIF_KEYS.map(n => n.key),
    ]

    const [zonesRes, contentRes, subsRes] = await Promise.all([
      supabase.from('zones').select('id, name, delivery_fee, schedule, active').order('name'),
      supabase.from('site_content').select('key, value').in('key', allContentKeys),
      supabase.from('newsletter_subscribers').select('id, email, source, subscribed_at, active, notes').order('subscribed_at', { ascending: false }),
    ])

    if (zonesRes.data)   setZones(zonesRes.data)
    if (subsRes.data)    setSubscribers(subsRes.data as Subscriber[])
    if (contentRes.data) {
      const map: Record<string, string> = {}
      contentRes.data.forEach(r => { map[r.key] = r.value })
      setBusiness({
        company: map['settings_company'] ?? BUSINESS_DEFAULTS.company,
        phone:   map['settings_phone']   ?? BUSINESS_DEFAULTS.phone,
        email:   map['settings_email']   ?? BUSINESS_DEFAULTS.email,
        address: map['settings_address'] ?? BUSINESS_DEFAULTS.address,
        hours:   map['settings_hours']   ?? BUSINESS_DEFAULTS.hours,
      })
      const notifState: Record<string, boolean> = {}
      NOTIF_KEYS.forEach(n => {
        notifState[n.key] = map[n.key] !== undefined ? map[n.key] === 'true' : n.defaultOn
      })
      setNotifs(notifState)
      setRevenueGoal(map['monthly_revenue_goal'] ?? '')
      setSocialsState({
        facebook:  map['social_facebook']  ?? '',
        instagram: map['social_instagram'] ?? '',
        twitter:   map['social_twitter']   ?? '',
      })
    }
    setLoading(false)
  }

  // ── Save: Socials ──────────────────────────────────────────────────────────
  const saveSocials = async () => {
    setSaving(true)
    const rows = [
      { key: 'social_facebook',  value: socials.facebook  },
      { key: 'social_instagram', value: socials.instagram },
      { key: 'social_twitter',   value: socials.twitter   },
    ]
    const { error } = await supabase.from('site_content').upsert(rows, { onConflict: 'key' })
    setSaving(false)
    if (error) { showToast('Error saving — please try again.'); return }
    showToast('Social links saved!')
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchAll() }, [])

  // ── Save: Business ────────────────────────────────────────────────────────
  const saveBusiness = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const rows = [
      { key: 'settings_company',    value: business.company },
      { key: 'settings_phone',      value: business.phone   },
      { key: 'settings_email',      value: business.email   },
      { key: 'settings_address',    value: business.address },
      { key: 'settings_hours',      value: business.hours   },
      { key: 'monthly_revenue_goal', value: revenueGoal || '0' },
    ]
    const { error } = await supabase
      .from('site_content')
      .upsert(rows, { onConflict: 'key' })
    setSaving(false)
    if (error) { showToast('Error saving — please try again.'); return }
    showToast('Business info saved!')
  }

  // ── Save: Zones ───────────────────────────────────────────────────────────
  const saveZones = async () => {
    setSaving(true)
    const updates = zones.map(z =>
      supabase.from('zones').update({ delivery_fee: z.delivery_fee, active: z.active }).eq('id', z.id)
    )
    await Promise.all(updates)
    setSaving(false)
    showToast('Zone settings saved!')
  }

  const updateZone = (id: string, field: 'delivery_fee' | 'active', value: number | boolean) => {
    setZones(prev => prev.map(z => z.id === id ? { ...z, [field]: value } : z))
  }

  // ── Save: Notifications ───────────────────────────────────────────────────
  const saveNotifs = async () => {
    setSaving(true)
    const rows = NOTIF_KEYS.map(n => ({ key: n.key, value: String(notifs[n.key] ?? n.defaultOn) }))
    const { error } = await supabase.from('site_content').upsert(rows, { onConflict: 'key' })
    setSaving(false)
    if (error) { showToast('Error saving — please try again.'); return }
    showToast('Notification preferences saved!')
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 max-w-2xl relative">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 right-6 z-50 flex items-center gap-2 bg-[#0097a7] text-white px-4 py-3 rounded-2xl shadow-xl text-sm font-medium">
            <CheckCircle2 className="w-4 h-4" /> {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-extrabold text-[#0c2340]">Settings</h2>
        <Button size="sm" variant="outline" onClick={fetchAll} className="border-[#cce7f0] text-[#4a7fa5]">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <Tabs defaultValue="business">
        <TabsList className="bg-[#e0f7fa] text-[#0097a7] mb-6">
          <TabsTrigger value="business"      className="data-[state=active]:bg-[#0097a7] data-[state=active]:text-white text-xs">Business</TabsTrigger>
          <TabsTrigger value="zones"         className="data-[state=active]:bg-[#0097a7] data-[state=active]:text-white text-xs">Zones & Fees</TabsTrigger>
          <TabsTrigger value="notifications" className="data-[state=active]:bg-[#0097a7] data-[state=active]:text-white text-xs">Notifications</TabsTrigger>
          <TabsTrigger value="subscribers"   className="data-[state=active]:bg-[#0097a7] data-[state=active]:text-white text-xs">Subscribers</TabsTrigger>
          <TabsTrigger value="socials"        className="data-[state=active]:bg-[#0097a7] data-[state=active]:text-white text-xs">Socials</TabsTrigger>
        </TabsList>

        {/* ── Business tab ────────────────────────────────────────────── */}
        <TabsContent value="business">
          <motion.form initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            onSubmit={saveBusiness}
            className="bg-white rounded-3xl border border-[#cce7f0] shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="w-5 h-5 text-[#0097a7]" />
              <h3 className="font-bold text-[#0c2340]">Business Information</h3>
              <span className="ml-auto text-xs text-[#4a7fa5]">Saved to Supabase</span>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => <div key={i} className="h-10 bg-[#f0f9ff] rounded-xl animate-pulse" />)}
              </div>
            ) : (
              <>
                {[
                  { label: 'Company Name', field: 'company' as const },
                  { label: 'Phone Number', field: 'phone'   as const },
                  { label: 'Email',        field: 'email'   as const },
                  { label: 'Address',      field: 'address' as const },
                ].map(({ label, field }) => (
                  <div key={field}>
                    <label className="text-sm font-medium text-[#0c2340] mb-1.5 block">{label}</label>
                    <Input
                      value={business[field]}
                      onChange={e => setBusiness(prev => ({ ...prev, [field]: e.target.value }))}
                      className="border-[#cce7f0]"
                    />
                  </div>
                ))}
                <div>
                  <label className="text-sm font-medium text-[#0c2340] mb-1.5 block">Business Hours</label>
                  <Textarea
                    value={business.hours}
                    onChange={e => setBusiness(prev => ({ ...prev, hours: e.target.value }))}
                    className="border-[#cce7f0] resize-none"
                    rows={3}
                  />
                </div>
              </>
            )}

            <div>
              <label className="text-sm font-medium text-[#0c2340] mb-1.5 block">Monthly Revenue Goal ($)</label>
              <Input
                type="number" min="0" step="100"
                value={revenueGoal}
                onChange={e => setRevenueGoal(e.target.value)}
                placeholder="e.g. 5000"
                className="border-[#cce7f0] max-w-xs"
              />
              <p className="text-xs text-[#4a7fa5] mt-1">Shown as a progress bar on the Analytics page.</p>
            </div>

            <Button type="submit" disabled={saving || loading} className="bg-gradient-to-r from-[#0097a7] to-[#1565c0] text-white gap-2">
              {saving ? 'Saving...' : <><CheckCircle2 className="w-4 h-4" /> Save Business Info</>}
            </Button>
          </motion.form>
        </TabsContent>

        {/* ── Zones tab ───────────────────────────────────────────────── */}
        <TabsContent value="zones">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl border border-[#cce7f0] shadow-sm overflow-hidden">
            <div className="p-5 border-b border-[#cce7f0] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#0097a7]" />
                <h3 className="font-bold text-[#0c2340]">Delivery Zones</h3>
              </div>
              <span className="text-xs text-[#4a7fa5]">Saved to Supabase</span>
            </div>

            {loading ? (
              <div className="p-4 space-y-2">
                {[...Array(6)].map((_, i) => <div key={i} className="h-10 bg-[#f0f9ff] rounded-xl animate-pulse" />)}
              </div>
            ) : (
              <>
                <div className="divide-y divide-[#f0f9ff]">
                  {/* Column headers */}
                  <div className="flex items-center gap-4 px-5 py-2 bg-[#f0f9ff]">
                    <span className="flex-1 text-xs font-semibold text-[#4a7fa5] uppercase">Zone</span>
                    <span className="w-32 text-xs font-semibold text-[#4a7fa5] uppercase">Schedule</span>
                    <span className="w-28 text-xs font-semibold text-[#4a7fa5] uppercase">Fee ($)</span>
                    <span className="w-16 text-xs font-semibold text-[#4a7fa5] uppercase text-center">Active</span>
                  </div>

                  {zones.map(z => (
                    <div key={z.id} className={`flex items-center gap-4 px-5 py-3 transition-colors ${!z.active ? 'opacity-50' : ''}`}>
                      <span className="flex-1 text-sm font-medium text-[#0c2340]">{z.name}</span>
                      <span className="w-32 text-xs text-[#4a7fa5]">{z.schedule}</span>
                      <div className="w-28 flex items-center gap-1">
                        <DollarSign className="w-3.5 h-3.5 text-[#4a7fa5] shrink-0" />
                        <Input
                          type="number"
                          min="0"
                          step="0.50"
                          value={z.delivery_fee}
                          onChange={e => updateZone(z.id, 'delivery_fee', parseFloat(e.target.value) || 0)}
                          className="border-[#cce7f0] h-7 w-20 text-xs text-right"
                        />
                      </div>
                      <div className="w-16 flex justify-center">
                        <input
                          type="checkbox"
                          checked={z.active}
                          onChange={e => updateZone(z.id, 'active', e.target.checked)}
                          className="w-4 h-4 accent-[#0097a7] cursor-pointer"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-5 border-t border-[#cce7f0]">
                  <Button
                    onClick={saveZones}
                    disabled={saving}
                    className="bg-gradient-to-r from-[#0097a7] to-[#1565c0] text-white gap-2"
                  >
                    {saving ? 'Saving...' : <><CheckCircle2 className="w-4 h-4" /> Save Zone Settings</>}
                  </Button>
                </div>
              </>
            )}
          </motion.div>
        </TabsContent>

        {/* ── Notifications tab ───────────────────────────────────────── */}
        <TabsContent value="notifications">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl border border-[#cce7f0] shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Bell className="w-5 h-5 text-[#0097a7]" />
              <h3 className="font-bold text-[#0c2340]">Email Notifications</h3>
            </div>
            <p className="text-xs text-[#4a7fa5] bg-[#f0f9ff] rounded-xl px-4 py-3 border border-[#cce7f0]">
              Toggle which events trigger emails via Resend. Preferences are saved to Supabase and read by the webhook handler.
            </p>
            {loading ? (
              <div className="space-y-2">{[...Array(6)].map((_, i) => <div key={i} className="h-10 bg-[#f0f9ff] rounded-xl animate-pulse" />)}</div>
            ) : (
              NOTIF_KEYS.map(n => (
                <label key={n.key} className="flex items-center justify-between py-2.5 border-b border-[#f0f9ff] last:border-0 cursor-pointer">
                  <span className="text-sm text-[#0c2340]">{n.label}</span>
                  <input
                    type="checkbox"
                    checked={notifs[n.key] ?? n.defaultOn}
                    onChange={e => setNotifs(prev => ({ ...prev, [n.key]: e.target.checked }))}
                    className="w-4 h-4 accent-[#0097a7]"
                  />
                </label>
              ))
            )}
            <Button
              onClick={saveNotifs}
              disabled={saving || loading}
              className="bg-gradient-to-r from-[#0097a7] to-[#1565c0] text-white gap-2"
            >
              {saving ? 'Saving...' : <><CheckCircle2 className="w-4 h-4" /> Save Preferences</>}
            </Button>
          </motion.div>
        </TabsContent>
        {/* ── Subscribers tab ─────────────────────────────────────────── */}
        <TabsContent value="subscribers">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl border border-[#cce7f0] shadow-sm overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-[#cce7f0]">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#0097a7]" />
                <h3 className="font-bold text-[#0c2340]">Newsletter Subscribers</h3>
                <span className="text-xs bg-[#e0f7fa] text-[#0097a7] px-2 py-0.5 rounded-full font-medium">{subscribers.length}</span>
              </div>
              <button
                onClick={() => {
                  const rows = [
                    ['Email', 'Source', 'Notes', 'Subscribed At', 'Active'],
                    ...subscribers.map(s => [
                      s.email,
                      s.source,
                      s.notes ?? '',
                      new Date(s.subscribed_at).toLocaleDateString('en-CA'),
                      s.active ? 'Yes' : 'No',
                    ])
                  ]
                  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
                  const blob = new Blob([csv], { type: 'text/csv' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url; a.download = 'subscribers.csv'; a.click()
                  URL.revokeObjectURL(url)
                }}
                className="flex items-center gap-1.5 text-xs text-[#0097a7] hover:underline"
              >
                <Download className="w-3.5 h-3.5" /> Export CSV
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#f0f9ff] text-xs text-[#4a7fa5] uppercase tracking-wider">
                    <th className="px-4 py-3 text-left">Email</th>
                    <th className="px-4 py-3 text-left">Source</th>
                    <th className="px-4 py-3 text-left">Notes</th>
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {subscribers.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-[#4a7fa5] text-sm">No subscribers yet</td>
                    </tr>
                  )}
                  {subscribers.map((s) => (
                    <tr key={s.id} className="border-t border-[#f0f9ff] hover:bg-[#f8fbfe]">
                      <td className="px-4 py-3 font-medium text-[#0c2340]">{s.email}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          s.source === 'coverage_request'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-[#e0f7fa] text-[#0097a7]'
                        }`}>
                          {s.source === 'coverage_request' ? 'Coverage Request' : 'Newsletter'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#4a7fa5] text-xs max-w-xs truncate">{s.notes ?? '—'}</td>
                      <td className="px-4 py-3 text-[#4a7fa5] text-xs">{new Date(s.subscribed_at).toLocaleDateString('en-CA')}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {s.active ? 'Active' : 'Unsubscribed'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        </TabsContent>
        {/* ── Socials tab ──────────────────────────────────────────────── */}
        <TabsContent value="socials">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl border border-[#cce7f0] shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Share2 className="w-5 h-5 text-[#0097a7]" />
              <h3 className="font-bold text-[#0c2340]">Social Links</h3>
              <span className="ml-auto text-xs text-[#4a7fa5]">Shown in Footer</span>
            </div>
            <p className="text-xs text-[#4a7fa5]">Leave a field blank to hide that icon from the footer.</p>

            {[
              { label: 'Facebook URL',  field: 'facebook'  as const, placeholder: 'https://facebook.com/yourpage' },
              { label: 'Instagram URL', field: 'instagram' as const, placeholder: 'https://instagram.com/yourhandle' },
              { label: 'Twitter / X URL', field: 'twitter' as const, placeholder: 'https://x.com/yourhandle' },
            ].map(({ label, field, placeholder }) => (
              <div key={field}>
                <label className="text-sm font-medium text-[#0c2340] mb-1.5 block">{label}</label>
                <Input
                  value={socials[field]}
                  onChange={e => setSocialsState(prev => ({ ...prev, [field]: e.target.value }))}
                  placeholder={placeholder}
                  className="border-[#cce7f0]"
                />
              </div>
            ))}

            <Button onClick={saveSocials} disabled={saving || loading} className="bg-gradient-to-r from-[#0097a7] to-[#1565c0] text-white gap-2">
              {saving ? 'Saving...' : <><CheckCircle2 className="w-4 h-4" /> Save Social Links</>}
            </Button>
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

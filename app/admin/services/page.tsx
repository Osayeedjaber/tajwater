'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, CheckCircle2, Droplets, Settings, Building2, RefreshCw, Clock, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { supabase } from '@/lib/supabase'

interface Service {
  id: string
  title: string
  description: string
  features: string[]
  pricing: { label: string; price: string }[]
  icon: string
  color: string
  sort_order: number
  active: boolean
}

const emptyService: Omit<Service, 'id'> = {
  title: '', description: '', features: [], pricing: [],
  icon: 'Droplets', color: '#0097a7', sort_order: 0, active: true,
}

const iconOptions = ['Droplets', 'Settings', 'Building2', 'RefreshCw', 'Clock', 'Shield']
const colorOptions = ['#0097a7', '#1565c0', '#006064', '#00acc1', '#1976d2', '#004d40']

function ServiceIcon({ name, color, size = 'w-6 h-6' }: { name: string; color: string; size?: string }) {
  const props = { className: size, style: { color } }
  if (name === 'Settings')  return <Settings  {...props} />
  if (name === 'Building2') return <Building2 {...props} />
  if (name === 'RefreshCw') return <RefreshCw {...props} />
  if (name === 'Clock')     return <Clock     {...props} />
  if (name === 'Shield')    return <Shield    {...props} />
  return <Droplets {...props} />
}

export default function AdminServicesPage() {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState('')
  const [dialog, setDialog] = useState(false)
  const [editing, setEditing] = useState<Service | null>(null)
  const [form, setForm] = useState<Omit<Service, 'id'>>(emptyService)
  const [featuresText, setFeaturesText] = useState('')
  const [pricingText, setPricingText] = useState('')

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const fetch = async () => {
    setLoading(true)
    const { data } = await supabase.from('services').select('*').order('sort_order')
    if (data) setServices(data)
    setLoading(false)
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetch() }, [])

  const openAdd = () => {
    setEditing(null)
    setForm(emptyService)
    setFeaturesText('')
    setPricingText('')
    setDialog(true)
  }

  const openEdit = (s: Service) => {
    setEditing(s)
    setForm({ title: s.title, description: s.description, features: s.features, pricing: s.pricing, icon: s.icon, color: s.color, sort_order: s.sort_order, active: s.active })
    setFeaturesText(s.features.join('\n'))
    setPricingText(s.pricing.map((p) => `${p.label}|${p.price}`).join('\n'))
    setDialog(true)
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    const features = featuresText.split('\n').map((f) => f.trim()).filter(Boolean)
    const pricing = pricingText.split('\n').map((line) => {
      const [label, price] = line.split('|')
      return { label: label?.trim() ?? '', price: price?.trim() ?? '' }
    }).filter((p) => p.label)

    const payload = { ...form, features, pricing }

    if (editing) {
      await supabase.from('services').update(payload).eq('id', editing.id)
      showToast('Service updated!')
    } else {
      await supabase.from('services').insert(payload)
      showToast('Service added!')
    }
    setDialog(false)
    fetch()
  }

  const remove = async (id: string) => {
    if (!confirm('Delete this service?')) return
    await supabase.from('services').delete().eq('id', id)
    setServices((prev) => prev.filter((s) => s.id !== id))
    showToast('Service deleted.')
  }

  const toggle = async (s: Service) => {
    await supabase.from('services').update({ active: !s.active }).eq('id', s.id)
    setServices((prev) => prev.map((x) => x.id === s.id ? { ...x, active: !x.active } : x))
    showToast(s.active ? 'Service hidden.' : 'Service shown.')
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-[#4a7fa5]">Loading services...</div>

  return (
    <div className="space-y-5 relative">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="fixed top-20 right-6 z-50 flex items-center gap-2 bg-[#0097a7] text-white px-4 py-3 rounded-2xl shadow-xl text-sm font-medium">
            <CheckCircle2 className="w-4 h-4" /> {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-[#0c2340]">Services</h2>
          <p className="text-sm text-[#4a7fa5]">Manage services shown on the public Services page — changes go live instantly</p>
        </div>
        <Button onClick={openAdd} className="bg-gradient-to-r from-[#0097a7] to-[#1565c0] text-white gap-2 shrink-0">
          <Plus className="w-4 h-4" /> Add Service
        </Button>
      </div>

      {services.length === 0 ? (
        <div className="bg-white rounded-3xl border border-[#cce7f0] p-16 text-center">
          <Droplets className="w-12 h-12 text-[#b3e5fc] mx-auto mb-3" />
          <p className="text-[#4a7fa5] font-medium">No services yet</p>
          <p className="text-sm text-[#4a7fa5]/70 mb-4">Add your first service to show it on the website</p>
          <Button onClick={openAdd} className="bg-[#0097a7] text-white gap-2">
            <Plus className="w-4 h-4" /> Add Service
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {services.map((svc, i) => (
            <motion.div key={svc.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
              className="bg-white rounded-2xl border border-[#cce7f0] shadow-sm p-5">
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: svc.color + '22' }}>
                  <ServiceIcon name={svc.icon} color={svc.color} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-bold text-[#0c2340]">{svc.title}</h3>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${svc.active ? 'bg-green-100 text-green-700' : 'bg-[#f0f9ff] text-[#4a7fa5]'}`}>
                      {svc.active ? 'Active' : 'Hidden'}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#f0f9ff] text-[#4a7fa5]">
                      Sort #{svc.sort_order}
                    </span>
                  </div>
                  <p className="text-sm text-[#4a7fa5] mb-2 line-clamp-2">{svc.description}</p>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {svc.features.slice(0, 4).map((f) => (
                      <span key={f} className="text-[10px] px-2 py-0.5 rounded-full bg-[#e0f7fa] text-[#0097a7]">{f}</span>
                    ))}
                    {svc.features.length > 4 && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#f0f9ff] text-[#4a7fa5]">+{svc.features.length - 4} more</span>
                    )}
                  </div>
                  {svc.pricing.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {svc.pricing.slice(0, 3).map((p) => (
                        <span key={p.label} className="text-[10px] font-medium text-[#0c2340]">
                          {p.label}: <span className="text-[#0097a7]">{p.price}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 shrink-0 flex-wrap justify-end">
                  <button
                    onClick={() => toggle(svc)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                      svc.active
                        ? 'border-amber-200 text-amber-600 hover:bg-amber-50'
                        : 'border-green-200 text-green-600 hover:bg-green-50'
                    }`}
                  >
                    {svc.active ? 'Hide' : 'Show'}
                  </button>
                  <button
                    onClick={() => openEdit(svc)}
                    className="px-2.5 py-1 rounded-lg text-xs font-medium border border-[#cce7f0] text-[#0097a7] hover:bg-[#e0f7fa] transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => remove(svc.id)}
                    className="px-2.5 py-1 rounded-lg text-xs font-medium border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Service Dialog */}
      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Service' : 'Add Service'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={save} className="space-y-4 mt-2">
            <div>
              <label className="text-sm font-medium text-[#0c2340] mb-1.5 block">Service Title *</label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. 20L Water Delivery"
                className="border-[#cce7f0]"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium text-[#0c2340] mb-1.5 block">Description</label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Short description shown on the services page..."
                rows={3}
                className="border-[#cce7f0] resize-none"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-[#0c2340] mb-1.5 block">Features <span className="text-[#4a7fa5] font-normal">(one per line)</span></label>
              <Textarea
                value={featuresText}
                onChange={(e) => setFeaturesText(e.target.value)}
                placeholder={"pH balanced water\nBPA-free containers\nSame-day delivery"}
                rows={4}
                className="border-[#cce7f0] resize-none text-sm"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-[#0c2340] mb-1.5 block">
                Pricing <span className="text-[#4a7fa5] font-normal">(format: Label|Price, one per line)</span>
              </label>
              <Textarea
                value={pricingText}
                onChange={(e) => setPricingText(e.target.value)}
                placeholder={"1–4 jugs|$8.99/jug\n5–9 jugs|$7.99/jug\n10+ jugs|$6.99/jug"}
                rows={4}
                className="border-[#cce7f0] resize-none text-sm font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-[#0c2340] mb-1.5 block">Icon</label>
                <select
                  value={form.icon}
                  onChange={(e) => setForm({ ...form, icon: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl border border-[#cce7f0] text-sm focus:border-[#0097a7] focus:outline-none text-[#0c2340]"
                >
                  {iconOptions.map((icon) => <option key={icon} value={icon}>{icon}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-[#0c2340] mb-1.5 block">Color</label>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {colorOptions.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setForm({ ...form, color: c })}
                      className={`w-7 h-7 rounded-lg transition-all ${form.color === c ? 'ring-2 ring-offset-1 ring-[#0097a7] scale-110' : ''}`}
                      style={{ background: c }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-[#0c2340] mb-1.5 block">Sort Order</label>
              <Input
                type="number"
                value={form.sort_order}
                onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })}
                className="border-[#cce7f0] w-32"
              />
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="svc-active"
                checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
                className="w-4 h-4 accent-[#0097a7]"
              />
              <label htmlFor="svc-active" className="text-sm text-[#0c2340]">Active (visible on Services page)</label>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialog(false)} className="flex-1 border-[#cce7f0]">
                Cancel
              </Button>
              <Button type="submit" className="flex-1 bg-gradient-to-r from-[#0097a7] to-[#1565c0] text-white">
                {editing ? 'Save Changes' : 'Add Service'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

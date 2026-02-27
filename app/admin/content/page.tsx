'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Edit, Trash2, CheckCircle2, Droplets, Settings, Building2, RefreshCw, Clock, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { supabase } from '@/lib/supabase'

// ─── Types ───────────────────────────────────────────────
interface TeamMember { id: string; name: string; role: string; bio: string; initials: string; color: string; sort_order: number; active: boolean }
interface Service { id: string; title: string; description: string; features: string[]; pricing: { label: string; price: string }[]; icon: string; color: string; sort_order: number; active: boolean }
interface SiteContent { id: string; key: string; value: string }

const emptyMember: Omit<TeamMember, 'id'> = { name: '', role: '', bio: '', initials: '', color: '#0097a7', sort_order: 0, active: true }
const emptyService: Omit<Service, 'id'> = { title: '', description: '', features: [], pricing: [], icon: 'Droplets', color: '#0097a7', sort_order: 0, active: true }

const iconOptions = ['Droplets', 'Settings', 'Building2', 'RefreshCw', 'Clock', 'Shield']
const colorOptions = ['#0097a7', '#1565c0', '#006064', '#00acc1', '#1976d2', '#004d40']

const aboutFields = [
  { key: 'about_hero_subtitle', label: 'Hero Subtitle',      multiline: false },
  { key: 'about_mission',       label: 'Mission Statement',  multiline: true  },
  { key: 'about_vision',        label: 'Vision Statement',   multiline: true  },
]

export default function AdminContentPage() {
  const [team, setTeam] = useState<TeamMember[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [siteContent, setSiteContent] = useState<SiteContent[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState('')

  // About text draft — keyed by content key, no hooks inside map
  const [aboutDraft, setAboutDraft] = useState<Record<string, string>>({})

  // Member dialog
  const [memberDialog, setMemberDialog] = useState(false)
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null)
  const [memberForm, setMemberForm] = useState<Omit<TeamMember, 'id'>>(emptyMember)

  // Service dialog
  const [serviceDialog, setServiceDialog] = useState(false)
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [serviceForm, setServiceForm] = useState<Omit<Service, 'id'>>(emptyService)
  const [featuresText, setFeaturesText] = useState('')
  const [pricingText, setPricingText] = useState('')

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const fetchAll = async () => {
    setLoading(true)
    const [t, s, c] = await Promise.all([
      supabase.from('about_team').select('*').order('sort_order'),
      supabase.from('services').select('*').order('sort_order'),
      supabase.from('site_content').select('*'),
    ])
    if (t.data) setTeam(t.data)
    if (s.data) setServices(s.data)
    if (c.data) {
      setSiteContent(c.data)
      // Populate the about draft from fresh data
      const draft: Record<string, string> = {}
      c.data.forEach((row: SiteContent) => { draft[row.key] = row.value })
      setAboutDraft(draft)
    }
    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [])

  // ─── Site content helpers ─────────────────────────────
  const saveContent = async (key: string) => {
    const value = aboutDraft[key] ?? ''
    await supabase.from('site_content').upsert({ key, value }, { onConflict: 'key' })
    showToast('Content saved!')
  }

  // ─── Team CRUD ────────────────────────────────────────
  const openAddMember = () => { setEditingMember(null); setMemberForm(emptyMember); setMemberDialog(true) }
  const openEditMember = (m: TeamMember) => {
    setEditingMember(m)
    setMemberForm({ name: m.name, role: m.role, bio: m.bio, initials: m.initials, color: m.color, sort_order: m.sort_order, active: m.active })
    setMemberDialog(true)
  }

  const saveMember = async (e: React.FormEvent) => {
    e.preventDefault()
    if (editingMember) {
      await supabase.from('about_team').update(memberForm).eq('id', editingMember.id)
    } else {
      await supabase.from('about_team').insert(memberForm)
    }
    showToast(editingMember ? 'Team member updated!' : 'Team member added!')
    setMemberDialog(false)
    fetchAll()
  }

  const deleteMember = async (id: string) => {
    if (!confirm('Delete this team member?')) return
    await supabase.from('about_team').delete().eq('id', id)
    setTeam((prev) => prev.filter((m) => m.id !== id))
    showToast('Team member removed.')
  }

  // ─── Services CRUD ────────────────────────────────────
  const openAddService = () => {
    setEditingService(null)
    setServiceForm(emptyService)
    setFeaturesText('')
    setPricingText('')
    setServiceDialog(true)
  }

  const openEditService = (s: Service) => {
    setEditingService(s)
    setServiceForm({ title: s.title, description: s.description, features: s.features, pricing: s.pricing, icon: s.icon, color: s.color, sort_order: s.sort_order, active: s.active })
    setFeaturesText(s.features.join('\n'))
    setPricingText(s.pricing.map((p) => `${p.label}|${p.price}`).join('\n'))
    setServiceDialog(true)
  }

  const saveService = async (e: React.FormEvent) => {
    e.preventDefault()
    const features = featuresText.split('\n').map((f) => f.trim()).filter(Boolean)
    const pricing = pricingText.split('\n').map((line) => {
      const [label, price] = line.split('|')
      return { label: label?.trim() ?? '', price: price?.trim() ?? '' }
    }).filter((p) => p.label)

    const payload = { ...serviceForm, features, pricing }

    if (editingService) {
      await supabase.from('services').update(payload).eq('id', editingService.id)
    } else {
      await supabase.from('services').insert(payload)
    }
    showToast(editingService ? 'Service updated!' : 'Service added!')
    setServiceDialog(false)
    fetchAll()
  }

  const deleteService = async (id: string) => {
    if (!confirm('Delete this service?')) return
    await supabase.from('services').delete().eq('id', id)
    setServices((prev) => prev.filter((s) => s.id !== id))
    showToast('Service deleted.')
  }

  const toggleService = async (s: Service) => {
    await supabase.from('services').update({ active: !s.active }).eq('id', s.id)
    setServices((prev) => prev.map((x) => x.id === s.id ? { ...x, active: !x.active } : x))
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-[#4a7fa5]">Loading content...</div>

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

      <div>
        <h2 className="text-2xl font-extrabold text-[#0c2340]">Content Management</h2>
        <p className="text-sm text-[#4a7fa5]">Edit About page, Services page, and team members — changes go live instantly</p>
      </div>

      <Tabs defaultValue="about">
        <TabsList className="bg-[#e0f7fa] text-[#0097a7]">
          <TabsTrigger value="about"    className="data-[state=active]:bg-[#0097a7] data-[state=active]:text-white">About Page</TabsTrigger>
          <TabsTrigger value="team"     className="data-[state=active]:bg-[#0097a7] data-[state=active]:text-white">Team Members</TabsTrigger>
          <TabsTrigger value="services" className="data-[state=active]:bg-[#0097a7] data-[state=active]:text-white">Services</TabsTrigger>
        </TabsList>

        {/* ── About text blocks ── */}
        <TabsContent value="about">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-3xl border border-[#cce7f0] shadow-sm p-6 space-y-6">
            <h3 className="font-bold text-[#0c2340]">About Page Text</h3>
            {aboutFields.map((field) => (
              <div key={field.key}>
                <label className="text-sm font-medium text-[#0c2340] mb-1.5 block">{field.label}</label>
                {field.multiline ? (
                  <Textarea
                    value={aboutDraft[field.key] ?? ''}
                    onChange={(e) => setAboutDraft((prev) => ({ ...prev, [field.key]: e.target.value }))}
                    rows={4}
                    className="border-[#cce7f0] resize-none"
                  />
                ) : (
                  <Input
                    value={aboutDraft[field.key] ?? ''}
                    onChange={(e) => setAboutDraft((prev) => ({ ...prev, [field.key]: e.target.value }))}
                    className="border-[#cce7f0]"
                  />
                )}
                <Button size="sm" onClick={() => saveContent(field.key)} className="mt-2 bg-[#0097a7] hover:bg-[#006064] text-white text-xs">
                  Save
                </Button>
              </div>
            ))}
          </motion.div>
        </TabsContent>

        {/* ── Team members ── */}
        <TabsContent value="team">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={openAddMember} className="bg-gradient-to-r from-[#0097a7] to-[#1565c0] text-white gap-2">
                <Plus className="w-4 h-4" /> Add Team Member
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {team.map((member, i) => (
                <motion.div key={member.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                  className="bg-white rounded-2xl border border-[#cce7f0] shadow-sm p-5 text-center relative">
                  <div className="absolute top-3 right-3 flex gap-1">
                    <button onClick={() => openEditMember(member)} className="w-6 h-6 rounded-lg bg-[#e0f7fa] flex items-center justify-center text-[#0097a7] hover:bg-[#0097a7] hover:text-white transition-colors">
                      <Edit className="w-3 h-3" />
                    </button>
                    <button onClick={() => deleteMember(member.id)} className="w-6 h-6 rounded-lg bg-red-50 flex items-center justify-center text-red-400 hover:bg-red-500 hover:text-white transition-colors">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-lg mx-auto mb-3 shadow-md"
                    style={{ background: `linear-gradient(135deg, ${member.color}, ${member.color}99)` }}>
                    {member.initials}
                  </div>
                  <p className="font-bold text-[#0c2340] text-sm">{member.name}</p>
                  <p className="text-xs font-medium mb-2" style={{ color: member.color }}>{member.role}</p>
                  <p className="text-[#4a7fa5] text-xs leading-relaxed">{member.bio}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </TabsContent>

        {/* ── Services ── */}
        <TabsContent value="services">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={openAddService} className="bg-gradient-to-r from-[#0097a7] to-[#1565c0] text-white gap-2">
                <Plus className="w-4 h-4" /> Add Service
              </Button>
            </div>
            <div className="space-y-4">
              {services.map((svc, i) => (
                <motion.div key={svc.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                  className="bg-white rounded-2xl border border-[#cce7f0] shadow-sm p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: svc.color + '22' }}>
                      {svc.icon === 'Droplets'   ? <Droplets   className="w-6 h-6" style={{ color: svc.color }} /> :
                       svc.icon === 'Settings'   ? <Settings   className="w-6 h-6" style={{ color: svc.color }} /> :
                       svc.icon === 'RefreshCw'  ? <RefreshCw  className="w-6 h-6" style={{ color: svc.color }} /> :
                       svc.icon === 'Clock'      ? <Clock      className="w-6 h-6" style={{ color: svc.color }} /> :
                       svc.icon === 'Shield'     ? <Shield     className="w-6 h-6" style={{ color: svc.color }} /> :
                       <Building2 className="w-6 h-6" style={{ color: svc.color }} />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-[#0c2340]">{svc.title}</h3>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${svc.active ? 'bg-green-100 text-green-700' : 'bg-[#f0f9ff] text-[#4a7fa5]'}`}>
                          {svc.active ? 'Active' : 'Hidden'}
                        </span>
                      </div>
                      <p className="text-sm text-[#4a7fa5] mb-2">{svc.description}</p>
                      <div className="flex flex-wrap gap-1">
                        {svc.features.slice(0, 3).map((f) => (
                          <span key={f} className="text-[10px] px-2 py-0.5 rounded-full bg-[#e0f7fa] text-[#0097a7]">{f}</span>
                        ))}
                        {svc.features.length > 3 && <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#f0f9ff] text-[#4a7fa5]">+{svc.features.length - 3}</span>}
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => toggleService(svc)} className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${svc.active ? 'border-amber-200 text-amber-600 hover:bg-amber-50' : 'border-green-200 text-green-600 hover:bg-green-50'}`}>
                        {svc.active ? 'Hide' : 'Show'}
                      </button>
                      <button onClick={() => openEditService(svc)} className="px-2.5 py-1 rounded-lg text-xs font-medium border border-[#cce7f0] text-[#0097a7] hover:bg-[#e0f7fa] transition-colors">
                        Edit
                      </button>
                      <button onClick={() => deleteService(svc.id)} className="px-2.5 py-1 rounded-lg text-xs font-medium border border-red-200 text-red-500 hover:bg-red-50 transition-colors">
                        Delete
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </TabsContent>
      </Tabs>

      {/* ── Team member dialog ── */}
      <Dialog open={memberDialog} onOpenChange={setMemberDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingMember ? 'Edit Team Member' : 'Add Team Member'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={saveMember} className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-[#0c2340] mb-1.5 block">Full Name *</label>
                <Input value={memberForm.name} onChange={(e) => setMemberForm({ ...memberForm, name: e.target.value })} placeholder="Jane Smith" className="border-[#cce7f0]" required />
              </div>
              <div>
                <label className="text-sm font-medium text-[#0c2340] mb-1.5 block">Initials *</label>
                <Input value={memberForm.initials} onChange={(e) => setMemberForm({ ...memberForm, initials: e.target.value.toUpperCase().slice(0, 2) })} placeholder="JS" maxLength={2} className="border-[#cce7f0]" required />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-[#0c2340] mb-1.5 block">Role / Title *</label>
              <Input value={memberForm.role} onChange={(e) => setMemberForm({ ...memberForm, role: e.target.value })} placeholder="Operations Manager" className="border-[#cce7f0]" required />
            </div>
            <div>
              <label className="text-sm font-medium text-[#0c2340] mb-1.5 block">Bio</label>
              <Textarea value={memberForm.bio} onChange={(e) => setMemberForm({ ...memberForm, bio: e.target.value })} placeholder="Brief description..." rows={3} className="border-[#cce7f0] resize-none" />
            </div>
            <div>
              <label className="text-sm font-medium text-[#0c2340] mb-1.5 block">Color</label>
              <div className="flex gap-2">
                {colorOptions.map((c) => (
                  <button key={c} type="button" onClick={() => setMemberForm({ ...memberForm, color: c })}
                    className={`w-7 h-7 rounded-lg transition-all ${memberForm.color === c ? 'ring-2 ring-offset-2 ring-[#0097a7] scale-110' : ''}`}
                    style={{ background: c }} />
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-[#0c2340] mb-1.5 block">Sort Order</label>
              <Input type="number" value={memberForm.sort_order} onChange={(e) => setMemberForm({ ...memberForm, sort_order: parseInt(e.target.value) || 0 })} className="border-[#cce7f0]" />
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setMemberDialog(false)} className="flex-1 border-[#cce7f0]">Cancel</Button>
              <Button type="submit" className="flex-1 bg-gradient-to-r from-[#0097a7] to-[#1565c0] text-white">
                {editingMember ? 'Save Changes' : 'Add Member'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Service dialog ── */}
      <Dialog open={serviceDialog} onOpenChange={setServiceDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingService ? 'Edit Service' : 'Add Service'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={saveService} className="space-y-4 mt-2">
            <div>
              <label className="text-sm font-medium text-[#0c2340] mb-1.5 block">Service Title *</label>
              <Input value={serviceForm.title} onChange={(e) => setServiceForm({ ...serviceForm, title: e.target.value })} placeholder="20L Water Delivery" className="border-[#cce7f0]" required />
            </div>
            <div>
              <label className="text-sm font-medium text-[#0c2340] mb-1.5 block">Description</label>
              <Textarea value={serviceForm.description} onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })} rows={3} className="border-[#cce7f0] resize-none" />
            </div>
            <div>
              <label className="text-sm font-medium text-[#0c2340] mb-1.5 block">Features (one per line)</label>
              <Textarea value={featuresText} onChange={(e) => setFeaturesText(e.target.value)} placeholder={"pH balanced water\nBPA-free containers\nSame-day delivery"} rows={4} className="border-[#cce7f0] resize-none text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium text-[#0c2340] mb-1.5 block">Pricing (format: Label|Price, one per line)</label>
              <Textarea value={pricingText} onChange={(e) => setPricingText(e.target.value)} placeholder={"1–4 jugs|$8.99/jug\n5–9 jugs|$7.99/jug\n10+ jugs|$6.99/jug"} rows={4} className="border-[#cce7f0] resize-none text-sm font-mono" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-[#0c2340] mb-1.5 block">Icon</label>
                <select value={serviceForm.icon} onChange={(e) => setServiceForm({ ...serviceForm, icon: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl border border-[#cce7f0] text-sm focus:border-[#0097a7] focus:outline-none text-[#0c2340]">
                  {iconOptions.map((icon) => <option key={icon} value={icon}>{icon}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-[#0c2340] mb-1.5 block">Color</label>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {colorOptions.map((c) => (
                    <button key={c} type="button" onClick={() => setServiceForm({ ...serviceForm, color: c })}
                      className={`w-7 h-7 rounded-lg transition-all ${serviceForm.color === c ? 'ring-2 ring-offset-1 ring-[#0097a7] scale-110' : ''}`}
                      style={{ background: c }} />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" id="svc-active" checked={serviceForm.active} onChange={(e) => setServiceForm({ ...serviceForm, active: e.target.checked })} className="w-4 h-4 accent-[#0097a7]" />
              <label htmlFor="svc-active" className="text-sm text-[#0c2340]">Active (visible on Services page)</label>
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setServiceDialog(false)} className="flex-1 border-[#cce7f0]">Cancel</Button>
              <Button type="submit" className="flex-1 bg-gradient-to-r from-[#0097a7] to-[#1565c0] text-white">
                {editingService ? 'Save Changes' : 'Add Service'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

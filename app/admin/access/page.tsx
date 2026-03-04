'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, CheckCircle2, UserCog, Shield, Users, Edit } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { supabase } from '@/lib/supabase'

interface AdminUser {
  id: string
  email: string
  role: 'super_admin' | 'manager' | 'delivery'
  name: string
  created_at: string
}

const ROLES = [
  {
    value: 'super_admin',
    label: 'Super Admin',
    desc: 'Full access to everything — settings, access management, all data',
    color: '#1565c0',
    bg: '#e3f2fd',
  },
  {
    value: 'manager',
    label: 'Manager',
    desc: 'Orders, customers, products, content, tickets, analytics',
    color: '#0097a7',
    bg: '#e0f7fa',
  },
  {
    value: 'delivery',
    label: 'Delivery Staff',
    desc: 'Dashboard and deliveries only',
    color: '#006064',
    bg: '#e0f2f1',
  },
] as const

type Role = typeof ROLES[number]['value']

const ROLE_MAP = Object.fromEntries(ROLES.map((r) => [r.value, r]))

const emptyForm = { email: '', name: '', role: 'manager' as Role }

export default function AdminAccessPage() {
  const [admins, setAdmins] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState('')
  const [dialog, setDialog] = useState(false)
  const [editing, setEditing] = useState<AdminUser | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [currentEmail, setCurrentEmail] = useState('')

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3500) }

  const fetchAdmins = async () => {
    setLoading(true)
    const { data } = await supabase.from('admin_users').select('*').order('created_at')
    if (data) setAdmins(data)
    setLoading(false)
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchAdmins()
    supabase.auth.getUser().then(({ data }) => {
      setCurrentEmail(data.user?.email ?? '')
    })
  }, [])

  const openAdd = () => {
    setEditing(null)
    setForm(emptyForm)
    setDialog(true)
  }

  const openEdit = (a: AdminUser) => {
    setEditing(a)
    setForm({ email: a.email, name: a.name || '', role: a.role })
    setDialog(true)
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    if (editing) {
      const { error } = await supabase
        .from('admin_users')
        .update({ name: form.name, role: form.role })
        .eq('id', editing.id)
      if (error) { showToast('Error: ' + error.message); setSaving(false); return }
      showToast('Admin updated!')
    } else {
      // Check if email already exists
      const { data: existing } = await supabase
        .from('admin_users')
        .select('id')
        .eq('email', form.email.toLowerCase().trim())
        .maybeSingle()

      if (existing) { showToast('That email already has access.'); setSaving(false); return }

      const { error } = await supabase.from('admin_users').insert({
        email: form.email.toLowerCase().trim(),
        name: form.name,
        role: form.role,
      })
      if (error) { showToast('Error: ' + error.message); setSaving(false); return }
      showToast('Access granted! They can now log in at /admin/login using their email.')
    }

    setSaving(false)
    setDialog(false)
    fetchAdmins()
  }

  const remove = async (admin: AdminUser) => {
    if (admin.email === currentEmail) {
      showToast("You can't remove your own access.")
      return
    }
    if (!confirm(`Remove admin access for ${admin.email}?`)) return
    await supabase.from('admin_users').delete().eq('id', admin.id)
    setAdmins((prev) => prev.filter((a) => a.id !== admin.id))
    showToast('Access removed.')
  }

  const stats = {
    total: admins.length,
    superAdmins: admins.filter((a) => a.role === 'super_admin').length,
    managers: admins.filter((a) => a.role === 'manager').length,
    delivery: admins.filter((a) => a.role === 'delivery').length,
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-[#4a7fa5]">Loading access list...</div>

  return (
    <div className="space-y-5 relative">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="fixed top-20 right-6 z-50 flex items-center gap-2 bg-[#0097a7] text-white px-4 py-3 rounded-2xl shadow-xl text-sm font-medium max-w-sm">
            <CheckCircle2 className="w-4 h-4 shrink-0" /> {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-[#0c2340]">Access Management</h2>
          <p className="text-sm text-[#4a7fa5]">Grant or revoke admin access — the person must have a Supabase auth account with that email</p>
        </div>
        <Button onClick={openAdd} className="bg-gradient-to-r from-[#0097a7] to-[#1565c0] text-white gap-2 shrink-0">
          <Plus className="w-4 h-4" /> Grant Access
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Admins', value: stats.total, icon: Users, color: '#0097a7', bg: '#e0f7fa' },
          { label: 'Super Admins', value: stats.superAdmins, icon: Shield, color: '#1565c0', bg: '#e3f2fd' },
          { label: 'Managers', value: stats.managers, icon: UserCog, color: '#006064', bg: '#e0f2f1' },
          { label: 'Delivery Staff', value: stats.delivery, icon: Users, color: '#00acc1', bg: '#e0f7fa' },
        ].map((s, i) => {
          const Icon = s.icon
          return (
            <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
              className="bg-white rounded-2xl p-4 border border-[#cce7f0] shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: s.bg }}>
                <Icon className="w-5 h-5" style={{ color: s.color }} />
              </div>
              <div>
                <p className="text-xl font-extrabold text-[#0c2340]">{s.value}</p>
                <p className="text-xs text-[#4a7fa5]">{s.label}</p>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Role guide */}
      <div className="bg-white rounded-2xl border border-[#cce7f0] p-5">
        <p className="text-xs font-semibold text-[#4a7fa5] uppercase tracking-wider mb-3">Role Permissions</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {ROLES.map((r) => (
            <div key={r.value} className="rounded-xl p-3.5 border" style={{ background: r.bg, borderColor: r.color + '33' }}>
              <div className="flex items-center gap-2 mb-1.5">
                <Shield className="w-3.5 h-3.5 shrink-0" style={{ color: r.color }} />
                <span className="text-xs font-bold" style={{ color: r.color }}>{r.label}</span>
              </div>
              <p className="text-xs text-[#4a7fa5] leading-relaxed">{r.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Admin list */}
      <div className="space-y-3">
        {admins.length === 0 ? (
          <div className="bg-white rounded-3xl border border-[#cce7f0] p-16 text-center">
            <Shield className="w-12 h-12 text-[#b3e5fc] mx-auto mb-3" />
            <p className="text-[#4a7fa5] font-medium">No admins yet</p>
            <Button onClick={openAdd} className="mt-4 bg-[#0097a7] text-white gap-2">
              <Plus className="w-4 h-4" /> Grant First Access
            </Button>
          </div>
        ) : (
          admins.map((admin, i) => {
            const role = ROLE_MAP[admin.role]
            const isMe = admin.email === currentEmail
            return (
              <motion.div key={admin.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="bg-white rounded-2xl border border-[#cce7f0] shadow-sm p-5">
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm"
                    style={{ background: `linear-gradient(135deg, ${role?.color ?? '#0097a7'}, ${role?.color ?? '#0097a7'}99)` }}>
                    {(admin.name || admin.email).charAt(0).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-[#0c2340] truncate">
                        {admin.name || 'No name set'}
                      </span>
                      {isMe && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#e0f7fa] text-[#0097a7] font-semibold">You</span>
                      )}
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                        style={{ background: role?.bg ?? '#e0f7fa', color: role?.color ?? '#0097a7' }}>
                        {role?.label ?? admin.role}
                      </span>
                    </div>
                    <p className="text-sm text-[#4a7fa5] truncate">{admin.email}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => openEdit(admin)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[#cce7f0] text-[#0097a7] hover:bg-[#e0f7fa] transition-colors flex items-center gap-1">
                      <Edit className="w-3 h-3" /> Edit
                    </button>
                    {!isMe && (
                      <button onClick={() => remove(admin)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium border border-red-200 text-red-500 hover:bg-red-50 transition-colors flex items-center gap-1">
                        <Trash2 className="w-3 h-3" /> Remove
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            )
          })
        )}
      </div>

      {/* Notice */}
      <div className="bg-[#fff8e1] border border-amber-200 rounded-2xl p-4 text-sm text-amber-800">
        <p className="font-semibold mb-1">How to add an admin:</p>
        <ol className="list-decimal list-inside space-y-1 text-amber-700 text-xs leading-relaxed">
          <li>Go to <strong>Supabase Dashboard → Authentication → Users</strong> and create an account for the person (or have them sign up on the site first)</li>
          <li>Come back here and click <strong>Grant Access</strong> — enter their exact email and choose a role</li>
          <li>They can now log in at <code className="bg-amber-100 px-1 rounded">/admin/login</code> with their email and password</li>
        </ol>
      </div>

      {/* Dialog */}
      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Admin Access' : 'Grant Admin Access'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={save} className="space-y-4 mt-2">
            <div>
              <label className="text-sm font-medium text-[#0c2340] mb-1.5 block">Full Name</label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Jane Smith"
                className="border-[#cce7f0]"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-[#0c2340] mb-1.5 block">Email Address *</label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="jane@example.com"
                className="border-[#cce7f0]"
                required
                disabled={!!editing}
              />
              {editing && <p className="text-xs text-[#4a7fa5] mt-1">Email cannot be changed — remove and re-add to change email</p>}
            </div>

            <div>
              <label className="text-sm font-medium text-[#0c2340] mb-2 block">Role *</label>
              <div className="space-y-2">
                {ROLES.map((r) => (
                  <label key={r.value}
                    className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                      form.role === r.value ? 'border-[#0097a7] bg-[#e0f7fa]' : 'border-[#cce7f0] hover:border-[#0097a7]/40'
                    }`}>
                    <input
                      type="radio"
                      name="role"
                      value={r.value}
                      checked={form.role === r.value}
                      onChange={() => setForm({ ...form, role: r.value })}
                      className="mt-0.5 accent-[#0097a7]"
                    />
                    <div>
                      <p className="text-sm font-semibold text-[#0c2340]">{r.label}</p>
                      <p className="text-xs text-[#4a7fa5]">{r.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialog(false)} className="flex-1 border-[#cce7f0]">
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="flex-1 bg-gradient-to-r from-[#0097a7] to-[#1565c0] text-white">
                {saving ? 'Saving...' : editing ? 'Save Changes' : 'Grant Access'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

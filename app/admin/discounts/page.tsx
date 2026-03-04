'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Tag, CheckCircle2, Trash2, ToggleLeft, ToggleRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { supabase } from '@/lib/supabase'

type DiscountCode = {
  id: string
  code: string
  type: 'percent' | 'fixed'
  value: number
  min_order_amount: number
  max_uses: number | null
  uses_count: number
  expires_at: string | null
  active: boolean
  created_at: string
}

const empty: { code: string; type: 'percent' | 'fixed'; value: number; min_order_amount: number; max_uses: string; expires_at: string; active: boolean } = {
  code: '', type: 'percent', value: 10,
  min_order_amount: 0, max_uses: '', expires_at: '', active: true,
}

export default function AdminDiscountsPage() {
  const [codes, setCodes] = useState<DiscountCode[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const fetchCodes = async () => {
    setLoading(true)
    const { data } = await supabase.from('discount_codes').select('*').order('created_at', { ascending: false })
    if (data) setCodes(data as DiscountCode[])
    setLoading(false)
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchCodes() }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const payload = {
      code: form.code.toUpperCase().trim(),
      type: form.type,
      value: Number(form.value),
      min_order_amount: Number(form.min_order_amount) || 0,
      max_uses: form.max_uses === '' ? null : Number(form.max_uses),
      expires_at: form.expires_at || null,
      active: form.active,
    }
    const { error } = await supabase.from('discount_codes').insert(payload)
    if (!error) {
      showToast('Discount code created!')
      fetchCodes()
      setDialogOpen(false)
      setForm(empty)
    } else {
      showToast('Error: ' + (error.message ?? 'Failed to create'))
    }
    setSaving(false)
  }

  const toggleActive = async (code: DiscountCode) => {
    await supabase.from('discount_codes').update({ active: !code.active }).eq('id', code.id)
    setCodes((prev) => prev.map((c) => c.id === code.id ? { ...c, active: !c.active } : c))
  }

  const deleteCode = async (id: string) => {
    if (!confirm('Delete this discount code? This cannot be undone.')) return
    await supabase.from('discount_codes').delete().eq('id', id)
    setCodes((prev) => prev.filter((c) => c.id !== id))
    showToast('Code deleted.')
  }

  const isExpired = (code: DiscountCode) => code.expires_at ? new Date(code.expires_at) < new Date() : false

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

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0c2340]">Discount Codes</h1>
          <p className="text-sm text-[#4a7fa5]">{codes.filter(c => c.active).length} active codes</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="bg-gradient-to-r from-[#0097a7] to-[#1565c0] text-white gap-2">
          <Plus className="w-4 h-4" /> Create Code
        </Button>
      </div>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl border border-[#cce7f0] shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-[#4a7fa5]">Loading...</div>
        ) : codes.length === 0 ? (
          <div className="p-12 text-center">
            <Tag className="w-8 h-8 text-[#cce7f0] mx-auto mb-3" />
            <p className="text-[#4a7fa5]">No discount codes yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#f0f9ff] text-xs text-[#4a7fa5] uppercase tracking-wider">
                  <th className="px-4 py-3 text-left">Code</th>
                  <th className="px-4 py-3 text-left">Discount</th>
                  <th className="px-4 py-3 text-left">Min Order</th>
                  <th className="px-4 py-3 text-left">Uses</th>
                  <th className="px-4 py-3 text-left">Expires</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {codes.map((code) => (
                  <tr key={code.id} className="border-t border-[#f0f9ff] hover:bg-[#f8fbfe]">
                    <td className="px-4 py-3">
                      <span className="font-mono font-bold text-[#0097a7] bg-[#e0f7fa] px-2 py-0.5 rounded-lg">{code.code}</span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-[#0c2340]">
                      {code.type === 'percent' ? `${code.value}% off` : `$${code.value.toFixed(2)} off`}
                    </td>
                    <td className="px-4 py-3 text-[#4a7fa5]">
                      {code.min_order_amount > 0 ? `$${code.min_order_amount.toFixed(2)} min` : '—'}
                    </td>
                    <td className="px-4 py-3 text-[#4a7fa5]">
                      {code.uses_count}{code.max_uses ? ` / ${code.max_uses}` : ' / ∞'}
                    </td>
                    <td className="px-4 py-3 text-[#4a7fa5] text-xs">
                      {code.expires_at
                        ? <span className={isExpired(code) ? 'text-red-500' : ''}>
                            {new Date(code.expires_at).toLocaleDateString('en-CA')}
                            {isExpired(code) && ' (expired)'}
                          </span>
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={code.active && !isExpired(code) ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}>
                        {code.active && !isExpired(code) ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5">
                        <button onClick={() => toggleActive(code)} title={code.active ? 'Deactivate' : 'Activate'}
                          className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${code.active ? 'bg-amber-50 text-amber-600 hover:bg-amber-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}>
                          {code.active ? <ToggleLeft className="w-3.5 h-3.5" /> : <ToggleRight className="w-3.5 h-3.5" />}
                        </button>
                        <button onClick={() => deleteCode(code.id)} title="Delete"
                          className="w-7 h-7 rounded-lg bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* Create dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#0c2340]">Create Discount Code</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-[#0c2340] mb-1.5 block">Code *</label>
              <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="e.g. SUMMER20" className="border-[#cce7f0] font-mono uppercase" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-[#0c2340] mb-1.5 block">Type *</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as 'percent' | 'fixed' })}
                  className="w-full h-10 px-3 rounded-xl border border-[#cce7f0] text-sm focus:border-[#0097a7] focus:outline-none">
                  <option value="percent">% Percent</option>
                  <option value="fixed">$ Fixed Amount</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-[#0c2340] mb-1.5 block">Value *</label>
                <Input type="number" step="0.01" min="0" value={form.value}
                  onChange={(e) => setForm({ ...form, value: parseFloat(e.target.value) || 0 })}
                  className="border-[#cce7f0]" required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-[#0c2340] mb-1.5 block">Min Order ($)</label>
                <Input type="number" step="0.01" min="0" value={form.min_order_amount}
                  onChange={(e) => setForm({ ...form, min_order_amount: parseFloat(e.target.value) || 0 })}
                  className="border-[#cce7f0]" placeholder="0" />
              </div>
              <div>
                <label className="text-sm font-medium text-[#0c2340] mb-1.5 block">Max Uses</label>
                <Input type="number" min="1" value={form.max_uses}
                  onChange={(e) => setForm({ ...form, max_uses: e.target.value })}
                  className="border-[#cce7f0]" placeholder="Unlimited" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-[#0c2340] mb-1.5 block">Expires At</label>
              <Input type="date" value={form.expires_at}
                onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
                className="border-[#cce7f0]" />
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="flex-1 border-[#cce7f0]">Cancel</Button>
              <Button type="submit" disabled={saving} className="flex-1 bg-gradient-to-r from-[#0097a7] to-[#1565c0] text-white">
                {saving ? 'Creating...' : 'Create Code'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

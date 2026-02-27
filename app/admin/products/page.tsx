'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Edit, Trash2, AlertTriangle, Package, CheckCircle2, Search, Minus, Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { supabase } from '@/lib/supabase'
import type { Product } from '@/types'

const categories = ['water', 'equipment', 'subscription', 'accessories']
const categoryEmoji: Record<string, string> = { water: '💧', equipment: '🔧', subscription: '🔄', accessories: '🧹' }

const empty: Omit<Product, 'id'> = { name: '', description: '', price: 0, image_url: '', stock: 0, category: 'water', active: true }

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [form, setForm] = useState<Omit<Product, 'id'>>(empty)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [toast, setToast]           = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [lowThreshold, setLowThreshold] = useState(20)
  const [stockFilter, setStockFilter]   = useState<'all' | 'low' | 'out'>('all')

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const fetchProducts = async () => {
    setLoading(true)
    const { data } = await supabase.from('products').select('*').order('category').order('name')
    if (data) setProducts(data)

    // Load low stock threshold from site_content
    const { data: contentRow } = await supabase
      .from('site_content')
      .select('value')
      .eq('key', 'inventory_low_stock_threshold')
      .single()
    if (contentRow?.value) setLowThreshold(parseInt(contentRow.value) || 20)

    setLoading(false)
  }

  useEffect(() => { fetchProducts() }, [])

  const adjustStock = async (product: Product, delta: number) => {
    const newStock = Math.max(0, product.stock + delta)
    const { error } = await supabase.from('products').update({ stock: newStock }).eq('id', product.id)
    if (!error) {
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, stock: newStock } : p))
    }
  }

  const saveLowThreshold = async (val: number) => {
    setLowThreshold(val)
    await supabase.from('site_content').upsert({ key: 'inventory_low_stock_threshold', value: String(val) }, { onConflict: 'key' })
  }

  const openAdd = () => { setEditing(null); setForm(empty); setDialogOpen(true) }
  const openEdit = (p: Product) => { setEditing(p); setForm({ name: p.name, description: p.description, price: p.price, image_url: p.image_url, stock: p.stock, category: p.category, active: p.active }); setDialogOpen(true) }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { showToast('Please select an image file.'); return }
    if (file.size > 5 * 1024 * 1024) { showToast('Image must be under 5 MB.'); return }
    setUploading(true)
    const ext = file.name.split('.').pop() ?? 'jpg'
    const path = `products/${Date.now()}.${ext}`
    const { error: uploadError } = await supabase.storage.from('product-images').upload(path, file, { upsert: true })
    if (uploadError) { showToast('Upload failed. Check storage bucket permissions.'); setUploading(false); return }
    const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(path)
    setForm((prev) => ({ ...prev, image_url: publicUrl }))
    if (fileInputRef.current) fileInputRef.current.value = ''
    setUploading(false)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    if (editing) {
      const { error } = await supabase.from('products').update(form).eq('id', editing.id)
      if (!error) { showToast('Product updated!'); fetchProducts(); setDialogOpen(false) }
    } else {
      const { error } = await supabase.from('products').insert(form)
      if (!error) { showToast('Product added!'); fetchProducts(); setDialogOpen(false) }
    }
    setSaving(false)
  }

  const toggleActive = async (p: Product) => {
    await supabase.from('products').update({ active: !p.active }).eq('id', p.id)
    setProducts((prev) => prev.map((x) => x.id === p.id ? { ...x, active: !x.active } : x))
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Archive this product? It will be hidden from the shop but order history is preserved.')) return
    await supabase.from('products').update({ active: false }).eq('id', id)
    setProducts((prev) => prev.map((p) => p.id === id ? { ...p, active: false } : p))
    showToast('Product archived.')
  }

  const filtered = products.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase())
    const matchStock =
      stockFilter === 'all' ? true :
      stockFilter === 'out' ? p.stock === 0 :
      p.stock > 0 && p.stock < lowThreshold
    return matchSearch && matchStock
  })

  const lowStockCount = products.filter(p => p.stock > 0 && p.stock < lowThreshold).length
  const outOfStockCount = products.filter(p => p.stock === 0).length
  const maxStock = Math.max(...products.map(p => p.stock), 1)

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

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-[#0c2340]">Products & Inventory</h2>
          <p className="text-sm text-[#4a7fa5]">{products.length} products · changes reflect on the shop immediately</p>
        </div>
        <Button onClick={openAdd} className="bg-gradient-to-r from-[#0097a7] to-[#1565c0] text-white gap-2">
          <Plus className="w-4 h-4" /> Add Product
        </Button>
      </div>

      {/* Inventory summary */}
      {!loading && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total SKUs',    value: products.length,  color: '#0097a7', bg: '#e0f7fa' },
            { label: 'Low Stock',     value: lowStockCount,    color: '#d97706', bg: '#fef3c7' },
            { label: 'Out of Stock',  value: outOfStockCount,  color: '#dc2626', bg: '#fef2f2' },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
              className="bg-white rounded-2xl p-4 border border-[#cce7f0] shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: s.bg }}>
                <Package className="w-5 h-5" style={{ color: s.color }} />
              </div>
              <div>
                <p className="text-xl font-extrabold text-[#0c2340]">{s.value}</p>
                <p className="text-xs text-[#4a7fa5]">{s.label}</p>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Low stock threshold + search + filter row */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#0097a7]" />
          <Input placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 border-[#cce7f0] bg-white" />
        </div>
        <div className="flex gap-2">
          {(['all', 'low', 'out'] as const).map(f => (
            <button key={f} onClick={() => setStockFilter(f)}
              className={`px-3 py-2 rounded-xl text-xs font-medium transition-all capitalize ${
                stockFilter === f ? 'bg-[#0097a7] text-white' : 'bg-white border border-[#cce7f0] text-[#4a7fa5] hover:border-[#0097a7]'
              }`}>
              {f === 'all' ? 'All' : f === 'low' ? 'Low Stock' : 'Out of Stock'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <label className="text-xs text-[#4a7fa5] whitespace-nowrap">Low stock threshold:</label>
          <Input
            type="number" min="1" value={lowThreshold}
            onChange={e => saveLowThreshold(parseInt(e.target.value) || 20)}
            className="w-20 h-8 text-xs border-[#cce7f0]"
          />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-48 bg-white rounded-2xl border border-[#cce7f0] animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((product, i) => (
            <motion.div key={product.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className={`bg-white rounded-2xl border shadow-sm p-5 ${product.stock > 0 && product.stock < 20 ? 'border-amber-300' : 'border-[#cce7f0]'}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-[#e0f7fa] flex items-center justify-center text-xl">
                    {categoryEmoji[product.category] ?? '📦'}
                  </div>
                  <div>
                    <Badge className={product.active ? 'bg-green-100 text-green-700 text-[10px]' : 'bg-[#f0f9ff] text-[#4a7fa5] text-[10px]'}>
                      {product.active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(product)} className="w-8 h-8 rounded-lg border border-[#cce7f0] flex items-center justify-center text-[#4a7fa5] hover:border-[#0097a7] hover:text-[#0097a7] transition-colors">
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(product.id)} className="w-8 h-8 rounded-lg border border-[#cce7f0] flex items-center justify-center text-[#4a7fa5] hover:border-red-400 hover:text-red-500 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <h3 className="font-bold text-[#0c2340] text-sm mb-1 leading-tight">{product.name}</h3>
              <p className="text-xs text-[#4a7fa5] line-clamp-2 mb-3">{product.description}</p>

              <div className="flex items-center justify-between mb-2">
                <p className="text-xl font-extrabold text-[#0097a7]">${product.price.toFixed(2)}</p>
                <div className={`flex items-center gap-1 text-xs font-medium ${product.stock < 20 ? 'text-amber-600' : 'text-[#4a7fa5]'}`}>
                  {product.stock < 20 && product.stock > 0 && <AlertTriangle className="w-3.5 h-3.5" />}
                  <Package className="w-3.5 h-3.5" />
                  {product.stock} in stock
                </div>
              </div>

              {/* Stock bar */}
              <div className="w-full h-1.5 bg-[#f0f9ff] rounded-full mb-3">
                <div className={`h-full rounded-full ${product.stock === 0 ? 'bg-red-400' : product.stock < lowThreshold ? 'bg-amber-400' : 'bg-[#0097a7]'}`}
                  style={{ width: `${Math.min(100, (product.stock / maxStock) * 100)}%` }} />
              </div>

              {/* Quick stock adjust */}
              <div className="flex items-center gap-2 mb-3">
                <button onClick={() => adjustStock(product, -1)} disabled={product.stock === 0}
                  className="w-7 h-7 rounded-lg border border-[#cce7f0] flex items-center justify-center text-[#4a7fa5] hover:border-red-400 hover:text-red-500 disabled:opacity-30 transition-colors">
                  <Minus className="w-3 h-3" />
                </button>
                <span className="text-xs font-bold text-[#0c2340] min-w-[40px] text-center">{product.stock}</span>
                <button onClick={() => adjustStock(product, 1)}
                  className="w-7 h-7 rounded-lg border border-[#cce7f0] flex items-center justify-center text-[#4a7fa5] hover:border-green-400 hover:text-green-600 transition-colors">
                  <Plus className="w-3 h-3" />
                </button>
                <span className="text-[10px] text-[#4a7fa5] ml-1">units</span>
              </div>

              <button onClick={() => toggleActive(product)}
                className={`w-full py-1.5 rounded-xl text-xs font-medium border transition-colors ${product.active ? 'border-amber-200 text-amber-600 hover:bg-amber-50' : 'border-green-200 text-green-600 hover:bg-green-50'}`}>
                {product.active ? 'Deactivate' : 'Activate'}
              </button>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#0c2340]">{editing ? 'Edit Product' : 'Add New Product'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 mt-2">
            <div>
              <label className="text-sm font-medium text-[#0c2340] mb-1.5 block">Product Name *</label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. 20L Spring Water Jug" className="border-[#cce7f0]" required />
            </div>
            <div>
              <label className="text-sm font-medium text-[#0c2340] mb-1.5 block">Description</label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Brief description shown on the shop..." rows={3} className="border-[#cce7f0] resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-[#0c2340] mb-1.5 block">Price ($) *</label>
                <Input type="number" step="0.01" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })} className="border-[#cce7f0]" required />
              </div>
              <div>
                <label className="text-sm font-medium text-[#0c2340] mb-1.5 block">Stock (units) *</label>
                <Input type="number" min="0" value={form.stock} onChange={(e) => setForm({ ...form, stock: parseInt(e.target.value) || 0 })} className="border-[#cce7f0]" required />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-[#0c2340] mb-1.5 block">Category *</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full h-10 px-3 rounded-xl border border-[#cce7f0] text-sm focus:border-[#0097a7] focus:outline-none text-[#0c2340]" required>
                {categories.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-[#0c2340] mb-1.5 block">Product Image</label>
              {form.image_url ? (
                <div className="relative w-full h-36 rounded-xl overflow-hidden border border-[#cce7f0] mb-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={form.image_url} alt="Product" className="w-full h-full object-contain bg-[#f0f9ff]" />
                  <button type="button" onClick={() => setForm({ ...form, image_url: '' })}
                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}
                  className="w-full h-24 border-2 border-dashed border-[#cce7f0] rounded-xl flex flex-col items-center justify-center gap-2 text-[#4a7fa5] hover:border-[#0097a7] hover:text-[#0097a7] transition-colors mb-2 disabled:opacity-60">
                  {uploading ? (
                    <div className="w-5 h-5 border-2 border-[#cce7f0] border-t-[#0097a7] rounded-full animate-spin" />
                  ) : (
                    <><Upload className="w-5 h-5" /><span className="text-xs font-medium">Click to upload image</span><span className="text-[10px]">JPG, PNG, WebP · Max 5 MB</span></>
                  )}
                </button>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              <Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="Or paste image URL..." className="border-[#cce7f0] text-xs" />
            </div>
            <div className="flex items-center gap-3 pt-1">
              <input type="checkbox" id="active" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="w-4 h-4 accent-[#0097a7]" />
              <label htmlFor="active" className="text-sm text-[#0c2340]">Active (visible on shop)</label>
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="flex-1 border-[#cce7f0]">Cancel</Button>
              <Button type="submit" disabled={saving} className="flex-1 bg-gradient-to-r from-[#0097a7] to-[#1565c0] text-white">
                {saving ? 'Saving...' : editing ? 'Save Changes' : 'Add Product'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

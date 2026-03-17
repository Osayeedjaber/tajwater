'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Save, Upload, X, Package, AlertTriangle,
  CheckCircle2, Trash2, Eye, EyeOff, Plus, Minus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { Product } from '@/types'

const categories = ['water', 'equipment', 'subscription', 'accessories']
const categoryEmoji: Record<string, string> = {
  water: '💧', equipment: '🔧', subscription: '🔄', accessories: '🧹',
}
const categoryColors: Record<string, string> = {
  water: '#0097a7', equipment: '#1565c0', subscription: '#006064', accessories: '#00acc1',
}

export default function AdminProductDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [product, setProduct] = useState<Product | null>(null)
  const [form, setForm] = useState<Omit<Product, 'id'> | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [toast, setToast] = useState('')
  const [toastType, setToastType] = useState<'success' | 'error'>('success')
  const [stockDelta, setStockDelta] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast(msg)
    setToastType(type)
    setTimeout(() => setToast(''), 3500)
  }

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single()
      if (error || !data) {
        router.replace('/admin/products')
        return
      }
      setProduct(data)
      setForm({
        name: data.name,
        description: data.description,
        price: data.price,
        stock: data.stock,
        category: data.category,
        image_url: data.image_url,
        active: data.active,
      })
      setLoading(false)
    }
    load()
  }, [id, router])

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !form) return
    if (!file.type.startsWith('image/')) { showToast('Please select an image file.', 'error'); return }
    if (file.size > 5 * 1024 * 1024) { showToast('Image must be under 5 MB.', 'error'); return }
    setUploading(true)
    const ext = file.name.split('.').pop() ?? 'jpg'
    const path = `products/${Date.now()}.${ext}`
    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(path, file, { upsert: true })
    if (uploadError) {
      showToast('Upload failed. Check storage bucket permissions.', 'error')
      setUploading(false)
      return
    }
    const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(path)
    setForm((prev) => prev ? { ...prev, image_url: publicUrl } : prev)
    if (fileInputRef.current) fileInputRef.current.value = ''
    setUploading(false)
    showToast('Image uploaded!')
  }

  const handleSave = async () => {
    if (!form || !product) return
    setSaving(true)
    const stockAdjusted = form.stock + stockDelta
    const payload = { ...form, stock: stockAdjusted }
    const { error } = await supabase.from('products').update(payload).eq('id', product.id)
    if (error) {
      showToast('Failed to save changes.', 'error')
    } else {
      setProduct({ ...product, ...payload })
      setForm(payload)
      setStockDelta(0)
      showToast('Product saved!')
    }
    setSaving(false)
  }

  const handleArchive = async () => {
    if (!product) return
    if (!confirm('Archive this product? It will be hidden from the shop but order history is preserved.')) return
    await supabase.from('products').update({ active: false }).eq('id', product.id)
    showToast('Product archived.')
    setTimeout(() => router.push('/admin/products'), 1200)
  }

  if (loading || !form || !product) {
    return (
      <div className="space-y-6">
        <div className="h-10 bg-[#e0f7fa] rounded-xl w-48 animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-3xl border border-[#cce7f0] h-96 animate-pulse" />
          <div className="bg-white rounded-3xl border border-[#cce7f0] h-80 animate-pulse" />
        </div>
      </div>
    )
  }

  const color = categoryColors[form.category] ?? '#0097a7'
  const currentStock = form.stock + stockDelta

  return (
    <div className="space-y-6 relative">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-20 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl shadow-xl text-sm font-medium text-white ${toastType === 'error' ? 'bg-red-500' : 'bg-[#0097a7]'}`}
          >
            <CheckCircle2 className="w-4 h-4" /> {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/products"
            className="w-9 h-9 rounded-xl border border-[#cce7f0] flex items-center justify-center text-[#4a7fa5] hover:border-[#0097a7] hover:text-[#0097a7] transition-colors bg-white"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h2 className="text-xl font-extrabold text-[#0c2340] leading-tight">{product.name}</h2>
            <p className="text-xs text-[#4a7fa5]">Product ID: {product.id.slice(0, 8).toUpperCase()}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/shop/${product.id}`} target="_blank">
            <Button variant="outline" size="sm" className="border-[#cce7f0] text-[#4a7fa5] gap-1.5">
              <Eye className="w-3.5 h-3.5" /> View on Shop
            </Button>
          </Link>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-gradient-to-r from-[#0097a7] to-[#1565c0] text-white gap-2"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* Status badges */}
      <div className="flex items-center gap-2 flex-wrap">
        <Badge className={form.active ? 'bg-green-100 text-green-700' : 'bg-[#f0f9ff] text-[#4a7fa5]'}>
          {form.active ? '● Active' : '○ Inactive'}
        </Badge>
        <Badge className="capitalize text-xs" style={{ background: color, color: '#fff' }}>
          {categoryEmoji[form.category] ?? '📦'} {form.category}
        </Badge>
        {currentStock === 0 && (
          <Badge className="bg-red-100 text-red-600">Out of Stock</Badge>
        )}
        {currentStock > 0 && currentStock < 20 && (
          <Badge className="bg-amber-100 text-amber-700 gap-1">
            <AlertTriangle className="w-3 h-3" /> Low Stock
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* === LEFT: Main edit form === */}
        <div className="lg:col-span-2 space-y-5">
          {/* Product info card */}
          <div className="bg-white rounded-3xl border border-[#cce7f0] shadow-sm p-6 space-y-5">
            <h3 className="font-bold text-[#0c2340] text-sm border-b border-[#f0f9ff] pb-3">Product Information</h3>

            <div>
              <label className="text-sm font-medium text-[#0c2340] mb-1.5 block">Product Name *</label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. 20L Spring Water Jug"
                className="border-[#cce7f0] focus:border-[#0097a7]"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-[#0c2340] mb-1.5 block">Description</label>
              <Textarea
                value={form.description ?? ''}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Shown on the product detail page and shop listing..."
                rows={4}
                className="border-[#cce7f0] focus:border-[#0097a7] resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-[#0c2340] mb-1.5 block">Price (CAD) *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4a7fa5] text-sm">$</span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })}
                    className="pl-7 border-[#cce7f0] focus:border-[#0097a7]"
                    required
                  />
                </div>
                <p className="text-[10px] text-[#4a7fa5] mt-1">Subscribe & Save shows 10% off: ${(form.price * 0.9).toFixed(2)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-[#0c2340] mb-1.5 block">Category *</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl border border-[#cce7f0] text-sm focus:border-[#0097a7] focus:outline-none text-[#0c2340] bg-white"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>{categoryEmoji[c]} {c.charAt(0).toUpperCase() + c.slice(1)}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Image card */}
          <div className="bg-white rounded-3xl border border-[#cce7f0] shadow-sm p-6 space-y-4">
            <h3 className="font-bold text-[#0c2340] text-sm border-b border-[#f0f9ff] pb-3">Product Image</h3>

            {form.image_url ? (
              <div className="relative w-full h-56 rounded-2xl overflow-hidden border border-[#cce7f0]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={form.image_url}
                  alt={form.name}
                  className="w-full h-full object-contain bg-[#f0f9ff]"
                />
                <button
                  type="button"
                  onClick={() => setForm({ ...form, image_url: '' })}
                  className="absolute top-3 right-3 w-7 h-7 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors shadow"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full h-36 border-2 border-dashed border-[#cce7f0] rounded-2xl flex flex-col items-center justify-center gap-2 text-[#4a7fa5] hover:border-[#0097a7] hover:text-[#0097a7] transition-colors disabled:opacity-60"
              >
                {uploading ? (
                  <div className="w-6 h-6 border-2 border-[#cce7f0] border-t-[#0097a7] rounded-full animate-spin" />
                ) : (
                  <>
                    <Upload className="w-6 h-6" />
                    <span className="text-sm font-medium">Click to upload image</span>
                    <span className="text-xs">JPG, PNG, WebP · Max 5 MB</span>
                  </>
                )}
              </button>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            <div>
              <label className="text-xs text-[#4a7fa5] mb-1 block">Or paste an image URL</label>
              <Input
                value={form.image_url ?? ''}
                onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                placeholder="https://..."
                className="border-[#cce7f0] focus:border-[#0097a7] text-sm"
              />
            </div>
          </div>
        </div>

        {/* === RIGHT: Sidebar === */}
        <div className="space-y-5">
          {/* Visibility */}
          <div className="bg-white rounded-3xl border border-[#cce7f0] shadow-sm p-5 space-y-3">
            <h3 className="font-bold text-[#0c2340] text-sm border-b border-[#f0f9ff] pb-3">Visibility</h3>
            <button
              onClick={() => setForm({ ...form, active: !form.active })}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
                form.active
                  ? 'border-green-200 bg-green-50 text-green-700'
                  : 'border-[#cce7f0] bg-[#f0f9ff] text-[#4a7fa5]'
              }`}
            >
              <span className="text-sm font-medium">{form.active ? 'Visible on shop' : 'Hidden from shop'}</span>
              {form.active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
            <p className="text-[10px] text-[#4a7fa5]">
              {form.active
                ? 'Customers can see and purchase this product.'
                : 'This product is hidden. Toggle on to make it live.'}
            </p>
          </div>

          {/* Stock management */}
          <div className="bg-white rounded-3xl border border-[#cce7f0] shadow-sm p-5 space-y-4">
            <h3 className="font-bold text-[#0c2340] text-sm border-b border-[#f0f9ff] pb-3">Inventory</h3>

            <div className="text-center">
              <p className="text-4xl font-extrabold text-[#0c2340]">{currentStock}</p>
              <p className="text-xs text-[#4a7fa5]">units in stock</p>
              {stockDelta !== 0 && (
                <p className={`text-xs font-semibold mt-1 ${stockDelta > 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {stockDelta > 0 ? `+${stockDelta}` : stockDelta} pending (click Save)
                </p>
              )}
            </div>

            {/* Stock bar */}
            <div className="w-full h-2 bg-[#f0f9ff] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${currentStock === 0 ? 'bg-red-400' : currentStock < 20 ? 'bg-amber-400' : 'bg-[#0097a7]'}`}
                style={{ width: `${Math.min(100, (currentStock / Math.max(currentStock + 50, 100)) * 100)}%` }}
              />
            </div>

            {/* Adjust buttons */}
            <div>
              <label className="text-xs text-[#4a7fa5] mb-2 block">Adjust stock</label>
              <div className="flex items-center justify-between gap-2">
                {[-10, -5, -1].map((delta) => (
                  <button
                    key={delta}
                    onClick={() => setStockDelta((d) => Math.max(-form.stock, d + delta))}
                    disabled={currentStock + delta < 0}
                    className="flex-1 h-9 rounded-xl border border-[#cce7f0] text-sm font-semibold text-red-500 hover:bg-red-50 hover:border-red-200 disabled:opacity-30 transition-colors"
                  >
                    {delta}
                  </button>
                ))}
                <div className="w-px h-9 bg-[#cce7f0]" />
                {[1, 5, 10].map((delta) => (
                  <button
                    key={delta}
                    onClick={() => setStockDelta((d) => d + delta)}
                    className="flex-1 h-9 rounded-xl border border-[#cce7f0] text-sm font-semibold text-green-600 hover:bg-green-50 hover:border-green-200 transition-colors"
                  >
                    +{delta}
                  </button>
                ))}
              </div>
            </div>

            {/* Manual stock input */}
            <div>
              <label className="text-xs text-[#4a7fa5] mb-1.5 block">Set stock directly</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setStockDelta(-1)}
                  className="w-9 h-9 rounded-xl border border-[#cce7f0] flex items-center justify-center text-[#4a7fa5] hover:border-red-400 hover:text-red-500 transition-colors"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <Input
                  type="number"
                  min="0"
                  value={currentStock}
                  onChange={(e) => {
                    const newVal = parseInt(e.target.value) || 0
                    setStockDelta(newVal - form.stock)
                  }}
                  className="text-center font-bold border-[#cce7f0] focus:border-[#0097a7]"
                />
                <button
                  onClick={() => setStockDelta((d) => d + 1)}
                  className="w-9 h-9 rounded-xl border border-[#cce7f0] flex items-center justify-center text-[#4a7fa5] hover:border-green-400 hover:text-green-600 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Preview card */}
          <div className="bg-white rounded-3xl border border-[#cce7f0] shadow-sm p-5 space-y-3">
            <h3 className="font-bold text-[#0c2340] text-sm border-b border-[#f0f9ff] pb-3">Shop Preview</h3>
            <div className="rounded-2xl border border-[#cce7f0] overflow-hidden">
              <div
                className="h-28 flex items-center justify-center"
                style={{ background: `linear-gradient(135deg, ${color}15, ${color}30)` }}
              >
                {form.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.image_url} alt={form.name} className="h-full w-full object-contain p-3" />
                ) : (
                  <div className="text-5xl">{categoryEmoji[form.category] ?? '📦'}</div>
                )}
              </div>
              <div className="p-3">
                <p className="font-bold text-[#0c2340] text-sm line-clamp-1">{form.name || 'Product Name'}</p>
                <p className="text-[10px] text-[#4a7fa5] line-clamp-2 mt-0.5">{form.description || 'Description...'}</p>
                <p className="text-lg font-extrabold mt-1.5" style={{ color }}>${form.price.toFixed(2)}</p>
              </div>
            </div>
          </div>

          {/* Danger zone */}
          <div className="bg-white rounded-3xl border border-red-100 shadow-sm p-5 space-y-3">
            <h3 className="font-bold text-red-600 text-sm border-b border-red-50 pb-3 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" /> Danger Zone
            </h3>
            <button
              onClick={handleArchive}
              className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-200 text-red-500 text-sm font-medium hover:bg-red-50 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Archive Product
            </button>
            <p className="text-[10px] text-[#4a7fa5]">
              Archived products are hidden from the shop. Order history is preserved.
            </p>
          </div>
        </div>
      </div>

      {/* Bottom save bar */}
      <div className="sticky bottom-0 bg-white border-t border-[#cce7f0] rounded-2xl p-4 flex items-center justify-between shadow-lg mt-4">
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-[#0097a7]" />
          <span className="text-sm text-[#4a7fa5]">
            {form.active ? 'Live on shop' : 'Hidden from shop'} · ${form.price.toFixed(2)} · {currentStock} units
          </span>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/products">
            <Button variant="outline" size="sm" className="border-[#cce7f0] text-[#4a7fa5]">
              Discard
            </Button>
          </Link>
          <Button
            onClick={handleSave}
            disabled={saving}
            size="sm"
            className="bg-gradient-to-r from-[#0097a7] to-[#1565c0] text-white gap-2"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  )
}

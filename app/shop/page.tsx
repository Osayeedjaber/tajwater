'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ShoppingCart, Plus, Minus, Search, Star, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useCart } from '@/store/cartStore'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { Product } from '@/types'
import CartToast from '@/components/shared/CartToast'

const categoryEmoji: Record<string, string> = {
  water: '💧', equipment: '🔧', subscription: '🔄', accessories: '🧹',
}
const categoryColors: Record<string, string> = {
  water: '#0097a7', equipment: '#1565c0', subscription: '#006064', accessories: '#00acc1',
}

export default function ShopPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<string[]>(['all'])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [sort, setSort] = useState('default')
  const [addedId, setAddedId] = useState<string | null>(null)
  const [subscribeMode, setSubscribeMode] = useState<Record<string, boolean>>({})
  const [subFreq, setSubFreq] = useState<Record<string, 'weekly' | 'biweekly' | 'monthly'>>({})
  const { items, addItem, updateQuantity, count, _hasHydrated } = useCart()

  useEffect(() => {
    const fetchProducts = async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('active', true)
        .order('category')
      if (!error && data) {
        setProducts(data)
        const cats = Array.from(new Set(data.map((p: Product) => p.category).filter(Boolean))) as string[]
        setCategories(['all', ...cats.sort()])
      }
      setLoading(false)
    }
    fetchProducts()
  }, [])

  const filtered = products
    .filter((p) => category === 'all' || p.category === category)
    .filter((p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.description ?? '').toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (sort === 'price-asc') return a.price - b.price
      if (sort === 'price-desc') return b.price - a.price
      return 0
    })

  const getCartQty = (id: string) => items.find((i) => i.product.id === id)?.quantity ?? 0

  const handleAdd = (product: Product) => {
    const freq = subscribeMode[product.id] ? (subFreq[product.id] ?? 'weekly') : undefined
    addItem(product, freq)
    setAddedId(product.id)
    setTimeout(() => setAddedId(null), 2500)
  }

  const canSubscribe = (p: Product) => p.category === 'water' || p.category === 'subscription'
  const SUBSCRIBE_DISCOUNT = 0.10

  return (
    <div className="min-h-screen">
      <CartToast product={products.find(p => p.id === addedId) ?? null} visible={addedId !== null} />
      {/* Hero */}
      <section className="relative py-24 hero-gradient overflow-hidden">
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 80" className="w-full" preserveAspectRatio="none">
            <path d="M0,40 C240,80 480,0 720,40 C960,80 1200,0 1440,40 L1440,80 L0,80 Z" fill="#f0f9ff" />
          </svg>
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-3xl sm:text-5xl font-extrabold text-white mb-4">Shop Pure Water</h1>
            <p className="text-[#b3e5fc] text-lg">Jugs, dispensers, subscriptions & accessories — all in one place.</p>
          </motion.div>
        </div>
      </section>

      <section className="py-12 bg-[#f0f9ff]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#0097a7]" />
              <Input placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 h-11 border-[#cce7f0] bg-white" />
            </div>
            <select value={sort} onChange={(e) => setSort(e.target.value)} className="h-11 px-4 rounded-xl border border-[#cce7f0] bg-white text-[#0c2340] text-sm focus:border-[#0097a7] focus:outline-none">
              <option value="default">Sort: Featured</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
            </select>
            <Link href="/checkout">
              <Button className="h-11 gap-2 bg-gradient-to-r from-[#0097a7] to-[#1565c0] text-white font-semibold px-5 relative">
                <ShoppingCart className="w-4 h-4" />
                Cart
                {_hasHydrated && count() > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-white text-[#0097a7] text-[10px] font-bold flex items-center justify-center">
                    {count()}
                  </span>
                )}
              </Button>
            </Link>
          </div>

          {/* Category tabs */}
          <div className="flex flex-wrap gap-2 mb-8">
            {categories.map((cat) => (
              <button key={cat} onClick={() => setCategory(cat)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                  category === cat
                    ? 'bg-[#0097a7] text-white shadow-lg shadow-[#0097a7]/30'
                    : 'bg-white border border-[#cce7f0] text-[#4a7fa5] hover:border-[#0097a7] hover:text-[#0097a7]'
                }`}>
                {cat === 'all' ? '🌊 All' : `${categoryEmoji[cat] ?? '📦'} ${cat.charAt(0).toUpperCase() + cat.slice(1)}`}
              </button>
            ))}
          </div>

          {/* Loading skeleton */}
          {loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-3xl border border-[#cce7f0] overflow-hidden animate-pulse">
                  <div className="h-44 bg-[#e0f7fa]" />
                  <div className="p-5 space-y-3">
                    <div className="h-4 bg-[#e0f7fa] rounded w-3/4" />
                    <div className="h-3 bg-[#f0f9ff] rounded w-full" />
                    <div className="h-3 bg-[#f0f9ff] rounded w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Product grid */}
          {!loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence>
                {filtered.map((product, i) => {
                  const qty = getCartQty(product.id)
                  const color = categoryColors[product.category] ?? '#0097a7'
                  const justAdded = addedId === product.id

                  return (
                    <motion.div key={product.id} layout initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ delay: i * 0.06 }}
                      className="water-card bg-white rounded-3xl border border-[#cce7f0] overflow-hidden shadow-sm hover:shadow-md hover:border-[#0097a7]/30 transition-all">
                      <Link href={`/shop/${product.id}`}>
                        <div className="h-44 flex items-center justify-center relative overflow-hidden cursor-pointer" style={{ background: `linear-gradient(135deg, ${color}15, ${color}30)` }}>
                        {product.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={product.image_url} alt={product.name} className="w-full h-full object-contain p-3" />
                        ) : (
                          <div className="text-6xl">{categoryEmoji[product.category] ?? '💧'}</div>
                        )}
                        <Badge className="absolute top-3 left-3 text-[10px]" style={{ background: color }}>
                          {product.category}
                        </Badge>
                        {product.category === 'subscription' && (
                          <Badge className="absolute top-3 right-3 bg-amber-500 text-[10px]">Save 15%</Badge>
                        )}
                        {product.stock < 20 && product.stock > 0 && (
                          <Badge className="absolute bottom-3 right-3 bg-orange-400 text-[10px]">Low Stock</Badge>
                        )}
                      </div>
                      </Link>

                      <div className="p-5">
                        <Link href={`/shop/${product.id}`} className="group block mb-4">
                          <h3 className="font-bold text-[#0c2340] mb-1.5 group-hover:text-[#0097a7] transition-colors">{product.name}</h3>
                          <p className="text-[#4a7fa5] text-xs leading-relaxed line-clamp-2">{product.description}</p>
                        </Link>
                        <div className="flex items-center gap-1 mb-4">
                          {[...Array(5)].map((_, i) => <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />)}
                          <span className="text-xs text-[#4a7fa5] ml-1">(4.9)</span>
                        </div>

                        {/* Subscribe & Save toggle */}
                        {canSubscribe(product) && (
                          <div className="mb-4">
                            <div className="flex rounded-xl border border-[#cce7f0] overflow-hidden text-xs font-medium">
                              <button
                                onClick={() => setSubscribeMode((prev) => ({ ...prev, [product.id]: false }))}
                                className={`flex-1 py-1.5 transition-all ${!subscribeMode[product.id] ? 'bg-[#0097a7] text-white' : 'text-[#4a7fa5] hover:bg-[#f0f9ff]'}`}
                              >
                                One-Time
                              </button>
                              <button
                                onClick={() => setSubscribeMode((prev) => ({ ...prev, [product.id]: true }))}
                                className={`flex-1 py-1.5 transition-all ${subscribeMode[product.id] ? 'bg-[#0097a7] text-white' : 'text-[#4a7fa5] hover:bg-[#f0f9ff]'}`}
                              >
                                Subscribe & Save 10%
                              </button>
                            </div>
                            {subscribeMode[product.id] && (
                              <div className="flex gap-1 mt-2">
                                {(['weekly', 'biweekly', 'monthly'] as const).map((f) => (
                                  <button
                                    key={f}
                                    onClick={() => setSubFreq((prev) => ({ ...prev, [product.id]: f }))}
                                    className={`flex-1 py-1 rounded-lg text-[10px] font-medium transition-all ${(subFreq[product.id] ?? 'weekly') === f ? 'bg-[#0097a7] text-white' : 'border border-[#cce7f0] text-[#4a7fa5] hover:border-[#0097a7]'}`}
                                  >
                                    {f.charAt(0).toUpperCase() + f.slice(1)}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        <div className="flex items-center justify-between">
                          <div>
                            {subscribeMode[product.id] ? (
                              <>
                                <p className="text-2xl font-extrabold" style={{ color }}>${(product.price * (1 - SUBSCRIBE_DISCOUNT)).toFixed(2)}</p>
                                <p className="text-xs text-green-600 font-medium">Save ${(product.price * SUBSCRIBE_DISCOUNT).toFixed(2)}/delivery</p>
                              </>
                            ) : (
                              <>
                                <p className="text-2xl font-extrabold" style={{ color }}>${product.price.toFixed(2)}</p>
                                <p className="text-xs text-[#4a7fa5]">{product.category === 'subscription' ? '/month' : 'per unit'}</p>
                              </>
                            )}
                          </div>

                          {qty > 0 ? (
                            <div className="flex items-center gap-2">
                              <button onClick={() => updateQuantity(product.id, qty - 1)} className="w-8 h-8 rounded-lg border border-[#cce7f0] flex items-center justify-center hover:border-[#0097a7] hover:text-[#0097a7] transition-colors">
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="w-6 text-center font-bold text-[#0c2340]">{qty}</span>
                              <button onClick={() => updateQuantity(product.id, qty + 1)} className="w-8 h-8 rounded-lg flex items-center justify-center text-white" style={{ background: color }}>
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }} onClick={() => handleAdd(product)}
                              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold transition-all"
                              style={{ background: justAdded ? '#22c55e' : `linear-gradient(135deg, ${color}, ${color}cc)` }}>
                              {justAdded ? <><Check className="w-4 h-4" /> Added</> : <><ShoppingCart className="w-4 h-4" /> Add</>}
                            </motion.button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="text-center py-20 text-[#4a7fa5]">
              <div className="text-5xl mb-4">💧</div>
              <p className="font-semibold">No products found</p>
              <button onClick={() => { setSearch(''); setCategory('all') }} className="mt-3 text-[#0097a7] underline text-sm">Clear filters</button>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

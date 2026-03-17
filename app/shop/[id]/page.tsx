'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ShoppingCart, Plus, Minus, ArrowLeft, Star, Check, Package, Droplets, RefreshCw, Shield, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useCart } from '@/store/cartStore'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { Product } from '@/types'
import CartToast from '@/components/shared/CartToast'

const categoryColors: Record<string, string> = {
  water: '#0097a7', equipment: '#1565c0', subscription: '#006064', accessories: '#00acc1',
}
const categoryEmoji: Record<string, string> = {
  water: '💧', equipment: '🔧', subscription: '🔄', accessories: '🧹',
}
const SUBSCRIBE_DISCOUNT = 0.10

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [subscribeMode, setSubscribeMode] = useState(false)
  const [subFreq, setSubFreq] = useState<'weekly' | 'biweekly' | 'monthly'>('weekly')
  const [added, setAdded] = useState(false)
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([])
  const { items, addItem, updateQuantity } = useCart()

  useEffect(() => {
    const fetch = async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .eq('active', true)
        .single()

      if (error || !data) { router.replace('/shop'); return }
      setProduct(data)

      // Fetch related products from same category
      const { data: related } = await supabase
        .from('products')
        .select('*')
        .eq('category', data.category)
        .eq('active', true)
        .neq('id', id)
        .limit(4)
      setRelatedProducts(related ?? [])
      setLoading(false)
    }
    fetch()
  }, [id, router])

  const qty = product ? (items.find((i) => i.product.id === product.id)?.quantity ?? 0) : 0
  const canSubscribe = product?.category === 'water' || product?.category === 'subscription'

  const handleAdd = () => {
    if (!product) return
    const freq = subscribeMode ? subFreq : undefined
    if (qty > 0) {
      updateQuantity(product.id, qty + 1)
    } else {
      addItem(product, freq)
    }
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  const handleBuyNow = () => {
    if (!product) return
    const freq = subscribeMode ? subFreq : undefined
    if (qty === 0) addItem(product, freq)
    router.push('/checkout')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f0f9ff] pt-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div className="h-96 bg-white rounded-3xl border border-[#cce7f0] animate-pulse" />
            <div className="space-y-4">
              <div className="h-8 bg-[#e0f7fa] rounded-xl w-2/3 animate-pulse" />
              <div className="h-4 bg-[#f0f9ff] rounded-lg w-full animate-pulse" />
              <div className="h-4 bg-[#f0f9ff] rounded-lg w-3/4 animate-pulse" />
              <div className="h-12 bg-[#e0f7fa] rounded-xl animate-pulse mt-8" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!product) return null

  const color = categoryColors[product.category] ?? '#0097a7'
  const displayPrice = subscribeMode ? product.price * (1 - SUBSCRIBE_DISCOUNT) : product.price

  return (
    <div className="min-h-screen bg-[#f0f9ff] pt-20">
      <CartToast product={product} visible={added} />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-[#4a7fa5] mb-8">
          <Link href="/shop" className="hover:text-[#0097a7] transition-colors flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> Shop
          </Link>
          <span>/</span>
          <span className="capitalize text-[#0097a7]">{product.category}</span>
          <span>/</span>
          <span className="text-[#0c2340] font-medium truncate max-w-[200px]">{product.name}</span>
        </div>

        {/* Main product section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
          {/* Image */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="relative"
          >
            <div
              className="h-80 sm:h-[420px] rounded-3xl flex items-center justify-center overflow-hidden border border-[#cce7f0] shadow-lg relative"
              style={{ background: `linear-gradient(135deg, ${color}10, ${color}25)` }}
            >
              {product.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={product.image_url} alt={product.name} className="w-full h-full object-contain p-8" />
              ) : (
                <div className="text-[120px] opacity-60">{categoryEmoji[product.category] ?? '💧'}</div>
              )}
              <Badge className="absolute top-4 left-4 text-xs capitalize" style={{ background: color }}>
                {product.category}
              </Badge>
              {product.stock < 20 && product.stock > 0 && (
                <Badge className="absolute top-4 right-4 bg-orange-400 text-xs">Low Stock</Badge>
              )}
              {product.stock === 0 && (
                <div className="absolute inset-0 bg-black/40 rounded-3xl flex items-center justify-center">
                  <span className="text-white font-bold text-xl">Out of Stock</span>
                </div>
              )}
            </div>
          </motion.div>

          {/* Details */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col justify-between space-y-6"
          >
            <div>
              <p className="text-sm font-semibold capitalize mb-2" style={{ color }}>{product.category}</p>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0c2340] mb-3 leading-tight">{product.name}</h1>

              {/* Stars */}
              <div className="flex items-center gap-1.5 mb-4">
                {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />)}
                <span className="text-sm text-[#4a7fa5] ml-1">4.9 · Trusted by 1,000+ customers</span>
              </div>

              {/* Description */}
              <p className="text-[#4a7fa5] leading-relaxed mb-6">{product.description || 'Premium quality water delivery product.'}</p>

              {/* Trust badges */}
              <div className="flex flex-wrap gap-3 mb-6">
                {[
                  { icon: Droplets, text: 'Pure Quality' },
                  { icon: Shield, text: 'Certified Safe' },
                  { icon: RefreshCw, text: 'Easy Returns' },
                  { icon: Package, text: 'Fast Delivery' },
                ].map((b) => (
                  <div key={b.text} className="flex items-center gap-1.5 text-xs text-[#4a7fa5] bg-white border border-[#cce7f0] px-3 py-1.5 rounded-xl">
                    <b.icon className="w-3.5 h-3.5 text-[#0097a7]" />
                    {b.text}
                  </div>
                ))}
              </div>

              {/* Subscribe & Save toggle */}
              {canSubscribe && (
                <div className="mb-5">
                  <div className="flex rounded-xl border border-[#cce7f0] overflow-hidden text-sm font-medium mb-3">
                    <button
                      onClick={() => setSubscribeMode(false)}
                      className={`flex-1 py-2.5 transition-all ${!subscribeMode ? 'bg-[#0097a7] text-white' : 'text-[#4a7fa5] hover:bg-[#f0f9ff]'}`}
                    >
                      One-Time Purchase
                    </button>
                    <button
                      onClick={() => setSubscribeMode(true)}
                      className={`flex-1 py-2.5 transition-all ${subscribeMode ? 'bg-[#0097a7] text-white' : 'text-[#4a7fa5] hover:bg-[#f0f9ff]'}`}
                    >
                      Subscribe &amp; Save 10%
                    </button>
                  </div>
                  <AnimatePresence>
                    {subscribeMode && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <p className="text-xs text-[#4a7fa5] mb-2">Delivery frequency:</p>
                        <div className="flex gap-2">
                          {(['weekly', 'biweekly', 'monthly'] as const).map((f) => (
                            <button
                              key={f}
                              onClick={() => setSubFreq(f)}
                              className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${subFreq === f ? 'bg-[#0097a7] text-white shadow-md' : 'border border-[#cce7f0] text-[#4a7fa5] hover:border-[#0097a7]'}`}
                            >
                              {f.charAt(0).toUpperCase() + f.slice(1)}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* Price + Add to cart */}
            <div className="bg-white rounded-2xl border border-[#cce7f0] p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-extrabold" style={{ color }}>${displayPrice.toFixed(2)}</span>
                    {subscribeMode && (
                      <span className="text-sm text-[#4a7fa5] line-through">${product.price.toFixed(2)}</span>
                    )}
                  </div>
                  {subscribeMode ? (
                    <p className="text-sm text-green-600 font-medium">You save ${(product.price * SUBSCRIBE_DISCOUNT).toFixed(2)} per delivery</p>
                  ) : (
                    <p className="text-sm text-[#4a7fa5]">per {product.category === 'subscription' ? 'month' : 'unit'}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-xs text-[#4a7fa5]">In stock</p>
                  <p className="font-bold text-[#0c2340]">{product.stock} units</p>
                </div>
              </div>

              {/* Quantity + Add */}
              {qty > 0 ? (
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-3 bg-[#f0f9ff] rounded-xl p-1">
                    <button
                      onClick={() => updateQuantity(product.id, qty - 1)}
                      className="w-9 h-9 rounded-lg border border-[#cce7f0] bg-white flex items-center justify-center hover:border-[#0097a7] text-[#0c2340] transition-colors"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-8 text-center font-extrabold text-[#0c2340] text-lg">{qty}</span>
                    <button
                      onClick={() => updateQuantity(product.id, qty + 1)}
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-white transition-colors"
                      style={{ background: color }}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <Link href="/checkout" className="flex-1">
                    <Button className="w-full h-11 font-semibold text-white" style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)` }}>
                      <ShoppingCart className="w-4 h-4 mr-2" /> Go to Checkout
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="flex gap-3">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    disabled={product.stock === 0}
                    onClick={handleAdd}
                    className="flex-1 h-12 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all border-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      borderColor: added ? '#22c55e' : color,
                      color: added ? '#22c55e' : color,
                      background: added ? '#f0fdf4' : 'white',
                    }}
                  >
                    {added ? (
                      <><Check className="w-5 h-5" /> Added!</>
                    ) : (
                      <><ShoppingCart className="w-5 h-5" /> {product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}</>
                    )}
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    disabled={product.stock === 0}
                    onClick={handleBuyNow}
                    className="flex-1 h-12 rounded-xl text-white font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)` }}
                  >
                    <Zap className="w-5 h-5" /> Buy Now
                  </motion.button>
                </div>
              )}

              <AnimatePresence>
                {added && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    className="flex items-center justify-between text-sm bg-green-50 border border-green-200 rounded-xl px-4 py-2.5"
                  >
                    <span className="text-green-700 font-medium">✓ {product.name} added to cart</span>
                    <Link href="/checkout" className="text-[#0097a7] font-semibold hover:underline">
                      View Cart →
                    </Link>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>

        {/* Related products */}
        {relatedProducts.length > 0 && (
          <div>
            <h2 className="text-xl font-extrabold text-[#0c2340] mb-5">You Might Also Like</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {relatedProducts.map((p) => {
                const c = categoryColors[p.category] ?? '#0097a7'
                return (
                  <Link key={p.id} href={`/shop/${p.id}`}>
                    <motion.div
                      whileHover={{ y: -4 }}
                      className="bg-white rounded-2xl border border-[#cce7f0] overflow-hidden shadow-sm hover:shadow-md hover:border-[#0097a7]/30 transition-all cursor-pointer"
                    >
                      <div className="h-32 flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${c}10, ${c}25)` }}>
                        {p.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.image_url} alt={p.name} className="w-full h-full object-contain p-3" />
                        ) : (
                          <div className="text-4xl">{categoryEmoji[p.category] ?? '💧'}</div>
                        )}
                      </div>
                      <div className="p-3">
                        <p className="text-sm font-semibold text-[#0c2340] line-clamp-1">{p.name}</p>
                        <p className="text-sm font-extrabold mt-1" style={{ color: c }}>${p.price.toFixed(2)}</p>
                      </div>
                    </motion.div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

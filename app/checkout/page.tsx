'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { ShoppingCart, MapPin, CreditCard, CheckCircle2, Trash2, Plus, Minus, ArrowLeft, Truck, AlertCircle, Tag, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useCart } from '@/store/cartStore'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { PaymentForm, CreditCard as SquareCreditCard } from 'react-square-web-payments-sdk'
import { supabase } from '@/lib/supabase'

type Step = 'cart' | 'address' | 'payment' | 'confirmed'
type Zone = { id: string; name: string; delivery_fee: number }

// --- Main checkout page ---
export default function CheckoutPage() {
  const { items, updateQuantity, removeItem, total, clearCart } = useCart()
  const [step, setStep] = useState<Step>('cart')
  const [address, setAddress] = useState({ name: '', phone: '', street: '', city: '', zone: '', postal: '', notes: '', email: '' })
  const [zones, setZones] = useState<Zone[]>([])
  const [intentError, setIntentError] = useState('')
  const [processing, setProcessing] = useState(false)
  const [orderId, setOrderId] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [serverTotal, setServerTotal] = useState<number | null>(null)
  const [taxAmount, setTaxAmount] = useState(0)
  const [deliveryFee, setDeliveryFee] = useState(0)
  const [couponInput, setCouponInput] = useState('')
  const [applyingCoupon, setApplyingCoupon] = useState(false)
  const [couponError, setCouponError] = useState('')
  const [appliedDiscount, setAppliedDiscount] = useState<{ code: string; type: 'percent' | 'fixed'; value: number; amount: number; id: string } | null>(null)
  const router = useRouter()

  // Fetch active zones from DB
  useEffect(() => {
    supabase
      .from('zones')
      .select('id, name, delivery_fee')
      .eq('active', true)
      .order('name')
      .then(({ data }) => { if (data) setZones(data) })
  }, [])

  // Update delivery fee when zone changes
  useEffect(() => {
    const zone = zones.find(z => z.name === address.zone)
    setDeliveryFee(zone?.delivery_fee ?? 0)
  }, [address.zone, zones])

  // Require login — redirect if not authenticated; pre-fill address from profile
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.replace('/auth/login?redirect=/checkout')
        return
      }
      setUserId(session.user.id)

      const { data: profile } = await supabase
        .from('profiles')
        .select('name, phone, delivery_address, zone_id, email')
        .eq('id', session.user.id)
        .single()

      if (profile) {
        // Look up zone name from zone_id so the dropdown pre-selects correctly
        let zoneName = ''
        if (profile.zone_id) {
          const { data: zoneRow } = await supabase
            .from('zones')
            .select('name')
            .eq('id', profile.zone_id)
            .single()
          zoneName = zoneRow?.name ?? ''
        }
        setAddress(prev => ({
          ...prev,
          name:   profile.name ?? '',
          phone:  profile.phone ?? '',
          street: profile.delivery_address ?? '',
          zone:   zoneName,
          email:  profile.email ?? session.user.email ?? '',
        }))
      } else {
        setAddress(prev => ({ ...prev, email: session.user.email ?? '' }))
      }
      setAuthChecked(true)
    }
    checkAuth()
  }, [router])

  const subtotal = total()
  const discountAmt = appliedDiscount?.amount ?? 0
  const tax = Math.round((subtotal - discountAmt) * 0.12 * 100) / 100
  const orderTotal = Math.max(0, subtotal - discountAmt) + deliveryFee + tax

  const applyCode = async () => {
    const code = couponInput.trim().toUpperCase()
    if (!code) return
    setApplyingCoupon(true)
    setCouponError('')
    const { data } = await supabase
      .from('discount_codes')
      .select('id, code, type, value, min_order_amount, max_uses, uses_count, expires_at, active')
      .eq('code', code)
      .single()
    setApplyingCoupon(false)
    if (!data || !data.active) { setCouponError('Invalid or inactive discount code.'); return }
    if (data.expires_at && new Date(data.expires_at) < new Date()) { setCouponError('This discount code has expired.'); return }
    if (data.max_uses !== null && data.uses_count >= data.max_uses) { setCouponError('This discount code has reached its maximum uses.'); return }
    if (data.min_order_amount > 0 && subtotal < data.min_order_amount) {
      setCouponError(`Minimum order of $${data.min_order_amount.toFixed(2)} required for this code.`); return
    }
    const amount = data.type === 'percent'
      ? Math.round(subtotal * (data.value / 100) * 100) / 100
      : Math.min(data.value, subtotal)
    setAppliedDiscount({ id: data.id, code: data.code, type: data.type, value: data.value, amount })
    setCouponInput('')
  }

  // Handle Square card tokenization — send nonce to server to create payment
  const handleCardTokenized = useCallback(async (token: { token: string }) => {
    setProcessing(true)
    setIntentError('')
    try {
      const res = await fetch('/api/create-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceId: token.token,
          amount: orderTotal,
          items: items.map(i => ({
            product_id:          i.product.id,
            quantity:            i.quantity,
            price:               i.product.price,
            subscribeFrequency:  i.subscribeFrequency,
          })),
          address: {
            name:   address.name,
            phone:  address.phone,
            street: address.street,
            zone:   address.zone,
            postal: address.postal,
            email:  address.email,
          },
          notes: address.notes || null,
          userId,
          discountCodeId:     appliedDiscount?.id ?? null,
          discountAmount:     appliedDiscount?.amount ?? 0,
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setOrderId(data.orderId)
      setServerTotal(data.serverTotal ?? orderTotal)
      setTaxAmount(data.taxAmount ?? tax)
      if (data.deliveryFee !== undefined) setDeliveryFee(data.deliveryFee)
      clearCart()
      setStep('confirmed')
    } catch (err) {
      setIntentError(err instanceof Error ? err.message : 'Payment failed. Please try again.')
    } finally {
      setProcessing(false)
    }
  }, [orderTotal, items, address, userId, tax, appliedDiscount, clearCart])

  // Show nothing while auth check is in progress
  if (!authChecked) {
    return (
      <div className="min-h-screen bg-[#f0f9ff] flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
          className="w-8 h-8 border-3 border-[#cce7f0] border-t-[#0097a7] rounded-full"
        />
      </div>
    )
  }

  const displayTotal = serverTotal ?? orderTotal

  const StepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-10">
      {(['cart', 'address', 'payment'] as Step[]).map((s, i) => (
        <div key={s} className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
            step === s ? 'bg-[#0097a7] text-white' :
            ['cart', 'address', 'payment', 'confirmed'].indexOf(step) > i ? 'bg-[#e0f7fa] text-[#0097a7]' :
            'bg-[#f0f9ff] text-[#4a7fa5] border border-[#cce7f0]'
          }`}>
            {['cart', 'address', 'payment', 'confirmed'].indexOf(step) > i ? '✓' : i + 1}
          </div>
          <span className={`text-sm font-medium hidden sm:block ${step === s ? 'text-[#0097a7]' : 'text-[#4a7fa5]'}`}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </span>
          {i < 2 && <div className="w-8 h-0.5 bg-[#cce7f0]" />}
        </div>
      ))}
    </div>
  )

  if (step === 'confirmed') {
    return (
      <div className="min-h-screen bg-[#f0f9ff] flex items-center justify-center px-4 pt-20">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-3xl p-10 max-w-md w-full text-center border border-[#cce7f0] shadow-xl"
        >
          <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 0.5 }}>
            <CheckCircle2 className="w-20 h-20 text-[#0097a7] mx-auto mb-5" />
          </motion.div>
          <h2 className="text-2xl font-extrabold text-[#0c2340] mb-2">Order Confirmed!</h2>
          {orderId && (
            <p className="text-sm font-mono font-bold text-[#0097a7] mb-3">
              #{`TW-${orderId.slice(-8).toUpperCase()}`}
            </p>
          )}
          <p className="text-[#4a7fa5] mb-6">Your water is on its way. You&apos;ll receive a confirmation email shortly with your tracking details.</p>
          <div className="bg-[#e0f7fa] rounded-2xl p-4 mb-6 text-left">
            <div className="flex items-center gap-2 text-[#0097a7] font-semibold text-sm mb-1">
              <Truck className="w-4 h-4" /> Estimated Delivery
            </div>
            <p className="text-[#0c2340] font-bold">Within 1–2 business days</p>
            <p className="text-xs text-[#4a7fa5] mt-1">Our driver will call before arrival.</p>
          </div>
          <div className="flex flex-col gap-3">
            <Link href="/dashboard/orders">
              <Button className="w-full bg-gradient-to-r from-[#0097a7] to-[#1565c0] text-white">Track Order</Button>
            </Link>
            <Link href="/shop">
              <Button variant="outline" className="w-full border-[#cce7f0] text-[#0097a7]">Continue Shopping</Button>
            </Link>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f0f9ff] pt-24 pb-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/shop">
            <Button variant="ghost" size="sm" className="gap-1 text-[#4a7fa5]">
              <ArrowLeft className="w-4 h-4" /> Back to Shop
            </Button>
          </Link>
          <h1 className="text-2xl font-extrabold text-[#0c2340]">Checkout</h1>
        </div>

        <StepIndicator />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2">
            {/* Step 1: Cart */}
            {step === 'cart' && (
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="bg-white rounded-3xl border border-[#cce7f0] shadow-sm overflow-hidden">
                <div className="p-5 border-b border-[#cce7f0] flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-[#0097a7]" />
                  <h2 className="font-bold text-[#0c2340]">Your Cart ({items.length} items)</h2>
                </div>
                {items.length === 0 ? (
                  <div className="p-10 text-center text-[#4a7fa5]">
                    <div className="text-4xl mb-3">🛒</div>
                    <p>Your cart is empty.</p>
                    <Link href="/shop"><Button className="mt-4 bg-[#0097a7] text-white">Browse Products</Button></Link>
                  </div>
                ) : (
                  <div className="divide-y divide-[#f0f9ff]">
                    {items.map((item) => (
                      <div key={item.product.id} className="flex items-center gap-4 p-4">
                        <div className="w-14 h-14 rounded-xl bg-[#e0f7fa] flex items-center justify-center shrink-0 overflow-hidden">
                          {item.product.image_url ? (
                            <Image src={item.product.image_url} alt={item.product.name} width={56} height={56} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-2xl">💧</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-[#0c2340] truncate">{item.product.name}</p>
                          <p className="text-sm text-[#0097a7] font-bold">${item.product.price.toFixed(2)} each</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => updateQuantity(item.product.id, item.quantity - 1)} className="w-7 h-7 rounded-lg border border-[#cce7f0] flex items-center justify-center hover:border-[#0097a7] transition-colors">
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-6 text-center font-bold text-sm">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.product.id, item.quantity + 1)} className="w-7 h-7 rounded-lg bg-[#0097a7] flex items-center justify-center text-white">
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <p className="w-16 text-right font-bold text-[#0c2340]">${(item.product.price * item.quantity).toFixed(2)}</p>
                        <button onClick={() => removeItem(item.product.id)} className="text-red-400 hover:text-red-600 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {items.length > 0 && (
                  <div className="p-5">
                    <Button onClick={() => setStep('address')} className="w-full h-12 rounded-xl bg-gradient-to-r from-[#0097a7] to-[#1565c0] text-white font-semibold">
                      Continue to Address
                    </Button>
                  </div>
                )}
              </motion.div>
            )}

            {/* Step 2: Address */}
            {step === 'address' && (
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="bg-white rounded-3xl border border-[#cce7f0] shadow-sm overflow-hidden">
                <div className="p-5 border-b border-[#cce7f0] flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-[#0097a7]" />
                  <h2 className="font-bold text-[#0c2340]">Delivery Address</h2>
                </div>
                <form onSubmit={(e) => { e.preventDefault(); setStep('payment') }} className="p-5 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-[#0c2340] mb-1.5 block">Full Name</label>
                      <Input placeholder="John Smith" className="border-[#cce7f0]" required value={address.name} onChange={(e) => setAddress({ ...address, name: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-[#0c2340] mb-1.5 block">Phone</label>
                      <Input placeholder="+1 (604) 000-0000" className="border-[#cce7f0]" required value={address.phone} onChange={(e) => setAddress({ ...address, phone: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-[#0c2340] mb-1.5 block">Street Address</label>
                    <Input placeholder="123 Main Street, Suite 4" className="border-[#cce7f0]" required value={address.street} onChange={(e) => setAddress({ ...address, street: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-[#0c2340] mb-1.5 block">Zone</label>
                      <select
                        required
                        value={address.zone}
                        onChange={(e) => setAddress({ ...address, zone: e.target.value })}
                        className="w-full h-10 px-3 rounded-xl border border-[#cce7f0] text-sm focus:border-[#0097a7] focus:outline-none text-[#0c2340]"
                      >
                        <option value="">Select zone...</option>
                        {zones.map((z) => <option key={z.id} value={z.name}>{z.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-[#0c2340] mb-1.5 block">Postal Code</label>
                      <Input placeholder="V6B 1A1" className="border-[#cce7f0]" required value={address.postal} onChange={(e) => setAddress({ ...address, postal: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-[#0c2340] mb-1.5 block">Delivery Instructions <span className="text-[#4a7fa5] font-normal">(optional)</span></label>
                    <textarea
                      placeholder="Leave at back door, call before arriving, gate code: 1234…"
                      value={address.notes}
                      onChange={(e) => setAddress({ ...address, notes: e.target.value })}
                      rows={2}
                      className="w-full px-3 py-2 rounded-xl border border-[#cce7f0] text-sm focus:border-[#0097a7] focus:outline-none text-[#0c2340] resize-none"
                    />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <Button type="button" variant="outline" onClick={() => setStep('cart')} className="flex-1 border-[#cce7f0]">Back</Button>
                    <Button type="submit" className="flex-1 bg-gradient-to-r from-[#0097a7] to-[#1565c0] text-white">Continue to Payment</Button>
                  </div>
                </form>
              </motion.div>
            )}

            {/* Step 3: Payment — Square Web Payments SDK */}
            {step === 'payment' && (
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="bg-white rounded-3xl border border-[#cce7f0] shadow-sm overflow-hidden">
                <div className="p-5 border-b border-[#cce7f0] flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-[#0097a7]" />
                  <h2 className="font-bold text-[#0c2340]">Payment Details</h2>
                  <span className="ml-auto text-xs text-[#4a7fa5] bg-[#f0f9ff] px-2 py-1 rounded-full">🔒 Secured by Square</span>
                </div>

                <div className="p-5 space-y-4">
                  {intentError && (
                    <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-3">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {intentError}
                    </div>
                  )}

                  {processing && (
                    <div className="flex items-center justify-center gap-3 text-[#4a7fa5] py-4">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                        className="w-5 h-5 border-2 border-[#cce7f0] border-t-[#0097a7] rounded-full"
                      />
                      Processing payment...
                    </div>
                  )}

                  <PaymentForm
                    applicationId={process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID ?? ''}
                    locationId={process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID ?? ''}
                    cardTokenizeResponseReceived={async (token) => {
                      if (token.status === 'OK' && token.token) {
                        await handleCardTokenized({ token: token.token })
                      } else {
                        setIntentError('Card tokenization failed. Please check your card details and try again.')
                      }
                    }}
                    createPaymentRequest={() => ({
                      countryCode: 'CA',
                      currencyCode: 'CAD',
                      total: {
                        amount: displayTotal.toFixed(2),
                        label: 'TajWater Order',
                      },
                    })}
                  >
                    <SquareCreditCard
                      buttonProps={{
                        css: {
                          backgroundColor: '#0097a7',
                          color: '#fff',
                          fontSize: '14px',
                          fontWeight: '600',
                          borderRadius: '12px',
                          padding: '12px 0',
                          '&:hover': {
                            backgroundColor: '#00838f',
                          },
                        },
                      }}
                    >
                      {processing ? 'Processing...' : `Pay $${displayTotal.toFixed(2)}`}
                    </SquareCreditCard>
                  </PaymentForm>

                  <p className="text-xs text-[#4a7fa5]">
                    We also accept e-Transfer and cash on delivery — call us to arrange.
                  </p>
                  <p className="text-xs text-[#4a7fa5]">
                    By completing your purchase you agree to our{' '}
                    <a href="/legal/terms" target="_blank" className="underline hover:text-[#0097a7]">Terms of Service</a>
                    {' '}and{' '}
                    <a href="/legal/privacy" target="_blank" className="underline hover:text-[#0097a7]">Privacy Policy</a>.
                  </p>
                  <div className="pt-2">
                    <Button type="button" variant="outline" onClick={() => setStep('address')} className="border-[#cce7f0]">
                      Back
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Order summary */}
          <div>
            <div className="bg-white rounded-3xl border border-[#cce7f0] shadow-sm sticky top-24">
              <div className="p-5 border-b border-[#cce7f0]">
                <h3 className="font-bold text-[#0c2340]">Order Summary</h3>
              </div>
              <div className="p-5 space-y-3">
                {items.map((item) => (
                  <div key={item.product.id} className="flex items-center gap-2.5 text-sm">
                    <div className="w-8 h-8 rounded-lg bg-[#e0f7fa] shrink-0 overflow-hidden flex items-center justify-center">
                      {item.product.image_url ? (
                        <Image src={item.product.image_url} alt={item.product.name} width={32} height={32} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-sm">💧</span>
                      )}
                    </div>
                    <span className="text-[#4a7fa5] flex-1 truncate">{item.product.name} ×{item.quantity}</span>
                    <span className="font-medium text-[#0c2340] shrink-0">${(item.product.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}

                {/* Coupon input — only before payment step */}
                {step !== 'payment' && (
                  <div className="border-t border-[#cce7f0] pt-3">
                    {appliedDiscount ? (
                      <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-3 py-2">
                        <div className="flex items-center gap-2 text-sm text-green-700 font-medium">
                          <Tag className="w-3.5 h-3.5" />
                          {appliedDiscount.code}
                        </div>
                        <button onClick={() => setAppliedDiscount(null)} className="text-green-500 hover:text-green-700">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <div className="flex gap-2">
                          <Input
                            value={couponInput}
                            onChange={e => { setCouponInput(e.target.value.toUpperCase()); setCouponError('') }}
                            onKeyDown={e => e.key === 'Enter' && applyCode()}
                            placeholder="Discount code"
                            className="border-[#cce7f0] text-sm h-9 font-mono uppercase"
                          />
                          <Button
                            type="button"
                            size="sm"
                            onClick={applyCode}
                            disabled={!couponInput.trim() || applyingCoupon}
                            className="bg-[#0097a7] text-white h-9 px-3 shrink-0"
                          >
                            {applyingCoupon ? '...' : 'Apply'}
                          </Button>
                        </div>
                        {couponError && (
                          <p className="text-xs text-red-500 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> {couponError}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="border-t border-[#cce7f0] pt-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#4a7fa5]">Subtotal</span>
                    <span className="text-[#0c2340]">${subtotal.toFixed(2)}</span>
                  </div>
                  {appliedDiscount && (
                    <div className="flex justify-between text-sm">
                      <span className="text-green-600 flex items-center gap-1"><Tag className="w-3 h-3" /> {appliedDiscount.code}</span>
                      <span className="text-green-600 font-medium">-${appliedDiscount.amount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-[#4a7fa5]">Delivery</span>
                    <span className={deliveryFee === 0 ? 'text-green-600 font-medium' : 'text-[#0c2340]'}>
                      {deliveryFee === 0 ? 'FREE' : `$${deliveryFee.toFixed(2)}`}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#4a7fa5]">Tax (GST+PST 12%)</span>
                    <span className="text-[#0c2340]">${(serverTotal !== null ? taxAmount : tax).toFixed(2)}</span>
                  </div>
                  <div className="border-t border-[#cce7f0] pt-2 flex justify-between font-extrabold">
                    <span className="text-[#0c2340]">Total</span>
                    <span className="text-[#0097a7] text-lg">${displayTotal.toFixed(2)}</span>
                  </div>
                </div>
                {address.zone && (
                  <div className="flex items-start gap-2 pt-1 text-xs text-[#4a7fa5]">
                    <Truck className="w-3.5 h-3.5 mt-0.5 text-[#0097a7] shrink-0" />
                    Delivering to {address.zone}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

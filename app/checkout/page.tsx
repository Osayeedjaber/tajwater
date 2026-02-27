'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { ShoppingCart, MapPin, CreditCard, CheckCircle2, Trash2, Plus, Minus, ArrowLeft, Truck, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useCart } from '@/store/cartStore'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { supabase } from '@/lib/supabase'
import { DELIVERY_ZONES } from '@/lib/constants'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '')

type Step = 'cart' | 'address' | 'payment' | 'confirmed'

// --- Inner payment form that uses Stripe hooks ---
function StripePaymentForm({
  orderTotal,
  onSuccess,
  onBack,
}: {
  orderTotal: number
  onSuccess: () => void
  onBack: () => void
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [processing, setProcessing] = useState(false)
  const [payError, setPayError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return
    setProcessing(true)
    setPayError('')

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/checkout`,
      },
      redirect: 'if_required',
    })

    if (error) {
      setPayError(error.message ?? 'Payment failed. Please try again.')
      setProcessing(false)
    } else {
      onSuccess()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="p-5 space-y-4">
      <PaymentElement
        options={{
          layout: 'tabs',
          fields: { billingDetails: { name: 'auto' } },
        }}
      />
      {payError && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-3">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {payError}
        </div>
      )}
      <p className="text-xs text-[#4a7fa5]">
        We also accept e-Transfer and cash on delivery — call us to arrange.
      </p>
      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onBack} className="flex-1 border-[#cce7f0]">
          Back
        </Button>
        <Button
          type="submit"
          disabled={!stripe || processing}
          className="flex-1 bg-gradient-to-r from-[#0097a7] to-[#1565c0] text-white"
        >
          {processing ? (
            <span className="flex items-center gap-2">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
              />
              Processing...
            </span>
          ) : (
            `Pay $${orderTotal.toFixed(2)}`
          )}
        </Button>
      </div>
    </form>
  )
}

// --- Main checkout page ---
export default function CheckoutPage() {
  const { items, updateQuantity, removeItem, total, clearCart } = useCart()
  const [step, setStep] = useState<Step>('cart')
  const [address, setAddress] = useState({ name: '', phone: '', street: '', city: '', zone: '', postal: '' })
  const [clientSecret, setClientSecret] = useState('')
  const [intentError, setIntentError] = useState('')
  const [loadingIntent, setLoadingIntent] = useState(false)
  const [orderId, setOrderId] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  const [authChecked, setAuthChecked] = useState(false)
  const router = useRouter()

  // Require login — redirect to login with ?redirect=/checkout if not authenticated
  // Pre-fill address form from the user's saved profile
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.replace('/auth/login?redirect=/checkout')
        return
      }
      setUserId(session.user.id)

      // Pre-fill from profile if available
      const { data: profile } = await supabase
        .from('profiles')
        .select('name, phone, delivery_address, zone_id')
        .eq('id', session.user.id)
        .single()

      if (profile) {
        setAddress(prev => ({
          ...prev,
          name:   profile.name ?? '',
          phone:  profile.phone ?? '',
          street: profile.delivery_address ?? '',
          zone:   profile.zone_id ?? '',
        }))
      }
      setAuthChecked(true)
    }
    checkAuth()
  }, [router])

  const deliveryFee = address.zone === 'West Vancouver' || address.zone === 'Delta' ? 2.00
    : address.zone === 'Coquitlam' || address.zone === 'Port Moody' ? 1.50
    : address.zone === 'Langley' ? 2.50
    : 0
  const orderTotal = total() + deliveryFee

  // Create PaymentIntent + Supabase order when moving to payment step
  const createIntent = useCallback(async () => {
    setLoadingIntent(true)
    setIntentError('')
    try {
      const res = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: orderTotal,
          items: items.map(i => ({
            product_id: i.product.id,
            quantity:   i.quantity,
            price:      i.product.price,
          })),
          address: {
            name:   address.name,
            phone:  address.phone,
            street: address.street,
            zone:   address.zone,
            postal: address.postal,
          },
          userId,
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setClientSecret(data.clientSecret)
      setOrderId(data.orderId)
    } catch (err) {
      setIntentError(err instanceof Error ? err.message : 'Failed to initialize payment. Please try again.')
    } finally {
      setLoadingIntent(false)
    }
  }, [orderTotal, items, address, userId])

  useEffect(() => {
    if (step === 'payment' && !clientSecret) {
      createIntent()
    }
  }, [step, clientSecret, createIntent])

  // Show nothing while auth check is in progress (avoids flash of checkout for unauthenticated users)
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

  const handleConfirmed = () => {
    clearCart()
    setStep('confirmed')
  }

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
          <h2 className="text-2xl font-extrabold text-[#0c2340] mb-3">Order Confirmed! 🎉</h2>
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
                        <div className="w-14 h-14 rounded-xl bg-[#e0f7fa] flex items-center justify-center text-2xl shrink-0">💧</div>
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
                        {DELIVERY_ZONES.map((z) => <option key={z} value={z}>{z}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-[#0c2340] mb-1.5 block">Postal Code</label>
                      <Input placeholder="V6B 1A1" className="border-[#cce7f0]" required value={address.postal} onChange={(e) => setAddress({ ...address, postal: e.target.value })} />
                    </div>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <Button type="button" variant="outline" onClick={() => setStep('cart')} className="flex-1 border-[#cce7f0]">Back</Button>
                    <Button type="submit" className="flex-1 bg-gradient-to-r from-[#0097a7] to-[#1565c0] text-white">Continue to Payment</Button>
                  </div>
                </form>
              </motion.div>
            )}

            {/* Step 3: Payment — Stripe Elements */}
            {step === 'payment' && (
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="bg-white rounded-3xl border border-[#cce7f0] shadow-sm overflow-hidden">
                <div className="p-5 border-b border-[#cce7f0] flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-[#0097a7]" />
                  <h2 className="font-bold text-[#0c2340]">Payment Details</h2>
                  <span className="ml-auto text-xs text-[#4a7fa5] bg-[#f0f9ff] px-2 py-1 rounded-full">🔒 Secured by Stripe</span>
                </div>

                {loadingIntent && (
                  <div className="p-10 flex items-center justify-center gap-3 text-[#4a7fa5]">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                      className="w-5 h-5 border-2 border-[#cce7f0] border-t-[#0097a7] rounded-full"
                    />
                    Initializing secure payment...
                  </div>
                )}

                {intentError && (
                  <div className="p-5">
                    <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {intentError}
                    </div>
                    <div className="flex gap-3">
                      <Button variant="outline" onClick={() => setStep('address')} className="flex-1 border-[#cce7f0]">Back</Button>
                      <Button onClick={createIntent} className="flex-1 bg-[#0097a7] text-white">Try Again</Button>
                    </div>
                  </div>
                )}

                {clientSecret && !loadingIntent && (
                  <Elements
                    stripe={stripePromise}
                    options={{
                      clientSecret,
                      appearance: {
                        theme: 'stripe',
                        variables: {
                          colorPrimary: '#0097a7',
                          colorBackground: '#ffffff',
                          colorText: '#0c2340',
                          colorDanger: '#dc2626',
                          fontFamily: 'inherit',
                          borderRadius: '12px',
                        },
                      },
                    }}
                  >
                    <StripePaymentForm
                      orderTotal={orderTotal}
                      onSuccess={handleConfirmed}
                      onBack={() => setStep('address')}
                    />
                  </Elements>
                )}
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
                  <div key={item.product.id} className="flex justify-between text-sm">
                    <span className="text-[#4a7fa5]">{item.product.name} ×{item.quantity}</span>
                    <span className="font-medium text-[#0c2340]">${(item.product.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
                <div className="border-t border-[#cce7f0] pt-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#4a7fa5]">Subtotal</span>
                    <span className="text-[#0c2340]">${total().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#4a7fa5]">Delivery</span>
                    <span className={deliveryFee === 0 ? 'text-green-600 font-medium' : 'text-[#0c2340]'}>
                      {deliveryFee === 0 ? 'FREE' : `$${deliveryFee.toFixed(2)}`}
                    </span>
                  </div>
                  <div className="border-t border-[#cce7f0] pt-2 flex justify-between font-extrabold">
                    <span className="text-[#0c2340]">Total</span>
                    <span className="text-[#0097a7] text-lg">${orderTotal.toFixed(2)}</span>
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

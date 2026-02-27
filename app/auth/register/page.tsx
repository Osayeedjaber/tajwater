'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Mail, Lock, User, Phone, MapPin, ArrowRight, CheckCircle2 } from 'lucide-react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { DELIVERY_ZONES } from '@/lib/constants'
import { Suspense } from 'react'

function RegisterContent() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', address: '', zone: '' })
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') ?? '/dashboard'

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: { name: form.name, phone: form.phone, address: form.address, zone: form.zone },
      },
    })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSuccess(true)
    }
  }

  const handleGoogleLogin = async () => {
    setGoogleLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${redirect}`,
      },
    })
    if (error) {
      setError(error.message)
      setGoogleLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen hero-gradient flex items-center justify-center px-4 py-24">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass rounded-3xl p-10 max-w-md w-full text-center border border-white/30">
          <CheckCircle2 className="w-16 h-16 text-[#0097a7] mx-auto mb-4" />
          <h2 className="text-2xl font-extrabold text-[#0c2340] mb-3">Check Your Email!</h2>
          <p className="text-[#4a7fa5] mb-6">We sent a verification link to <strong>{form.email}</strong>. Click it to activate your account.</p>
          <Link href="/auth/login">
            <Button className="bg-gradient-to-r from-[#0097a7] to-[#1565c0] text-white">Go to Login</Button>
          </Link>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen hero-gradient flex items-center justify-center px-4 py-24 relative overflow-hidden">
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 120" className="w-full animate-wave-slow" preserveAspectRatio="none">
          <path d="M0,60 C240,120 480,0 720,60 C960,120 1200,0 1440,60 L1440,120 L0,120 Z" fill="rgba(255,255,255,0.06)" />
        </svg>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="glass rounded-3xl p-8 shadow-2xl shadow-black/20 border border-white/30">
          <div className="text-center mb-7">
            <div className="flex justify-center mb-4">
              <Image src="/logo/tajcyan.svg" alt="TajWater" width={160} height={52} className="h-12 w-auto" />
            </div>
            <h1 className="text-2xl font-extrabold text-[#0c2340]">Create Your Account</h1>
            <p className="text-[#4a7fa5] text-sm mt-1">Join thousands of happy TajWater customers</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl p-3 mb-5">{error}</div>
          )}

          {/* Google OAuth */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={googleLoading}
            className="w-full flex items-center justify-center gap-3 h-12 rounded-xl border-2 border-[#cce7f0] bg-white hover:border-[#0097a7] hover:bg-[#f0f9ff] transition-all font-medium text-[#0c2340] text-sm mb-5 disabled:opacity-60"
          >
            {googleLoading ? (
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} className="w-4 h-4 border-2 border-[#cce7f0] border-t-[#0097a7] rounded-full" />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
            )}
            Continue with Google
          </button>

          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-[#cce7f0]" />
            <span className="text-xs text-[#4a7fa5]">or register with email</span>
            <div className="flex-1 h-px bg-[#cce7f0]" />
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-[#0c2340] mb-1.5 block">Full Name</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#0097a7]" />
                <Input placeholder="John Smith" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="pl-10 border-[#cce7f0] h-11" required />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-[#0c2340] mb-1.5 block">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#0097a7]" />
                  <Input type="email" placeholder="email@..." value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="pl-9 border-[#cce7f0] h-11 text-sm" required />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-[#0c2340] mb-1.5 block">Phone</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#0097a7]" />
                  <Input placeholder="604-..." value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="pl-9 border-[#cce7f0] h-11 text-sm" />
                </div>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-[#0c2340] mb-1.5 block">Delivery Address</label>
              <div className="relative">
                <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#0097a7]" />
                <Input placeholder="123 Main Street, Vancouver" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="pl-10 border-[#cce7f0] h-11" />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-[#0c2340] mb-1.5 block">Delivery Zone</label>
              <select
                value={form.zone}
                onChange={(e) => setForm({ ...form, zone: e.target.value })}
                className="w-full h-11 px-3 rounded-xl border border-[#cce7f0] text-sm focus:border-[#0097a7] focus:outline-none text-[#0c2340]"
              >
                <option value="">Select your zone...</option>
                {DELIVERY_ZONES.map((z) => <option key={z} value={z}>{z}</option>)}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-[#0c2340] mb-1.5 block">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#0097a7]" />
                <Input
                  type={showPw ? 'text' : 'password'}
                  placeholder="Min. 8 characters"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="pl-10 pr-10 border-[#cce7f0] h-11"
                  minLength={8}
                  required
                />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#4a7fa5]">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" disabled={loading} className="w-full h-12 rounded-xl bg-gradient-to-r from-[#0097a7] to-[#1565c0] text-white font-semibold gap-2">
              {loading ? (
                <span className="flex items-center gap-2">
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                  Creating account...
                </span>
              ) : (
                <>Create Account <ArrowRight className="w-4 h-4" /></>
              )}
            </Button>
          </form>

          <p className="text-center text-sm text-[#4a7fa5] mt-6">
            Already have an account?{' '}
            <Link href={`/auth/login${redirect !== '/dashboard' ? `?redirect=${redirect}` : ''}`} className="text-[#0097a7] font-semibold hover:underline">Sign in</Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterContent />
    </Suspense>
  )
}

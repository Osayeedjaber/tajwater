'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Lock, Eye, EyeOff, CheckCircle2 } from 'lucide-react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  // Supabase sends the user back with a hash fragment — exchange it for a session
  useEffect(() => {
    supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'PASSWORD_RECOVERY') {
        // Session is now active, user can set a new password
      }
    })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setDone(true)
      setTimeout(() => router.push('/dashboard'), 2500)
    }
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
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <Image src="/logo/tajcyan.svg" alt="TajWater" width={160} height={52} className="h-12 w-auto" />
            </div>
            <h1 className="text-2xl font-extrabold text-[#0c2340]">Set New Password</h1>
            <p className="text-[#4a7fa5] text-sm mt-1">Choose a strong password for your account</p>
          </div>

          {done ? (
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center py-4">
              <div className="w-16 h-16 rounded-2xl bg-[#e0f7fa] flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-[#0097a7]" />
              </div>
              <p className="font-semibold text-[#0c2340] mb-2">Password updated!</p>
              <p className="text-sm text-[#4a7fa5]">Redirecting you to your dashboard...</p>
            </motion.div>
          ) : (
            <>
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl p-3 mb-5">
                  {error}
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-[#0c2340] mb-1.5 block">New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#0097a7]" />
                    <Input
                      type={showPw ? 'text' : 'password'}
                      placeholder="Min. 8 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10 border-[#cce7f0] h-11"
                      minLength={8}
                      required
                    />
                    <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#4a7fa5]">
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-[#0c2340] mb-1.5 block">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#0097a7]" />
                    <Input
                      type={showPw ? 'text' : 'password'}
                      placeholder="Repeat your password"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      className="pl-10 border-[#cce7f0] h-11"
                      required
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 rounded-xl bg-gradient-to-r from-[#0097a7] to-[#1565c0] text-white font-semibold"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                      Updating...
                    </span>
                  ) : 'Update Password'}
                </Button>
              </form>
              <p className="text-center text-sm text-[#4a7fa5] mt-6">
                <Link href="/auth/login" className="text-[#0097a7] font-semibold hover:underline">Back to Login</Link>
              </p>
            </>
          )}
        </div>
      </motion.div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Shield, Mail, Lock, Eye, EyeOff, ArrowRight, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AdminLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Sign in with Supabase
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError) {
      setError('Invalid email or password.')
      setLoading(false)
      return
    }

    // Check admin_users table for role
    const { data: adminData, error: adminError } = await supabase
      .from('admin_users')
      .select('role, name')
      .eq('email', email)
      .single()

    if (adminError || !adminData) {
      await supabase.auth.signOut()
      setError('Access denied. Your account does not have admin privileges.')
      setLoading(false)
      return
    }

    // Store role and name in localStorage for the layout to use
    localStorage.setItem('admin_role', adminData.role)
    localStorage.setItem('admin_name', adminData.name || 'Admin')

    router.push('/admin')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#003d40] via-[#006064] to-[#0d47a1] flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background circles */}
      <div className="absolute -top-20 -left-20 w-80 h-80 rounded-full bg-white/5 animate-float-bubble" />
      <div className="absolute -bottom-20 -right-20 w-96 h-96 rounded-full bg-white/5 animate-float-bubble" style={{ animationDelay: '2s' }} />

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="w-full max-w-sm"
      >
        <div className="glass rounded-3xl p-8 border border-white/30 shadow-2xl">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-[#0097a7] to-[#1565c0] mb-4 shadow-lg">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-extrabold text-[#0c2340]">Admin Portal</h1>
            <p className="text-[#4a7fa5] text-sm mt-1">TajWater Management System</p>
          </div>

          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl p-3 mb-4">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-[#0c2340] mb-1.5 block">Admin Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#0097a7]" />
                <Input type="email" placeholder="admin@tajwater.ca" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10 border-[#cce7f0] h-11" required />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-[#0c2340] mb-1.5 block">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#0097a7]" />
                <Input type={showPw ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 pr-10 border-[#cce7f0] h-11" required />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#4a7fa5]">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" disabled={loading} className="w-full h-12 rounded-xl bg-gradient-to-r from-[#006064] to-[#0d47a1] text-white font-semibold gap-2">
              {loading ? (
                <span className="flex items-center gap-2">
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                  Authenticating...
                </span>
              ) : (
                <>Access Admin <ArrowRight className="w-4 h-4" /></>
              )}
            </Button>
          </form>

          {/* Role guide */}
          <div className="mt-5 p-3 bg-[#f0f9ff]/60 rounded-xl border border-[#cce7f0]/50">
            <p className="text-[10px] text-[#4a7fa5] font-medium mb-1.5">Access Levels</p>
            <div className="space-y-1">
              {[
                { role: 'Super Admin', color: '#1565c0', desc: 'Full access to all sections' },
                { role: 'Manager', color: '#0097a7', desc: 'Orders, customers, products' },
                { role: 'Delivery Staff', color: '#006064', desc: 'Deliveries view only' },
              ].map((r) => (
                <div key={r.role} className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: r.color }} />
                  <span className="text-[10px] text-[#0c2340] font-medium">{r.role}</span>
                  <span className="text-[10px] text-[#4a7fa5]">— {r.desc}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-center text-xs text-[#4a7fa5] mt-4">Restricted access. All activity is logged.</p>
        </div>
      </motion.div>
    </div>
  )
}

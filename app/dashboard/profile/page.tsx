'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { User, Mail, Phone, CheckCircle2, Lock, AlertCircle, Eye, EyeOff, Camera, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { supabase } from '@/lib/supabase'

export default function ProfilePage() {
  const [profile, setProfile] = useState({ name: '', email: '', phone: '' })
  const [initials, setInitials] = useState('??')
  const [memberSince, setMemberSince] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [profileSaved, setProfileSaved] = useState(false)
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileError, setProfileError] = useState('')

  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [pwSaved, setPwSaved] = useState(false)
  const [pwSaving, setPwSaving] = useState(false)
  const [pwError, setPwError] = useState('')
  const [userId, setUserId] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const user = session.user
      setUserId(user.id)

      const email = user.email || ''
      const created = user.created_at
        ? new Date(user.created_at).toLocaleDateString('en-CA', { month: 'long', year: 'numeric' })
        : ''
      setMemberSince(created)

      const { data: prof } = await supabase
        .from('profiles')
        .select('name, phone, avatar_url')
        .eq('id', user.id)
        .single()

      const name = prof?.name || user.user_metadata?.name || ''
      const phone = prof?.phone || ''
      setProfile({ name, email, phone })

      // Avatar: prefer DB record, then Google OAuth avatar
      const avatar = prof?.avatar_url || user.user_metadata?.avatar_url || ''
      setAvatarUrl(avatar)

      const ini = name
        ? name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
        : email[0]?.toUpperCase() || '?'
      setInitials(ini)
    }
    load()
  }, [])

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !userId) return

    if (!file.type.startsWith('image/')) {
      setProfileError('Please select an image file (JPG, PNG, GIF, etc.)')
      return
    }
    if (file.size > 3 * 1024 * 1024) {
      setProfileError('Image must be under 3 MB.')
      return
    }

    setUploading(true)
    setProfileError('')

    const ext = file.name.split('.').pop() || 'jpg'
    const path = `${userId}/avatar.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true, cacheControl: '3600' })

    if (uploadError) {
      setProfileError('Upload failed. Make sure the avatars storage bucket exists in Supabase.')
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
    const urlWithBust = `${publicUrl}?t=${Date.now()}`

    const { error: saveError } = await supabase
      .from('profiles')
      .upsert({ id: userId, avatar_url: publicUrl }, { onConflict: 'id' })

    if (saveError) {
      setProfileError('Photo uploaded but failed to save. Try again.')
    } else {
      setAvatarUrl(urlWithBust)
    }

    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setProfileSaving(true)
    setProfileError('')
    const { error } = await supabase
      .from('profiles')
      .upsert({ id: userId, name: profile.name, phone: profile.phone }, { onConflict: 'id' })
    if (error) {
      setProfileError('Failed to save profile. Please try again.')
    } else {
      await supabase.auth.updateUser({ data: { name: profile.name } })
      setProfileSaved(true)
      const ini = profile.name
        ? profile.name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
        : initials
      setInitials(ini)
      setTimeout(() => setProfileSaved(false), 2500)
    }
    setProfileSaving(false)
  }

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPwError('')
    if (newPw !== confirmPw) {
      setPwError('New passwords do not match.')
      return
    }
    if (newPw.length < 6) {
      setPwError('Password must be at least 6 characters.')
      return
    }
    setPwSaving(true)
    const { error } = await supabase.auth.updateUser({ password: newPw })
    if (error) {
      setPwError(error.message)
    } else {
      setPwSaved(true)
      setNewPw('')
      setConfirmPw('')
      setTimeout(() => setPwSaved(false), 3000)
    }
    setPwSaving(false)
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h2 className="text-2xl font-extrabold text-[#0c2340]">My Profile</h2>

      <Tabs defaultValue="info">
        <TabsList className="bg-[#e0f7fa] text-[#0097a7] mb-6">
          <TabsTrigger value="info" className="data-[state=active]:bg-[#0097a7] data-[state=active]:text-white">Personal Info</TabsTrigger>
          <TabsTrigger value="password" className="data-[state=active]:bg-[#0097a7] data-[state=active]:text-white">Password</TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-3xl border border-[#cce7f0] shadow-sm p-6">

            {/* Avatar section */}
            <div className="flex items-center gap-5 mb-6">
              <div className="relative group">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="relative w-20 h-20 rounded-2xl overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0097a7]"
                  title="Change profile photo"
                >
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="Profile"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#0097a7] to-[#1565c0] flex items-center justify-center text-white font-bold text-2xl">
                      {initials}
                    </div>
                  )}
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    {uploading ? (
                      <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Camera className="w-5 h-5 text-white mb-1" />
                        <span className="text-[10px] text-white font-medium">Change</span>
                      </>
                    )}
                  </div>
                </button>

                {/* Upload badge */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full bg-[#0097a7] border-2 border-white flex items-center justify-center shadow-sm hover:bg-[#006064] transition-colors disabled:opacity-60"
                >
                  <Upload className="w-3 h-3 text-white" />
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />

              <div>
                <h3 className="font-bold text-[#0c2340]">{profile.name || profile.email}</h3>
                {memberSince && <p className="text-sm text-[#4a7fa5]">Customer since {memberSince}</p>}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="text-xs text-[#0097a7] hover:underline mt-1 disabled:opacity-50"
                >
                  {uploading ? 'Uploading...' : 'Upload profile photo'}
                </button>
                <p className="text-[10px] text-[#4a7fa5] mt-0.5">JPG, PNG, GIF · Max 3 MB</p>
              </div>
            </div>

            {profileError && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {profileError}
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-[#0c2340] mb-1.5 block">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#0097a7]" />
                  <Input
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    className="pl-10 border-[#cce7f0]"
                    placeholder="Your full name"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-[#0c2340] mb-1.5 block">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4a7fa5]" />
                  <Input
                    type="email"
                    value={profile.email}
                    disabled
                    className="pl-10 border-[#cce7f0] bg-[#f8fbfe] text-[#4a7fa5] cursor-not-allowed"
                  />
                </div>
                <p className="text-xs text-[#4a7fa5] mt-1">Email cannot be changed here. Contact support if needed.</p>
              </div>
              <div>
                <label className="text-sm font-medium text-[#0c2340] mb-1.5 block">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#0097a7]" />
                  <Input
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    className="pl-10 border-[#cce7f0]"
                    placeholder="+1 (604) 555-0000"
                  />
                </div>
              </div>
              <Button
                type="submit"
                disabled={profileSaving}
                className="bg-gradient-to-r from-[#0097a7] to-[#1565c0] text-white gap-2"
              >
                {profileSaved ? (
                  <><CheckCircle2 className="w-4 h-4" /> Saved!</>
                ) : profileSaving ? (
                  'Saving...'
                ) : (
                  'Save Changes'
                )}
              </Button>
            </form>
          </motion.div>
        </TabsContent>

        <TabsContent value="password">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-3xl border border-[#cce7f0] shadow-sm p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-[#e0f7fa] flex items-center justify-center">
                <Lock className="w-5 h-5 text-[#0097a7]" />
              </div>
              <div>
                <h3 className="font-semibold text-[#0c2340]">Change Password</h3>
                <p className="text-xs text-[#4a7fa5]">Choose a strong password you don&apos;t use elsewhere</p>
              </div>
            </div>

            {pwError && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {pwError}
              </div>
            )}

            {pwSaved && (
              <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl p-3 mb-4">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                Password updated successfully!
              </div>
            )}

            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-[#0c2340] mb-1.5 block">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#0097a7]" />
                  <Input
                    type={showPw ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={newPw}
                    onChange={(e) => setNewPw(e.target.value)}
                    className="pl-10 pr-10 border-[#cce7f0]"
                    required
                    minLength={6}
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#4a7fa5] hover:text-[#0097a7]">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-[#0c2340] mb-1.5 block">Confirm New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#0097a7]" />
                  <Input
                    type={showPw ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={confirmPw}
                    onChange={(e) => setConfirmPw(e.target.value)}
                    className="pl-10 border-[#cce7f0]"
                    required
                  />
                </div>
              </div>
              <Button
                type="submit"
                disabled={pwSaving}
                className="bg-gradient-to-r from-[#0097a7] to-[#1565c0] text-white gap-2"
              >
                {pwSaving ? 'Updating...' : 'Update Password'}
              </Button>
            </form>

            <div className="mt-6 p-4 bg-[#f0f9ff] rounded-xl border border-[#cce7f0]">
              <p className="text-xs text-[#4a7fa5] font-medium mb-1">Password tips</p>
              <ul className="text-xs text-[#4a7fa5] space-y-0.5 list-disc list-inside">
                <li>At least 6 characters long</li>
                <li>Mix uppercase, lowercase, numbers and symbols</li>
                <li>Avoid using personal information</li>
              </ul>
            </div>
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { LayoutDashboard, ShoppingBag, RefreshCw, User, HeadphonesIcon, LogOut, Menu, X, Bell, Droplets } from 'lucide-react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'

const navItems = [
  { icon: LayoutDashboard, label: 'Overview', href: '/dashboard' },
  { icon: ShoppingBag, label: 'My Orders', href: '/dashboard/orders' },
  { icon: RefreshCw, label: 'Subscription', href: '/dashboard/subscription' },
  { icon: User, label: 'My Profile', href: '/dashboard/profile' },
  { icon: HeadphonesIcon, label: 'Support', href: '/dashboard/support' },
]

// Extracted component to avoid "cannot create components during render" error
function AvatarBubble({ size = 8, textSize = 'text-xs', userAvatar, userName, userInitials }: { size?: number; textSize?: string; userAvatar: string; userName: string; userInitials: string }) {
  return (
    <div
      className={`w-${size} h-${size} rounded-lg overflow-hidden shrink-0`}
      style={{ width: `${size * 4}px`, height: `${size * 4}px` }}
    >
      {userAvatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={userAvatar} alt={userName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
      ) : (
        <div className={`w-full h-full bg-gradient-to-br from-[#0097a7] to-[#1565c0] flex items-center justify-center text-white font-bold ${textSize}`}>
          {userInitials}
        </div>
      )}
    </div>
  )
}

// Extracted Sidebar component
function Sidebar({ pathname, setSidebarOpen, userName, userAvatar, userInitials, handleLogout }: {
  pathname: string
  setSidebarOpen: (v: boolean) => void
  userName: string
  userAvatar: string
  userInitials: string
  handleLogout: () => void
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-[#cce7f0]">
        <Link href="/">
          <Image src="/logo/tajcyan.svg" alt="TajWater" width={130} height={42} className="h-9 w-auto" />
        </Link>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const active = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                active
                  ? 'bg-gradient-to-r from-[#0097a7] to-[#1565c0] text-white shadow-md shadow-[#0097a7]/30'
                  : 'text-[#4a7fa5] hover:bg-[#e0f7fa] hover:text-[#0097a7]'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-[#cce7f0] space-y-2">
        <div className="flex items-center gap-3 px-3 py-2">
          <AvatarBubble size={8} textSize="text-xs" userAvatar={userAvatar} userName={userName} userInitials={userInitials} />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-[#0c2340] truncate">{userName}</p>
            <p className="text-[10px] text-[#4a7fa5]">Customer</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-all"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)
  const [userName, setUserName] = useState('Customer')
  const [userInitials, setUserInitials] = useState('C')
  const [userAvatar, setUserAvatar] = useState('')

  useEffect(() => {
    // Eagerly check session on mount so we don't wait for the auth event
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.replace('/auth/login')
        return
      }

      const user = session.user
      let name = user.user_metadata?.name || user.email || 'Customer'

      const { data: prof } = await supabase
        .from('profiles')
        .select('name, avatar_url')
        .eq('id', user.id)
        .single()

      if (prof?.name) name = prof.name
      setUserAvatar(prof?.avatar_url || user.user_metadata?.avatar_url || '')
      setUserName(name)
      setUserInitials(name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2))
      setAuthChecked(true)
    }
    init()

    // Keep listening for sign-out
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || (!session && event !== 'INITIAL_SESSION')) {
        router.replace('/auth/login')
      }
    })

    return () => subscription.unsubscribe()
  }, [router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-[#f0f9ff] flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
          className="w-10 h-10 border-3 border-[#e0f7fa] border-t-[#0097a7] rounded-full"
          style={{ borderWidth: 3 }}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f0f9ff] flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-60 flex-col bg-white border-r border-[#cce7f0] fixed top-0 bottom-0 left-0 z-30">
        <Sidebar pathname={pathname} setSidebarOpen={setSidebarOpen} userName={userName} userAvatar={userAvatar} userInitials={userInitials} handleLogout={handleLogout} />
      </aside>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSidebarOpen(false)} className="fixed inset-0 bg-black/30 z-40 lg:hidden" />
            <motion.aside
              initial={{ x: -240 }}
              animate={{ x: 0 }}
              exit={{ x: -240 }}
              transition={{ type: 'spring', damping: 25 }}
              className="fixed top-0 left-0 bottom-0 w-60 bg-white z-50 shadow-2xl lg:hidden"
            >
              <div className="flex items-center justify-between p-4 border-b border-[#cce7f0]">
                <div className="flex items-center gap-2">
                  <Droplets className="w-5 h-5 text-[#0097a7]" />
                  <span className="font-bold text-[#006064]">Customer Portal</span>
                </div>
                <button onClick={() => setSidebarOpen(false)}><X className="w-5 h-5 text-[#4a7fa5]" /></button>
              </div>
              <Sidebar pathname={pathname} setSidebarOpen={setSidebarOpen} userName={userName} userAvatar={userAvatar} userInitials={userInitials} handleLogout={handleLogout} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main */}
      <div className="flex-1 lg:ml-60">
        {/* Top bar */}
        <div className="h-14 bg-white border-b border-[#cce7f0] flex items-center px-4 sm:px-6 gap-4 sticky top-0 z-20">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-1.5 rounded-lg hover:bg-[#e0f7fa] text-[#4a7fa5]">
            <Menu className="w-5 h-5" />
          </button>
          <span className="text-sm font-semibold text-[#0c2340]">Customer Dashboard</span>
          <div className="ml-auto flex items-center gap-3">
            <button className="w-8 h-8 rounded-lg hover:bg-[#e0f7fa] flex items-center justify-center text-[#4a7fa5] relative">
              <Bell className="w-4 h-4" />
            </button>
            <div className="hidden sm:flex items-center gap-2">
              <AvatarBubble size={8} textSize="text-xs" userAvatar={userAvatar} userName={userName} userInitials={userInitials} />
              <span className="text-sm font-medium text-[#0c2340] max-w-[120px] truncate">{userName.split(' ')[0]}</span>
            </div>
          </div>
        </div>

        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  )
}

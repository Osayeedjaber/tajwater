'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, ShoppingBag, Users, Package, Truck, CreditCard,
  Settings, Menu, X, Shield, LogOut, Bell, FileEdit, BarChart2, MessageSquare, Droplets, UserCog, RefreshCw, Tag, ClipboardList
} from 'lucide-react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'

type Role = 'super_admin' | 'manager' | 'delivery' | null

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard',  href: '/admin',             roles: ['super_admin', 'manager', 'delivery'] },
  { icon: ShoppingBag,     label: 'Orders',     href: '/admin/orders',      roles: ['super_admin', 'manager'] },
  { icon: Users,           label: 'Customers',  href: '/admin/customers',   roles: ['super_admin', 'manager'] },
  { icon: Package,         label: 'Products',      href: '/admin/products',       roles: ['super_admin', 'manager'] },
  { icon: RefreshCw,       label: 'Subscriptions', href: '/admin/subscriptions',  roles: ['super_admin', 'manager'] },
  { icon: Droplets,        label: 'Services',      href: '/admin/services',       roles: ['super_admin', 'manager'] },
  { icon: Truck,           label: 'Deliveries', href: '/admin/deliveries',  roles: ['super_admin', 'manager', 'delivery'] },
  { icon: CreditCard,      label: 'Payments',   href: '/admin/payments',    roles: ['super_admin', 'manager'] },
  { icon: Tag,             label: 'Discounts',  href: '/admin/discounts',   roles: ['super_admin', 'manager'] },
  { icon: MessageSquare,   label: 'Tickets',    href: '/admin/tickets',     roles: ['super_admin', 'manager'] },
  { icon: BarChart2,       label: 'Analytics',  href: '/admin/analytics',   roles: ['super_admin', 'manager'] },
  { icon: UserCog,         label: 'Access',     href: '/admin/access',      roles: ['super_admin'] },
  { icon: ClipboardList,   label: 'Audit Log',  href: '/admin/audit',       roles: ['super_admin'] },
  { icon: FileEdit,        label: 'Content',    href: '/admin/content',     roles: ['super_admin', 'manager'] },
  { icon: Settings,        label: 'Settings',   href: '/admin/settings',    roles: ['super_admin'] },
]

const ROLE_LABEL: Record<string, string> = {
  super_admin: 'Super Admin',
  manager:     'Manager',
  delivery:    'Delivery Staff',
}

const ROLE_COLOR: Record<string, string> = {
  super_admin: 'bg-[#1565c0]/25 text-[#b3e5fc]',
  manager:     'bg-[#0097a7]/25 text-[#b3e5fc]',
  delivery:    'bg-[#006064]/25 text-[#b3e5fc]',
}

type Notif = { id: string; text: string; href: string; time: string; read: boolean }

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname   = usePathname()
  const router     = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [role,      setRole]      = useState<Role>(null)
  const [adminName, setAdminName] = useState('')
  const [mounted,   setMounted]   = useState(false)
  const [notifs,    setNotifs]    = useState<Notif[]>([])
  const [bellOpen,  setBellOpen]  = useState(false)
  const bellRef                   = useRef<HTMLDivElement>(null)
  const unread = notifs.filter(n => !n.read).length

  useEffect(() => {
    // Skip auth check on the login page itself
    if (pathname === '/admin/login') {
      setMounted(true)
      return
    }

    const storedRole = localStorage.getItem('admin_role') as Role
    const storedName = localStorage.getItem('admin_name') || 'Admin'

    // No role stored → not logged in → redirect
    if (!storedRole) {
      router.replace('/admin/login')
      return
    }

    setRole(storedRole)
    setAdminName(storedName)
    setMounted(true)
  }, [pathname, router])

  // Realtime: subscribe to new orders + new tickets
  useEffect(() => {
    if (pathname === '/admin/login') return

    const channel = supabase
      .channel('admin-notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, payload => {
        const row = payload.new as { id: string; customer_name?: string; total?: number }
        setNotifs(prev => [{
          id:    row.id,
          text:  `New order from ${row.customer_name ?? 'Guest'} — $${Number(row.total ?? 0).toFixed(2)}`,
          href:  '/admin/orders',
          time:  new Date().toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' }),
          read:  false,
        }, ...prev].slice(0, 20))
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tickets' }, payload => {
        const row = payload.new as { id: string; subject?: string }
        setNotifs(prev => [{
          id:    'ticket-' + row.id,
          text:  `New ticket: ${row.subject ?? 'Support request'}`,
          href:  '/admin/tickets',
          time:  new Date().toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' }),
          read:  false,
        }, ...prev].slice(0, 20))
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [pathname])

  // Close bell panel on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Login page — render with no layout
  if (pathname === '/admin/login') {
    return <>{children}</>
  }

  // Not mounted yet — show minimal skeleton to prevent hydration flash
  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#f0f9ff] flex">
        <aside className="hidden lg:block w-56 bg-gradient-to-b from-[#003d40] to-[#0d47a1]" />
        <div className="flex-1 lg:ml-56">
          <div className="h-14 bg-white border-b border-[#cce7f0]" />
          <div className="p-8 space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-white rounded-2xl border border-[#cce7f0] animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  const navItems = NAV_ITEMS.filter(item => !role || item.roles.includes(role))

  const handleLogout = async () => {
    localStorage.removeItem('admin_role')
    localStorage.removeItem('admin_name')
    await supabase.auth.signOut()
    router.push('/admin/login')
  }

  const Sidebar = () => (
    <div className="flex flex-col h-full bg-gradient-to-b from-[#003d40] to-[#0d47a1]">
      {/* Logo */}
      <div className="p-5 border-b border-white/10">
        <Link href="/" onClick={() => setSidebarOpen(false)}>
          <Image src="/logo/tajwhite.svg" alt="TajWater" width={120} height={40} className="h-8 w-auto" />
        </Link>
        <p className="text-[10px] text-[#b3e5fc]/60 mt-1.5 font-medium tracking-wider uppercase">Admin Panel</p>
      </div>

      {/* Role + name */}
      {role && (
        <div className="px-5 pt-4 pb-2">
          <span className={`inline-block text-[10px] font-semibold px-2.5 py-1 rounded-full ${ROLE_COLOR[role] ?? 'bg-white/10 text-[#b3e5fc]'}`}>
            {ROLE_LABEL[role] ?? role}
          </span>
          <p className="text-xs text-white/60 mt-1.5 truncate">{adminName}</p>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
        {navItems.map(item => {
          const Icon   = item.icon
          const active = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                active
                  ? 'bg-white/20 text-white shadow-sm'
                  : 'text-[#b3e5fc]/80 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-white' : 'text-[#b3e5fc]/60'}`} />
              {item.label}
              {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#00bcd4]" />}
            </Link>
          )
        })}
      </nav>

      {/* Bottom actions */}
      <div className="px-3 py-4 border-t border-white/10 space-y-0.5">
        <Link
          href="/"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[#b3e5fc]/70 hover:bg-white/10 hover:text-white transition-all"
        >
          <X className="w-4 h-4" />
          Exit to Site
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[#b3e5fc]/70 hover:bg-red-500/20 hover:text-red-300 transition-all"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#f0f9ff] flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-56 flex-col fixed top-0 bottom-0 left-0 z-30 shadow-xl">
        <Sidebar />
      </aside>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            />
            <motion.aside
              initial={{ x: -224 }}
              animate={{ x: 0 }}
              exit={{ x: -224 }}
              transition={{ type: 'spring', damping: 28, stiffness: 260 }}
              className="fixed top-0 left-0 bottom-0 w-56 z-50 shadow-2xl lg:hidden"
            >
              <Sidebar />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex-1 lg:ml-56 min-w-0">
        {/* Top bar */}
        <header className="h-14 bg-white border-b border-[#cce7f0] flex items-center px-4 sm:px-6 gap-3 sticky top-0 z-20 shadow-sm">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg hover:bg-[#e0f7fa] transition-colors"
          >
            <Menu className="w-5 h-5 text-[#4a7fa5]" />
          </button>

          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#0097a7]" />
            <span className="font-semibold text-[#0c2340] text-sm hidden sm:block">TajWater Admin</span>
          </div>

          {/* Page breadcrumb */}
          <div className="hidden md:flex items-center gap-1.5 text-xs text-[#4a7fa5]">
            <span>/</span>
            <span className="capitalize">
              {pathname === '/admin' ? 'Dashboard' : pathname.split('/admin/')[1]?.split('/')[0] ?? ''}
            </span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <div ref={bellRef} className="relative">
              <button
                onClick={() => { setBellOpen(v => !v); setNotifs(prev => prev.map(n => ({ ...n, read: true }))) }}
                className="w-8 h-8 rounded-lg hover:bg-[#e0f7fa] flex items-center justify-center text-[#4a7fa5] relative transition-colors"
              >
                <Bell className="w-4 h-4" />
                {unread > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </button>
              <AnimatePresence>
                {bellOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-10 w-80 bg-white rounded-2xl border border-[#cce7f0] shadow-xl z-50 overflow-hidden"
                  >
                    <div className="px-4 py-3 border-b border-[#f0f9ff] flex items-center justify-between">
                      <span className="text-sm font-bold text-[#0c2340]">Notifications</span>
                      {notifs.length > 0 && (
                        <button onClick={() => setNotifs([])} className="text-xs text-[#4a7fa5] hover:text-red-500">Clear all</button>
                      )}
                    </div>
                    <div className="max-h-72 overflow-y-auto divide-y divide-[#f0f9ff]">
                      {notifs.length === 0 ? (
                        <p className="text-sm text-[#4a7fa5] text-center py-8">No new notifications</p>
                      ) : notifs.map(n => (
                        <Link key={n.id} href={n.href} onClick={() => setBellOpen(false)}
                          className="flex items-start gap-3 px-4 py-3 hover:bg-[#f0f9ff] transition-colors">
                          <div className="w-7 h-7 rounded-lg bg-[#e0f7fa] flex items-center justify-center shrink-0 mt-0.5">
                            <Bell className="w-3.5 h-3.5 text-[#0097a7]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-[#0c2340] font-medium leading-snug">{n.text}</p>
                            <p className="text-[10px] text-[#4a7fa5] mt-0.5">{n.time}</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div className="flex items-center gap-2 pl-2 border-l border-[#cce7f0]">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#0097a7] to-[#1565c0] flex items-center justify-center text-white text-xs font-bold">
                {adminName ? adminName.charAt(0).toUpperCase() : '?'}
              </div>
              <div className="hidden sm:block">
                <p className="text-xs font-semibold text-[#0c2340] leading-none">{adminName}</p>
                <p className="text-[10px] text-[#4a7fa5] mt-0.5">{role ? ROLE_LABEL[role] : ''}</p>
              </div>
            </div>
          </div>
        </header>

        <main className="p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}

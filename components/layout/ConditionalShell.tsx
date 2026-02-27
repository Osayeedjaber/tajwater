'use client'

import { usePathname } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import FloatingOrderButton from '@/components/shared/FloatingOrderButton'

export default function ConditionalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const hideShell = pathname.startsWith('/admin') || pathname.startsWith('/auth')

  return (
    <>
      {!hideShell && <Navbar />}
      <main>{children}</main>
      {!hideShell && <Footer />}
      {!hideShell && <FloatingOrderButton />}
    </>
  )
}

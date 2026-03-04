'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Phone, Mail, MapPin, Facebook, Instagram, Twitter, MessageCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function Footer() {
  const pathname = usePathname()
  const [phone, setPhone] = useState(process.env.NEXT_PUBLIC_COMPANY_PHONE || '')
  const [email, setEmail] = useState(process.env.NEXT_PUBLIC_COMPANY_EMAIL || '')
  const [zones, setZones] = useState<string[]>([])
  const [socials, setSocials] = useState({ facebook: '', instagram: '', twitter: '' })

  useEffect(() => {
    supabase
      .from('site_content')
      .select('key, value')
      .in('key', ['settings_phone', 'settings_email', 'social_facebook', 'social_instagram', 'social_twitter'])
      .then(({ data }) => {
        if (!data) return
        const fb: typeof socials = { facebook: '', instagram: '', twitter: '' }
        for (const row of data) {
          if (row.key === 'settings_phone') setPhone(row.value)
          if (row.key === 'settings_email') setEmail(row.value)
          if (row.key === 'social_facebook')  fb.facebook  = row.value
          if (row.key === 'social_instagram') fb.instagram = row.value
          if (row.key === 'social_twitter')   fb.twitter   = row.value
        }
        setSocials(fb)
      })
    supabase
      .from('zones')
      .select('name')
      .eq('active', true)
      .order('name')
      .then(({ data }) => {
        if (data) setZones(data.map((z: { name: string }) => z.name))
      })
  }, [])

  if (pathname.startsWith('/admin') || pathname.startsWith('/auth')) return null

  const whatsapp = phone.replace(/\D/g, '')

  return (
    <footer className="relative overflow-hidden bg-gradient-to-b from-[#006064] to-[#003d40]">
      {/* Wave top */}
      <div className="absolute top-0 left-0 right-0 overflow-hidden leading-none">
        <svg viewBox="0 0 1440 80" className="w-full" preserveAspectRatio="none">
          <path d="M0,40 C240,80 480,0 720,40 C960,80 1200,0 1440,40 L1440,0 L0,0 Z" fill="#f0f9ff" />
        </svg>
      </div>

      <div className="relative pt-20 pb-10 px-4 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">

          {/* Brand */}
          <div className="lg:col-span-1">
            <div className="mb-4">
              <Image src="/logo/tajwhite.svg" alt="TajWater" width={150} height={48} className="h-11 w-auto" />
            </div>
            <p className="text-[#b3e5fc] text-sm leading-relaxed mb-5">
              Delivering pure, fresh water across Metro Vancouver. Trusted by thousands of households and businesses since 2010.
            </p>
            <div className="flex gap-3">
              {[
                { icon: Facebook,  href: socials.facebook  || null },
                { icon: Instagram, href: socials.instagram || null },
                { icon: Twitter,   href: socials.twitter   || null },
              ].filter(s => s.href).map(({ icon: Icon, href }, i) => (
                <a key={i} href={href!} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-lg bg-white/10 hover:bg-[#00bcd4] flex items-center justify-center text-white transition-all duration-200 hover:scale-110">
                  <Icon className="w-4 h-4" />
                </a>
              ))}
              <a href={`https://wa.me/${whatsapp}`} className="w-9 h-9 rounded-lg bg-[#25d366]/20 hover:bg-[#25d366] flex items-center justify-center text-white transition-all duration-200 hover:scale-110">
                <MessageCircle className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-white mb-4">Quick Links</h4>
            <ul className="space-y-2">
              {[
                { label: 'Home', href: '/' },
                { label: 'Our Services', href: '/services' },
                { label: 'Delivery Areas', href: '/areas' },
                { label: 'Shop', href: '/shop' },
                { label: 'About Us', href: '/about' },
                { label: 'Contact', href: '/contact' },
                { label: 'Customer Login', href: '/auth/login' },
              ].map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-[#b3e5fc] hover:text-white text-sm transition-colors hover:translate-x-1 inline-block duration-200">
                    → {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Delivery Zones */}
          <div>
            <h4 className="font-semibold text-white mb-4">Delivery Zones</h4>
            <div className="flex flex-wrap gap-2">
              {zones.map((zone) => (
                <Link
                  key={zone}
                  href="/areas"
                  className="text-[10px] font-medium px-2.5 py-1 rounded-full bg-white/10 text-[#b3e5fc] hover:bg-[#00bcd4] hover:text-white transition-all duration-200"
                >
                  {zone}
                </Link>
              ))}
            </div>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold text-white mb-4">Contact Us</h4>
            <ul className="space-y-3">
              {phone && (
                <li>
                  <a href={`tel:${phone}`} className="flex items-start gap-3 group">
                    <div className="w-8 h-8 rounded-lg bg-white/10 group-hover:bg-[#00bcd4] flex items-center justify-center shrink-0 transition-colors">
                      <Phone className="w-4 h-4 text-[#00bcd4] group-hover:text-white" />
                    </div>
                    <div>
                      <p className="text-[10px] text-[#b3e5fc]/60 uppercase tracking-wider">Phone</p>
                      <p className="text-sm text-[#b3e5fc] group-hover:text-white transition-colors">{phone}</p>
                    </div>
                  </a>
                </li>
              )}
              {email && (
                <li>
                  <a href={`mailto:${email}`} className="flex items-start gap-3 group">
                    <div className="w-8 h-8 rounded-lg bg-white/10 group-hover:bg-[#00bcd4] flex items-center justify-center shrink-0 transition-colors">
                      <Mail className="w-4 h-4 text-[#00bcd4] group-hover:text-white" />
                    </div>
                    <div>
                      <p className="text-[10px] text-[#b3e5fc]/60 uppercase tracking-wider">Email</p>
                      <p className="text-sm text-[#b3e5fc] group-hover:text-white transition-colors">{email}</p>
                    </div>
                  </a>
                </li>
              )}
              <li>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                    <MapPin className="w-4 h-4 text-[#00bcd4]" />
                  </div>
                  <div>
                    <p className="text-[10px] text-[#b3e5fc]/60 uppercase tracking-wider">Office</p>
                    <p className="text-sm text-[#b3e5fc]">Vancouver, BC, Canada</p>
                  </div>
                </div>
              </li>
              <li>
                <div className="mt-2 p-3 rounded-xl bg-white/10 border border-white/10">
                  <p className="text-[11px] text-[#b3e5fc]/70 uppercase tracking-wider mb-1">Business Hours</p>
                  <p className="text-sm text-white font-medium">Mon – Sat: 7am – 7pm</p>
                  <p className="text-sm text-[#b3e5fc]">Sunday: 9am – 5pm</p>
                </div>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row justify-between items-center gap-3">
          <p className="text-[#b3e5fc]/60 text-xs">© {new Date().getFullYear()} TajWater. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="/legal/privacy" className="text-[#b3e5fc]/60 hover:text-[#b3e5fc] text-xs transition-colors">Privacy Policy</Link>
            <Link href="/legal/terms" className="text-[#b3e5fc]/60 hover:text-[#b3e5fc] text-xs transition-colors">Terms of Service</Link>
            <Link href="/admin/login" className="text-[#b3e5fc]/60 hover:text-[#b3e5fc] text-xs transition-colors">Admin</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

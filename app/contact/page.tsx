'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Phone, Mail, MapPin, Clock, MessageCircle, Send, CheckCircle2, Facebook, Instagram, Twitter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { supabase } from '@/lib/supabase'

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' })
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState('')
  const [phone,   setPhone]   = useState(process.env.NEXT_PUBLIC_COMPANY_PHONE   ?? '')
  const [email,   setEmail]   = useState(process.env.NEXT_PUBLIC_COMPANY_EMAIL   ?? '')
  const [address, setAddress] = useState('Metro Vancouver, BC, Canada')

  useEffect(() => {
    supabase
      .from('site_content')
      .select('key, value')
      .in('key', ['settings_phone', 'settings_email', 'settings_address'])
      .then(({ data }) => {
        if (!data) return
        const map: Record<string, string> = {}
        data.forEach(r => { map[r.key] = r.value })
        if (map['settings_phone'])   setPhone(map['settings_phone'])
        if (map['settings_email'])   setEmail(map['settings_email'])
        if (map['settings_address']) setAddress(map['settings_address'])
      })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSending(true)
    setSendError('')
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error('Failed to send')
      setSent(true)
    } catch {
      setSendError('Something went wrong. Please try calling or emailing us directly.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative py-28 hero-gradient overflow-hidden">
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 80" className="w-full" preserveAspectRatio="none">
            <path d="M0,40 C240,80 480,0 720,40 C960,80 1200,0 1440,40 L1440,80 L0,80 Z" fill="#f0f9ff" />
          </svg>
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
            <span className="inline-block px-4 py-1.5 rounded-full bg-white/20 text-white text-sm font-semibold mb-4">Contact Us</span>
            <h1 className="text-3xl sm:text-5xl font-extrabold text-white mb-5">
              We&apos;d Love to <span className="gradient-text-light">Hear From You</span>
            </h1>
            <p className="text-[#b3e5fc] text-xl max-w-2xl mx-auto">
              Questions, quotes, or just want to say hello — our team is here for you.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="py-20 bg-[#f0f9ff]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">

            {/* Contact info */}
            <div className="lg:col-span-2 space-y-5">
              <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}>
                <h2 className="text-2xl font-extrabold text-[#0c2340] mb-6">Get in Touch</h2>

                {[
                  {
                    icon: Phone, label: 'Call Us', value: phone,
                    href: `tel:${phone}`, btn: 'Call Now', color: '#0097a7',
                  },
                  {
                    icon: MessageCircle, label: 'WhatsApp', value: 'Chat on WhatsApp',
                    href: `https://wa.me/${phone.replace(/\D/g, '')}`, btn: 'Chat Now', color: '#25d366',
                  },
                  {
                    icon: Mail, label: 'Email', value: email,
                    href: `mailto:${email}`, btn: 'Send Email', color: '#1565c0',
                  },
                ].map((item) => {
                  const Icon = item.icon
                  return (
                    <div key={item.label} className="flex items-center gap-4 bg-white rounded-2xl p-4 border border-[#cce7f0] shadow-sm">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: item.color + '18' }}>
                        <Icon className="w-5 h-5" style={{ color: item.color }} />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-[#4a7fa5] uppercase tracking-wider">{item.label}</p>
                        <p className="font-semibold text-[#0c2340]">{item.value}</p>
                      </div>
                      <a href={item.href} target={item.href.startsWith('http') ? '_blank' : undefined} rel="noreferrer">
                        <Button size="sm" className="text-white rounded-lg text-xs" style={{ background: item.color }}>
                          {item.btn}
                        </Button>
                      </a>
                    </div>
                  )
                })}

                {/* Address */}
                <div className="bg-white rounded-2xl p-4 border border-[#cce7f0] shadow-sm">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-[#e0f7fa] flex items-center justify-center shrink-0">
                      <MapPin className="w-5 h-5 text-[#0097a7]" />
                    </div>
                    <div>
                      <p className="text-xs text-[#4a7fa5] uppercase tracking-wider mb-1">Office Address</p>
                      <p className="font-semibold text-[#0c2340]">{address}</p>
                    </div>
                  </div>
                </div>

                {/* Hours */}
                <div className="bg-white rounded-2xl p-4 border border-[#cce7f0] shadow-sm">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-[#e0f7fa] flex items-center justify-center shrink-0">
                      <Clock className="w-5 h-5 text-[#0097a7]" />
                    </div>
                    <div>
                      <p className="text-xs text-[#4a7fa5] uppercase tracking-wider mb-2">Business Hours</p>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between gap-6"><span className="text-[#4a7fa5]">Mon – Fri</span><span className="font-semibold text-[#0c2340]">7:00 AM – 7:00 PM</span></div>
                        <div className="flex justify-between gap-6"><span className="text-[#4a7fa5]">Saturday</span><span className="font-semibold text-[#0c2340]">8:00 AM – 6:00 PM</span></div>
                        <div className="flex justify-between gap-6"><span className="text-[#4a7fa5]">Sunday</span><span className="font-semibold text-[#0c2340]">9:00 AM – 5:00 PM</span></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Social */}
                <div className="flex gap-3">
                  {[
                    { icon: Facebook, href: '#', color: '#1877f2' },
                    { icon: Instagram, href: '#', color: '#e4405f' },
                    { icon: Twitter, href: '#', color: '#1da1f2' },
                  ].map(({ icon: Icon, href, color }, i) => (
                    <a key={i} href={href} className="w-10 h-10 rounded-xl flex items-center justify-center bg-white border border-[#cce7f0] hover:border-transparent hover:scale-110 transition-all" style={{ '--hover-bg': color } as React.CSSProperties}>
                      <Icon className="w-4 h-4" style={{ color }} />
                    </a>
                  ))}
                </div>
              </motion.div>
            </div>

            {/* Contact form */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
              className="lg:col-span-3"
            >
              <div className="bg-white rounded-3xl p-8 border border-[#cce7f0] shadow-lg">
                <h3 className="text-xl font-extrabold text-[#0c2340] mb-6">Send Us a Message</h3>
                {sent ? (
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-center py-10"
                  >
                    <CheckCircle2 className="w-14 h-14 text-[#0097a7] mx-auto mb-4" />
                    <h4 className="text-xl font-bold text-[#0c2340] mb-2">Message Sent!</h4>
                    <p className="text-[#4a7fa5]">We&apos;ll get back to you within 2 business hours.</p>
                  </motion.div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-[#0c2340] mb-1.5 block">Full Name</label>
                        <Input placeholder="John Smith" className="border-[#cce7f0] focus:border-[#0097a7]" required onChange={(e) => setForm({ ...form, name: e.target.value })} />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-[#0c2340] mb-1.5 block">Phone Number</label>
                        <Input placeholder="+1 (604) 000-0000" className="border-[#cce7f0] focus:border-[#0097a7]" onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-[#0c2340] mb-1.5 block">Email Address</label>
                      <Input type="email" placeholder="your@email.com" className="border-[#cce7f0] focus:border-[#0097a7]" required onChange={(e) => setForm({ ...form, email: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-[#0c2340] mb-1.5 block">Subject</label>
                      <Input placeholder="How can we help?" className="border-[#cce7f0] focus:border-[#0097a7]" required onChange={(e) => setForm({ ...form, subject: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-[#0c2340] mb-1.5 block">Message</label>
                      <Textarea
                        placeholder="Tell us more about your inquiry..."
                        rows={5}
                        className="border-[#cce7f0] focus:border-[#0097a7] resize-none"
                        required
                        onChange={(e) => setForm({ ...form, message: e.target.value })}
                      />
                    </div>
                    {sendError && (
                      <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-3">{sendError}</p>
                    )}
                    <Button type="submit" disabled={sending} className="w-full h-12 rounded-xl bg-gradient-to-r from-[#0097a7] to-[#1565c0] text-white font-semibold gap-2">
                      {sending ? (
                        <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Sending...</>
                      ) : (
                        <><Send className="w-4 h-4" /> Send Message</>
                      )}
                    </Button>
                  </form>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Map */}
      <section className="pb-20 bg-[#f0f9ff]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl overflow-hidden border border-[#cce7f0] shadow-lg h-72">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d83327.37699649763!2d-123.1948247!3d49.2576691!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x548673f143a94fb3%3A0xbb9196ea9b81f38b!2sVancouver%2C%20BC!5e0!3m2!1sen!2sca!4v1700000000001"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="TajWater Office Location"
            />
          </div>
        </div>
      </section>
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Shield, Award, Leaf, Heart, Users, Droplets } from 'lucide-react'
import { supabase } from '@/lib/supabase'

const timeline = [
  { year: '2010', title: 'Founded in Vancouver', desc: 'TajWater started as a small family operation delivering water to 50 homes in North Vancouver.' },
  { year: '2013', title: 'First 1,000 Customers', desc: 'Rapid growth through word of mouth led to expansion into Burnaby and Richmond.' },
  { year: '2016', title: 'Commercial Division Launched', desc: 'We began serving restaurants, gyms, and offices across Metro Vancouver.' },
  { year: '2019', title: 'Filtration Services Added', desc: 'Expanded into professional filtration installation and maintenance services.' },
  { year: '2022', title: '10 Zones Covered', desc: 'Now serving all of Metro Vancouver from Langley to West Vancouver.' },
  { year: '2024', title: '5,000+ Customers', desc: 'Trusted by thousands of families and hundreds of businesses across the region.' },
]

const certs = [
  { icon: Shield, label: 'NSF/ANSI 58 Certified', desc: 'Meets all Health Canada drinking water standards' },
  { icon: Award, label: 'ISO 9001:2015', desc: 'Quality management system certified' },
  { icon: Leaf, label: 'BC Water Authority Approved', desc: 'Fully licensed water delivery operator in BC' },
  { icon: Heart, label: 'BPA-Free Containers', desc: 'All jugs are food-grade, BPA-free polycarbonate' },
]

const values = [
  { icon: Droplets, title: 'Purity First', desc: 'Every drop is tested before it leaves our facility. Quality is non-negotiable.' },
  { icon: Users, title: 'Community Driven', desc: 'We\'re a local BC company — your neighbours, not a faceless corporation.' },
  { icon: Shield, title: 'Reliability', desc: 'We\'ve delivered over 50,000 jugs with a 99.6% on-time delivery rate.' },
  { icon: Heart, title: 'Customer Love', desc: '4.9 stars from over 800 verified reviews across Google and Facebook.' },
]

interface TeamMember { id: string; name: string; role: string; bio: string; initials: string; color: string; sort_order: number }
interface SiteContent { key: string; value: string }

export default function AboutPage() {
  const [team, setTeam] = useState<TeamMember[]>([])
  const [content, setContent] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      const [teamRes, contentRes] = await Promise.all([
        supabase.from('about_team').select('*').order('sort_order'),
        supabase.from('site_content').select('key, value'),
      ])
      if (teamRes.data) setTeam(teamRes.data)
      if (contentRes.data) {
        const map: Record<string, string> = {}
        contentRes.data.forEach((row: SiteContent) => { map[row.key] = row.value })
        setContent(map)
      }
      setLoading(false)
    }
    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen">
        <div className="h-64 hero-gradient animate-pulse" />
        <div className="max-w-7xl mx-auto px-4 py-20 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[0, 1].map(i => <div key={i} className="h-40 bg-[#e0f7fa] rounded-3xl animate-pulse" />)}
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {[0, 1, 2, 3].map(i => <div key={i} className="h-48 bg-[#e0f7fa] rounded-3xl animate-pulse" />)}
          </div>
        </div>
      </div>
    )
  }

  const heroSubtitle = content['about_hero_subtitle'] || 'Since 2010, TajWater has been Metro Vancouver\'s trusted source for clean, fresh water. Family-owned, community-focused.'
  const mission = content['about_mission'] || 'To make clean, pure water accessible and affordable for every household and business in Metro Vancouver — delivered reliably, sustainably, and with genuine care.'
  const vision = content['about_vision'] || 'A BC where no family goes without access to quality drinking water. We\'re building the most trusted water delivery network in the province, one delivery at a time.'

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
            <span className="inline-block px-4 py-1.5 rounded-full bg-white/20 text-white text-sm font-semibold mb-4">Our Story</span>
            <h1 className="text-3xl sm:text-5xl font-extrabold text-white mb-5">
              Born in BC, Built for<br /><span className="gradient-text-light">Pure Hydration</span>
            </h1>
            <p className="text-[#b3e5fc] text-xl max-w-2xl mx-auto">{heroSubtitle}</p>
          </motion.div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-20 bg-[#f0f9ff]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[
              { label: 'Our Mission', text: mission, color: '#0097a7', bg: '#e0f7fa' },
              { label: 'Our Vision', text: vision, color: '#1565c0', bg: '#e3f2fd' },
            ].map((item, i) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-70px' }}
                transition={{ delay: i * 0.15 }}
                className="bg-white rounded-3xl p-8 border border-[#cce7f0] shadow-sm"
              >
                <span className="inline-block px-3 py-1 rounded-full text-xs font-bold text-white mb-4" style={{ background: item.color }}>
                  {item.label}
                </span>
                <p className="text-[#0c2340] text-lg leading-relaxed">{item.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-70px' }} className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0c2340]">Our <span className="gradient-text">Journey</span></h2>
          </motion.div>
          <div className="relative">
            <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-[#0097a7] to-[#1565c0]" />
            <div className="space-y-8">
              {timeline.map((item, i) => (
                <motion.div
                  key={item.year}
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: '-70px' }}
                  transition={{ delay: i * 0.1 }}
                  className="flex gap-6 pl-4"
                >
                  <div className="relative shrink-0">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#0097a7] to-[#1565c0] flex items-center justify-center text-white text-xs font-bold shadow-lg ring-4 ring-white">
                      {i + 1}
                    </div>
                  </div>
                  <div className="bg-[#f0f9ff] rounded-2xl p-5 flex-1 border border-[#cce7f0]">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#0097a7] text-white">{item.year}</span>
                      <h3 className="font-bold text-[#0c2340]">{item.title}</h3>
                    </div>
                    <p className="text-[#4a7fa5] text-sm">{item.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-20 bg-[#f0f9ff]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-70px' }} className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0c2340] mb-3">Meet the <span className="gradient-text">Team</span></h2>
            <p className="text-[#4a7fa5]">The people behind every perfect delivery</p>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {team.map((member, i) => (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-70px' }}
                transition={{ delay: i * 0.1 }}
                className="water-card bg-white rounded-3xl p-6 text-center border border-[#cce7f0]"
              >
                <div
                  className="w-20 h-20 rounded-2xl flex items-center justify-center text-white font-bold text-xl mx-auto mb-4 shadow-lg"
                  style={{ background: `linear-gradient(135deg, ${member.color}, ${member.color}99)` }}
                >
                  {member.initials}
                </div>
                <h3 className="font-bold text-[#0c2340]">{member.name}</h3>
                <p className="text-xs font-medium mb-3" style={{ color: member.color }}>{member.role}</p>
                <p className="text-[#4a7fa5] text-xs leading-relaxed">{member.bio}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Certifications */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-70px' }} className="text-center mb-12">
            <h2 className="text-3xl font-extrabold text-[#0c2340] mb-3">Certifications & <span className="gradient-text">Standards</span></h2>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {certs.map((cert, i) => {
              const Icon = cert.icon
              return (
                <motion.div
                  key={cert.label}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-70px' }}
                  transition={{ delay: i * 0.1 }}
                  className="flex gap-4 p-5 bg-[#f0f9ff] rounded-2xl border border-[#cce7f0]"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#e0f7fa] flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-[#0097a7]" />
                  </div>
                  <div>
                    <p className="font-bold text-[#0c2340] text-sm">{cert.label}</p>
                    <p className="text-xs text-[#4a7fa5] mt-0.5">{cert.desc}</p>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 bg-gradient-to-br from-[#006064] to-[#1565c0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-70px' }} className="text-center mb-12">
            <h2 className="text-3xl font-extrabold text-white mb-3">Why Choose <span className="gradient-text-light">TajWater</span></h2>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((val, i) => {
              const Icon = val.icon
              return (
                <motion.div
                  key={val.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-70px' }}
                  transition={{ delay: i * 0.1 }}
                  className="glass-dark rounded-2xl p-6 text-center"
                >
                  <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center mx-auto mb-4">
                    <Icon className="w-6 h-6 text-[#00bcd4]" />
                  </div>
                  <h3 className="font-bold text-white mb-2">{val.title}</h3>
                  <p className="text-[#b3e5fc] text-sm">{val.desc}</p>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>
    </div>
  )
}

import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const { email, source = 'homepage', notes } = await request.json()

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }

    const db = createServerClient()

    const { error } = await db
      .from('newsletter_subscribers')
      .upsert(
        { email: email.toLowerCase().trim(), source, notes: notes ?? null, active: true },
        { onConflict: 'email', ignoreDuplicates: false }
      )

    if (error) {
      console.error('Newsletter subscribe error:', error)
      return NextResponse.json({ error: 'Failed to subscribe' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Newsletter route error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

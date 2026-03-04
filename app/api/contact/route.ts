import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function POST(req: Request) {
  const { name, email, phone, subject, message } = await req.json()

  if (!name || !email || !subject || !message) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const db = createServerClient()

  // Format message with contact info header so admin sees who sent it
  const fullMessage = `**From:** ${name}\n**Email:** ${email}${phone ? `\n**Phone:** ${phone}` : ''}\n\n---\n\n${message}`

  // Try to find user_id by email (search profiles via auth)
  // We search auth.users via service-role — profiles doesn't store email directly
  let userId: string | null = null
  try {
    const { data: users } = await db.auth.admin.listUsers()
    const match = users?.users?.find((u) => u.email === email)
    if (match) userId = match.id
  } catch {
    // If lookup fails, just leave user_id null
  }

  const { error } = await db
    .from('tickets')
    .insert({
      user_id: userId,
      subject,
      message: fullMessage,
      status: 'open',
    })

  if (error) {
    console.error('Contact ticket insert error:', error)
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

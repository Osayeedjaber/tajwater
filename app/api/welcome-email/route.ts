import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { Resend } from 'resend'
import { buildWelcomeEmail } from '@/lib/email'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { userId, email, name } = await req.json()
    if (!userId || !email) {
      return NextResponse.json({ error: 'userId and email are required' }, { status: 400 })
    }

    const db = createServerClient()

    // Check notification preference
    const { data: notifRow } = await db
      .from('site_content')
      .select('value')
      .eq('key', 'notif_welcome')
      .maybeSingle()
    if (notifRow?.value === 'false') {
      return NextResponse.json({ skipped: true, reason: 'notification disabled' })
    }

    // Avoid duplicate welcome emails (check email_logs)
    const { data: existing } = await db
      .from('email_logs')
      .select('id')
      .eq('user_id', userId)
      .eq('email_type', 'welcome')
      .maybeSingle()
    if (existing) {
      return NextResponse.json({ skipped: true, reason: 'already sent' })
    }

    const resend = new Resend(process.env.RESEND_API_KEY)
    const fromEmail = process.env.RESEND_FROM_EMAIL ?? 'TajWater <orders@tajwater.ca>'
    const customerName = name || 'there'

    // Fetch email template overrides from site_content
    const { data: tmplRows } = await db
      .from('site_content')
      .select('key, value')
      .in('key', ['email_welcome_subject', 'email_welcome_message'])
    const tmpl: Record<string, string> = {}
    for (const r of (tmplRows ?? [])) tmpl[r.key] = r.value

    const html = buildWelcomeEmail({
      customerName,
      message: tmpl['email_welcome_message'] || undefined,
    })
    const subject = tmpl['email_welcome_subject'] || 'Welcome to TajWater! 💧'

    let resendId: string | undefined
    let emailStatus = 'sent'
    let emailError: string | undefined
    try {
      const result = await resend.emails.send({ from: fromEmail, to: email, subject, html })
      resendId = result.data?.id
    } catch (e) {
      emailStatus = 'failed'
      emailError = String(e)
    }

    await db.from('email_logs').insert({
      user_id:         userId,
      recipient_email: email,
      email_type:      'welcome',
      subject,
      status:          emailStatus,
      resend_id:       resendId ?? null,
      error_message:   emailError ?? null,
      sent_by:         null,
      metadata:        null,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('welcome-email error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

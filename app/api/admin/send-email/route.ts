import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createServerClient } from '@/lib/supabase'
import { buildTicketReplyEmail } from '@/lib/email'
import { rateLimit } from '@/lib/ratelimit'

export async function POST(req: NextRequest) {
  // Rate limit: max 20 email sends per IP per minute
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (!rateLimit(`send-email:${ip}`, 20, 60_000)) {
    return NextResponse.json({ error: 'Too many requests. Please wait a moment.' }, { status: 429 })
  }

  try {
    const payload = await req.json()

    // Support both old format (admin compose) and new internal format (ticket reply)
    const {
      user_id, recipient_email, recipient_name, subject, body, sent_by,
      // Internal call format
      to, ticketSubject, customerName, useTicketTemplate,
    } = payload

    const toEmail = recipient_email ?? to
    if (!toEmail || !subject || !body) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const db = createServerClient()

    // Only verify admin for external compose calls (sent_by present)
    if (sent_by) {
      const { data: admin } = await db.from('admin_users').select('email').eq('email', sent_by).single()
      if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const resend    = new Resend(process.env.RESEND_API_KEY)
    const fromEmail = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev'

    const html = useTicketTemplate
      ? buildTicketReplyEmail({ ticketSubject: ticketSubject ?? subject, adminReply: body, customerName: customerName ?? recipient_name ?? 'Customer' })
      : `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#0c2340">
        <div style="background:linear-gradient(135deg,#0097a7,#1565c0);padding:32px;border-radius:16px 16px 0 0;text-align:center">
          <h1 style="color:white;margin:0;font-size:24px">TajWater</h1>
        </div>
        <div style="background:#ffffff;padding:32px;border:1px solid #cce7f0;border-radius:0 0 16px 16px">
          ${recipient_name ? `<p style="margin:0 0 16px">Hi <strong>${recipient_name}</strong>,</p>` : ''}
          <div style="line-height:1.7;color:#334155">${body.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br/>')}</div>
          <hr style="border:none;border-top:1px solid #e0f7fa;margin:24px 0"/>
          <p style="font-size:12px;color:#4a7fa5;margin:0">
            This message was sent by the TajWater team. If you have questions, reply to this email or call us.
          </p>
        </div>
      </div>
    `

    let resendId: string | undefined
    let emailStatus = 'sent'
    let emailError: string | undefined

    try {
      const result = await resend.emails.send({ from: fromEmail, to: toEmail, subject, html })
      resendId = result.data?.id
    } catch (e) {
      emailStatus = 'failed'
      emailError  = String(e)
    }

    await db.from('email_logs').insert({
      user_id:         user_id ?? null,
      recipient_email: toEmail,
      email_type:      'admin_custom',
      subject,
      status:          emailStatus,
      resend_id:       resendId ?? null,
      error_message:   emailError ?? null,
      sent_by,
      metadata:        null,
    })

    if (emailStatus === 'failed') {
      return NextResponse.json({ error: emailError ?? 'Failed to send email' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error'
    console.error('admin/send-email error:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

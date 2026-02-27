import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createServerClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { user_id, recipient_email, recipient_name, subject, body, sent_by } = await req.json()

    if (!recipient_email || !subject || !body || !sent_by) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const db = createServerClient()

    // Verify sender is a real admin
    const { data: admin } = await db
      .from('admin_users')
      .select('email')
      .eq('email', sent_by)
      .single()

    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const resend     = new Resend(process.env.RESEND_API_KEY)
    const fromEmail  = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev'

    const html = `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#0c2340">
        <div style="background:linear-gradient(135deg,#0097a7,#1565c0);padding:32px;border-radius:16px 16px 0 0;text-align:center">
          <h1 style="color:white;margin:0;font-size:24px">TajWater</h1>
        </div>
        <div style="background:#ffffff;padding:32px;border:1px solid #cce7f0;border-radius:0 0 16px 16px">
          ${recipient_name ? `<p style="margin:0 0 16px">Hi <strong>${recipient_name}</strong>,</p>` : ''}
          <div style="line-height:1.7;color:#334155">${body.replace(/\n/g, '<br/>')}</div>
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
      const result = await resend.emails.send({ from: fromEmail, to: recipient_email, subject, html })
      resendId = result.data?.id
    } catch (e) {
      emailStatus = 'failed'
      emailError  = String(e)
    }

    await db.from('email_logs').insert({
      user_id:         user_id ?? null,
      recipient_email,
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

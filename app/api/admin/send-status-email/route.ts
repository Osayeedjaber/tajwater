import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient as createSsrClient } from '@supabase/ssr'
import { createServerClient } from '@/lib/supabase'
import { resend } from '@/lib/email'
import { buildOutForDeliveryEmail, buildDeliveredEmail } from '@/lib/email'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const cookieStore = await cookies()
    const ssrClient = createSsrClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: () => {},
        },
      }
    )
    const { data: { session } } = await ssrClient.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const db = createServerClient()
    const { data: adminRow } = await db
      .from('admin_users')
      .select('id')
      .eq('email', session.user.email)
      .single()
    if (!adminRow) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { orderId, newStatus } = await request.json()
    if (!orderId || !newStatus) return NextResponse.json({ error: 'orderId and newStatus required' }, { status: 400 })

    // Check notification preference
    const notifKey = newStatus === 'out_for_delivery' ? 'notif_delivery_reminder' : 'notif_delivery_completed'
    const { data: notifRow } = await db.from('site_content').select('value').eq('key', notifKey).single()
    if (notifRow?.value === 'false') {
      return NextResponse.json({ skipped: true, reason: 'notification disabled' })
    }

    // Fetch order + customer info
    const { data: order } = await db
      .from('orders')
      .select('id, customer_name, customer_email: profiles!inner(email), zone_id, zones(name)')
      .eq('id', orderId)
      .single()

    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

    const customerName = (order as { customer_name?: string }).customer_name ?? 'Customer'
    const customerEmail = (order as unknown as { profiles?: { email: string } | null })
    // Fallback: fetch profile email via order directly
    const { data: fullOrder } = await db
      .from('orders')
      .select('id, customer_name, zone_id, user_id, zones(name)')
      .eq('id', orderId)
      .single()

    if (!fullOrder?.user_id) return NextResponse.json({ skipped: true, reason: 'no user_id' })

    const { data: profile } = await db
      .from('profiles')
      .select('email, name')
      .eq('id', fullOrder.user_id)
      .single()

    if (!profile?.email) return NextResponse.json({ skipped: true, reason: 'no customer email' })

    const name = profile.name || customerName
    const zoneName = Array.isArray((fullOrder as unknown as { zones?: { name: string }[] }).zones)
      ? ((fullOrder as unknown as { zones: { name: string }[] }).zones[0]?.name ?? null)
      : ((fullOrder as unknown as { zones: { name: string } | null }).zones?.name ?? null)

    let html: string
    let subject: string

    if (newStatus === 'out_for_delivery') {
      html = buildOutForDeliveryEmail({ orderId, customerName: name, zone: zoneName })
      subject = `Your TajWater order is on its way!`
    } else if (newStatus === 'delivered') {
      html = buildDeliveredEmail({ orderId, customerName: name })
      subject = `Your TajWater order has been delivered!`
    } else {
      return NextResponse.json({ skipped: true, reason: 'status not handled' })
    }

    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? 'TajWater <orders@tajwater.ca>',
      to: profile.email,
      subject,
      html,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('send-status-email error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

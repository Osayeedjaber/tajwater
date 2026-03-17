import { NextRequest, NextResponse } from 'next/server'
import { getSquareClient } from '@/lib/square'
import { createServerClient } from '@/lib/supabase'
import { createServerClient as createSsrClient } from '@supabase/ssr'

export async function POST(req: NextRequest) {
  // Verify admin session
  const ssrClient = createSsrClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: () => {},
      },
    }
  )
  const { data: { session } } = await ssrClient.auth.getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = createServerClient()

  const { data: adminRow } = await db
    .from('admin_users')
    .select('id, role')
    .eq('email', session.user.email ?? '')
    .maybeSingle()

  if (!adminRow) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { order_id, amount } = await req.json()
  if (!order_id) {
    return NextResponse.json({ error: 'order_id is required' }, { status: 400 })
  }

  // Fetch order
  const { data: order, error: orderError } = await db
    .from('orders')
    .select('id, total, square_payment_id, payment_status')
    .eq('id', order_id)
    .single()

  if (orderError || !order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  if (!order.square_payment_id) {
    return NextResponse.json({ error: 'No Square payment found for this order' }, { status: 400 })
  }

  if (order.payment_status === 'refunded') {
    return NextResponse.json({ error: 'Order already refunded' }, { status: 400 })
  }

  const refundAmount = amount ?? order.total
  const refundCents = Math.round(refundAmount * 100)

  try {
    const square = getSquareClient()
    await square.refundsApi.refundPayment({
      paymentId: order.square_payment_id,
      idempotencyKey: crypto.randomUUID(),
      amountMoney: {
        amount: BigInt(refundCents),
        currency: 'CAD',
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Square refund failed'
    console.error('Square refund error:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }

  // Update order
  await db
    .from('orders')
    .update({
      payment_status: 'refunded',
      status: 'cancelled',
      refund_amount: refundAmount,
    })
    .eq('id', order_id)

  // Log to audit_logs
  await db.from('audit_logs').insert({
    admin_email: session.user.email,
    action: 'refund',
    entity_type: 'order',
    entity_id: order_id,
    details: { refund_amount: refundAmount, order_total: order.total },
  })

  return NextResponse.json({ success: true, refund_amount: refundAmount })
}

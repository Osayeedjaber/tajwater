import { NextRequest, NextResponse } from 'next/server'
import { getSquareClient } from '@/lib/square'
import { createServerClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// Creates a new Square payment for an existing unpaid order
export async function POST(req: NextRequest) {
  try {
    const { order_id, user_id, sourceId } = await req.json()

    if (!order_id) {
      return NextResponse.json({ error: 'order_id is required' }, { status: 400 })
    }
    if (!sourceId) {
      return NextResponse.json({ error: 'Payment source token is required' }, { status: 400 })
    }

    const db = createServerClient()

    // Fetch the order — verify it belongs to this user and is unpaid
    const { data: order, error: fetchError } = await db
      .from('orders')
      .select('id, total, user_id, payment_status, customer_name, customer_phone, delivery_address')
      .eq('id', order_id)
      .single()

    if (fetchError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (order.user_id !== user_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    if (order.payment_status === 'paid') {
      return NextResponse.json({ error: 'Order is already paid' }, { status: 400 })
    }

    // Create a Square payment with the token
    const square = getSquareClient()
    const amountCents = Math.round(Number(order.total) * 100)

    const { result } = await square.paymentsApi.createPayment({
      sourceId,
      idempotencyKey: crypto.randomUUID(),
      amountMoney: {
        amount: BigInt(amountCents),
        currency: 'CAD',
      },
      locationId: process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID!,
      referenceId: order.id,
      note: `TajWater retry payment for order ${order.id.slice(-8).toUpperCase()}`,
    })

    const payment = result.payment
    if (!payment || (payment.status !== 'COMPLETED' && payment.status !== 'APPROVED')) {
      return NextResponse.json({ error: 'Payment was declined. Please try again.' }, { status: 400 })
    }

    // Update the order with the new Square payment ID
    await db
      .from('orders')
      .update({
        square_payment_id: payment.id,
        payment_status: 'paid',
        status: 'processing',
      })
      .eq('id', order.id)

    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create payment'
    console.error('retry-payment error:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

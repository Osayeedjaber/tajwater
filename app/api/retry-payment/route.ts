import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createServerClient } from '@/lib/supabase'

// Creates a new Stripe PaymentIntent for an existing unpaid order
export async function POST(req: NextRequest) {
  try {
    const { order_id, user_id } = await req.json()

    if (!order_id) {
      return NextResponse.json({ error: 'order_id is required' }, { status: 400 })
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

    // Create a fresh PaymentIntent for the existing order amount
    const paymentIntent = await stripe.paymentIntents.create({
      amount:   Math.round(Number(order.total) * 100),
      currency: 'cad',
      automatic_payment_methods: { enabled: true },
      metadata: {
        order_id:       order.id,
        customer_name:  order.customer_name  ?? '',
        customer_phone: order.customer_phone ?? '',
        retry:          'true',
      },
      description: `TajWater retry payment for order ${order.id.slice(-8).toUpperCase()}`,
    })

    // Update the order's stripe_payment_intent_id so the webhook can reconcile
    await db
      .from('orders')
      .update({ stripe_payment_intent_id: paymentIntent.id })
      .eq('id', order.id)

    return NextResponse.json({ clientSecret: paymentIntent.client_secret })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create payment'
    console.error('retry-payment error:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

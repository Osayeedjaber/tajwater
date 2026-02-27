import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createServerClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { amount, items, address, userId } = await req.json()

    if (!amount || typeof amount !== 'number' || amount < 0.50) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
    }

    const db = createServerClient()

    // 1. Resolve zone UUID from zone name
    let zoneId: string | null = null
    if (address?.zone) {
      const { data: zoneRow } = await db
        .from('zones')
        .select('id')
        .eq('name', address.zone)
        .single()
      zoneId = zoneRow?.id ?? null
    }

    // 2. Build delivery address string
    const deliveryAddress = address
      ? [address.street, address.zone, `BC ${address.postal}`].filter(Boolean).join(', ')
      : null

    // 3. Create the order in Supabase (pending payment)
    const { data: order, error: orderError } = await db
      .from('orders')
      .insert({
        user_id:        userId ?? null,
        status:         'pending',
        payment_status: 'pending',
        total:          amount,
        delivery_address: deliveryAddress,
        zone_id:        zoneId,
        customer_name:  address?.name  ?? null,
        customer_phone: address?.phone ?? null,
      })
      .select('id')
      .single()

    if (orderError || !order) {
      console.error('Order creation error:', orderError)
      return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
    }

    // 4. Create order_items
    if (Array.isArray(items) && items.length > 0) {
      const orderItems = items.map((item: { product_id: string; quantity: number; price: number }) => ({
        order_id:   order.id,
        product_id: item.product_id,
        quantity:   item.quantity,
        price:      item.price,
      }))
      const { error: itemsError } = await db.from('order_items').insert(orderItems)
      if (itemsError) console.error('Order items error:', itemsError)
    }

    // 5. Create Stripe PaymentIntent with order_id in metadata
    const paymentIntent = await stripe.paymentIntents.create({
      amount:   Math.round(amount * 100),
      currency: 'cad',
      automatic_payment_methods: { enabled: true },
      metadata: {
        order_id:       order.id,
        customer_name:  address?.name  ?? '',
        customer_phone: address?.phone ?? '',
        customer_email: address?.email ?? '',
        zone:           address?.zone  ?? '',
      },
      description: `TajWater order ${order.id.slice(-8).toUpperCase()}`,
    })

    // 6. Store the PI id on the order so we can reconcile refunds later
    await db
      .from('orders')
      .update({ stripe_payment_intent_id: paymentIntent.id })
      .eq('id', order.id)

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      orderId:      order.id,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create payment'
    console.error('create-payment-intent error:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

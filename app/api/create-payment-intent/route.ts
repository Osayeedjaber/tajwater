import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createServerClient } from '@/lib/supabase'
import { rateLimit } from '@/lib/ratelimit'

export async function POST(req: NextRequest) {
  // Rate limit: max 10 payment intent creations per IP per minute
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (!rateLimit(`create-payment-intent:${ip}`, 10, 60_000)) {
    return NextResponse.json({ error: 'Too many requests. Please wait a moment.' }, { status: 429 })
  }

  try {
    const { amount, items, address, userId, notes, discountCodeId, discountAmount: clientDiscountAmount } = await req.json()
    type CartItem = { product_id: string; quantity: number; subscribeFrequency?: 'weekly' | 'biweekly' | 'monthly' }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'No items provided' }, { status: 400 })
    }

    const db = createServerClient()

    // 1. Resolve zone and fetch delivery fee from DB (not from client)
    let zoneId: string | null = null
    let deliveryFee = 0
    if (address?.zone) {
      const { data: zoneRow } = await db
        .from('zones')
        .select('id, delivery_fee')
        .eq('name', address.zone)
        .single()
      zoneId = zoneRow?.id ?? null
      deliveryFee = zoneRow?.delivery_fee ?? 0
    }

    // 2. Fetch fresh product prices from DB — client-supplied prices are untrusted
    const productIds = items.map((i: { product_id: string }) => i.product_id)
    const { data: products, error: productError } = await db
      .from('products')
      .select('id, price, active')
      .in('id', productIds)

    if (productError || !products) {
      return NextResponse.json({ error: 'Failed to fetch product prices' }, { status: 500 })
    }

    const priceMap: Record<string, number> = {}
    for (const p of products) {
      if (!p.active) {
        return NextResponse.json({ error: `Product is no longer available` }, { status: 400 })
      }
      priceMap[p.id] = p.price
    }

    // 3. Recalculate subtotal server-side (apply 10% discount for subscribe items)
    const SUBSCRIBE_DISCOUNT = 0.10
    let subtotal = 0
    for (const item of items as CartItem[]) {
      const price = priceMap[item.product_id]
      if (price === undefined) {
        return NextResponse.json({ error: 'Invalid product in cart' }, { status: 400 })
      }
      const unitPrice = item.subscribeFrequency ? price * (1 - SUBSCRIBE_DISCOUNT) : price
      subtotal += unitPrice * item.quantity
    }

    // 4. Validate discount code server-side if provided
    let discountAmt = 0
    let validatedDiscountCodeId: string | null = null
    if (discountCodeId) {
      const { data: dc } = await db
        .from('discount_codes')
        .select('id, type, value, min_order_amount, max_uses, uses_count, expires_at, active')
        .eq('id', discountCodeId)
        .single()
      if (
        dc && dc.active &&
        !(dc.expires_at && new Date(dc.expires_at) < new Date()) &&
        !(dc.max_uses !== null && dc.uses_count >= dc.max_uses) &&
        !(dc.min_order_amount > 0 && subtotal < dc.min_order_amount)
      ) {
        discountAmt = dc.type === 'percent'
          ? Math.round(subtotal * (dc.value / 100) * 100) / 100
          : Math.min(dc.value, subtotal)
        validatedDiscountCodeId = dc.id
      }
    }

    // 5. BC tax: GST 5% + PST 7% = 12% (applied on discounted subtotal)
    const discountedSubtotal = Math.max(0, subtotal - discountAmt)
    const taxAmount = Math.round(discountedSubtotal * 0.12 * 100) / 100
    const serverTotal = Math.round((discountedSubtotal + deliveryFee + taxAmount) * 100) / 100

    // 6. Reject if client amount differs by more than $0.01
    if (typeof amount === 'number' && Math.abs(amount - serverTotal) > 0.01) {
      return NextResponse.json({ error: 'Price mismatch — please refresh and try again' }, { status: 400 })
    }

    if (serverTotal < 0.50) {
      return NextResponse.json({ error: 'Order total is too low' }, { status: 400 })
    }

    // 7. Build delivery address string
    const deliveryAddress = address
      ? [address.street, address.zone, `BC ${address.postal}`].filter(Boolean).join(', ')
      : null

    // 8. Create the order in Supabase (pending payment)
    const { data: order, error: orderError } = await db
      .from('orders')
      .insert({
        user_id:          userId ?? null,
        status:           'pending',
        payment_status:   'pending',
        total:            serverTotal,
        delivery_address: deliveryAddress,
        zone_id:          zoneId,
        customer_name:    address?.name  ?? null,
        customer_phone:    address?.phone ?? null,
        notes:             notes ?? null,
        tax_amount:        taxAmount,
        discount_code_id:  validatedDiscountCodeId,
        discount_amount:   discountAmt,
      })
      .select('id')
      .single()

    if (orderError || !order) {
      console.error('Order creation error:', orderError)
      return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
    }

    // 9. Create order_items using server-validated prices
    const orderItems = (items as CartItem[]).map(item => ({
      order_id:   order.id,
      product_id: item.product_id,
      quantity:   item.quantity,
      price:      item.subscribeFrequency
        ? Math.round(priceMap[item.product_id] * (1 - SUBSCRIBE_DISCOUNT) * 100) / 100
        : priceMap[item.product_id],
    }))
    const { error: itemsError } = await db.from('order_items').insert(orderItems)
    if (itemsError) console.error('Order items error:', itemsError)

    // 9b. Create subscription rows for any subscribe-frequency items
    if (userId) {
      const subscribeItems = (items as CartItem[]).filter(i => i.subscribeFrequency)
      if (subscribeItems.length > 0) {
        const now = new Date()
        const subRows = subscribeItems.map(item => {
          const freq = item.subscribeFrequency!
          const nextDelivery = new Date(now)
          nextDelivery.setDate(now.getDate() + (freq === 'weekly' ? 7 : freq === 'biweekly' ? 14 : 30))
          return {
            user_id:       userId,
            product_id:    item.product_id,
            frequency:     freq,
            quantity:      item.quantity,
            zone_id:       zoneId,
            price:         Math.round(priceMap[item.product_id] * (1 - SUBSCRIBE_DISCOUNT) * 100) / 100,
            status:        'active',
            next_delivery: nextDelivery.toISOString(),
          }
        })
        const { error: subError } = await db.from('subscriptions').insert(subRows)
        if (subError) console.error('Subscription creation error:', subError)
      }
    }

    // 10. Create Stripe PaymentIntent with order_id in metadata
    const paymentIntent = await stripe.paymentIntents.create({
      amount:   Math.round(serverTotal * 100),
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

    // 11. Store the PI id on the order so we can reconcile refunds later
    await db
      .from('orders')
      .update({ stripe_payment_intent_id: paymentIntent.id })
      .eq('id', order.id)

    return NextResponse.json({
      clientSecret:   paymentIntent.client_secret,
      orderId:        order.id,
      serverTotal,
      taxAmount,
      deliveryFee,
      discountAmount: discountAmt,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create payment'
    console.error('create-payment-intent error:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

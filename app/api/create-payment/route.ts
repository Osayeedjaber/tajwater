import { NextRequest, NextResponse } from 'next/server'
import { getSquareClient } from '@/lib/square'
import { createServerClient } from '@/lib/supabase'
import { rateLimit } from '@/lib/ratelimit'
import { Resend } from 'resend'
import { buildOrderConfirmationEmail } from '@/lib/email'
import { generateInvoicePDF, type InvoiceOrderData } from '@/lib/generateInvoice'

export async function POST(req: NextRequest) {
  // Rate limit: max 10 payment creations per IP per minute
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (!rateLimit(`create-payment:${ip}`, 10, 60_000)) {
    return NextResponse.json({ error: 'Too many requests. Please wait a moment.' }, { status: 429 })
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { amount, items, address, userId, notes, discountCodeId, discountAmount: clientDiscountAmount, sourceId } = await req.json()
    type CartItem = { product_id: string; quantity: number; subscribeFrequency?: 'weekly' | 'biweekly' | 'monthly' }

    if (!sourceId) {
      return NextResponse.json({ error: 'Payment source token is required' }, { status: 400 })
    }

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

    // 10. Create Square payment with the nonce token
    const square = getSquareClient()
    const amountCents = Math.round(serverTotal * 100)
    const idempotencyKey = crypto.randomUUID()

    const { result } = await square.paymentsApi.createPayment({
      sourceId,
      idempotencyKey,
      amountMoney: {
        amount: BigInt(amountCents),
        currency: 'CAD',
      },
      locationId: process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID!,
      referenceId: order.id,
      note: `TajWater order ${order.id.slice(-8).toUpperCase()}`,
    })

    const payment = result.payment
    if (!payment || (payment.status !== 'COMPLETED' && payment.status !== 'APPROVED')) {
      // Payment failed — update order status
      await db.from('orders').update({ payment_status: 'failed' }).eq('id', order.id)
      return NextResponse.json({ error: 'Payment was declined. Please try again.' }, { status: 400 })
    }

    // 11. Store the Square payment ID on the order and update status
    await db
      .from('orders')
      .update({
        square_payment_id: payment.id,
        payment_status: 'paid',
        status: 'processing',
      })
      .eq('id', order.id)

    // 12. Increment discount code uses_count if applicable
    if (validatedDiscountCodeId) {
      await db.rpc('increment_discount_uses', { code_id: validatedDiscountCodeId })
    }

    // 13. Decrement stock for each item
    const { data: stockItems } = await db.from('order_items').select('product_id, quantity').eq('order_id', order.id)
    if (stockItems) {
      await Promise.all(stockItems.map((item: { product_id: string; quantity: number }) =>
        db.rpc('decrement_stock', { product_id: item.product_id, amount: item.quantity })
      ))
    }

    // 14. Send order confirmation email with invoice PDF
    try {
      const { data: fullOrder } = await db
        .from('orders')
        .select('id, total, delivery_address, customer_name, user_id, tax_amount, discount_amount, zones(name), order_items(quantity, price, products(name)), profiles:user_id(name, email)')
        .eq('id', order.id)
        .single()

      if (fullOrder) {
        const profile  = fullOrder.profiles as { name?: string; email?: string } | null
        const toEmail  = profile?.email ?? address?.email ?? null

        // Check notification preference + fetch email templates
        const { data: contentRows } = await db.from('site_content').select('key, value')
          .in('key', ['notif_order_confirmation', 'email_confirmation_subject', 'email_confirmation_greeting'])
        const contentMap: Record<string, string> = {}
        for (const r of (contentRows ?? [])) contentMap[r.key] = r.value
        const confirmNotifEnabled = contentMap['notif_order_confirmation'] !== 'false'

        if (toEmail && confirmNotifEnabled) {
          const resend    = new Resend(process.env.RESEND_API_KEY)
          const fromEmail = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev'
          type RawItem    = { quantity: number; price: number; products: { name: string } | null }
          const subject   = contentMap['email_confirmation_subject'] || `Your TajWater Order #${fullOrder.id.slice(0, 8).toUpperCase()} is Confirmed`
          const html = buildOrderConfirmationEmail({
            id:              fullOrder.id,
            customerName:    profile?.name ?? fullOrder.customer_name ?? 'Valued Customer',
            items:           ((fullOrder.order_items ?? []) as unknown as RawItem[]).map(i => ({ name: i.products?.name ?? 'Product', qty: i.quantity, price: i.price })),
            total:           fullOrder.total,
            deliveryAddress: fullOrder.delivery_address ?? null,
            zone:            (fullOrder.zones as { name?: string } | null)?.name ?? null,
            greeting:        contentMap['email_confirmation_greeting'] || undefined,
            taxAmount:       (fullOrder as { tax_amount?: number }).tax_amount ?? undefined,
            discountAmount:  (fullOrder as { discount_amount?: number }).discount_amount ?? undefined,
          })

          // Generate invoice PDF attachment
          let pdfAttachment: { filename: string; content: string } | undefined
          try {
            const invoiceCompanyInfo = {
              name:    'TajWater',
              address: 'Metro Vancouver, BC, Canada',
              phone:   process.env.NEXT_PUBLIC_COMPANY_PHONE ?? '',
              email:   process.env.NEXT_PUBLIC_COMPANY_EMAIL ?? '',
              website: process.env.NEXT_PUBLIC_SITE_URL ?? 'tajwater.ca',
            }
            const invoiceOrder: InvoiceOrderData = {
              id:               fullOrder.id,
              total:            fullOrder.total,
              payment_status:   'paid',
              delivery_address: fullOrder.delivery_address ?? null,
              customer_name:    fullOrder.customer_name ?? null,
              customer_phone:   null,
              created_at:       new Date().toISOString(),
              zones:            Array.isArray(fullOrder.zones) ? (fullOrder.zones[0] ?? null) : (fullOrder.zones as { name: string } | null) ?? null,
              order_items:      ((fullOrder.order_items ?? []) as unknown as RawItem[]).map(i => ({
                id:       crypto.randomUUID(),
                quantity: i.quantity,
                price:    i.price,
                products: i.products ? { name: i.products.name } : null,
              })),
              profiles:         profile ? { name: profile.name ?? '', email: profile.email ?? '' } : null,
              tax_amount:       (fullOrder as { tax_amount?: number }).tax_amount ?? null,
              discount_amount:  (fullOrder as { discount_amount?: number }).discount_amount ?? null,
            }
            const pdfBuf = await generateInvoicePDF(invoiceOrder, invoiceCompanyInfo)
            pdfAttachment = {
              filename: `INV-${fullOrder.id.slice(-8).toUpperCase()}.pdf`,
              content:  pdfBuf.toString('base64'),
            }
          } catch (pdfErr) {
            console.error('Invoice PDF generation failed:', pdfErr)
          }

          let resendId: string | undefined
          let emailStatus = 'sent'
          let emailError: string | undefined
          try {
            const emailResult = await resend.emails.send({
              from:        fromEmail,
              to:          toEmail,
              subject,
              html,
              attachments: pdfAttachment ? [{ filename: pdfAttachment.filename, content: pdfAttachment.content }] : undefined,
            })
            resendId = emailResult.data?.id
          } catch (e) {
            emailStatus = 'failed'
            emailError  = String(e)
          }

          await db.from('email_logs').insert({
            user_id:         fullOrder.user_id ?? null,
            recipient_email: toEmail,
            email_type:      'order_confirmation',
            subject,
            status:          emailStatus,
            resend_id:       resendId ?? null,
            error_message:   emailError ?? null,
            sent_by:         null,
            metadata:        { order_id: fullOrder.id },
          })
        }
      }
    } catch (emailErr) {
      // Email errors should not fail the payment
      console.error('Post-payment email error:', emailErr)
    }

    return NextResponse.json({
      success:        true,
      orderId:        order.id,
      serverTotal,
      taxAmount,
      deliveryFee,
      discountAmount: discountAmt,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create payment'
    console.error('create-payment error:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

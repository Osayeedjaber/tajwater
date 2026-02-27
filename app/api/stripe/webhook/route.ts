import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { stripe } from '@/lib/stripe'
import { createServerClient } from '@/lib/supabase'
import { Resend } from 'resend'
import { buildOrderConfirmationEmail } from '@/lib/email'
import { generateInvoicePDF, type InvoiceOrderData } from '@/lib/generateInvoice'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const body   = await req.text()
  const sig    = req.headers.get('stripe-signature')
  const secret = process.env.STRIPE_WEBHOOK_SECRET

  if (!sig || !secret) {
    return NextResponse.json({ error: 'Missing config' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const db = createServerClient()

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const pi      = event.data.object as Stripe.PaymentIntent
        const orderId = pi.metadata?.order_id
        if (orderId) {
          await db.from('orders').update({ payment_status: 'paid', status: 'processing' }).eq('id', orderId)

          // Increment discount code uses_count if applicable
          const { data: paidOrder } = await db
            .from('orders')
            .select('discount_code_id')
            .eq('id', orderId)
            .single()
          if (paidOrder?.discount_code_id) {
            await db.rpc('increment_discount_uses', { code_id: paidOrder.discount_code_id })
          }

          // Decrement stock for each item
          const { data: items } = await db.from('order_items').select('product_id, quantity').eq('order_id', orderId)
          if (items) {
            await Promise.all(items.map((item: { product_id: string; quantity: number }) =>
              db.rpc('decrement_stock', { product_id: item.product_id, amount: item.quantity })
            ))
          }

          // Fetch order data for confirmation email
          const { data: order } = await db
            .from('orders')
            .select('id, total, delivery_address, customer_name, user_id, zones(name), order_items(quantity, price, products(name)), profiles:user_id(name, email)')
            .eq('id', orderId)
            .single()

          if (order) {
            const profile  = order.profiles as { name?: string; email?: string } | null
            const toEmail  = profile?.email ?? pi.metadata?.customer_email ?? null

            // Check notification preference
            const { data: notifRow } = await db.from('site_content').select('value').eq('key', 'notif_order_confirmation').maybeSingle()
            const confirmNotifEnabled = notifRow?.value !== 'false'

            if (toEmail && confirmNotifEnabled) {
              const resend    = new Resend(process.env.RESEND_API_KEY)
              const fromEmail = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev'
              type RawItem    = { quantity: number; price: number; products: { name: string } | null }
              const subject   = `Your TajWater Order #${order.id.slice(0, 8).toUpperCase()} is Confirmed`
              const html = buildOrderConfirmationEmail({
                id:              order.id,
                customerName:    profile?.name ?? order.customer_name ?? 'Valued Customer',
                items:           ((order.order_items ?? []) as unknown as RawItem[]).map(i => ({ name: i.products?.name ?? 'Product', qty: i.quantity, price: i.price })),
                total:           order.total,
                deliveryAddress: order.delivery_address ?? null,
                zone:            (order.zones as { name?: string } | null)?.name ?? null,
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
                  id:               order.id,
                  total:            order.total,
                  payment_status:   'paid',
                  delivery_address: order.delivery_address ?? null,
                  customer_name:    order.customer_name ?? null,
                  customer_phone:   null,
                  created_at:       new Date().toISOString(),
                  zones:            Array.isArray(order.zones) ? (order.zones[0] ?? null) : (order.zones as { name: string } | null) ?? null,
                  order_items:      ((order.order_items ?? []) as unknown as RawItem[]).map(i => ({
                    id:       crypto.randomUUID(),
                    quantity: i.quantity,
                    price:    i.price,
                    products: i.products ? { name: i.products.name } : null,
                  })),
                  profiles: profile ? { name: profile.name ?? '', email: profile.email ?? '' } : null,
                }
                const pdfBuf = await generateInvoicePDF(invoiceOrder, invoiceCompanyInfo)
                pdfAttachment = {
                  filename: `INV-${order.id.slice(-8).toUpperCase()}.pdf`,
                  content:  pdfBuf.toString('base64'),
                }
              } catch (pdfErr) {
                console.error('Invoice PDF generation failed:', pdfErr)
              }

              let resendId: string | undefined
              let emailStatus = 'sent'
              let emailError: string | undefined
              try {
                const result = await resend.emails.send({
                  from:        fromEmail,
                  to:          toEmail,
                  subject,
                  html,
                  attachments: pdfAttachment ? [{ filename: pdfAttachment.filename, content: pdfAttachment.content }] : undefined,
                })
                resendId = result.data?.id
              } catch (e) {
                emailStatus = 'failed'
                emailError  = String(e)
              }

              await db.from('email_logs').insert({
                user_id:         order.user_id ?? null,
                recipient_email: toEmail,
                email_type:      'order_confirmation',
                subject,
                status:          emailStatus,
                resend_id:       resendId ?? null,
                error_message:   emailError ?? null,
                sent_by:         null,
                metadata:        { order_id: order.id },
              })
            }
          }
        }
        break
      }
      case 'payment_intent.payment_failed': {
        const pi      = event.data.object as Stripe.PaymentIntent
        const orderId = pi.metadata?.order_id
        if (orderId) {
          await db.from('orders').update({ payment_status: 'failed' }).eq('id', orderId)
        }
        break
      }
      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge
        const piId   = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id
        if (piId) {
          // Restore stock when refunded
          const { data: refundedOrder } = await db.from('orders').select('id').eq('stripe_payment_intent_id', piId).single()
          if (refundedOrder) {
            const { data: refundItems } = await db.from('order_items').select('product_id, quantity').eq('order_id', refundedOrder.id)
            if (refundItems) {
              await Promise.all(refundItems.map(item =>
                db.rpc('increment_stock', { product_id: item.product_id, amount: item.quantity })
              ))
            }
          }
          await db.from('orders').update({ payment_status: 'refunded', status: 'cancelled' }).eq('stripe_payment_intent_id', piId)
        }
        break
      }
      case 'charge.dispute.created': {
        const dispute = event.data.object as Stripe.Dispute
        const piId    = typeof dispute.payment_intent === 'string' ? dispute.payment_intent : dispute.payment_intent?.id
        if (piId) {
          await db.from('orders').update({ payment_status: 'disputed' }).eq('stripe_payment_intent_id', piId)
        }
        break
      }
      default:
        break
    }
  } catch (err) {
    console.error('Webhook processing error:', err)
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}

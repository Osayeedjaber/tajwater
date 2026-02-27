import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { stripe } from '@/lib/stripe'
import { createServerClient } from '@/lib/supabase'
import { Resend } from 'resend'
import { buildOrderConfirmationEmail } from '@/lib/email'

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

          // Fetch order data for confirmation email
          const { data: order } = await db
            .from('orders')
            .select('id, total, delivery_address, customer_name, user_id, zones(name), order_items(quantity, price, products(name)), profiles:user_id(name, email)')
            .eq('id', orderId)
            .single()

          if (order) {
            const profile  = order.profiles as { name?: string; email?: string } | null
            const toEmail  = profile?.email ?? pi.metadata?.customer_email ?? null

            if (toEmail) {
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
  } catch {
    // Return 200 so Stripe doesn't retry
  }

  return NextResponse.json({ received: true })
}

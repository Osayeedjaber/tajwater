import { NextRequest, NextResponse } from 'next/server'
import { createHmac } from 'crypto'
import { createServerClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

function verifySquareSignature(body: string, signature: string, sigKey: string, notifUrl: string): boolean {
  // Square signature = Base64(HMAC-SHA256(sigKey, notifUrl + body))
  const hmac = createHmac('sha256', sigKey)
  hmac.update(notifUrl + body)
  const expected = hmac.digest('base64')
  return expected === signature
}

export async function POST(req: NextRequest) {
  const body      = await req.text()
  const signature = req.headers.get('x-square-hmacsha256-signature')
  const sigKey    = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY
  const notifUrl  = `${process.env.NEXT_PUBLIC_SITE_URL}/api/square/webhook`

  if (!signature || !sigKey) {
    return NextResponse.json({ error: 'Missing config' }, { status: 400 })
  }

  // Verify the webhook signature
  if (!verifySquareSignature(body, signature, sigKey, notifUrl)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const event = JSON.parse(body)
  const db    = createServerClient()

  try {
    const eventType = event.type as string
    const data      = event.data?.object ?? {}

    switch (eventType) {
      // payment.completed — backup handler (primary success path is in create-payment)
      case 'payment.completed':
      case 'payment.updated': {
        const payment    = data.payment
        const paymentId  = payment?.id
        const status     = payment?.status

        if (!paymentId) break

        // Find the order by square_payment_id
        const { data: order } = await db
          .from('orders')
          .select('id, payment_status')
          .eq('square_payment_id', paymentId)
          .single()

        if (!order) break

        if (status === 'COMPLETED' && order.payment_status !== 'paid') {
          await db.from('orders').update({ payment_status: 'paid', status: 'processing' }).eq('id', order.id)

          // Decrement stock
          const { data: items } = await db.from('order_items').select('product_id, quantity').eq('order_id', order.id)
          if (items) {
            await Promise.all(items.map((item: { product_id: string; quantity: number }) =>
              db.rpc('decrement_stock', { product_id: item.product_id, amount: item.quantity })
            ))
          }
        } else if (status === 'FAILED') {
          await db.from('orders').update({ payment_status: 'failed' }).eq('id', order.id)
        }
        break
      }

      // Refund events
      case 'refund.created':
      case 'refund.updated': {
        const refund    = data.refund
        const paymentId = refund?.payment_id
        const status    = refund?.status

        if (!paymentId || status !== 'COMPLETED') break

        const { data: refundedOrder } = await db
          .from('orders')
          .select('id')
          .eq('square_payment_id', paymentId)
          .single()

        if (refundedOrder) {
          // Restore stock
          const { data: refundItems } = await db.from('order_items').select('product_id, quantity').eq('order_id', refundedOrder.id)
          if (refundItems) {
            await Promise.all(refundItems.map((item: { product_id: string; quantity: number }) =>
              db.rpc('increment_stock', { product_id: item.product_id, amount: item.quantity })
            ))
          }
          await db.from('orders').update({ payment_status: 'refunded', status: 'cancelled' }).eq('id', refundedOrder.id)
        }
        break
      }

      // Dispute events
      case 'dispute.created': {
        const dispute   = data.dispute
        const paymentId = dispute?.payment_id

        if (paymentId) {
          await db.from('orders').update({ payment_status: 'disputed' }).eq('square_payment_id', paymentId)
        }
        break
      }

      default:
        break
    }
  } catch (err) {
    console.error('Square webhook processing error:', err)
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { createServerClient as createSsrClient } from '@supabase/ssr'
import { generateInvoicePDF, type InvoiceOrderData } from '@/lib/generateInvoice'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { orderId } = await params

  // Auth check — user must own the order or be an admin
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

  // Check if user is admin
  const { data: adminRow } = await db
    .from('admin_users')
    .select('id')
    .eq('email', session.user.email ?? '')
    .maybeSingle()

  // Fetch order with related data
  const { data: order, error } = await db
    .from('orders')
    .select(`
      id, user_id, total, payment_status, delivery_address, customer_name, customer_phone, created_at,
      zones ( name ),
      order_items ( id, quantity, price, products ( name ) ),
      profiles:user_id ( name, email )
    `)
    .eq('id', orderId)
    .single()

  if (error || !order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  // Verify ownership: must be the order owner or an admin
  const orderData = order as unknown as InvoiceOrderData & { user_id: string | null }
  if (!adminRow && orderData.user_id !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Fetch company info from site_content
  const { data: contentRows } = await db
    .from('site_content')
    .select('key, value')
    .in('key', ['company_name', 'company_address', 'company_phone', 'company_email', 'company_website'])

  const content: Record<string, string> = {}
  for (const row of (contentRows ?? [])) {
    content[row.key] = row.value
  }

  const companyInfo = {
    name:    content['company_name']    ?? 'TajWater',
    address: content['company_address'] ?? 'Metro Vancouver, BC, Canada',
    phone:   content['company_phone']   ?? process.env.NEXT_PUBLIC_COMPANY_PHONE ?? '',
    email:   content['company_email']   ?? process.env.NEXT_PUBLIC_COMPANY_EMAIL ?? '',
    website: content['company_website'] ?? (process.env.NEXT_PUBLIC_SITE_URL ?? 'tajwater.ca'),
  }

  const pdfBuffer = await generateInvoicePDF(orderData as InvoiceOrderData, companyInfo)
  const invoiceNum = 'INV-' + orderId.slice(-8).toUpperCase()

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      'Content-Type':        'application/pdf',
      'Content-Disposition': `attachment; filename="${invoiceNum}.pdf"`,
    },
  })
}

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { createServerClient as createSsrClient } from '@supabase/ssr'
import { generateManifestPDF, type ManifestOrder } from '@/lib/generateManifest'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  // Admin auth check
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
    .select('id')
    .eq('email', session.user.email ?? '')
    .maybeSingle()

  if (!adminRow) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Optional date filter from query param — default to today
  const searchParams = req.nextUrl.searchParams
  const dateParam = searchParams.get('date') // YYYY-MM-DD or 'all'
  const showAll = dateParam === 'all'

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  let query = db
    .from('orders')
    .select(`
      id, status, customer_name, customer_phone, delivery_address, driver_name, notes, total, created_at,
      zones ( name ),
      order_items ( quantity, products ( name ) )
    `)
    .in('status', ['pending', 'processing', 'out_for_delivery', 'delivered'])
    .order('created_at', { ascending: true })
    .limit(500)

  if (!showAll) {
    const targetDate = dateParam ?? todayStart.toISOString().slice(0, 10)
    // Fetch the whole day + all currently out_for_delivery (regardless of date)
    query = query.or(
      `and(created_at.gte.${targetDate}T00:00:00,created_at.lte.${targetDate}T23:59:59),status.eq.out_for_delivery`
    )
  }

  const { data, error } = await query
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orders: ManifestOrder[] = (data ?? []).map((o: any) => {
    const zoneName = Array.isArray(o.zones)
      ? (o.zones[0]?.name ?? 'Unknown')
      : (o.zones?.name ?? 'Unknown')

    const items = (o.order_items ?? [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((i: any) => `${i.quantity}× ${i.products?.name ?? 'Item'}`)
      .join(', ') || '—'

    return {
      id:               o.id,
      status:           o.status,
      customer_name:    o.customer_name,
      customer_phone:   o.customer_phone,
      delivery_address: o.delivery_address,
      driver_name:      o.driver_name,
      notes:            o.notes,
      total:            Number(o.total),
      zone_name:        zoneName,
      items,
    }
  })

  // Group by zone
  const byZone: Record<string, ManifestOrder[]> = {}
  for (const o of orders) {
    if (!byZone[o.zone_name]) byZone[o.zone_name] = []
    byZone[o.zone_name].push(o)
  }

  const displayDate = dateParam && dateParam !== 'all'
    ? new Date(dateParam + 'T12:00:00').toLocaleDateString('en-CA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    : showAll
      ? 'All Active Orders'
      : new Date().toLocaleDateString('en-CA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  const buffer = await generateManifestPDF(orders, displayDate, byZone)
  const filename = `delivery-manifest-${dateParam ?? todayStart.toISOString().slice(0, 10)}.pdf`

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type':        'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control':       'no-store',
    },
  })
}

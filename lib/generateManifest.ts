import { renderToBuffer, Document, Page, Text, View, StyleSheet, type DocumentProps } from '@react-pdf/renderer'
import React from 'react'

export type ManifestOrder = {
  id: string
  status: string
  customer_name: string | null
  customer_phone: string | null
  delivery_address: string | null
  driver_name: string | null
  notes: string | null
  total: number
  zone_name: string
  items: string  // pre-formatted "2× 20L Jug, 1× Filter"
}

const S = StyleSheet.create({
  page:         { fontFamily: 'Helvetica', fontSize: 9, color: '#0c2340', padding: 36, backgroundColor: '#ffffff' },
  header:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', borderBottomWidth: 2, borderBottomColor: '#0097a7', paddingBottom: 10, marginBottom: 16 },
  title:        { fontSize: 18, fontFamily: 'Helvetica-Bold', color: '#0097a7' },
  subtitle:     { fontSize: 9, color: '#4a7fa5', marginTop: 2 },
  headerRight:  { textAlign: 'right', gap: 2 },
  headerMeta:   { fontSize: 9, color: '#4a7fa5', textAlign: 'right' },
  zoneTitle:    { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#ffffff', backgroundColor: '#0097a7', padding: '5 10', borderRadius: 4, marginBottom: 4, marginTop: 12 },
  tableHead:    { flexDirection: 'row', backgroundColor: '#e0f7fa', padding: '4 6', borderRadius: 3, marginBottom: 2 },
  thText:       { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: '#0097a7', textTransform: 'uppercase', letterSpacing: 0.4 },
  row:          { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f0f9ff', padding: '5 6' },
  rowAlt:       { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f0f9ff', padding: '5 6', backgroundColor: '#f7feff' },
  cell:         { fontSize: 8.5, color: '#0c2340' },
  cellMuted:    { fontSize: 7.5, color: '#4a7fa5', marginTop: 1 },
  colId:        { width: 62 },
  colCustomer:  { flex: 1.4 },
  colAddress:   { flex: 2 },
  colItems:     { flex: 1.6 },
  colDriver:    { flex: 1 },
  colStatus:    { width: 70 },
  footer:       { position: 'absolute', bottom: 24, left: 36, right: 36, borderTopWidth: 1, borderTopColor: '#e0f7fa', paddingTop: 8, flexDirection: 'row', justifyContent: 'space-between' },
  footerText:   { fontSize: 7.5, color: '#4a7fa5' },
  summaryRow:   { flexDirection: 'row', gap: 16, marginBottom: 16 },
  summaryBox:   { flex: 1, backgroundColor: '#f0f9ff', borderRadius: 6, padding: '8 12', alignItems: 'center' },
  summaryNum:   { fontSize: 18, fontFamily: 'Helvetica-Bold', color: '#0097a7' },
  summaryLabel: { fontSize: 8, color: '#4a7fa5', marginTop: 2 },
})

function statusLabel(s: string) {
  return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function shortId(id: string) {
  return '#TW-' + id.slice(-6).toUpperCase()
}

export function ManifestPDF({
  orders,
  date,
  byZone,
}: {
  orders: ManifestOrder[]
  date: string
  byZone: Record<string, ManifestOrder[]>
}) {
  const delivered = orders.filter(o => o.status === 'delivered').length
  const inTransit = orders.filter(o => o.status === 'out_for_delivery').length
  const pending   = orders.filter(o => ['pending', 'processing'].includes(o.status)).length

  return React.createElement(Document, { title: `TajWater Delivery Manifest — ${date}` },
    React.createElement(Page, { size: 'A4', orientation: 'landscape', style: S.page },

      // Header
      React.createElement(View, { style: S.header },
        React.createElement(View, null,
          React.createElement(Text, { style: S.title }, 'TajWater — Delivery Manifest'),
          React.createElement(Text, { style: S.subtitle }, 'Metro Vancouver Water Delivery · Confidential driver document'),
        ),
        React.createElement(View, { style: S.headerRight },
          React.createElement(Text, { style: S.headerMeta }, date),
          React.createElement(Text, { style: S.headerMeta }, `Total stops: ${orders.length}`),
          React.createElement(Text, { style: S.headerMeta }, `Generated: ${new Date().toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' })}`),
        ),
      ),

      // KPI summary
      React.createElement(View, { style: S.summaryRow },
        React.createElement(View, { style: S.summaryBox },
          React.createElement(Text, { style: S.summaryNum }, String(orders.length)),
          React.createElement(Text, { style: S.summaryLabel }, 'Total Stops'),
        ),
        React.createElement(View, { style: S.summaryBox },
          React.createElement(Text, { style: { ...S.summaryNum, color: '#16a34a' } }, String(delivered)),
          React.createElement(Text, { style: S.summaryLabel }, 'Delivered'),
        ),
        React.createElement(View, { style: S.summaryBox },
          React.createElement(Text, { style: { ...S.summaryNum, color: '#0097a7' } }, String(inTransit)),
          React.createElement(Text, { style: S.summaryLabel }, 'Out for Delivery'),
        ),
        React.createElement(View, { style: S.summaryBox },
          React.createElement(Text, { style: { ...S.summaryNum, color: '#d97706' } }, String(pending)),
          React.createElement(Text, { style: S.summaryLabel }, 'Pending'),
        ),
        React.createElement(View, { style: S.summaryBox },
          React.createElement(Text, { style: S.summaryNum }, String(Object.keys(byZone).length)),
          React.createElement(Text, { style: S.summaryLabel }, 'Zones'),
        ),
      ),

      // Per-zone tables
      ...Object.entries(byZone).flatMap(([zone, zoneOrders]) => [
        React.createElement(Text, { key: `zt-${zone}`, style: S.zoneTitle }, `${zone}  (${zoneOrders.length} stop${zoneOrders.length !== 1 ? 's' : ''})`),
        // table header
        React.createElement(View, { key: `th-${zone}`, style: S.tableHead },
          React.createElement(Text, { style: { ...S.thText, ...S.colId } }, 'Order'),
          React.createElement(Text, { style: { ...S.thText, ...S.colCustomer } }, 'Customer'),
          React.createElement(Text, { style: { ...S.thText, ...S.colAddress } }, 'Address'),
          React.createElement(Text, { style: { ...S.thText, ...S.colItems } }, 'Items'),
          React.createElement(Text, { style: { ...S.thText, ...S.colDriver } }, 'Driver'),
          React.createElement(Text, { style: { ...S.thText, ...S.colStatus } }, 'Status'),
        ),
        // rows
        ...zoneOrders.map((o, idx) =>
          React.createElement(View, { key: o.id, style: idx % 2 === 0 ? S.row : S.rowAlt },
            React.createElement(View, { style: S.colId },
              React.createElement(Text, { style: S.cell }, shortId(o.id)),
            ),
            React.createElement(View, { style: S.colCustomer },
              React.createElement(Text, { style: S.cell }, o.customer_name ?? '—'),
              o.customer_phone && React.createElement(Text, { style: S.cellMuted }, o.customer_phone),
            ),
            React.createElement(View, { style: S.colAddress },
              React.createElement(Text, { style: { ...S.cell, fontSize: 8 } }, o.delivery_address ?? '—'),
              o.notes && React.createElement(Text, { style: { ...S.cellMuted, color: '#b45309' } }, `Note: ${o.notes}`),
            ),
            React.createElement(View, { style: S.colItems },
              React.createElement(Text, { style: { ...S.cell, fontSize: 8 } }, o.items || '—'),
            ),
            React.createElement(View, { style: S.colDriver },
              React.createElement(Text, { style: S.cell }, o.driver_name ?? 'Unassigned'),
            ),
            React.createElement(View, { style: S.colStatus },
              React.createElement(Text, { style: { ...S.cell, color: statusColor(o.status) } }, statusLabel(o.status)),
            ),
          )
        ),
      ]),

      // Footer
      React.createElement(View, { style: S.footer, fixed: true },
        React.createElement(Text, { style: S.footerText }, 'TajWater Inc. · Metro Vancouver, BC · Confidential'),
        React.createElement(Text, { style: S.footerText, render: ({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) =>
          `Page ${pageNumber} of ${totalPages}` } as React.ComponentProps<typeof Text>),
      ),
    )
  )
}

function statusColor(s: string) {
  const map: Record<string, string> = {
    delivered:        '#16a34a',
    out_for_delivery: '#0097a7',
    processing:       '#1565c0',
    pending:          '#d97706',
    cancelled:        '#dc2626',
  }
  return map[s] ?? '#0c2340'
}

export async function generateManifestPDF(orders: ManifestOrder[], date: string, byZone: Record<string, ManifestOrder[]>): Promise<Buffer> {
  return renderToBuffer(
    ManifestPDF({ orders, date, byZone }) as unknown as React.ReactElement<DocumentProps>
  )
}

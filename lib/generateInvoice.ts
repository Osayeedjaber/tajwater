import { renderToBuffer, Document, Page, Text, View, StyleSheet, DocumentProps } from '@react-pdf/renderer'
import React from 'react'

export type InvoiceOrderItem = { id: string; quantity: number; price: number; products: { name: string } | null }
export type InvoiceOrderData = {
  id: string
  total: number
  payment_status: string | null
  delivery_address: string | null
  customer_name: string | null
  customer_phone: string | null
  created_at: string
  zones: { name: string } | null
  order_items: InvoiceOrderItem[]
  profiles: { name: string; email: string } | null
}
export type CompanyInfo = { name: string; address: string; phone: string; email: string; website: string }

const styles = StyleSheet.create({
  page:           { fontFamily: 'Helvetica', fontSize: 10, color: '#0c2340', padding: 48, backgroundColor: '#ffffff' },
  header:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32, paddingBottom: 20, borderBottomWidth: 2, borderBottomColor: '#0097a7' },
  companyBlock:   { gap: 3 },
  companyName:    { fontSize: 22, fontFamily: 'Helvetica-Bold', color: '#0097a7' },
  companyTagline: { fontSize: 9, color: '#4a7fa5', marginTop: 2 },
  companyDetail:  { fontSize: 9, color: '#4a7fa5' },
  invoiceLabel:   { fontSize: 28, fontFamily: 'Helvetica-Bold', color: '#0c2340', textAlign: 'right' },
  invoiceNumber:  { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#0097a7', textAlign: 'right', marginTop: 4 },
  invoiceDate:    { fontSize: 9, color: '#4a7fa5', textAlign: 'right', marginTop: 2 },
  billingRow:     { flexDirection: 'row', gap: 24, marginBottom: 24 },
  billingBox:     { flex: 1, backgroundColor: '#f0f9ff', borderRadius: 8, padding: 14 },
  billingTitle:   { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#0097a7', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 },
  billingText:    { fontSize: 10, color: '#0c2340', marginBottom: 2 },
  billingMuted:   { fontSize: 9, color: '#4a7fa5', marginBottom: 2 },
  tableHeader:    { flexDirection: 'row', backgroundColor: '#0097a7', borderRadius: 4, padding: '8 12', marginBottom: 2 },
  tableHeaderText:{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#ffffff', textTransform: 'uppercase', letterSpacing: 0.5 },
  tableRow:       { flexDirection: 'row', padding: '8 12', borderBottomWidth: 1, borderBottomColor: '#e0f7fa' },
  tableRowAlt:    { flexDirection: 'row', padding: '8 12', borderBottomWidth: 1, borderBottomColor: '#e0f7fa', backgroundColor: '#f7feff' },
  colProduct:     { flex: 3 },
  colQty:         { flex: 1, textAlign: 'center' },
  colPrice:       { flex: 1.5, textAlign: 'right' },
  colTotal:       { flex: 1.5, textAlign: 'right' },
  cellText:       { fontSize: 10, color: '#0c2340' },
  cellMuted:      { fontSize: 9, color: '#4a7fa5' },
  totalsArea:     { marginTop: 12, alignItems: 'flex-end' },
  totalsBox:      { width: 220, gap: 4 },
  totalRow:       { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  totalLabel:     { fontSize: 10, color: '#4a7fa5' },
  totalValue:     { fontSize: 10, color: '#0c2340', fontFamily: 'Helvetica-Bold' },
  grandRow:       { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderTopWidth: 1.5, borderTopColor: '#0097a7', marginTop: 4 },
  grandLabel:     { fontSize: 13, fontFamily: 'Helvetica-Bold', color: '#0c2340' },
  grandValue:     { fontSize: 13, fontFamily: 'Helvetica-Bold', color: '#0097a7' },
  statusBadge:    { marginTop: 16, alignSelf: 'flex-end', backgroundColor: '#e0f7fa', borderRadius: 6, padding: '4 12' },
  statusText:     { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#0097a7', textTransform: 'uppercase', letterSpacing: 0.8 },
  footer:         { position: 'absolute', bottom: 32, left: 48, right: 48, borderTopWidth: 1, borderTopColor: '#e0f7fa', paddingTop: 12, flexDirection: 'row', justifyContent: 'space-between' },
  footerText:     { fontSize: 8, color: '#4a7fa5' },
})

function InvoicePDF({ order, companyInfo }: { order: InvoiceOrderData; companyInfo: CompanyInfo }) {
  const invoiceNum   = 'INV-' + order.id.slice(-8).toUpperCase()
  const issueDate    = new Date(order.created_at).toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })
  const customerName = order.profiles?.name ?? order.customer_name ?? 'Guest Customer'
  const zone         = (order.zones as { name: string } | null)?.name ?? '—'
  const subtotal     = order.order_items.reduce((s, i) => s + i.price * i.quantity, 0)
  const deliveryFee  = parseFloat((order.total - subtotal).toFixed(2))
  const statusColor: Record<string, string> = { paid: '#16a34a', pending: '#d97706', failed: '#dc2626', refunded: '#dc2626' }
  const payStatus    = order.payment_status ?? 'pending'

  return React.createElement(Document, { title: invoiceNum },
    React.createElement(Page, { size: 'A4', style: styles.page },
      // Header
      React.createElement(View, { style: styles.header },
        React.createElement(View, { style: styles.companyBlock },
          React.createElement(Text, { style: styles.companyName }, companyInfo.name),
          React.createElement(Text, { style: styles.companyTagline }, "Metro Vancouver's Premium Water Delivery"),
          React.createElement(Text, { style: styles.companyDetail }, companyInfo.address),
          React.createElement(Text, { style: styles.companyDetail }, companyInfo.phone),
          React.createElement(Text, { style: styles.companyDetail }, companyInfo.email),
        ),
        React.createElement(View, null,
          React.createElement(Text, { style: styles.invoiceLabel }, 'INVOICE'),
          React.createElement(Text, { style: styles.invoiceNumber }, invoiceNum),
          React.createElement(Text, { style: styles.invoiceDate }, 'Issued: ' + issueDate),
        ),
      ),
      // Billing info
      React.createElement(View, { style: styles.billingRow },
        React.createElement(View, { style: styles.billingBox },
          React.createElement(Text, { style: styles.billingTitle }, 'Bill To'),
          React.createElement(Text, { style: styles.billingText }, customerName),
          order.profiles?.email && React.createElement(Text, { style: styles.billingMuted }, order.profiles.email),
          order.customer_phone && React.createElement(Text, { style: styles.billingMuted }, order.customer_phone),
          React.createElement(Text, { style: styles.billingMuted }, zone),
          order.delivery_address && React.createElement(Text, { style: styles.billingMuted }, order.delivery_address),
        ),
        React.createElement(View, { style: styles.billingBox },
          React.createElement(Text, { style: styles.billingTitle }, 'Payment Info'),
          React.createElement(Text, { style: { ...styles.billingText, color: statusColor[payStatus] ?? '#0c2340', fontFamily: 'Helvetica-Bold' } },
            payStatus.charAt(0).toUpperCase() + payStatus.slice(1)),
          React.createElement(Text, { style: styles.billingMuted }, 'Paid via Stripe'),
        ),
      ),
      // Table header
      React.createElement(View, { style: styles.tableHeader },
        React.createElement(Text, { style: { ...styles.tableHeaderText, flex: 3 } }, 'Product'),
        React.createElement(Text, { style: { ...styles.tableHeaderText, flex: 1, textAlign: 'center' } }, 'Qty'),
        React.createElement(Text, { style: { ...styles.tableHeaderText, flex: 1.5, textAlign: 'right' } }, 'Unit Price'),
        React.createElement(Text, { style: { ...styles.tableHeaderText, flex: 1.5, textAlign: 'right' } }, 'Subtotal'),
      ),
      // Items
      ...order.order_items.map((item, idx) =>
        React.createElement(View, { key: item.id, style: idx % 2 === 0 ? styles.tableRow : styles.tableRowAlt },
          React.createElement(View, { style: styles.colProduct },
            React.createElement(Text, { style: styles.cellText }, item.products?.name ?? 'Product'),
          ),
          React.createElement(Text, { style: { ...styles.cellText, ...styles.colQty } }, String(item.quantity)),
          React.createElement(Text, { style: { ...styles.cellText, ...styles.colPrice } }, `$${item.price.toFixed(2)}`),
          React.createElement(Text, { style: { ...styles.cellText, ...styles.colTotal } }, `$${(item.price * item.quantity).toFixed(2)}`),
        )
      ),
      // Totals
      React.createElement(View, { style: styles.totalsArea },
        React.createElement(View, { style: styles.totalsBox },
          React.createElement(View, { style: styles.totalRow },
            React.createElement(Text, { style: styles.totalLabel }, 'Subtotal'),
            React.createElement(Text, { style: styles.totalValue }, `$${subtotal.toFixed(2)}`),
          ),
          deliveryFee > 0 && React.createElement(View, { style: styles.totalRow },
            React.createElement(Text, { style: styles.totalLabel }, 'Delivery Fee'),
            React.createElement(Text, { style: styles.totalValue }, `$${deliveryFee.toFixed(2)}`),
          ),
          React.createElement(View, { style: styles.grandRow },
            React.createElement(Text, { style: styles.grandLabel }, 'Total'),
            React.createElement(Text, { style: styles.grandValue }, `$${order.total.toFixed(2)}`),
          ),
        ),
        React.createElement(View, { style: { ...styles.statusBadge, backgroundColor: payStatus === 'paid' ? '#dcfce7' : '#fef3c7' } },
          React.createElement(Text, { style: { ...styles.statusText, color: statusColor[payStatus] ?? '#0097a7' } },
            payStatus === 'paid' ? 'PAID' : payStatus.toUpperCase()),
        ),
      ),
      // Footer
      React.createElement(View, { style: styles.footer },
        React.createElement(Text, { style: styles.footerText }, 'Thank you for your business. ' + companyInfo.name),
        React.createElement(Text, { style: styles.footerText }, companyInfo.website),
      ),
    )
  )
}

export async function generateInvoicePDF(order: InvoiceOrderData, companyInfo: CompanyInfo): Promise<Buffer> {
  return renderToBuffer(
    InvoicePDF({ order, companyInfo }) as unknown as React.ReactElement<DocumentProps>
  )
}

import { Resend } from 'resend'

// Lazy initialization — prevents build failures when RESEND_API_KEY is absent
let _resend: Resend | undefined
export const resend = new Proxy({} as Resend, {
  get(_target, prop) {
    if (!_resend) {
      _resend = new Resend(process.env.RESEND_API_KEY)
    }
    return (_resend as unknown as Record<string | symbol, unknown>)[prop]
  },
})

export function buildOrderConfirmationEmail(order: {
  id: string
  customerName: string
  items: { name: string; qty: number; price: number }[]
  total: number
  deliveryAddress: string | null
  zone: string | null
  greeting?: string
  taxAmount?: number
  deliveryFee?: number
  discountAmount?: number
}): string {
  const shortId   = 'TW-' + order.id.slice(-8).toUpperCase()
  const subtotal   = order.items.reduce((s, i) => s + i.qty * i.price, 0)
  const discount   = order.discountAmount ?? 0
  const tax        = order.taxAmount ?? 0
  const delivery   = order.deliveryFee ?? Math.max(0, parseFloat((order.total - subtotal + discount - tax).toFixed(2)))
  const greetText = (order.greeting ?? `Hi {{customer_name}}, your order has been received and we're getting it ready for delivery.`)
    .replace(/\{\{customer_name\}\}/g, order.customerName)
    .replace(/\{\{order_id\}\}/g, shortId)
    .replace(/\{\{total\}\}/g, `$${order.total.toFixed(2)}`)

  const rows = order.items.map(i => `
    <tr>
      <td style="padding:11px 14px;border-bottom:1px solid #edf4f7;font-size:14px;color:#1a3347;">${i.name}</td>
      <td style="padding:11px 14px;border-bottom:1px solid #edf4f7;font-size:14px;color:#6b8c9e;text-align:center;">&times;${i.qty}</td>
      <td style="padding:11px 14px;border-bottom:1px solid #edf4f7;font-size:13px;color:#6b8c9e;text-align:right;">$${i.price.toFixed(2)}</td>
      <td style="padding:11px 14px;border-bottom:1px solid #edf4f7;font-size:14px;font-weight:700;color:#1a3347;text-align:right;">$${(i.qty * i.price).toFixed(2)}</td>
    </tr>`).join('')

  const extraRows = [
    discount > 0    ? `<tr><td colspan="3" style="padding:5px 14px;text-align:right;font-size:13px;color:#16a34a;">Discount</td><td style="padding:5px 14px;text-align:right;font-size:13px;font-weight:700;color:#16a34a;">&#8722;$${discount.toFixed(2)}</td></tr>` : '',
    delivery > 0.01 ? `<tr><td colspan="3" style="padding:5px 14px;text-align:right;font-size:13px;color:#6b8c9e;">Delivery Fee</td><td style="padding:5px 14px;text-align:right;font-size:13px;font-weight:700;color:#1a3347;">$${delivery.toFixed(2)}</td></tr>` : '',
    tax > 0         ? `<tr><td colspan="3" style="padding:5px 14px;text-align:right;font-size:13px;color:#6b8c9e;">Tax (GST + PST)</td><td style="padding:5px 14px;text-align:right;font-size:13px;font-weight:700;color:#1a3347;">$${tax.toFixed(2)}</td></tr>` : '',
  ].filter(Boolean).join('')

  const _co = {
    email: process.env.NEXT_PUBLIC_COMPANY_EMAIL ?? 'info@tajwater.ca',
    url:   process.env.NEXT_PUBLIC_SITE_URL      ?? 'https://tajwater.ca',
    phone: process.env.NEXT_PUBLIC_COMPANY_PHONE ?? '',
    year:  new Date().getFullYear(),
  }

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>TajWater Order Confirmed</title></head>
<body style="margin:0;padding:0;background:#e8f4f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
<div style="display:none;overflow:hidden;max-height:0;">Order ${shortId} confirmed &middot; $${order.total.toFixed(2)} &middot; Delivery in 1&ndash;2 business days&nbsp;&zwnj;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#e8f4f8;"><tr><td style="padding:32px 16px;" align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 32px rgba(0,21,50,0.10);">
  <tr><td style="padding:32px 48px 28px;text-align:center;background-color:#0097a7;background-image:linear-gradient(135deg,#0097a7 0%,#006db3 60%,#1565c0 100%);">
    <p style="margin:0 0 6px;font-size:11px;font-weight:800;color:rgba(255,255,255,0.6);letter-spacing:4px;text-transform:uppercase;">TAJWATER</p>
    <p style="margin:0 0 8px;font-size:32px;">&#128167;</p>
    <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.65);">Metro Vancouver&rsquo;s Premium Water Delivery</p>
  </td></tr>
  <tr><td style="padding:40px 48px 32px;">
    <h1 style="margin:0 0 6px;font-size:26px;font-weight:900;color:#0c2340;">Order Confirmed! &#127881;</h1>
    <p style="margin:0 0 28px;font-size:15px;color:#6b8c9e;line-height:1.7;">${greetText}</p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-radius:14px;overflow:hidden;margin-bottom:28px;background-color:#0097a7;background-image:linear-gradient(135deg,#0097a7,#1565c0);">
      <tr>
        <td style="padding:20px 24px;">
          <p style="margin:0;font-size:10px;font-weight:800;color:rgba(255,255,255,0.65);letter-spacing:1.5px;text-transform:uppercase;">Order Number</p>
          <p style="margin:4px 0 0;font-size:22px;font-weight:900;color:#ffffff;font-family:'Courier New',monospace;letter-spacing:2px;">${shortId}</p>
        </td>
        <td style="padding:20px 24px;text-align:right;vertical-align:middle;">
          <a href="${_co.url}/dashboard/orders" style="display:inline-block;background:rgba(255,255,255,0.18);color:#ffffff;padding:10px 20px;border-radius:10px;font-size:13px;font-weight:700;text-decoration:none;border:1px solid rgba(255,255,255,0.25);">Track Order &rarr;</a>
        </td>
      </tr>
    </table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5eff3;border-radius:14px;overflow:hidden;margin-bottom:20px;">
      <thead>
        <tr style="background:#f5fafb;">
          <th style="padding:10px 14px;text-align:left;font-size:11px;font-weight:700;color:#8caab8;text-transform:uppercase;letter-spacing:0.6px;border-bottom:1px solid #e5eff3;">Item</th>
          <th style="padding:10px 14px;text-align:center;font-size:11px;font-weight:700;color:#8caab8;text-transform:uppercase;letter-spacing:0.6px;border-bottom:1px solid #e5eff3;">Qty</th>
          <th style="padding:10px 14px;text-align:right;font-size:11px;font-weight:700;color:#8caab8;text-transform:uppercase;letter-spacing:0.6px;border-bottom:1px solid #e5eff3;">Unit</th>
          <th style="padding:10px 14px;text-align:right;font-size:11px;font-weight:700;color:#8caab8;text-transform:uppercase;letter-spacing:0.6px;border-bottom:1px solid #e5eff3;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
        ${extraRows}
        <tr style="background:#f5fafb;">
          <td colspan="3" style="padding:13px 14px;text-align:right;font-size:15px;font-weight:800;color:#0c2340;border-top:2px solid #e5eff3;">Total Charged</td>
          <td style="padding:13px 14px;text-align:right;font-size:20px;font-weight:900;color:#0097a7;border-top:2px solid #e5eff3;">$${order.total.toFixed(2)}</td>
        </tr>
      </tbody>
    </table>

    ${order.deliveryAddress ? `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5fafb;border:1px solid #e5eff3;border-radius:12px;margin-bottom:20px;">
      <tr><td style="padding:16px 20px;">
        <p style="margin:0 0 5px;font-size:11px;font-weight:700;color:#0097a7;letter-spacing:0.5px;text-transform:uppercase;">Delivery Address</p>
        <p style="margin:0;font-size:14px;color:#1a3347;line-height:1.5;">${order.deliveryAddress}${order.zone ? `<br/><span style="font-size:12px;color:#8caab8;">Zone: ${order.zone}</span>` : ''}</p>
      </td></tr>
    </table>` : ''}

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fffbeb;border:1px solid #fde68a;border-radius:14px;margin-bottom:28px;">
      <tr><td style="padding:18px 22px;">
        <p style="margin:0 0 10px;font-size:13px;font-weight:700;color:#92400e;">What happens next</p>
        <p style="margin:0 0 4px;font-size:13px;color:#78350f;">1&nbsp;&nbsp;We confirm and prepare your order</p>
        <p style="margin:0 0 4px;font-size:13px;color:#78350f;">2&nbsp;&nbsp;Your driver will call ~30 min before arrival</p>
        <p style="margin:0;font-size:13px;color:#78350f;">3&nbsp;&nbsp;Estimated delivery: <strong>1&ndash;2 business days</strong></p>
      </td></tr>
    </table>

    <p style="margin:0;font-size:13px;color:#8caab8;line-height:1.7;">Questions? Email <a href="mailto:${_co.email}" style="color:#0097a7;font-weight:600;">${_co.email}</a>${_co.phone ? ` or call <a href="tel:${_co.phone}" style="color:#0097a7;font-weight:600;">${_co.phone}</a>` : ''}.</p>
  </td></tr>
  <tr><td style="background:#f5fafb;padding:20px 48px;border-top:1px solid #e5eff3;text-align:center;">
    <p style="margin:0 0 5px;font-size:12px;color:#8caab8;"><a href="${_co.url}" style="color:#0097a7;text-decoration:none;font-weight:700;">tajwater.ca</a>&nbsp;&middot;&nbsp;<a href="mailto:${_co.email}" style="color:#8caab8;text-decoration:none;">${_co.email}</a></p>
    <p style="margin:0;font-size:11px;color:#b0c4cf;">&copy; ${_co.year} TajWater &middot; Metro Vancouver, BC</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`
}

// ─── Shared email shell ───────────────────────────────────────────────────────
function shell(bodyHtml: string, preview = '', coEmail = process.env.NEXT_PUBLIC_COMPANY_EMAIL ?? 'info@tajwater.ca', coUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://tajwater.ca', coPhone = process.env.NEXT_PUBLIC_COMPANY_PHONE ?? ''): string {
  const yr = new Date().getFullYear()
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>TajWater</title></head>
<body style="margin:0;padding:0;background:#e8f4f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
${preview ? `<div style="display:none;overflow:hidden;max-height:0;">${preview}&nbsp;&zwnj;</div>` : ''}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#e8f4f8;"><tr><td style="padding:32px 16px;" align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 32px rgba(0,21,50,0.10);">
  <tr><td style="padding:30px 48px 26px;text-align:center;background-color:#0097a7;background-image:linear-gradient(135deg,#0097a7 0%,#006db3 60%,#1565c0 100%);">
    <p style="margin:0 0 5px;font-size:11px;font-weight:800;color:rgba(255,255,255,0.6);letter-spacing:4px;text-transform:uppercase;">TAJWATER</p>
    <p style="margin:0 0 6px;font-size:30px;">&#128167;</p>
    <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.65);">Metro Vancouver&rsquo;s Premium Water Delivery</p>
  </td></tr>
  <tr><td style="padding:40px 48px 32px;">${bodyHtml}</td></tr>
  <tr><td style="background:#f5fafb;padding:20px 48px;border-top:1px solid #e5eff3;text-align:center;">
    <p style="margin:0 0 5px;font-size:12px;color:#8caab8;"><a href="${coUrl}" style="color:#0097a7;text-decoration:none;font-weight:700;">tajwater.ca</a>&nbsp;&middot;&nbsp;<a href="mailto:${coEmail}" style="color:#8caab8;text-decoration:none;">${coEmail}</a>${coPhone ? `&nbsp;&middot;&nbsp;<a href="tel:${coPhone}" style="color:#8caab8;text-decoration:none;">${coPhone}</a>` : ''}</p>
    <p style="margin:0;font-size:11px;color:#b0c4cf;">&copy; ${yr} TajWater &middot; Metro Vancouver, BC</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`
}

// ─── Welcome ──────────────────────────────────────────────────────────────────
export function buildWelcomeEmail({ customerName, message }: { customerName: string; message?: string }): string {
  const coEmail = process.env.NEXT_PUBLIC_COMPANY_EMAIL ?? 'info@tajwater.ca'
  const coUrl   = process.env.NEXT_PUBLIC_SITE_URL      ?? 'https://tajwater.ca'
  const msgText = (message ?? `Hi {{customer_name}}, your account is ready. Fresh, pure water is just a few clicks away.`)
    .replace(/\{\{customer_name\}\}/g, customerName)
  return shell(`
<h1 style="margin:0 0 6px;font-size:26px;font-weight:900;color:#0c2340;">Welcome to TajWater! &#128167;</h1>
<p style="margin:0 0 28px;font-size:15px;color:#6b8c9e;line-height:1.7;">${msgText}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
  <tr><td style="padding-bottom:10px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5fafb;border:1px solid #e5eff3;border-radius:12px;">
      <tr>
        <td style="padding:14px 16px;font-size:22px;width:44px;text-align:center;vertical-align:top;">&#128722;</td>
        <td style="padding:14px 16px 14px 0;vertical-align:top;"><p style="margin:0 0 3px;font-size:14px;font-weight:700;color:#1a3347;">Shop Anytime</p><p style="margin:0;font-size:13px;color:#8caab8;line-height:1.5;">Browse jugs, dispensers &amp; accessories &mdash; delivered to your door.</p></td>
      </tr>
    </table>
  </td></tr>
  <tr><td style="padding-bottom:10px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5fafb;border:1px solid #e5eff3;border-radius:12px;">
      <tr>
        <td style="padding:14px 16px;font-size:22px;width:44px;text-align:center;vertical-align:top;">&#128260;</td>
        <td style="padding:14px 16px 14px 0;vertical-align:top;"><p style="margin:0 0 3px;font-size:14px;font-weight:700;color:#1a3347;">Subscribe &amp; Save 15%</p><p style="margin:0;font-size:13px;color:#8caab8;line-height:1.5;">Weekly, biweekly or monthly auto-delivery. Cancel anytime.</p></td>
      </tr>
    </table>
  </td></tr>
  <tr><td>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5fafb;border:1px solid #e5eff3;border-radius:12px;">
      <tr>
        <td style="padding:14px 16px;font-size:22px;width:44px;text-align:center;vertical-align:top;">&#128204;</td>
        <td style="padding:14px 16px 14px 0;vertical-align:top;"><p style="margin:0 0 3px;font-size:14px;font-weight:700;color:#1a3347;">Track Every Order</p><p style="margin:0;font-size:13px;color:#8caab8;line-height:1.5;">Real-time status updates from order placed to doorstep.</p></td>
      </tr>
    </table>
  </td></tr>
</table>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
  <tr><td style="border-radius:12px;background-color:#0097a7;background-image:linear-gradient(135deg,#0097a7,#1565c0);">
    <a href="${coUrl}/shop" style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;">Browse Products &rarr;</a>
  </td></tr>
</table>
<p style="margin:0;font-size:13px;color:#8caab8;line-height:1.7;">Questions? Email <a href="mailto:${coEmail}" style="color:#0097a7;font-weight:600;">${coEmail}</a>.</p>
`, `Welcome, ${customerName}! Your TajWater account is ready.`, coEmail, coUrl)
}

// ─── Out for Delivery ─────────────────────────────────────────────────────────
export function buildOutForDeliveryEmail({ orderId, customerName, zone, message }: {
  orderId: string; customerName: string; zone?: string | null; message?: string
}): string {
  const coEmail = process.env.NEXT_PUBLIC_COMPANY_EMAIL ?? 'info@tajwater.ca'
  const coUrl   = process.env.NEXT_PUBLIC_SITE_URL      ?? 'https://tajwater.ca'
  const coPhone = process.env.NEXT_PUBLIC_COMPANY_PHONE ?? ''
  const shortId = 'TW-' + orderId.slice(-8).toUpperCase()
  const msgText = message
    ? message.replace(/\{\{customer_name\}\}/g, customerName).replace(/\{\{order_id\}\}/g, shortId)
    : `Good news, ${customerName}! Your order <strong style="color:#0097a7;">${shortId}</strong> is out for delivery${zone ? ` to ${zone}` : ''}.`
  return shell(`
<h1 style="margin:0 0 6px;font-size:26px;font-weight:900;color:#0c2340;">Your water is on the way! &#128665;</h1>
<p style="margin:0 0 28px;font-size:15px;color:#6b8c9e;line-height:1.7;">${msgText}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-radius:14px;overflow:hidden;margin-bottom:24px;background-color:#0097a7;background-image:linear-gradient(135deg,#0097a7,#1565c0);">
  <tr>
    <td style="padding:18px 24px;"><p style="margin:0;font-size:10px;font-weight:800;color:rgba(255,255,255,0.65);letter-spacing:1.5px;text-transform:uppercase;">Now Delivering</p><p style="margin:4px 0 0;font-size:20px;font-weight:900;color:#ffffff;font-family:'Courier New',monospace;letter-spacing:2px;">${shortId}</p></td>
    <td style="padding:18px 24px;text-align:right;vertical-align:middle;font-size:36px;">&#128205;</td>
  </tr>
</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5fafb;border:1px solid #e5eff3;border-radius:14px;margin-bottom:24px;">
  <tr><td style="padding:20px 24px;">
    <p style="margin:0 0 14px;font-size:14px;font-weight:700;color:#1a3347;">Delivery Progress</p>
    <p style="margin:0 0 7px;font-size:13px;color:#0097a7;">&#10003;&nbsp;&nbsp;Order Received</p>
    <p style="margin:0 0 7px;font-size:13px;color:#0097a7;">&#10003;&nbsp;&nbsp;Prepared &amp; Dispatched</p>
    <p style="margin:0 0 7px;font-size:13px;font-weight:700;color:#1565c0;">&#128665;&nbsp;&nbsp;Out for Delivery &larr; <em>You are here</em></p>
    <p style="margin:0;font-size:13px;color:#b0c4cf;">&#9744;&nbsp;&nbsp;Delivered</p>
  </td></tr>
</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fffbeb;border:1px solid #fde68a;border-radius:14px;margin-bottom:28px;">
  <tr><td style="padding:18px 22px;">
    <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#92400e;">&#128241; Driver calling ahead</p>
    <p style="margin:0;font-size:13px;color:#78350f;line-height:1.6;">Our driver will call ~30 minutes before arriving. Please ensure someone is available or leave instructions.</p>
  </td></tr>
</table>
<p style="margin:0;font-size:13px;color:#8caab8;line-height:1.7;">${coPhone ? `Issues? Call <a href="tel:${coPhone}" style="color:#0097a7;font-weight:600;">${coPhone}</a> or email ` : 'Issues? Email '}<a href="mailto:${coEmail}" style="color:#0097a7;font-weight:600;">${coEmail}</a>.</p>
`, `${shortId} is on its way — expect your driver soon`, coEmail, coUrl, coPhone)
}

// ─── Delivered ────────────────────────────────────────────────────────────────
export function buildDeliveredEmail({ orderId, customerName, message }: {
  orderId: string; customerName: string; message?: string
}): string {
  const coEmail = process.env.NEXT_PUBLIC_COMPANY_EMAIL ?? 'info@tajwater.ca'
  const coUrl   = process.env.NEXT_PUBLIC_SITE_URL      ?? 'https://tajwater.ca'
  const shortId = 'TW-' + orderId.slice(-8).toUpperCase()
  const msgText = message
    ? message.replace(/\{\{customer_name\}\}/g, customerName).replace(/\{\{order_id\}\}/g, shortId)
    : `Great news, ${customerName}! Your order <strong style="color:#0097a7;">${shortId}</strong> has been delivered. Enjoy your fresh water!`
  return shell(`
<div style="text-align:center;margin-bottom:24px;">
  <p style="margin:0 0 6px;font-size:44px;">&#9989;</p>
  <h1 style="margin:0;font-size:26px;font-weight:900;color:#0c2340;">Delivered! Stay hydrated. &#128167;</h1>
</div>
<p style="margin:0 0 24px;font-size:15px;color:#6b8c9e;line-height:1.7;text-align:center;">${msgText}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#dcfce7;border:1px solid #bbf7d0;border-radius:12px;margin-bottom:24px;">
  <tr><td style="padding:14px 20px;">
    <p style="margin:0 0 3px;font-size:11px;font-weight:700;color:#16a34a;letter-spacing:0.5px;text-transform:uppercase;">&#10003; Order Delivered</p>
    <p style="margin:0;font-size:18px;font-weight:900;color:#14532d;font-family:'Courier New',monospace;letter-spacing:1px;">${shortId}</p>
  </td></tr>
</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
  <tr>
    <td style="padding-right:8px;width:50%;vertical-align:top;">
      <table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:12px;background-color:#0097a7;background-image:linear-gradient(135deg,#0097a7,#1565c0);"><a href="${coUrl}/dashboard/orders" style="display:inline-block;padding:12px 20px;color:#ffffff;font-size:13px;font-weight:700;text-decoration:none;">View Order Details</a></td></tr></table>
    </td>
    <td style="padding-left:8px;width:50%;vertical-align:top;">
      <table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:12px;background:#f5fafb;border:1px solid #e5eff3;"><a href="${coUrl}/shop" style="display:inline-block;padding:12px 20px;color:#0097a7;font-size:13px;font-weight:700;text-decoration:none;">Order Again &rarr;</a></td></tr></table>
    </td>
  </tr>
</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#e0f7fa;background-image:linear-gradient(135deg,#e0f7fa,#e3f2fd);border:1px solid #b3dce5;border-radius:14px;margin-bottom:28px;">
  <tr><td style="padding:18px 22px;">
    <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#0c2340;">&#128161; Never run out of water</p>
    <p style="margin:0 0 10px;font-size:13px;color:#4a7fa5;line-height:1.5;">Set up auto-delivery and save up to 15% on every order. Cancel anytime.</p>
    <a href="${coUrl}/shop" style="font-size:13px;font-weight:700;color:#0097a7;text-decoration:none;">Try a subscription &rarr;</a>
  </td></tr>
</table>
<p style="margin:0;font-size:13px;color:#8caab8;line-height:1.7;text-align:center;">Thank you for choosing TajWater!</p>
`, `${shortId} delivered — enjoy your fresh water!`, coEmail, coUrl)
}

// ─── Ticket Reply ─────────────────────────────────────────────────────────────
export function buildTicketReplyEmail({ ticketSubject, adminReply, customerName }: {
  ticketSubject: string; adminReply: string; customerName: string
}): string {
  const coEmail = process.env.NEXT_PUBLIC_COMPANY_EMAIL ?? 'info@tajwater.ca'
  const coUrl   = process.env.NEXT_PUBLIC_SITE_URL      ?? 'https://tajwater.ca'
  const safeReply = adminReply
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br/>')
  return shell(`
<h1 style="margin:0 0 6px;font-size:26px;font-weight:900;color:#0c2340;">We replied to your ticket &#128172;</h1>
<p style="margin:0 0 28px;font-size:15px;color:#6b8c9e;line-height:1.7;">Hi ${customerName}, our support team has responded to your request.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5fafb;border:1px solid #e5eff3;border-radius:12px;margin-bottom:16px;">
  <tr><td style="padding:14px 18px;">
    <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#0097a7;letter-spacing:0.5px;text-transform:uppercase;">Your Ticket</p>
    <p style="margin:0;font-size:14px;font-weight:600;color:#1a3347;">${ticketSubject}</p>
  </td></tr>
</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5fafb;border-top:1px solid #e5eff3;border-right:1px solid #e5eff3;border-bottom:1px solid #e5eff3;border-left:4px solid #0097a7;border-radius:0 12px 12px 0;margin-bottom:28px;">
  <tr><td style="padding:18px 22px;">
    <p style="margin:0 0 8px;font-size:11px;font-weight:700;color:#0097a7;letter-spacing:0.5px;text-transform:uppercase;">TajWater Support</p>
    <p style="margin:0;font-size:14px;color:#1a3347;line-height:1.7;">${safeReply}</p>
  </td></tr>
</table>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
  <tr><td style="border-radius:12px;background-color:#0097a7;background-image:linear-gradient(135deg,#0097a7,#1565c0);">
    <a href="${coUrl}/dashboard/support" style="display:inline-block;padding:14px 28px;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;">View Your Ticket &rarr;</a>
  </td></tr>
</table>
<p style="margin:0;font-size:13px;color:#8caab8;line-height:1.7;text-align:center;">Still need help? Reply to this email or contact <a href="mailto:${coEmail}" style="color:#0097a7;font-weight:600;">${coEmail}</a>.</p>
`, `Support reply: ${ticketSubject}`, coEmail, coUrl)
}


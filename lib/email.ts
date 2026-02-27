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
}): string {
  const shortId = 'TW-' + order.id.slice(-8).toUpperCase()
  const itemRows = order.items
    .map(
      item => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #e0f7fa;color:#0c2340;">${item.name}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e0f7fa;color:#4a7fa5;text-align:center;">${item.qty}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e0f7fa;color:#4a7fa5;text-align:right;">$${item.price.toFixed(2)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e0f7fa;font-weight:700;color:#0c2340;text-align:right;">$${(item.qty * item.price).toFixed(2)}</td>
      </tr>`
    )
    .join('')

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Order Confirmed</title></head>
<body style="margin:0;padding:0;background:#f0f9ff;font-family:system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f9ff;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,151,167,0.08);">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#0097a7,#1565c0);padding:32px 40px;text-align:center;">
            <h1 style="margin:0;color:#fff;font-size:28px;font-weight:800;letter-spacing:-0.5px;">💧 TajWater</h1>
            <p style="margin:8px 0 0;color:rgba(255,255,255,0.8);font-size:14px;">Metro Vancouver's Premium Water Delivery</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px 40px;">
            <h2 style="margin:0 0 8px;color:#0c2340;font-size:22px;">Order Confirmed! 🎉</h2>
            <p style="margin:0 0 24px;color:#4a7fa5;font-size:15px;">Hi ${order.customerName}, your order has been received and we're preparing it for delivery.</p>

            <div style="background:#f0f9ff;border-radius:12px;padding:16px 20px;margin-bottom:24px;">
              <p style="margin:0;font-size:13px;color:#4a7fa5;">Order Number</p>
              <p style="margin:4px 0 0;font-size:20px;font-weight:800;color:#0097a7;font-family:monospace;">${shortId}</p>
            </div>

            ${order.deliveryAddress ? `
            <div style="background:#f0f9ff;border-radius:12px;padding:16px 20px;margin-bottom:24px;">
              <p style="margin:0;font-size:13px;color:#4a7fa5;">Delivery Address</p>
              <p style="margin:4px 0 0;font-size:14px;color:#0c2340;">${order.deliveryAddress}</p>
              ${order.zone ? `<p style="margin:4px 0 0;font-size:13px;color:#0097a7;">Zone: ${order.zone}</p>` : ''}
            </div>` : ''}

            <!-- Items table -->
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e0f7fa;border-radius:12px;overflow:hidden;margin-bottom:24px;">
              <thead>
                <tr style="background:#e0f7fa;">
                  <th style="padding:10px 12px;text-align:left;font-size:12px;color:#0097a7;text-transform:uppercase;letter-spacing:0.5px;">Item</th>
                  <th style="padding:10px 12px;text-align:center;font-size:12px;color:#0097a7;text-transform:uppercase;letter-spacing:0.5px;">Qty</th>
                  <th style="padding:10px 12px;text-align:right;font-size:12px;color:#0097a7;text-transform:uppercase;letter-spacing:0.5px;">Price</th>
                  <th style="padding:10px 12px;text-align:right;font-size:12px;color:#0097a7;text-transform:uppercase;letter-spacing:0.5px;">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                ${itemRows}
                <tr>
                  <td colspan="3" style="padding:12px;text-align:right;font-weight:700;color:#0c2340;">Total</td>
                  <td style="padding:12px;text-align:right;font-size:18px;font-weight:800;color:#0097a7;">$${order.total.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>

            <div style="background:#e0f7fa;border-radius:12px;padding:16px 20px;margin-bottom:24px;border-left:4px solid #0097a7;">
              <p style="margin:0;font-size:14px;color:#006064;font-weight:600;">📅 Estimated Delivery</p>
              <p style="margin:6px 0 0;font-size:13px;color:#4a7fa5;">We typically deliver within 1–2 business days. You'll receive a call from our driver before delivery.</p>
            </div>

            <p style="margin:0;font-size:13px;color:#4a7fa5;">Questions? Reply to this email or contact us at <a href="mailto:${process.env.NEXT_PUBLIC_COMPANY_EMAIL ?? 'info@tajwater.ca'}" style="color:#0097a7;">${process.env.NEXT_PUBLIC_COMPANY_EMAIL ?? 'info@tajwater.ca'}</a></p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f0f9ff;padding:20px 40px;text-align:center;border-top:1px solid #e0f7fa;">
            <p style="margin:0;font-size:12px;color:#4a7fa5;">© ${new Date().getFullYear()} TajWater · Metro Vancouver · <a href="${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://tajwater.ca'}" style="color:#0097a7;">tajwater.ca</a></p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

const companyEmail = () => process.env.NEXT_PUBLIC_COMPANY_EMAIL ?? 'info@tajwater.ca'
const siteUrl = () => process.env.NEXT_PUBLIC_SITE_URL ?? 'https://tajwater.ca'

function emailWrapper(body: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f0f9ff;font-family:system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f9ff;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,151,167,0.08);">
        <tr>
          <td style="background:linear-gradient(135deg,#0097a7,#1565c0);padding:32px 40px;text-align:center;">
            <h1 style="margin:0;color:#fff;font-size:28px;font-weight:800;">💧 TajWater</h1>
            <p style="margin:8px 0 0;color:rgba(255,255,255,0.8);font-size:14px;">Metro Vancouver's Premium Water Delivery</p>
          </td>
        </tr>
        <tr><td style="padding:32px 40px;">${body}</td></tr>
        <tr>
          <td style="background:#f0f9ff;padding:20px 40px;text-align:center;border-top:1px solid #e0f7fa;">
            <p style="margin:0;font-size:12px;color:#4a7fa5;">© ${new Date().getFullYear()} TajWater · Metro Vancouver · <a href="${siteUrl()}" style="color:#0097a7;">tajwater.ca</a></p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export function buildWelcomeEmail({ customerName }: { customerName: string }): string {
  return emailWrapper(`
    <h2 style="margin:0 0 8px;color:#0c2340;font-size:22px;">Welcome to TajWater! 💧</h2>
    <p style="margin:0 0 20px;color:#4a7fa5;font-size:15px;">Hi ${customerName}, your account is ready. Fresh water is just a few clicks away.</p>
    <a href="${siteUrl()}/shop" style="display:inline-block;background:linear-gradient(135deg,#0097a7,#1565c0);color:#fff;padding:14px 28px;border-radius:12px;font-weight:700;text-decoration:none;font-size:15px;">Browse Our Water Selection</a>
    <p style="margin:24px 0 0;font-size:13px;color:#4a7fa5;">Questions? Contact us at <a href="mailto:${companyEmail()}" style="color:#0097a7;">${companyEmail()}</a></p>
  `)
}

export function buildOutForDeliveryEmail({ orderId, customerName, zone }: {
  orderId: string; customerName: string; zone?: string | null
}): string {
  const shortId = 'TW-' + orderId.slice(-8).toUpperCase()
  return emailWrapper(`
    <h2 style="margin:0 0 8px;color:#0c2340;font-size:22px;">Your water is on its way! 🚚</h2>
    <p style="margin:0 0 20px;color:#4a7fa5;font-size:15px;">Hi ${customerName}, your order <strong style="color:#0097a7;">${shortId}</strong> is out for delivery${zone ? ` to ${zone}` : ''}. Our driver will call before arriving.</p>
    <div style="background:#e0f7fa;border-radius:12px;padding:16px 20px;border-left:4px solid #0097a7;">
      <p style="margin:0;font-size:14px;color:#006064;font-weight:600;">📱 Driver will call ahead</p>
      <p style="margin:6px 0 0;font-size:13px;color:#4a7fa5;">Please ensure someone is available to receive the delivery or leave specific instructions.</p>
    </div>
    <p style="margin:20px 0 0;font-size:13px;color:#4a7fa5;">Questions? Contact us at <a href="mailto:${companyEmail()}" style="color:#0097a7;">${companyEmail()}</a></p>
  `)
}

export function buildDeliveredEmail({ orderId, customerName }: {
  orderId: string; customerName: string
}): string {
  const shortId = 'TW-' + orderId.slice(-8).toUpperCase()
  return emailWrapper(`
    <h2 style="margin:0 0 8px;color:#0c2340;font-size:22px;">Delivered! Stay hydrated 💧</h2>
    <p style="margin:0 0 20px;color:#4a7fa5;font-size:15px;">Hi ${customerName}, your order <strong style="color:#0097a7;">${shortId}</strong> has been delivered successfully. Enjoy fresh water!</p>
    <a href="${siteUrl()}/dashboard/orders" style="display:inline-block;background:linear-gradient(135deg,#0097a7,#1565c0);color:#fff;padding:12px 24px;border-radius:12px;font-weight:700;text-decoration:none;font-size:14px;">View Order Details</a>
    <p style="margin:20px 0 0;font-size:13px;color:#4a7fa5;">Ready for another delivery? <a href="${siteUrl()}/shop" style="color:#0097a7;">Shop now</a></p>
  `)
}

export function buildTicketReplyEmail({ ticketSubject, adminReply, customerName }: {
  ticketSubject: string; adminReply: string; customerName: string
}): string {
  const safeReply = adminReply
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br/>')
  return emailWrapper(`
    <h2 style="margin:0 0 8px;color:#0c2340;font-size:22px;">We replied to your support ticket</h2>
    <p style="margin:0 0 8px;color:#4a7fa5;font-size:15px;">Hi ${customerName}, here's our response to: <strong style="color:#0c2340;">${ticketSubject}</strong></p>
    <div style="background:#f0f9ff;border-radius:12px;padding:20px;border-left:4px solid #0097a7;margin:20px 0;">
      <p style="margin:0;font-size:14px;color:#0c2340;line-height:1.6;">${safeReply}</p>
    </div>
    <a href="${siteUrl()}/dashboard/support" style="display:inline-block;background:linear-gradient(135deg,#0097a7,#1565c0);color:#fff;padding:12px 24px;border-radius:12px;font-weight:700;text-decoration:none;font-size:14px;">View Ticket</a>
    <p style="margin:20px 0 0;font-size:13px;color:#4a7fa5;">Need more help? Reply to this email or visit <a href="${siteUrl()}/dashboard/support" style="color:#0097a7;">your support portal</a>.</p>
  `)
}

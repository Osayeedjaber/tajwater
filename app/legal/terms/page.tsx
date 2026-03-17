import Link from 'next/link'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#f0f9ff]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
        <div className="mb-8">
          <Link href="/" className="text-sm text-[#0097a7] hover:underline">← Back to Home</Link>
        </div>

        <div className="bg-white rounded-3xl border border-[#cce7f0] shadow-sm p-8 sm:p-12 prose prose-slate max-w-none">
          <h1 className="text-3xl font-extrabold text-[#0c2340] mb-2">Terms of Service</h1>
          <p className="text-[#4a7fa5] text-sm mb-8">Last updated: February 2026</p>

          <h2 className="text-lg font-bold text-[#0c2340] mt-8 mb-3">1. Acceptance of Terms</h2>
          <p className="text-[#4a7fa5] leading-relaxed">
            By placing an order or using the TajWater website, you agree to be bound by these Terms of Service. If you do not agree, please do not use our services.
          </p>

          <h2 className="text-lg font-bold text-[#0c2340] mt-8 mb-3">2. Service Description</h2>
          <p className="text-[#4a7fa5] leading-relaxed">
            TajWater provides bottled water delivery services within Metro Vancouver. We offer one-time and recurring subscription deliveries. Service availability is subject to your delivery zone.
          </p>

          <h2 className="text-lg font-bold text-[#0c2340] mt-8 mb-3">3. Orders and Payment</h2>
          <p className="text-[#4a7fa5] leading-relaxed">
            All orders are subject to product availability. Prices are displayed in Canadian dollars (CAD) and include applicable taxes (GST + PST). Payment is processed securely through Square at the time of order. We reserve the right to cancel or refuse any order.
          </p>

          <h2 className="text-lg font-bold text-[#0c2340] mt-8 mb-3">4. Delivery</h2>
          <p className="text-[#4a7fa5] leading-relaxed">
            Delivery windows are estimates only. TajWater is not liable for delays due to weather, traffic, or other circumstances outside our control. You must ensure someone is available to receive the delivery or provide specific instructions.
          </p>

          <h2 className="text-lg font-bold text-[#0c2340] mt-8 mb-3">5. Cancellations and Refunds</h2>
          <p className="text-[#4a7fa5] leading-relaxed">
            Orders may be cancelled before dispatch for a full refund. Once an order is out for delivery, cancellations are subject to our discretion. Subscription cancellations take effect at the next billing cycle. Refunds are processed to the original payment method within 5–10 business days.
          </p>

          <h2 className="text-lg font-bold text-[#0c2340] mt-8 mb-3">6. Subscriptions</h2>
          <p className="text-[#4a7fa5] leading-relaxed">
            Subscription plans renew automatically at the selected frequency (weekly, biweekly, or monthly). You may pause or cancel your subscription at any time from your dashboard. No cancellation fees apply.
          </p>

          <h2 className="text-lg font-bold text-[#0c2340] mt-8 mb-3">7. Limitation of Liability</h2>
          <p className="text-[#4a7fa5] leading-relaxed">
            TajWater&apos;s liability is limited to the value of the order in question. We are not liable for indirect, incidental, or consequential damages. Our products are food-grade certified and tested regularly.
          </p>

          <h2 className="text-lg font-bold text-[#0c2340] mt-8 mb-3">8. Changes to Terms</h2>
          <p className="text-[#4a7fa5] leading-relaxed">
            We may update these terms at any time. Continued use of our services after changes constitutes acceptance of the new terms.
          </p>

          <h2 className="text-lg font-bold text-[#0c2340] mt-8 mb-3">9. Contact</h2>
          <p className="text-[#4a7fa5] leading-relaxed">
            Questions about these terms? Contact us at{' '}
            <a href="mailto:info@tajwater.ca" className="text-[#0097a7] hover:underline">info@tajwater.ca</a>.
          </p>
        </div>
      </div>
    </div>
  )
}

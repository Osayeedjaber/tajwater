import Link from 'next/link'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#f0f9ff]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
        <div className="mb-8">
          <Link href="/" className="text-sm text-[#0097a7] hover:underline">← Back to Home</Link>
        </div>

        <div className="bg-white rounded-3xl border border-[#cce7f0] shadow-sm p-8 sm:p-12 prose prose-slate max-w-none">
          <h1 className="text-3xl font-extrabold text-[#0c2340] mb-2">Privacy Policy</h1>
          <p className="text-[#4a7fa5] text-sm mb-8">Last updated: February 2026 · PIPEDA compliant</p>

          <p className="text-[#4a7fa5] leading-relaxed">
            TajWater (&quot;we&quot;, &quot;our&quot;, &quot;us&quot;) is committed to protecting your privacy. This policy explains how we collect, use, and safeguard your personal information in accordance with the Personal Information Protection and Electronic Documents Act (PIPEDA).
          </p>

          <h2 className="text-lg font-bold text-[#0c2340] mt-8 mb-3">1. Information We Collect</h2>
          <ul className="text-[#4a7fa5] leading-relaxed space-y-1 list-disc list-inside">
            <li><strong>Account information:</strong> Name, email address, phone number</li>
            <li><strong>Delivery information:</strong> Delivery address and zone</li>
            <li><strong>Payment information:</strong> Processed securely by Stripe — we never store card numbers</li>
            <li><strong>Order history:</strong> Products ordered, amounts, delivery dates</li>
            <li><strong>Usage data:</strong> Pages visited, browser type, IP address (for security and analytics)</li>
            <li><strong>Communications:</strong> Support tickets, emails you send us</li>
          </ul>

          <h2 className="text-lg font-bold text-[#0c2340] mt-8 mb-3">2. How We Use Your Information</h2>
          <ul className="text-[#4a7fa5] leading-relaxed space-y-1 list-disc list-inside">
            <li>To process and fulfill your orders</li>
            <li>To send order confirmations, delivery notifications, and invoices</li>
            <li>To manage your subscription and account</li>
            <li>To respond to support requests</li>
            <li>To send promotional emails (only with your consent — you can unsubscribe anytime)</li>
            <li>To improve our services and website</li>
            <li>To comply with legal obligations</li>
          </ul>

          <h2 className="text-lg font-bold text-[#0c2340] mt-8 mb-3">3. Information Sharing</h2>
          <p className="text-[#4a7fa5] leading-relaxed">
            We do not sell your personal information. We share data only with:
          </p>
          <ul className="text-[#4a7fa5] leading-relaxed space-y-1 list-disc list-inside mt-2">
            <li><strong>Stripe</strong> — to process payments securely</li>
            <li><strong>Supabase</strong> — our database and authentication provider</li>
            <li><strong>Resend</strong> — to deliver transactional emails</li>
            <li><strong>Our delivery drivers</strong> — only your name, address, and order notes</li>
            <li>Law enforcement when required by law</li>
          </ul>

          <h2 className="text-lg font-bold text-[#0c2340] mt-8 mb-3">4. Data Retention</h2>
          <p className="text-[#4a7fa5] leading-relaxed">
            We retain your account information for as long as your account is active. Order records are kept for 7 years for tax and legal compliance. You may request deletion of your account and personal data at any time.
          </p>

          <h2 className="text-lg font-bold text-[#0c2340] mt-8 mb-3">5. Your Rights (PIPEDA)</h2>
          <p className="text-[#4a7fa5] leading-relaxed">Under PIPEDA, you have the right to:</p>
          <ul className="text-[#4a7fa5] leading-relaxed space-y-1 list-disc list-inside mt-2">
            <li>Access the personal information we hold about you</li>
            <li>Correct inaccurate information</li>
            <li>Withdraw consent to certain uses of your data</li>
            <li>Request deletion of your account (subject to legal retention requirements)</li>
            <li>File a complaint with the Office of the Privacy Commissioner of Canada</li>
          </ul>

          <h2 className="text-lg font-bold text-[#0c2340] mt-8 mb-3">6. Security</h2>
          <p className="text-[#4a7fa5] leading-relaxed">
            We use industry-standard security measures including SSL encryption, secure authentication, and Row-Level Security on our database. Payment data is handled exclusively by Stripe (PCI-DSS compliant).
          </p>

          <h2 className="text-lg font-bold text-[#0c2340] mt-8 mb-3">7. Cookies</h2>
          <p className="text-[#4a7fa5] leading-relaxed">
            We use essential cookies for authentication and session management. We may use analytics cookies to understand how visitors use our site. You can disable non-essential cookies in your browser settings.
          </p>

          <h2 className="text-lg font-bold text-[#0c2340] mt-8 mb-3">8. Contact Our Privacy Officer</h2>
          <p className="text-[#4a7fa5] leading-relaxed">
            For privacy inquiries, access requests, or complaints, contact us at:{' '}
            <a href="mailto:privacy@tajwater.ca" className="text-[#0097a7] hover:underline">privacy@tajwater.ca</a>
            <br />
            TajWater · Metro Vancouver, BC, Canada
          </p>
        </div>
      </div>
    </div>
  )
}

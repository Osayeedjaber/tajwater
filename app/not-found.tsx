import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#f0f9ff] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 rounded-3xl bg-[#e0f7fa] flex items-center justify-center mx-auto mb-6">
          <span className="text-4xl">💧</span>
        </div>
        <h1 className="text-6xl font-extrabold text-[#0097a7] mb-2">404</h1>
        <h2 className="text-2xl font-bold text-[#0c2340] mb-3">Page Not Found</h2>
        <p className="text-[#4a7fa5] mb-8">
          Looks like this page dried up. Let&apos;s get you back on track.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#0097a7] to-[#1565c0] text-white font-semibold hover:opacity-90 transition-opacity"
          >
            Go Home
          </Link>
          <Link
            href="/shop"
            className="px-6 py-3 rounded-xl border border-[#cce7f0] text-[#0097a7] font-semibold hover:border-[#0097a7] transition-colors"
          >
            Browse Shop
          </Link>
        </div>
      </div>
    </div>
  )
}

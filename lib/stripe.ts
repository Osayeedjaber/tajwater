import Stripe from 'stripe'

// Lazy initialization — Stripe is only constructed when first accessed,
// not at module load time. This prevents build failures when env vars are absent.
let _client: Stripe | undefined

export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    if (!_client) {
      _client = new Stripe(process.env.STRIPE_SECRET_KEY!, {
        apiVersion: '2026-02-25.clover',
      })
    }
    return (_client as unknown as Record<string | symbol, unknown>)[prop]
  },
})

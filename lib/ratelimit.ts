/**
 * Simple in-memory rate limiter.
 * Suitable for single-instance deployments; for multi-instance use Upstash Redis.
 */

type Window = { count: number; resetAt: number }
const store = new Map<string, Window>()

/**
 * Returns true if the request is ALLOWED, false if rate-limited.
 * @param key     Unique identifier (e.g. IP address + route)
 * @param limit   Max requests per window
 * @param windowMs Window duration in milliseconds
 */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now >= entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }

  if (entry.count >= limit) {
    return false
  }

  entry.count += 1
  return true
}

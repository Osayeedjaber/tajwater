/**
 * Environment variable validation.
 * Call validateServerEnv() at the start of API route handlers.
 * This catches misconfigured deployments with clear error messages.
 */

const SERVER_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'RESEND_API_KEY',
] as const

export function validateServerEnv(): void {
  for (const key of SERVER_VARS) {
    if (!process.env[key]) {
      throw new Error(
        `Missing required environment variable: ${key}\n` +
        `Check your .env.local file or deployment environment settings.`
      )
    }
  }
}

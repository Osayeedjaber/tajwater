import { createBrowserClient } from '@supabase/ssr'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Lazy browser client — only instantiated on first access, not at module load time.
// Uses @supabase/ssr so the session is stored in cookies (not localStorage),
// allowing proxy.ts to read it server-side and keep the user logged in.
let _supabase: SupabaseClient | undefined

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    if (!_supabase) {
      _supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      )
    }
    return (_supabase as unknown as Record<string | symbol, unknown>)[prop]
  },
})

// Server client — uses service role key, bypasses RLS. Only call inside API routes.
export function createServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false },
    }
  )
}

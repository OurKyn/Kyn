import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Creates a Supabase client for server-side usage.
 * Uses environment variables and Next.js cookies for session management.
 * Uses get/set/remove cookie API for Next.js 15 compatibility.
 */
export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (key) => cookieStore.get(key)?.value,
        set: (key, value, options) => {
          cookieStore.set({ name: key, value, ...options })
        },
        remove: (key, options) => {
          cookieStore.set({ name: key, value: '', ...options })
        },
      },
    }
  )
}

import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

export async function updateSession(request: NextRequest) {
  const response = NextResponse.next()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (key) => request.cookies.get(key)?.value,
        set: (key, value, options) => {
          response.cookies.set({ name: key, value, ...options })
        },
        remove: (key, options) => {
          response.cookies.set({ name: key, value: '', ...options })
        },
      },
    }
  )
  await supabase.auth.getUser()
  return response
}

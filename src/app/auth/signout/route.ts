import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request): Promise<NextResponse> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  // Use: const origin = (request as Request & { nextUrl?: { origin?: string } }).nextUrl?.origin || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  const origin =
    (request as Request & { nextUrl?: { origin?: string } }).nextUrl?.origin ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    'http://localhost:3000'
  return NextResponse.redirect(`${origin}/`, { status: 302 })
}

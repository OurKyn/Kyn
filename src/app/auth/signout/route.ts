import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(): Promise<NextResponse> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  return NextResponse.redirect('/', { status: 302 })
}

import { HomeContent } from '@/components/home-content'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export default async function Home() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()
  const user = data?.user

  if (!user) {
    redirect('/auth/login')
  }
  if (!user.email) {
    return null
  }
  return <HomeContent email={user.email} />
}

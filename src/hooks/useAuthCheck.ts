import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

export function useAuthCheck() {
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      const { data, error } = await supabase.auth.getUser()
      if (error || !data?.user) {
        router.replace('/auth/login')
      }
    }
    checkAuth()
  }, [router, supabase])
}

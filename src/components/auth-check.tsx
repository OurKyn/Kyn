import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { createClient } from '@/utils/supabase/client'

interface AuthCheckProps {
  children: React.ReactNode
}

export default function AuthCheck({ children }: AuthCheckProps) {
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

  return <>{children}</>
}

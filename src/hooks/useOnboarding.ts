import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

export interface OnboardingForm {
  fullName: string
  avatarUrl?: string
}

export function useOnboarding() {
  const supabase = createClient()
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const onSubmit = async (data: OnboardingForm) => {
    setLoading(true)
    setError(null)
    const { data: userData, error: userError } = await supabase.auth.getUser()
    if (userError || !userData?.user) {
      setError('Not authenticated')
      setLoading(false)
      return
    }
    const { error: upsertError } = await supabase.from('profiles').upsert({
      user_id: userData.user.id,
      email: userData.user.email,
      full_name: data.fullName,
      avatar_url: data.avatarUrl || null,
    })
    if (upsertError) {
      setError(upsertError.message)
      setLoading(false)
      return
    }
    router.push('/')
  }

  return {
    loading,
    error,
    onSubmit,
    setError,
  }
}

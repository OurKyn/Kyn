import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'

export interface ProfileForm {
  fullName: string
  avatarUrl?: string
}

export function useProfile(reset: (values: ProfileForm) => void) {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadProfile = async () => {
    setLoading(true)
    setError(null)
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    if (userError || !user) {
      setError('Not authenticated')
      setLoading(false)
      return
    }
    const { data, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()
    if (profileError) {
      setError('Could not load profile')
    } else {
      reset({
        fullName: data.full_name || '',
        avatarUrl: data.avatar_url || '',
      })
    }
    setLoading(false)
  }

  useEffect(() => {
    loadProfile()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reset, supabase])

  const onSubmit = async (values: ProfileForm) => {
    setError(null)
    setLoading(true)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setError('Not authenticated')
      setLoading(false)
      return
    }
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        full_name: values.fullName,
        avatar_url: values.avatarUrl || null,
      })
      .eq('user_id', user.id)
    if (updateError) {
      setError('Failed to update profile')
    }
    setLoading(false)
  }

  return {
    loading,
    error,
    onSubmit,
    loadProfile,
    setError,
  }
}

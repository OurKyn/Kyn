import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/utils/supabase/client'

export interface ProfileForm {
  fullName: string
  avatarUrl?: string
}

export function useProfile(reset: (values: ProfileForm) => void) {
  const supabase = createClient()
  const queryClient = useQueryClient()

  // Get user
  const userQuery = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const { data, error } = await supabase.auth.getUser()
      if (error || !data?.user) throw new Error('Not authenticated')
      return data.user
    },
  })
  const user = userQuery.data

  // Get profile
  const profileQuery = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated')
      const { data, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()
      if (profileError) throw new Error('Could not load profile')
      reset({
        fullName: data.full_name || '',
        avatarUrl: data.avatar_url || '',
      })
      return data
    },
    enabled: !!user,
  })

  const onSubmit = async (values: ProfileForm) => {
    if (!user) throw new Error('Not authenticated')
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        full_name: values.fullName,
        avatar_url: values.avatarUrl || null,
      })
      .eq('user_id', user.id)
    if (updateError) throw new Error('Failed to update profile')
    queryClient.invalidateQueries({ queryKey: ['profile', user.id] })
  }

  return {
    isLoading: userQuery.isLoading || profileQuery.isLoading,
    error: userQuery.error || profileQuery.error,
    onSubmit,
    profile: profileQuery.data,
  }
}

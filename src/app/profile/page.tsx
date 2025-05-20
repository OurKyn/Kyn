'use client'

import { createClient } from '@/utils/supabase/client'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'

const profileSchema = z.object({
  fullName: z.string().min(2, 'Name required'),
  avatarUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
})

type ProfileForm = z.infer<typeof profileSchema>

export default function ProfilePage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { fullName: '', avatarUrl: '' },
  })

  useEffect(() => {
    async function fetchProfile() {
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
    fetchProfile()
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

  return (
    <div className="max-w-md mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">Edit Profile</h1>
      {loading && <div className="text-gray-500">Loading...</div>}
      {error && <div className="text-red-500 mb-2">{error}</div>}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label htmlFor="fullName" className="block text-sm font-medium mb-1">
            Full Name
          </label>
          <input
            id="fullName"
            type="text"
            {...register('fullName')}
            className="w-full border rounded px-3 py-2 focus:outline-none focus:ring focus:border-blue-300"
            disabled={isSubmitting || loading}
          />
          {errors.fullName && (
            <p className="text-red-500 text-xs mt-1">
              {errors.fullName.message}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="avatarUrl" className="block text-sm font-medium mb-1">
            Avatar URL
          </label>
          <input
            id="avatarUrl"
            type="url"
            {...register('avatarUrl')}
            className="w-full border rounded px-3 py-2 focus:outline-none focus:ring focus:border-blue-300"
            disabled={isSubmitting || loading}
          />
          {errors.avatarUrl && (
            <p className="text-red-500 text-xs mt-1">
              {errors.avatarUrl.message}
            </p>
          )}
        </div>
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          disabled={isSubmitting || loading}
        >
          Save Changes
        </button>
      </form>
    </div>
  )
}

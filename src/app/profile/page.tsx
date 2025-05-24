'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useProfile, ProfileForm } from '@/hooks/useProfile'
import { LoadingState } from '@/components/loading-state'
import { z } from 'zod'

const profileSchema = z.object({
  fullName: z.string().min(2, 'Name required'),
  avatarUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
})

export default function ProfilePage() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { fullName: '', avatarUrl: '' },
  })
  const { isLoading, error, onSubmit } = useProfile(reset)

  return (
    <div className="max-w-md mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">Edit Profile</h1>
      {isLoading && <LoadingState message="Loading profile..." />}
      {error && (
        <div className="text-red-500 mb-2">
          {typeof error === 'object' && error !== null && 'message' in error
            ? error.message
            : String(error)}
        </div>
      )}
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
            disabled={isSubmitting || isLoading}
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
            disabled={isSubmitting || isLoading}
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
          disabled={isSubmitting || isLoading}
        >
          Save Changes
        </button>
      </form>
    </div>
  )
}

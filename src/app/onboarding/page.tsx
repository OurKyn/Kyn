'use client'

import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useOnboarding, OnboardingForm } from '@/hooks/useOnboarding'
import { motion } from 'framer-motion'
import AuthCheck from '@/components/auth-check'
import { LoadingState } from '@/components/loading-state'

const profileSchema = z.object({
  fullName: z.string().min(2, 'Full name required'),
  avatarUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
})

export default function OnboardingPage() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<OnboardingForm>({
    resolver: zodResolver(profileSchema),
  })
  const { loading, error, onSubmit } = useOnboarding()

  return (
    <AuthCheck>
      <motion.div
        className="rounded-2xl shadow-xl bg-white/80 dark:bg-brand-dark/80 border border-brand/10 dark:border-brand-accent/20 backdrop-blur-md p-6 sm:p-8 space-y-8"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
      >
        <motion.h2
          className="text-2xl md:text-3xl font-bold text-center bg-gradient-to-r from-brand via-brand-accent to-brand-dark bg-clip-text text-transparent animate-gradient"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.7 }}
        >
          Complete your profile
        </motion.h2>
        {loading ? (
          <LoadingState message="Saving..." />
        ) : (
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-6"
            aria-label="Onboarding form"
          >
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium">
                Full Name
              </label>
              <input
                id="fullName"
                type="text"
                autoComplete="name"
                {...register('fullName')}
                className="mt-1 block w-full rounded border border-brand/20 dark:border-brand-accent/30 bg-white/70 dark:bg-brand-dark/60 shadow-sm focus:border-brand-accent focus:ring-brand-accent transition-colors"
                aria-invalid={!!errors.fullName}
                aria-describedby={
                  errors.fullName ? 'fullName-error' : undefined
                }
              />
              {errors.fullName && (
                <p id="fullName-error" className="mt-1 text-xs text-red-600">
                  {errors.fullName.message}
                </p>
              )}
            </div>
            <div>
              <label htmlFor="avatarUrl" className="block text-sm font-medium">
                Avatar URL (optional)
              </label>
              <input
                id="avatarUrl"
                type="url"
                autoComplete="url"
                {...register('avatarUrl')}
                className="mt-1 block w-full rounded border border-brand/20 dark:border-brand-accent/30 bg-white/70 dark:bg-brand-dark/60 shadow-sm focus:border-brand-accent focus:ring-brand-accent transition-colors"
                aria-invalid={!!errors.avatarUrl}
                aria-describedby={
                  errors.avatarUrl ? 'avatarUrl-error' : undefined
                }
              />
              {errors.avatarUrl && (
                <p id="avatarUrl-error" className="mt-1 text-xs text-red-600">
                  {errors.avatarUrl.message}
                </p>
              )}
            </div>
            {error && <div className="text-red-600 text-sm">{error}</div>}
            <motion.button
              type="submit"
              className="w-full py-2 px-4 rounded-lg bg-brand-accent text-brand-dark font-bold shadow-md hover:scale-105 active:scale-95 transition-transform duration-200 focus:outline-none focus:ring-2 focus:ring-brand-accent focus:ring-offset-2 disabled:opacity-50"
              disabled={loading}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {loading ? 'Saving...' : 'Save Profile'}
            </motion.button>
          </form>
        )}
      </motion.div>
    </AuthCheck>
  )
}

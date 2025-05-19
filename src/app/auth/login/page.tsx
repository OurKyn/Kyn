'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'

const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type LoginForm = z.infer<typeof loginSchema>

export default function LoginPage() {
  const supabase = createClient()
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  async function handleLogin(data: LoginForm) {
    setLoading(true)
    setError(null)
    setSuccess(null)
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    setSuccess('Login successful! Redirecting...')
    setTimeout(() => {
      router.push('/')
    }, 1000)
  }

  return (
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
        Sign in to Kyn
      </motion.h2>
      <form
        onSubmit={handleSubmit(handleLogin)}
        className="space-y-6"
        aria-label="Login form"
      >
        <div>
          <label htmlFor="email" className="block text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            {...register('email')}
            className="mt-1 block w-full rounded border border-brand/20 dark:border-brand-accent/30 bg-white/70 dark:bg-brand-dark/60 shadow-sm focus:border-brand-accent focus:ring-brand-accent transition-colors"
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? 'email-error' : undefined}
          />
          {errors.email && (
            <p id="email-error" className="mt-1 text-xs text-red-600">
              {errors.email.message}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            {...register('password')}
            className="mt-1 block w-full rounded border border-brand/20 dark:border-brand-accent/30 bg-white/70 dark:bg-brand-dark/60 shadow-sm focus:border-brand-accent focus:ring-brand-accent transition-colors"
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? 'password-error' : undefined}
          />
          {errors.password && (
            <p id="password-error" className="mt-1 text-xs text-red-600">
              {errors.password.message}
            </p>
          )}
        </div>
        {error && <div className="text-red-600 text-sm">{error}</div>}
        {success && <div className="text-green-600 text-sm">{success}</div>}
        <motion.button
          type="submit"
          className="w-full py-2 px-4 rounded-lg bg-brand-accent text-brand-dark font-bold shadow-md hover:scale-105 active:scale-95 transition-transform duration-200 focus:outline-none focus:ring-2 focus:ring-brand-accent focus:ring-offset-2 disabled:opacity-50"
          disabled={loading}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </motion.button>
        <p className="text-center text-sm">
          Don&apos;t have an account?{' '}
          <a
            href="/auth/register"
            className="text-brand-accent hover:underline"
          >
            Register
          </a>
        </p>
      </form>
    </motion.div>
  )
}

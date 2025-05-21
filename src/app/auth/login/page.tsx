'use client'

import { useState } from 'react'
import { z } from 'zod'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { AuthForm } from '@/components/auth-form'
import { LoadingState } from '@/components/loading-state'

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
      {loading ? (
        <LoadingState message="Signing in..." />
      ) : (
        <>
          <AuthForm
            schema={loginSchema}
            onSubmit={handleLogin}
            buttonText={loading ? 'Signing in...' : 'Sign In'}
          />
          {error && <div className="text-red-600 text-sm">{error}</div>}
          {success && <div className="text-green-600 text-sm">{success}</div>}
          <p className="text-center text-sm">
            Don&apos;t have an account?{' '}
            <a
              href="/auth/register"
              className="text-brand-accent hover:underline"
            >
              Register
            </a>
          </p>
        </>
      )}
    </motion.div>
  )
}

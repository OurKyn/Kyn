'use client'

import { useState } from 'react'
import { z } from 'zod'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { AuthForm } from '@/components/auth-form'

const registerSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type RegisterForm = z.infer<typeof registerSchema>

export default function RegisterPage() {
  const supabase = createClient()
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleRegister(data: RegisterForm) {
    setLoading(true)
    setError(null)
    setSuccess(null)
    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
    })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    setSuccess('Registration successful! Redirecting...')
    setTimeout(() => {
      router.push('/onboarding')
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
        Create your Kyn account
      </motion.h2>
      <AuthForm
        schema={registerSchema}
        onSubmit={handleRegister}
        buttonText={loading ? 'Registering...' : 'Register'}
      />
      {error && <div className="text-red-600 text-sm">{error}</div>}
      {success && <div className="text-green-600 text-sm">{success}</div>}
      <p className="text-center text-sm">
        Already have an account?{' '}
        <a href="/auth/login" className="text-brand-accent hover:underline">
          Sign in
        </a>
      </p>
    </motion.div>
  )
}

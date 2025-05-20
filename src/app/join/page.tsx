'use client'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { z } from 'zod'
import { AuthForm } from '@/components/auth-form'
import { LoadingState } from '@/components/loading-state'
import { joinFamily } from '@/hooks/useFamily'
import { createClient } from '@/utils/supabase/client'

const joinSchema = z.object({
  password: z.string().min(4, 'Invite password required').optional(),
})

export default function JoinPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [mode, setMode] = useState<'token' | 'password' | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [familyId, setFamilyId] = useState<string | null>(null)

  // Check auth and parse params
  useEffect(() => {
    const supabase = createClient()
    async function check() {
      setLoading(true)
      setError(null)
      const { data, error: userError } = await supabase.auth.getUser()
      if (userError || !data?.user) {
        router.replace('/auth/login?next=/join' + window.location.search)
        return
      }
      // Check for profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', data.user.id)
        .single()
      if (profileError || !profile) {
        router.replace('/onboarding?next=/join' + window.location.search)
        return
      }
      // Parse token/family from URL
      const urlToken = searchParams.get('token')
      const urlFamily = searchParams.get('family')
      if (urlToken && urlFamily) {
        setMode('token')
        setToken(urlToken)
        setFamilyId(urlFamily)
      } else {
        setMode('password')
      }
      setLoading(false)
    }
    check()
  }, [router, searchParams])

  // Handle join by token (QR)
  useEffect(() => {
    if (mode === 'token' && token && familyId && !loading && !error) {
      setLoading(true)
      joinFamily('token', token).then((res) => {
        if (res.success) {
          setSuccess('Joined family! Redirecting...')
          setTimeout(() => router.replace('/family'), 1200)
        } else {
          setError(res.error || 'Failed to join family')
        }
        setLoading(false)
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, token, familyId, loading, error])

  // Handle join by password
  async function handleJoin({ password }: { password?: string }) {
    setLoading(true)
    setError(null)
    setSuccess(null)
    if (!password) {
      setError('Invite password required')
      setLoading(false)
      return
    }
    const res = await joinFamily('password', password)
    if (res.success) {
      setSuccess('Joined family! Redirecting...')
      setTimeout(() => router.replace('/family'), 1200)
    } else {
      setError(res.error || 'Failed to join family')
    }
    setLoading(false)
  }

  return (
    <div className="max-w-md mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">Join a Family</h1>
      {loading ? (
        <LoadingState message="Checking invite..." />
      ) : error ? (
        <div className="text-red-600 text-sm mb-4">{error}</div>
      ) : success ? (
        <div className="text-green-600 text-sm mb-4">{success}</div>
      ) : mode === 'password' ? (
        <>
          <p className="mb-2 text-sm text-gray-600">
            Enter your family invite password below.
          </p>
          <AuthForm
            schema={joinSchema}
            onSubmit={handleJoin}
            buttonText={loading ? 'Joining...' : 'Join Family'}
          />
        </>
      ) : (
        <LoadingState message="Joining family..." />
      )}
    </div>
  )
}

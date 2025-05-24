'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useFamilyContext } from '@/context/family-context'
import { createClient } from '@/utils/supabase/client'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { LoadingState } from '@/components/loading-state'
import { EmptyState } from '@/components/empty-state'
import Image from 'next/image'

const healthLogSchema = z.object({
  date: z.string().min(1, 'Date required'),
  steps: z.number().min(0).optional(),
  calories: z.number().min(0).optional(),
  sleepHours: z.number().min(0).max(24).optional(),
  notes: z.string().max(200).optional(),
})

type HealthLogForm = z.infer<typeof healthLogSchema>

const challengeSchema = z.object({
  title: z.string().min(2, 'Title required'),
  description: z.string().optional(),
  startDate: z.string().min(1, 'Start date required'),
  endDate: z.string().min(1, 'End date required'),
})

type ChallengeForm = z.infer<typeof challengeSchema>

interface HealthLog {
  id: string
  family_id: string
  profile_id: string
  date: string
  steps?: number
  calories?: number
  sleep_hours?: number
  notes?: string
  profiles?: {
    full_name?: string | null
    avatar_url?: string | null
  }
}

interface Challenge {
  id: string
  family_id: string
  title: string
  description?: string | null
  start_date: string
  end_date: string
  created_by: string
  profiles?: {
    full_name?: string | null
  }
}

export default function HealthPage() {
  const { selectedFamilyId } = useFamilyContext()
  const supabase = createClient()
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const [challengeError, setChallengeError] = useState<string | null>(null)

  // Fetch health logs for the family
  const { data: logs, isLoading: logsLoading } = useQuery({
    queryKey: ['health_logs', selectedFamilyId],
    queryFn: async () => {
      if (!selectedFamilyId) return []
      const { data, error } = await supabase
        .from('family_health_logs')
        .select('*, profiles(full_name, avatar_url)')
        .eq('family_id', selectedFamilyId)
        .order('date', { ascending: false })
      if (error) throw new Error('Failed to fetch logs')
      return data as HealthLog[]
    },
    enabled: !!selectedFamilyId,
  })

  // Fetch fitness challenges
  const { data: challenges, isLoading: challengesLoading } = useQuery({
    queryKey: ['fitness_challenges', selectedFamilyId],
    queryFn: async () => {
      if (!selectedFamilyId) return []
      const { data, error } = await supabase
        .from('family_fitness_challenges')
        .select('*, profiles(full_name)')
        .eq('family_id', selectedFamilyId)
        .order('start_date', { ascending: false })
      if (error) throw new Error('Failed to fetch challenges')
      return data as Challenge[]
    },
    enabled: !!selectedFamilyId,
  })

  // Health log form
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<HealthLogForm>({
    resolver: zodResolver(healthLogSchema),
    defaultValues: {
      date: '',
      steps: 0,
      calories: 0,
      sleepHours: 0,
      notes: '',
    },
  })

  const logMutation = useMutation({
    mutationFn: async (values: HealthLogForm) => {
      setError(null)
      if (!selectedFamilyId) throw new Error('No family selected')
      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError || !userData?.user) throw new Error('Not authenticated')
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', userData.user.id)
        .single()
      if (profileError || !profile) throw new Error('Profile not found')
      const { error: upsertError } = await supabase
        .from('family_health_logs')
        .upsert(
          {
            family_id: selectedFamilyId,
            profile_id: profile.id,
            date: values.date,
            steps: values.steps,
            calories: values.calories,
            sleep_hours: values.sleepHours,
            notes: values.notes,
          },
          { onConflict: ['family_id', 'profile_id', 'date'] }
        )
      if (upsertError) throw new Error('Failed to log health data')
    },
    onSuccess: () => {
      reset()
      queryClient.invalidateQueries({
        queryKey: ['health_logs', selectedFamilyId],
      })
    },
    onError: (err: unknown) => {
      if (err instanceof Error) setError(err.message)
      else setError('Failed to log health data')
    },
  })

  // Challenge form
  const {
    register: registerChallenge,
    handleSubmit: handleSubmitChallenge,
    reset: resetChallenge,
    formState: { errors: challengeErrors, isSubmitting: challengeSubmitting },
  } = useForm<ChallengeForm>({
    resolver: zodResolver(challengeSchema),
    defaultValues: { title: '', description: '', startDate: '', endDate: '' },
  })

  const challengeMutation = useMutation({
    mutationFn: async (values: ChallengeForm) => {
      setChallengeError(null)
      if (!selectedFamilyId) throw new Error('No family selected')
      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError || !userData?.user) throw new Error('Not authenticated')
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', userData.user.id)
        .single()
      if (profileError || !profile) throw new Error('Profile not found')
      const { error: insertError } = await supabase
        .from('family_fitness_challenges')
        .insert({
          family_id: selectedFamilyId,
          title: values.title,
          description: values.description,
          start_date: values.startDate,
          end_date: values.endDate,
          created_by: profile.id,
        })
      if (insertError) throw new Error('Failed to create challenge')
    },
    onSuccess: () => {
      resetChallenge()
      queryClient.invalidateQueries({
        queryKey: ['fitness_challenges', selectedFamilyId],
      })
    },
    onError: (err: unknown) => {
      if (err instanceof Error) setChallengeError(err.message)
      else setChallengeError('Failed to create challenge')
    },
  })

  // Leaderboard (sum steps by profile)
  const leaderboard = (logs || [])
    .filter((l: HealthLog) => l.steps)
    .reduce(
      (
        acc: Record<string, { name: string; avatar: string; steps: number }>,
        l: HealthLog
      ) => {
        const key = l.profile_id
        if (!acc[key])
          acc[key] = {
            name: l.profiles?.full_name || 'Unknown',
            avatar: l.profiles?.avatar_url || '',
            steps: 0,
          }
        acc[key].steps += l.steps || 0
        return acc
      },
      {}
    )
  const leaderboardArr = Object.values(leaderboard).sort(
    (a, b) => b.steps - a.steps
  )

  return (
    <div className="max-w-2xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">Family Health & Fitness</h1>
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-2">Log Daily Health</h2>
        <form
          onSubmit={handleSubmit((v) => logMutation.mutate(v))}
          className="mb-4 space-y-2"
        >
          <input
            type="date"
            {...register('date')}
            className="w-full border rounded px-3 py-2"
            disabled={isSubmitting}
          />
          {errors.date && (
            <p className="text-red-500 text-xs mt-1">{errors.date.message}</p>
          )}
          <input
            type="number"
            {...register('steps', { valueAsNumber: true })}
            className="w-full border rounded px-3 py-2"
            placeholder="Steps"
            min={0}
            disabled={isSubmitting}
          />
          <input
            type="number"
            {...register('calories', { valueAsNumber: true })}
            className="w-full border rounded px-3 py-2"
            placeholder="Calories"
            min={0}
            disabled={isSubmitting}
          />
          <input
            type="number"
            {...register('sleepHours', { valueAsNumber: true })}
            className="w-full border rounded px-3 py-2"
            placeholder="Sleep Hours"
            min={0}
            max={24}
            step={0.1}
            disabled={isSubmitting}
          />
          <textarea
            {...register('notes')}
            className="w-full border rounded px-3 py-2"
            placeholder="Notes (optional)"
            maxLength={200}
            disabled={isSubmitting}
          />
          <button
            type="submit"
            className="bg-emerald-600 text-white px-4 py-2 rounded hover:bg-emerald-700 disabled:opacity-50"
            disabled={isSubmitting}
          >
            Log Health
          </button>
          {error && <div className="text-red-500 text-sm mt-2">{error}</div>}
        </form>
        {logsLoading ? (
          <LoadingState message="Loading logs..." />
        ) : !logs || logs.length === 0 ? (
          <EmptyState message="No health logs yet." />
        ) : (
          <ul className="space-y-2">
            {logs.map((l: HealthLog) => (
              <li
                key={l.id}
                className="border rounded p-3 bg-white dark:bg-brand-dark/70"
              >
                <div className="flex items-center gap-2 mb-1">
                  {l.profiles?.avatar_url && (
                    <Image
                      src={l.profiles.avatar_url}
                      alt=""
                      width={28}
                      height={28}
                      className="w-7 h-7 rounded-full"
                    />
                  )}
                  <span className="font-semibold text-sm">
                    {l.profiles?.full_name || 'Unknown'}
                  </span>
                  <span className="ml-2 text-xs text-gray-500">{l.date}</span>
                </div>
                <div className="text-xs">
                  Steps: {l.steps || 0} | Calories: {l.calories || 0} | Sleep:{' '}
                  {l.sleep_hours || 0}h
                </div>
                {l.notes && (
                  <div className="text-xs text-gray-600 mt-1">{l.notes}</div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-2">Leaderboard (Steps)</h2>
        {leaderboardArr.length === 0 ? (
          <EmptyState message="No leaderboard data yet." />
        ) : (
          <ol className="space-y-2">
            {leaderboardArr.map((p, i) => (
              <li key={p.name} className="flex items-center gap-2">
                <span className="font-bold text-lg">#{i + 1}</span>
                {p.avatar && (
                  <Image
                    src={p.avatar}
                    alt=""
                    width={28}
                    height={28}
                    className="w-7 h-7 rounded-full"
                  />
                )}
                <span className="font-semibold">{p.name}</span>
                <span className="ml-2 text-xs text-gray-500">
                  {p.steps} steps
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>
      <section>
        <h2 className="text-lg font-semibold mb-2">Fitness Challenges</h2>
        <form
          onSubmit={handleSubmitChallenge((v) => challengeMutation.mutate(v))}
          className="mb-4 space-y-2"
        >
          <input
            type="text"
            {...registerChallenge('title')}
            className="w-full border rounded px-3 py-2"
            placeholder="Challenge title"
            disabled={challengeSubmitting}
          />
          {challengeErrors.title && (
            <p className="text-red-500 text-xs mt-1">
              {challengeErrors.title.message}
            </p>
          )}
          <input
            type="text"
            {...registerChallenge('description')}
            className="w-full border rounded px-3 py-2"
            placeholder="Description (optional)"
            disabled={challengeSubmitting}
          />
          <input
            type="date"
            {...registerChallenge('startDate')}
            className="w-full border rounded px-3 py-2"
            disabled={challengeSubmitting}
          />
          <input
            type="date"
            {...registerChallenge('endDate')}
            className="w-full border rounded px-3 py-2"
            disabled={challengeSubmitting}
          />
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            disabled={challengeSubmitting}
          >
            Create Challenge
          </button>
          {challengeError && (
            <div className="text-red-500 text-sm mt-2">{challengeError}</div>
          )}
        </form>
        {challengesLoading ? (
          <LoadingState message="Loading challenges..." />
        ) : !challenges || challenges.length === 0 ? (
          <EmptyState message="No challenges yet." />
        ) : (
          <ul className="space-y-2">
            {challenges.map((c: Challenge) => (
              <li
                key={c.id}
                className="border rounded p-3 bg-white dark:bg-brand-dark/70"
              >
                <div className="font-semibold">{c.title}</div>
                <div className="text-xs text-gray-500">
                  {c.start_date} - {c.end_date}
                </div>
                {c.description && (
                  <div className="text-xs text-gray-600 mt-1">
                    {c.description}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

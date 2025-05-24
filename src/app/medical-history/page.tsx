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

const medicalHistorySchema = z.object({
  relation: z.string().min(2, 'Relation required'),
  condition: z.string().min(2, 'Condition required'),
  notes: z.string().max(200).optional(),
  diagnosedAt: z.string().optional(),
})

type MedicalHistoryForm = z.infer<typeof medicalHistorySchema>

interface MedicalHistory {
  id: string
  family_id: string
  profile_id: string
  relation: string
  condition: string
  notes?: string | null
  diagnosed_at?: string | null
  profiles?: {
    full_name?: string | null
    avatar_url?: string | null
  }
}

export default function MedicalHistoryPage() {
  const { selectedFamilyId } = useFamilyContext()
  const supabase = createClient()
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)

  // Fetch medical history for the family
  const { data: history, isLoading } = useQuery({
    queryKey: ['medical_history', selectedFamilyId],
    queryFn: async () => {
      if (!selectedFamilyId) return []
      const { data, error } = await supabase
        .from('family_medical_history')
        .select('*, profiles(full_name, avatar_url)')
        .eq('family_id', selectedFamilyId)
        .order('diagnosed_at', { ascending: false })
      if (error) throw new Error('Failed to fetch medical history')
      return data as MedicalHistory[]
    },
    enabled: !!selectedFamilyId,
  })

  // Medical history form
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<MedicalHistoryForm>({
    resolver: zodResolver(medicalHistorySchema),
    defaultValues: { relation: '', condition: '', notes: '', diagnosedAt: '' },
  })

  const mutation = useMutation({
    mutationFn: async (values: MedicalHistoryForm) => {
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
      const { error: insertError } = await supabase
        .from('family_medical_history')
        .insert({
          family_id: selectedFamilyId,
          profile_id: profile.id,
          relation: values.relation,
          condition: values.condition,
          notes: values.notes,
          diagnosed_at: values.diagnosedAt || null,
        })
      if (insertError) throw new Error('Failed to add medical history')
    },
    onSuccess: () => {
      reset()
      queryClient.invalidateQueries({
        queryKey: ['medical_history', selectedFamilyId],
      })
    },
    onError: (err: unknown) => {
      if (err instanceof Error) setError(err.message)
      else setError('Failed to add medical history')
    },
  })

  return (
    <div className="max-w-2xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">Family Medical History</h1>
      <form
        onSubmit={handleSubmit((v) => mutation.mutate(v))}
        className="mb-6 space-y-2"
      >
        <input
          type="text"
          {...register('relation')}
          className="w-full border rounded px-3 py-2"
          placeholder="Relation (e.g. self, parent, sibling)"
          disabled={isSubmitting}
        />
        {errors.relation && (
          <p className="text-red-500 text-xs mt-1">{errors.relation.message}</p>
        )}
        <input
          type="text"
          {...register('condition')}
          className="w-full border rounded px-3 py-2"
          placeholder="Condition (e.g. Diabetes)"
          disabled={isSubmitting}
        />
        {errors.condition && (
          <p className="text-red-500 text-xs mt-1">
            {errors.condition.message}
          </p>
        )}
        <input
          type="date"
          {...register('diagnosedAt')}
          className="w-full border rounded px-3 py-2"
          placeholder="Diagnosed At (optional)"
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
          className="bg-rose-600 text-white px-4 py-2 rounded hover:bg-rose-700 disabled:opacity-50"
          disabled={isSubmitting}
        >
          Add Medical History
        </button>
        {error && <div className="text-red-500 text-sm mt-2">{error}</div>}
      </form>
      {isLoading ? (
        <LoadingState message="Loading medical history..." />
      ) : !history || history.length === 0 ? (
        <EmptyState message="No medical history yet." />
      ) : (
        <ul className="space-y-2">
          {history.map((h: MedicalHistory) => (
            <li
              key={h.id}
              className="border rounded p-3 bg-white dark:bg-brand-dark/70"
            >
              <div className="flex items-center gap-2 mb-1">
                {h.profiles?.avatar_url && (
                  <Image
                    src={h.profiles.avatar_url}
                    alt=""
                    width={28}
                    height={28}
                    className="w-7 h-7 rounded-full"
                  />
                )}
                <span className="font-semibold text-sm">
                  {h.profiles?.full_name || 'Unknown'}
                </span>
                <span className="ml-2 text-xs text-gray-500">{h.relation}</span>
                {h.diagnosed_at && (
                  <span className="ml-2 text-xs text-gray-500">
                    Diagnosed: {h.diagnosed_at}
                  </span>
                )}
              </div>
              <div className="text-xs">Condition: {h.condition}</div>
              {h.notes && (
                <div className="text-xs text-gray-600 mt-1">{h.notes}</div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

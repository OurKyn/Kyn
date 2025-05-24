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

const pollSchema = z.object({
  question: z.string().min(2, 'Question required'),
  options: z
    .array(z.string().min(1, 'Option cannot be empty'))
    .min(2, 'At least 2 options required')
    .max(6, 'Max 6 options'),
})

type PollForm = z.infer<typeof pollSchema>

interface Poll {
  id: string
  family_id: string
  question: string
  options: string[]
  created_by: string | null
  created_at: string
}

export default function PollsPage() {
  const { selectedFamilyId } = useFamilyContext()
  const supabase = createClient()
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const [optionInputs, setOptionInputs] = useState(['', ''])
  const [voteStatus, setVoteStatus] = useState<Record<string, number>>({})

  // Fetch polls for the selected family
  const { data: polls, isLoading } = useQuery({
    queryKey: ['polls', selectedFamilyId],
    queryFn: async () => {
      if (!selectedFamilyId) return []
      const { data, error } = await supabase
        .from('polls')
        .select('*')
        .eq('family_id', selectedFamilyId)
        .order('created_at', { ascending: false })
      if (error) throw new Error('Failed to fetch polls')
      return data
    },
    enabled: !!selectedFamilyId,
  })

  // Fetch votes for the current user
  const { data: myVotes } = useQuery({
    queryKey: ['poll_votes', selectedFamilyId],
    queryFn: async () => {
      if (!selectedFamilyId) return {}
      const { data: userData } = await supabase.auth.getUser()
      if (!userData?.user) return {}
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', userData.user.id)
        .single()
      if (!profile) return {}
      const { data, error } = await supabase
        .from('poll_votes')
        .select('*')
        .in(
          'poll_id',
          (polls || []).map((p: Poll) => p.id)
        )
        .eq('profile_id', profile.id)
      if (error) return {}
      const map: Record<string, number> = {}
      for (const vote of data || []) {
        map[vote.poll_id] = vote.option_index
      }
      return map
    },
    enabled: !!selectedFamilyId && !!polls && polls.length > 0,
  })

  // Fetch vote counts for all polls
  const { data: pollVoteCounts } = useQuery({
    queryKey: ['poll_vote_counts', selectedFamilyId],
    queryFn: async () => {
      if (!selectedFamilyId || !polls || polls.length === 0) return {}
      const { data, error } = await supabase
        .from('poll_votes')
        .select('poll_id, option_index')
      if (error) return {}
      const counts: Record<string, Record<number, number>> = {}
      for (const vote of data || []) {
        if (!counts[vote.poll_id]) counts[vote.poll_id] = {}
        counts[vote.poll_id][vote.option_index] =
          (counts[vote.poll_id][vote.option_index] || 0) + 1
      }
      return counts
    },
    enabled: !!selectedFamilyId && !!polls && polls.length > 0,
  })

  // Create poll form
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PollForm>({
    resolver: zodResolver(pollSchema),
    defaultValues: { question: '', options: ['', ''] },
  })

  const onCreate = async (values: PollForm) => {
    setError(null)
    if (!selectedFamilyId) {
      setError('No family selected')
      return
    }
    const { error: insertError } = await supabase.from('polls').insert({
      family_id: selectedFamilyId,
      question: values.question,
      options: values.options,
    })
    if (insertError) {
      setError('Failed to create poll')
      return
    }
    reset()
    setOptionInputs(['', ''])
    queryClient.invalidateQueries({ queryKey: ['polls', selectedFamilyId] })
  }

  // Vote mutation
  const voteMutation = useMutation({
    mutationFn: async ({
      pollId,
      optionIndex,
    }: {
      pollId: string
      optionIndex: number
    }) => {
      setError(null)
      const { data: userData } = await supabase.auth.getUser()
      if (!userData?.user) throw new Error('Not authenticated')
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', userData.user.id)
        .single()
      if (!profile) throw new Error('Profile not found')
      const { error: upsertError } = await supabase.from('poll_votes').upsert(
        {
          poll_id: pollId,
          profile_id: profile.id,
          option_index: optionIndex,
        },
        { onConflict: ['poll_id', 'profile_id'] }
      )
      if (upsertError) throw new Error('Failed to vote')
      return optionIndex
    },
    onSuccess: (_data, variables) => {
      setVoteStatus((prev) => ({
        ...prev,
        [variables.pollId]: variables.optionIndex,
      }))
      queryClient.invalidateQueries({
        queryKey: ['poll_votes', selectedFamilyId],
      })
      queryClient.invalidateQueries({
        queryKey: ['poll_vote_counts', selectedFamilyId],
      })
    },
    onError: (err: unknown) => {
      setError(
        typeof err === 'object' && err !== null && 'message' in err
          ? String((err as { message?: string }).message)
          : 'Failed to vote'
      )
    },
  })

  const handleVote = (pollId: string, optionIndex: number) => {
    voteMutation.mutate({ pollId, optionIndex })
  }

  // Option input handlers for poll creation
  const handleOptionChange = (idx: number, value: string) => {
    setOptionInputs((prev) => {
      const next = [...prev]
      next[idx] = value
      return next
    })
  }
  const addOption = () => {
    if (optionInputs.length < 6) setOptionInputs((prev) => [...prev, ''])
  }
  const removeOption = (idx: number) => {
    if (optionInputs.length > 2)
      setOptionInputs((prev) => prev.filter((_, i) => i !== idx))
  }

  return (
    <div className="max-w-2xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">Family Polls</h1>
      <form
        onSubmit={handleSubmit((values) =>
          onCreate({
            ...values,
            options: optionInputs,
          })
        )}
        className="mb-6 space-y-2"
      >
        <input
          {...register('question')}
          className="w-full border rounded px-3 py-2 focus:outline-none focus:ring focus:border-blue-300"
          placeholder="Poll question"
          disabled={isSubmitting}
        />
        {errors.question && (
          <p className="text-red-500 text-xs mt-1">{errors.question.message}</p>
        )}
        <div className="space-y-2">
          {optionInputs.map((opt, idx) => (
            <div key={idx} className="flex gap-2 items-center">
              <input
                type="text"
                value={opt}
                onChange={(e) => handleOptionChange(idx, e.target.value)}
                className="flex-1 border rounded px-3 py-2 focus:outline-none focus:ring focus:border-blue-300"
                placeholder={`Option ${idx + 1}`}
                disabled={isSubmitting}
              />
              {optionInputs.length > 2 && (
                <button
                  type="button"
                  className="text-red-500 text-xs px-2 py-1 rounded border border-red-200 hover:bg-red-50"
                  onClick={() => removeOption(idx)}
                  disabled={isSubmitting}
                >
                  Remove
                </button>
              )}
            </div>
          ))}
          {optionInputs.length < 6 && (
            <button
              type="button"
              className="text-blue-600 text-xs px-2 py-1 rounded border border-blue-200 hover:bg-blue-50"
              onClick={addOption}
              disabled={isSubmitting}
            >
              Add Option
            </button>
          )}
        </div>
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          disabled={isSubmitting}
        >
          Create Poll
        </button>
        {error && <div className="text-red-500 text-sm mt-2">{error}</div>}
      </form>
      {isLoading ? (
        <LoadingState message="Loading polls..." />
      ) : !polls || polls.length === 0 ? (
        <EmptyState message="No polls yet. Create your first poll!" />
      ) : (
        <div className="space-y-6">
          {(polls || []).map((poll: Poll) => (
            <div
              key={poll.id}
              className="border rounded p-4 bg-white dark:bg-brand-dark/80"
            >
              <div className="font-semibold text-lg mb-2">{poll.question}</div>
              <div className="space-y-2">
                {poll.options.map((opt, idx) => {
                  const totalVotes = pollVoteCounts?.[poll.id]?.[idx] || 0
                  const userVoted =
                    (myVotes && myVotes[poll.id] === idx) ||
                    voteStatus[poll.id] === idx
                  return (
                    <div key={idx} className="flex items-center gap-2">
                      <button
                        className={`px-3 py-1 rounded text-xs font-semibold border transition-colors ${userVoted ? 'bg-pink-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-700 hover:bg-pink-100 dark:hover:bg-pink-700'}`}
                        onClick={() => handleVote(poll.id, idx)}
                        disabled={voteMutation.isLoading}
                      >
                        {opt}
                      </button>
                      <span className="text-xs text-gray-500">
                        {totalVotes} vote{totalVotes === 1 ? '' : 's'}
                      </span>
                      {userVoted && (
                        <span className="text-green-600 text-xs ml-2">
                          Your vote
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

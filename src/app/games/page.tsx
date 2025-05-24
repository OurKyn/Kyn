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

const questionSchema = z.object({
  question: z.string().min(5, 'Question required'),
  answer: z.string().min(1, 'Answer required'),
})

type QuestionForm = z.infer<typeof questionSchema>

interface TriviaQuestion {
  id: string
  family_id: string
  question: string
  answer: string
  created_at: string
}

interface LeaderboardEntry {
  profile_id: string
  score: number
  profiles?: {
    full_name?: string | null
    avatar_url?: string | null
  }
}

export default function GamesPage() {
  const { selectedFamilyId } = useFamilyContext()
  const supabase = createClient()
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const [currentQ, setCurrentQ] = useState<number>(0)
  const [userAnswer, setUserAnswer] = useState('')
  const [showResult, setShowResult] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  // Fetch trivia questions for the family
  const { data: questions, isLoading } = useQuery({
    queryKey: ['trivia_questions', selectedFamilyId],
    queryFn: async () => {
      if (!selectedFamilyId) return []
      const { data, error } = await supabase
        .from('trivia_questions')
        .select('*')
        .eq('family_id', selectedFamilyId)
        .order('created_at', { ascending: true })
      if (error) throw new Error('Failed to fetch questions')
      return data as TriviaQuestion[]
    },
    enabled: !!selectedFamilyId,
  })

  // Fetch leaderboard
  const { data: leaderboard } = useQuery({
    queryKey: ['trivia_leaderboard', selectedFamilyId],
    queryFn: async () => {
      if (!selectedFamilyId) return []
      const { data, error } = await supabase
        .from('trivia_scores')
        .select('profile_id, score, profiles(full_name, avatar_url)')
        .eq('family_id', selectedFamilyId)
        .order('score', { ascending: false })
      if (error) return []
      return data as LeaderboardEntry[]
    },
    enabled: !!selectedFamilyId,
  })

  // Add new trivia question
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<QuestionForm>({
    resolver: zodResolver(questionSchema),
    defaultValues: { question: '', answer: '' },
  })

  const onCreate = async (values: QuestionForm) => {
    setError(null)
    if (!selectedFamilyId) {
      setError('No family selected')
      return
    }
    const { error: insertError } = await supabase
      .from('trivia_questions')
      .insert({
        family_id: selectedFamilyId,
        question: values.question,
        answer: values.answer,
      })
    if (insertError) {
      setError('Failed to add question')
      return
    }
    reset()
    queryClient.invalidateQueries({
      queryKey: ['trivia_questions', selectedFamilyId],
    })
  }

  // Answer trivia question
  const answerMutation = useMutation({
    mutationFn: async ({
      questionId,
      answer,
    }: {
      questionId: string
      answer: string
    }) => {
      setError(null)
      // Get current user profile
      const { data: userData } = await supabase.auth.getUser()
      if (!userData?.user) throw new Error('Not authenticated')
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', userData.user.id)
        .single()
      if (!profile) throw new Error('Profile not found')
      // Get correct answer
      const { data: q } = await supabase
        .from('trivia_questions')
        .select('answer')
        .eq('id', questionId)
        .single()
      if (!q) throw new Error('Question not found')
      const correct =
        q.answer.trim().toLowerCase() === answer.trim().toLowerCase()
      // Update score if correct
      if (correct) {
        await supabase.rpc('increment_trivia_score', {
          family_id: selectedFamilyId,
          profile_id: profile.id,
        })
      }
      return correct
    },
    onSuccess: (correct) => {
      setShowResult(true)
      setResult(correct ? 'Correct!' : 'Incorrect!')
      setTimeout(() => {
        setShowResult(false)
        setResult(null)
        setUserAnswer('')
        setCurrentQ((prev) =>
          questions && prev < questions.length - 1 ? prev + 1 : 0
        )
      }, 2000)
      queryClient.invalidateQueries({
        queryKey: ['trivia_leaderboard', selectedFamilyId],
      })
    },
    onError: (err: unknown) => {
      if (err instanceof Error) setError(err.message)
      else setError('Failed to answer question')
    },
  })

  const handleAnswer = (e: React.FormEvent) => {
    e.preventDefault()
    if (!questions || !questions[currentQ]) return
    answerMutation.mutate({
      questionId: questions[currentQ].id,
      answer: userAnswer,
    })
  }

  return (
    <div className="max-w-2xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">Games & Trivia</h1>
      <form onSubmit={handleSubmit(onCreate)} className="mb-6 space-y-2">
        <input
          {...register('question')}
          className="w-full border rounded px-3 py-2 focus:outline-none focus:ring focus:border-blue-300"
          placeholder="Trivia question"
          disabled={isSubmitting}
        />
        {errors.question && (
          <p className="text-red-500 text-xs mt-1">{errors.question.message}</p>
        )}
        <input
          {...register('answer')}
          className="w-full border rounded px-3 py-2 focus:outline-none focus:ring focus:border-blue-300"
          placeholder="Correct answer"
          disabled={isSubmitting}
        />
        {errors.answer && (
          <p className="text-red-500 text-xs mt-1">{errors.answer.message}</p>
        )}
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          disabled={isSubmitting}
        >
          Add Question
        </button>
        {error && <div className="text-red-500 text-sm mt-2">{error}</div>}
      </form>
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-2">Trivia Game</h2>
        {isLoading ? (
          <LoadingState message="Loading questions..." />
        ) : !questions || questions.length === 0 ? (
          <EmptyState message="No trivia questions yet. Add one above!" />
        ) : (
          <div className="border rounded p-4 bg-white dark:bg-brand-dark/80">
            <div className="font-semibold mb-2">Question:</div>
            <div className="mb-4">{questions[currentQ].question}</div>
            <form onSubmit={handleAnswer} className="flex gap-2 items-center">
              <input
                type="text"
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                className="flex-1 border rounded px-3 py-2 focus:outline-none focus:ring focus:border-blue-300"
                placeholder="Your answer"
                disabled={answerMutation.isLoading || showResult}
              />
              <button
                type="submit"
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
                disabled={answerMutation.isLoading || showResult}
              >
                Submit
              </button>
            </form>
            {showResult && (
              <div
                className={`mt-2 text-lg font-bold ${result === 'Correct!' ? 'text-green-600' : 'text-red-600'}`}
              >
                {result}
              </div>
            )}
          </div>
        )}
      </div>
      <div>
        <h2 className="text-lg font-semibold mb-2">Leaderboard</h2>
        {!leaderboard || leaderboard.length === 0 ? (
          <EmptyState message="No scores yet." />
        ) : (
          <ul className="space-y-2">
            {leaderboard.map((entry: LeaderboardEntry, idx: number) => (
              <li key={entry.profile_id} className="flex items-center gap-2">
                <span className="font-bold">#{idx + 1}</span>
                {entry.profiles?.avatar_url && (
                  <Image
                    src={entry.profiles.avatar_url}
                    alt=""
                    width={32}
                    height={32}
                    className="w-8 h-8 rounded-full"
                  />
                )}
                <span>{entry.profiles?.full_name || 'Unknown'}</span>
                <span className="ml-auto font-mono">{entry.score} pts</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

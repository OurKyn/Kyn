'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useFamilyContext } from '@/context/family-context'
import { createClient } from '@/utils/supabase/client'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { LoadingState } from '@/components/loading-state'
import { EmptyState } from '@/components/empty-state'

const storySchema = z.object({
  title: z.string().min(2, 'Title required'),
  content: z.string().min(2, 'Story required'),
  // audioUrl: z.string().url().optional(), // Placeholder for audio
})

type StoryForm = z.infer<typeof storySchema>

interface Story {
  id: string
  family_id: string
  author_id: string | null
  title: string
  content: string | null
  audio_url: string | null
  created_at: string
  updated_at: string
}

export default function StoriesPage() {
  const { selectedFamilyId } = useFamilyContext()
  const supabase = createClient()
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)

  // Fetch stories for the selected family
  const { data: stories, isLoading } = useQuery({
    queryKey: ['stories', selectedFamilyId],
    queryFn: async () => {
      if (!selectedFamilyId) return []
      const { data, error } = await supabase
        .from('family_stories')
        .select('*')
        .eq('family_id', selectedFamilyId)
        .order('created_at', { ascending: false })
      if (error) throw new Error('Failed to fetch stories')
      return data
    },
    enabled: !!selectedFamilyId,
  })

  // Create story form
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<StoryForm>({
    resolver: zodResolver(storySchema),
    defaultValues: { title: '', content: '' },
  })

  const onCreate = async (values: StoryForm) => {
    setError(null)
    if (!selectedFamilyId) {
      setError('No family selected')
      return
    }
    // Get current user profile for author_id
    const { data: userData, error: userError } = await supabase.auth.getUser()
    if (userError || !userData?.user) {
      setError('Not authenticated')
      return
    }
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', userData.user.id)
      .single()
    if (profileError || !profile) {
      setError('Profile not found')
      return
    }
    const { error: insertError } = await supabase
      .from('family_stories')
      .insert({
        family_id: selectedFamilyId,
        author_id: profile.id,
        title: values.title,
        content: values.content,
        // audio_url: values.audioUrl || null,
      })
    if (insertError) {
      setError('Failed to create story')
      return
    }
    reset()
    queryClient.invalidateQueries({ queryKey: ['stories', selectedFamilyId] })
  }

  return (
    <div className="max-w-2xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">Family Stories</h1>
      <form onSubmit={handleSubmit(onCreate)} className="mb-6 space-y-2">
        <input
          {...register('title')}
          className="w-full border rounded px-3 py-2 focus:outline-none focus:ring focus:border-blue-300"
          placeholder="Story title"
          disabled={isSubmitting}
        />
        {errors.title && (
          <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>
        )}
        <textarea
          {...register('content')}
          className="w-full border rounded px-3 py-2 focus:outline-none focus:ring focus:border-blue-300"
          placeholder="Write your family story..."
          rows={4}
          disabled={isSubmitting}
        />
        {errors.content && (
          <p className="text-red-500 text-xs mt-1">{errors.content.message}</p>
        )}
        {/* Placeholder for audio recording/upload */}
        {/* <input type="file" accept="audio/*" /> */}
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          disabled={isSubmitting}
        >
          Record/Save Story
        </button>
        {error && <div className="text-red-500 text-sm mt-2">{error}</div>}
      </form>
      {isLoading ? (
        <LoadingState message="Loading stories..." />
      ) : !stories || stories.length === 0 ? (
        <EmptyState message="No stories yet. Record your first family story!" />
      ) : (
        <div className="space-y-6">
          {(stories || []).map((story: Story) => (
            <div
              key={story.id}
              className="border rounded p-4 bg-white dark:bg-brand-dark/80"
            >
              <div className="font-semibold text-lg mb-1">{story.title}</div>
              <div className="text-xs text-gray-500 mb-2">
                {new Date(story.created_at).toLocaleString()}
              </div>
              <div className="mb-2 whitespace-pre-line">{story.content}</div>
              {/* {story.audio_url && (
                <audio controls src={story.audio_url} className="w-full mt-2" />
              )} */}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

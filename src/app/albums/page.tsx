'use client'

import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useFamilyContext } from '@/context/family-context'
import { createClient } from '@/utils/supabase/client'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import Link from 'next/link'
import Image from 'next/image'
import { LoadingState } from '@/components/loading-state'
import { EmptyState } from '@/components/empty-state'
import { toast } from 'sonner'

const albumSchema = z.object({
  title: z.string().min(2, 'Album title required'),
  coverUrl: z
    .string()
    .url('Must be a valid image URL')
    .optional()
    .or(z.literal('')),
})

type AlbumForm = z.infer<typeof albumSchema>

export default function AlbumsPage() {
  const { selectedFamilyId } = useFamilyContext()
  const supabase = createClient()
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)

  // Fetch albums for the selected family
  const { data: albums, isLoading } = useQuery({
    queryKey: ['albums', selectedFamilyId],
    queryFn: async () => {
      if (!selectedFamilyId) {
        return []
      }
      const { data, error } = await supabase
        .from('albums')
        .select('*')
        .eq('family_id', selectedFamilyId)
        .order('created_at', { ascending: false })
      if (error) {
        throw new Error('Failed to fetch albums')
      }
      return data
    },
    enabled: !!selectedFamilyId,
  })

  // Create album form
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AlbumForm>({
    resolver: zodResolver(albumSchema),
    defaultValues: { title: '', coverUrl: '' },
  })

  const onCreate = async (values: AlbumForm) => {
    setError(null)
    if (!selectedFamilyId) {
      setError('No family selected')
      return
    }
    const { error: insertError } = await supabase.from('albums').insert({
      family_id: selectedFamilyId,
      title: values.title,
      cover_url: values.coverUrl || null,
    })
    if (insertError) {
      setError('Failed to create album')
      return
    }
    reset()
    queryClient.invalidateQueries({ queryKey: ['albums', selectedFamilyId] })
  }

  // Real-time subscription for new albums in this family
  useEffect(() => {
    if (!selectedFamilyId) {
      return
    }
    const supabase = createClient()
    // Get current user profile for comparison
    let currentProfileId: string | null = null
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        supabase
          .from('profiles')
          .select('id')
          .eq('user_id', data.user.id)
          .single()
          .then(({ data: profile }) => {
            currentProfileId = profile?.id || null
          })
      }
    })
    const channel = supabase
      .channel(`albums_family_${selectedFamilyId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'albums',
          filter: `family_id=eq.${selectedFamilyId}`,
        },
        (payload) => {
          // Only show toast if the new album is from another user
          if (
            payload.new.created_by &&
            payload.new.created_by !== currentProfileId
          ) {
            toast('New album created', {
              description: `Album: ${payload.new.title}`,
              id: payload.new.id,
            })
          }
          queryClient.invalidateQueries({
            queryKey: ['albums', selectedFamilyId],
          })
        }
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [selectedFamilyId, queryClient])

  return (
    <div className="max-w-2xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">Photo Albums</h1>
      <form onSubmit={handleSubmit(onCreate)} className="mb-6 space-y-2">
        <input
          {...register('title')}
          className="w-full border rounded px-3 py-2 focus:outline-none focus:ring focus:border-blue-300"
          placeholder="Album title"
          disabled={isSubmitting}
        />
        {errors.title && (
          <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>
        )}
        <input
          {...register('coverUrl')}
          className="w-full border rounded px-3 py-2 focus:outline-none focus:ring focus:border-blue-300"
          placeholder="Cover image URL (optional)"
          disabled={isSubmitting}
        />
        {errors.coverUrl && (
          <p className="text-red-500 text-xs mt-1">{errors.coverUrl.message}</p>
        )}
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          disabled={isSubmitting}
        >
          Create Album
        </button>
        {error && <div className="text-red-500 text-sm mt-2">{error}</div>}
      </form>
      {isLoading ? (
        <LoadingState message="Loading albums..." />
      ) : !albums || albums.length === 0 ? (
        <EmptyState message="No albums yet. Create your first album!" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {(albums || []).map(
            (a: {
              id: string
              title: string
              cover_url: string
              created_by: string
              created_at: string
            }) => (
              <Link
                key={a.id}
                href={`/albums/${a.id}`}
                className="block rounded-lg border shadow hover:shadow-lg transition p-4 bg-white dark:bg-brand-dark/80"
              >
                {a.cover_url ? (
                  <Image
                    src={a.cover_url}
                    alt={a.title}
                    width={320}
                    height={180}
                    className="w-full h-40 object-cover rounded mb-2"
                  />
                ) : (
                  <div className="w-full h-40 bg-gray-100 dark:bg-gray-800 rounded mb-2 flex items-center justify-center text-gray-400">
                    No cover image
                  </div>
                )}
                <div className="font-semibold text-lg">{a.title}</div>
                <div className="text-xs text-gray-500 mt-1">
                  Created {new Date(a.created_at).toLocaleDateString()}
                </div>
              </Link>
            )
          )}
        </div>
      )}
    </div>
  )
}

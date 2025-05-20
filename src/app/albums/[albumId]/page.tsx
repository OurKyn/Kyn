'use client'

import { useParams } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import Image from 'next/image'
import { LoadingState } from '@/components/loading-state'
import { EmptyState } from '@/components/empty-state'
import { toast } from 'sonner'

const photoSchema = z.object({
  url: z.string().url('Must be a valid image URL'),
})

type PhotoForm = z.infer<typeof photoSchema>

export default function AlbumDetailPage() {
  const { albumId } = useParams<{ albumId: string }>()
  const supabase = createClient()
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)

  // Fetch album info
  const { data: album, isLoading: albumLoading } = useQuery({
    queryKey: ['album', albumId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('albums')
        .select('*')
        .eq('id', albumId)
        .single()
      if (error) throw new Error('Failed to fetch album')
      return data
    },
    enabled: !!albumId,
  })

  // Fetch photos (media) in this album
  const { data: photos, isLoading: photosLoading } = useQuery({
    queryKey: ['media', albumId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('media')
        .select('*')
        .eq('album_id', albumId)
        .order('created_at', { ascending: false })
      if (error) throw new Error('Failed to fetch photos')
      return data
    },
    enabled: !!albumId,
  })

  // Upload photo form
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PhotoForm>({
    resolver: zodResolver(photoSchema),
    defaultValues: { url: '' },
  })

  const onUpload = async (values: PhotoForm) => {
    setError(null)
    if (!albumId) {
      setError('No album selected')
      return
    }
    // Get current user profile for uploaded_by
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
    const { error: insertError } = await supabase.from('media').insert({
      album_id: albumId,
      url: values.url,
      uploaded_by: profile.id,
    })
    if (insertError) {
      setError('Failed to upload photo')
      return
    }
    reset()
    queryClient.invalidateQueries({ queryKey: ['media', albumId] })
  }

  // Real-time subscription for new photos in this album
  useEffect(() => {
    if (!albumId) return
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
      .channel(`media_album_${albumId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'media',
          filter: `album_id=eq.${albumId}`,
        },
        (payload) => {
          // Only show toast if the new photo is from another user
          if (
            payload.new.uploaded_by &&
            payload.new.uploaded_by !== currentProfileId
          ) {
            toast('New photo uploaded', {
              description: 'A new photo was added to this album.',
              type: 'post',
              id: payload.new.id,
            })
          }
          queryClient.invalidateQueries({ queryKey: ['media', albumId] })
        }
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [albumId, queryClient])

  return (
    <div className="max-w-2xl mx-auto py-8">
      {albumLoading ? (
        <LoadingState message="Loading album..." />
      ) : !album ? (
        <EmptyState message="Album not found" />
      ) : (
        <>
          <h1 className="text-2xl font-bold mb-2">{album.title}</h1>
          {album.cover_url && (
            <Image
              src={album.cover_url}
              alt={album.title}
              width={320}
              height={180}
              className="w-full h-40 object-cover rounded mb-4"
            />
          )}
          <div className="text-xs text-gray-500 mb-4">
            Created {new Date(album.created_at).toLocaleDateString()}
          </div>
          <form onSubmit={handleSubmit(onUpload)} className="mb-6 space-y-2">
            <input
              {...register('url')}
              className="w-full border rounded px-3 py-2 focus:outline-none focus:ring focus:border-blue-300"
              placeholder="Photo image URL"
              disabled={isSubmitting}
            />
            {errors.url && (
              <p className="text-red-500 text-xs mt-1">{errors.url.message}</p>
            )}
            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
              disabled={isSubmitting}
            >
              Upload Photo
            </button>
            {error && <div className="text-red-500 text-sm mt-2">{error}</div>}
          </form>
          <h2 className="text-lg font-semibold mb-2">Photos</h2>
          {photosLoading ? (
            <LoadingState message="Loading photos..." />
          ) : !photos || photos.length === 0 ? (
            <EmptyState message="No photos yet. Upload your first photo!" />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {photos.map(
                (photo: {
                  id: string
                  url: string
                  uploaded_by: string
                  created_at: string
                }) => (
                  <div
                    key={photo.id}
                    className="rounded overflow-hidden border bg-white dark:bg-brand-dark/80"
                  >
                    <Image
                      src={photo.url}
                      alt="Photo"
                      width={200}
                      height={200}
                      className="w-full h-32 object-cover"
                    />
                    <div className="text-xs text-gray-500 p-2">
                      Uploaded {new Date(photo.created_at).toLocaleDateString()}
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

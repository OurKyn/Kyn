import { createClient } from '@/utils/supabase/client'
import { z } from 'zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useState, useEffect } from 'react'

const commentSchema = z.object({
  content: z.string().min(1, 'Comment cannot be empty'),
})

interface Profile {
  full_name: string | null
  avatar_url: string | null
}

export interface Comment {
  id: string
  post_id: string
  author_id: string
  content: string
  created_at: string
  profiles: Profile
}

export function useFeed(familyId?: string | null) {
  const supabase = createClient()
  const queryClient = useQueryClient()
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({})
  const [commentSubmitting, setCommentSubmitting] = useState<
    Record<string, boolean>
  >({})
  const [commentErrors, setCommentErrors] = useState<
    Record<string, string | null>
  >({})

  // Get user
  const userQuery = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const { data, error } = await supabase.auth.getUser()
      if (error || !data?.user) throw new Error('Not authenticated')
      return data.user
    },
  })
  const user = userQuery.data

  // Get profile for current user
  const profileQuery = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated')
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single()
      if (error || !data) {
        console.error('Profile not found for user', user.id, error)
        throw new Error('Profile not found')
      }
      return data
    },
    enabled: !!user,
  })
  const profile = profileQuery.data

  // Get family membership (for role, but not for familyId)
  // Only used if familyId is not provided
  const memberQuery = useQuery({
    queryKey: ['family', profile?.id],
    queryFn: async () => {
      if (!profile) throw new Error('Profile not loaded')
      const { data: members, error } = await supabase
        .from('family_members')
        .select('family_id, joined_at')
        .eq('profile_id', profile.id)
        .order('joined_at', { ascending: false })
      if (error || !members || members.length === 0)
        throw new Error('You are not in a family')
      // Pick the most recently joined family
      return members[0]
    },
    enabled: !!profile && !familyId,
  })
  const member = memberQuery.data

  // Use the provided familyId, or fallback to the most recent membership
  const activeFamilyId = familyId || member?.family_id

  // Realtime subscription for posts/comments
  useEffect(() => {
    if (!activeFamilyId) return
    const channel = supabase
      .channel(`family_feed_${activeFamilyId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'posts',
          filter: `family_id=eq.${activeFamilyId}`,
        },
        (payload) => {
          // Only show toast if the new post is from another user
          if (
            payload.eventType === 'INSERT' &&
            profile?.id &&
            payload.new.author_id !== profile.id
          ) {
            toast('New post', {
              description: payload.new.content,
            })
          }
          queryClient.invalidateQueries({ queryKey: ['posts', activeFamilyId] })
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comments',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['posts', activeFamilyId] })
        }
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, activeFamilyId, queryClient, profile?.id])

  // Get posts
  const postsQuery = useQuery({
    queryKey: ['posts', activeFamilyId],
    queryFn: async () => {
      if (!activeFamilyId) throw new Error('No family ID')
      const { data, error } = await supabase
        .from('posts')
        .select(
          '*, profiles(full_name, avatar_url), comments(id, content, created_at, author_id, profiles(full_name, avatar_url))'
        )
        .eq('family_id', activeFamilyId)
        .order('created_at', { ascending: false })
      if (error) throw new Error('Failed to fetch posts')
      return data
    },
    enabled: !!activeFamilyId,
  })
  const posts = postsQuery.data

  // Post a new post
  const onPost = async (values: { content: string }, resetForm: () => void) => {
    if (!user || !activeFamilyId || !profile?.id)
      throw new Error('Not authenticated or not in a family')
    const { error: postError } = await supabase.from('posts').insert({
      family_id: activeFamilyId,
      author_id: profile.id,
      content: values.content,
    })
    if (postError) throw new Error('Failed to post')
    resetForm()
    queryClient.invalidateQueries({ queryKey: ['posts', activeFamilyId] })
  }

  // Handle comment input
  const handleCommentInput = (postId: string, value: string) => {
    setCommentInputs((prev) => ({ ...prev, [postId]: value }))
  }

  // Post a comment
  const onComment = async (postId: string) => {
    setCommentErrors((prev) => ({ ...prev, [postId]: null }))
    setCommentSubmitting((prev) => ({ ...prev, [postId]: true }))
    const content = commentInputs[postId] || ''
    const result = commentSchema.safeParse({ content })
    if (!result.success) {
      setCommentErrors((prev) => ({
        ...prev,
        [postId]: result.error.errors[0].message,
      }))
      setCommentSubmitting((prev) => ({ ...prev, [postId]: false }))
      return
    }
    if (!user || !profile?.id) {
      setCommentErrors((prev) => ({ ...prev, [postId]: 'Not authenticated' }))
      setCommentSubmitting((prev) => ({ ...prev, [postId]: false }))
      return
    }
    const { error: commentError } = await supabase.from('comments').insert({
      post_id: postId,
      author_id: profile.id,
      content,
    })
    if (commentError) {
      setCommentErrors((prev) => ({ ...prev, [postId]: 'Failed to comment' }))
    } else {
      setCommentInputs((prev) => ({ ...prev, [postId]: '' }))
      queryClient.invalidateQueries({ queryKey: ['posts', activeFamilyId] })
    }
    setCommentSubmitting((prev) => ({ ...prev, [postId]: false }))
  }

  return {
    loading:
      postsQuery.isLoading ||
      (activeFamilyId ? false : true) ||
      userQuery.isLoading,
    error: postsQuery.error || memberQuery.error || userQuery.error,
    posts,
    commentInputs,
    commentSubmitting,
    commentErrors,
    onPost,
    handleCommentInput,
    onComment,
  }
}

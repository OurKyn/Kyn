import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { z } from 'zod'

const commentSchema = z.object({
  content: z.string().min(1, 'Comment cannot be empty'),
})

interface Profile {
  full_name: string | null
  avatar_url: string | null
}

interface Comment {
  id: string
  post_id: string
  author_id: string
  content: string
  created_at: string
  profiles: Profile
}

interface Post {
  id: string
  family_id: string
  author_id: string
  content: string
  created_at: string
  profiles: Profile
  comments: Comment[]
}

export function useFeed(reset: () => void) {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [familyId, setFamilyId] = useState<string | null>(null)
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({})
  const [commentSubmitting, setCommentSubmitting] = useState<
    Record<string, boolean>
  >({})
  const [commentErrors, setCommentErrors] = useState<
    Record<string, string | null>
  >({})

  useEffect(() => {
    const fetchFeed = async () => {
      setLoading(true)
      setError(null)
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()
      if (userError || !user) {
        setError('Not authenticated')
        setLoading(false)
        return
      }
      const { data: member } = await supabase
        .from('family_members')
        .select('family_id')
        .eq('profile_id', user.id)
        .maybeSingle()
      if (!member) {
        setError('You are not in a family')
        setLoading(false)
        return
      }
      setFamilyId(member.family_id)
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select(
          '*, profiles(full_name, avatar_url), comments(id, content, created_at, author_id, profiles(full_name, avatar_url))'
        )
        .eq('family_id', member.family_id)
        .order('created_at', { ascending: false })
      if (postsError) {
        setError('Could not load posts')
        setPosts([])
      } else {
        setPosts(postsData)
      }
      setLoading(false)
    }
    fetchFeed()
  }, [supabase, reset])

  const onPost = async (values: { content: string }, resetForm: () => void) => {
    setError(null)
    setLoading(true)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user || !familyId) {
      setError('Not authenticated or not in a family')
      setLoading(false)
      return
    }
    const { error: postError } = await supabase.from('posts').insert({
      family_id: familyId,
      author_id: user.id,
      content: values.content,
    })
    if (postError) {
      setError('Failed to post')
    } else {
      resetForm()
    }
    setLoading(false)
  }

  const handleCommentInput = (postId: string, value: string) => {
    setCommentInputs((prev) => ({ ...prev, [postId]: value }))
  }

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
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setError('Not authenticated')
      setCommentSubmitting((prev) => ({ ...prev, [postId]: false }))
      return
    }
    const { error: commentError } = await supabase.from('comments').insert({
      post_id: postId,
      author_id: user.id,
      content,
    })
    if (commentError) {
      setCommentErrors((prev) => ({ ...prev, [postId]: 'Failed to comment' }))
    } else {
      setCommentInputs((prev) => ({ ...prev, [postId]: '' }))
    }
    setCommentSubmitting((prev) => ({ ...prev, [postId]: false }))
  }

  return {
    loading,
    error,
    posts,
    commentInputs,
    commentSubmitting,
    commentErrors,
    onPost,
    handleCommentInput,
    onComment,
  }
}

'use client'

import { createClient } from '@/utils/supabase/client'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import Image from 'next/image'

const postSchema = z.object({
  content: z.string().min(1, 'Post cannot be empty'),
})

const commentSchema = z.object({
  content: z.string().min(1, 'Comment cannot be empty'),
})

type PostForm = z.infer<typeof postSchema>

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

export default function FeedPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [familyId, setFamilyId] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PostForm>({
    resolver: zodResolver(postSchema),
    defaultValues: { content: '' },
  })
  // Manage comment input state per post
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({})
  const [commentSubmitting, setCommentSubmitting] = useState<
    Record<string, boolean>
  >({})
  const [commentErrors, setCommentErrors] = useState<
    Record<string, string | null>
  >({})

  useEffect(() => {
    async function fetchFeed() {
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
      // Get user's family membership (use maybeSingle for 0/1 row)
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
      // Get posts for family
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

  const onPost = async (values: PostForm) => {
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
      reset()
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
    // Validate comment
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

  return (
    <div className="max-w-2xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">Family Feed</h1>
      {loading && <div className="text-gray-500">Loading...</div>}
      {error && <div className="text-red-500 mb-2">{error}</div>}
      <form onSubmit={handleSubmit(onPost)} className="mb-6 space-y-2">
        <textarea
          {...register('content')}
          className="w-full border rounded px-3 py-2 focus:outline-none focus:ring focus:border-blue-300"
          placeholder="Share something with your family..."
          disabled={isSubmitting || loading}
        />
        {errors.content && (
          <p className="text-red-500 text-xs mt-1">{errors.content.message}</p>
        )}
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          disabled={isSubmitting || loading}
        >
          Post
        </button>
      </form>
      <div className="space-y-6">
        {posts.map((post) => (
          <div key={post.id} className="border rounded p-4">
            <div className="flex items-center gap-2 mb-2">
              {post.profiles?.avatar_url && (
                <Image
                  src={post.profiles.avatar_url}
                  alt=""
                  width={32}
                  height={32}
                  className="w-8 h-8 rounded-full"
                />
              )}
              <span className="font-semibold">
                {post.profiles?.full_name || 'Unknown'}
              </span>
              <span className="ml-2 text-xs text-gray-500">
                {new Date(post.created_at).toLocaleString()}
              </span>
            </div>
            <div className="mb-2">{post.content}</div>
            <div className="ml-4">
              <h4 className="font-medium text-sm mb-1">Comments</h4>
              <ul className="space-y-1 mb-2">
                {post.comments?.map((c) => (
                  <li key={c.id} className="flex items-center gap-2">
                    {c.profiles?.avatar_url && (
                      <Image
                        src={c.profiles.avatar_url}
                        alt=""
                        width={24}
                        height={24}
                        className="w-6 h-6 rounded-full"
                      />
                    )}
                    <span className="font-semibold text-xs">
                      {c.profiles?.full_name || 'Unknown'}
                    </span>
                    <span className="ml-2 text-xs text-gray-500">
                      {new Date(c.created_at).toLocaleString()}
                    </span>
                    <span className="ml-2 text-xs">{c.content}</span>
                  </li>
                ))}
              </ul>
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  onComment(post.id)
                }}
                className="flex gap-2"
              >
                <label htmlFor={`comment-${post.id}`} className="sr-only">
                  Add a comment
                </label>
                <input
                  id={`comment-${post.id}`}
                  type="text"
                  value={commentInputs[post.id] || ''}
                  onChange={(e) => handleCommentInput(post.id, e.target.value)}
                  className="flex-1 border rounded px-2 py-1 text-sm focus:outline-none focus:ring focus:border-blue-300"
                  placeholder="Add a comment..."
                  disabled={commentSubmitting[post.id] || loading}
                />
                <button
                  type="submit"
                  className="bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600 disabled:opacity-50"
                  disabled={commentSubmitting[post.id] || loading}
                >
                  Comment
                </button>
              </form>
              {commentErrors[post.id] && (
                <p className="text-red-500 text-xs mt-1">
                  {commentErrors[post.id]}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

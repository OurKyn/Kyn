'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useFeed } from '@/hooks/useFeed'
import { LoadingState } from '@/components/loading-state'
import { EmptyState } from '@/components/empty-state'
import Image from 'next/image'
import { z } from 'zod'

const postSchema = z.object({
  content: z.string().min(1, 'Post cannot be empty'),
})

type PostForm = z.infer<typeof postSchema>

export default function FeedPage() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PostForm>({
    resolver: zodResolver(postSchema),
    defaultValues: { content: '' },
  })
  const {
    loading,
    error,
    posts,
    commentInputs,
    commentSubmitting,
    commentErrors,
    onPost,
    handleCommentInput,
    onComment,
  } = useFeed(reset)

  return (
    <div className="max-w-2xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">Family Feed</h1>
      {loading && <LoadingState message="Loading feed..." />}
      {error && <div className="text-red-500 mb-2">{error}</div>}
      <form
        onSubmit={handleSubmit((values) => onPost(values, reset))}
        className="mb-6 space-y-2"
      >
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
        {!loading && posts.length === 0 && (
          <EmptyState message="No posts yet. Start the conversation!" />
        )}
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

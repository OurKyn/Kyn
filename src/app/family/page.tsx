'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useFamily } from '@/hooks/useFamily'
import { LoadingState } from '@/components/loading-state'
import { EmptyState } from '@/components/empty-state'
import Image from 'next/image'
import { z } from 'zod'

const familySchema = z.object({
  familyName: z.string().min(2, 'Family name required'),
})

type FamilyForm = z.infer<typeof familySchema>

export default function FamilyPage() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FamilyForm>({
    resolver: zodResolver(familySchema),
    defaultValues: { familyName: '' },
  })
  const { loading, error, family, members, onCreate } = useFamily(reset)

  return (
    <div className="max-w-md mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">Family Management</h1>
      {error && <div className="text-red-500 mb-2">{error}</div>}
      {loading ? (
        <LoadingState />
      ) : !family ? (
        <form onSubmit={handleSubmit(onCreate)} className="space-y-4">
          <div>
            <label
              htmlFor="familyName"
              className="block text-sm font-medium mb-1"
            >
              Family Name
            </label>
            <input
              id="familyName"
              type="text"
              {...register('familyName')}
              className="w-full border rounded px-3 py-2 focus:outline-none focus:ring focus:border-blue-300"
              disabled={isSubmitting}
            />
            {errors.familyName && (
              <p className="text-red-500 text-xs mt-1">
                {errors.familyName.message}
              </p>
            )}
          </div>
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            disabled={isSubmitting}
          >
            Create Family
          </button>
        </form>
      ) : (
        <div>
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Family: {family.name}</h2>
          </div>
          <div>
            <h3 className="font-medium mb-2">Members</h3>
            <ul className="space-y-2">
              {members.length === 0 ? (
                <EmptyState message="No members yet." />
              ) : (
                members.map((m) => (
                  <li key={m.id} className="flex items-center gap-2">
                    {m.profiles?.avatar_url && (
                      <Image
                        src={m.profiles.avatar_url}
                        alt=""
                        width={32}
                        height={32}
                        className="w-8 h-8 rounded-full"
                      />
                    )}
                    <span>{m.profiles?.full_name || 'Unknown'}</span>
                    <span className="ml-2 text-xs text-gray-500">
                      ({m.role})
                    </span>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}

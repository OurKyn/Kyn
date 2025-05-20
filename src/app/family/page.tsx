'use client'

import { createClient } from '@/utils/supabase/client'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import Image from 'next/image'

const familySchema = z.object({
  familyName: z.string().min(2, 'Family name required'),
})

type FamilyForm = z.infer<typeof familySchema>

interface Profile {
  full_name: string | null
  avatar_url: string | null
}

interface Family {
  id: string
  name: string
  created_by: string
  created_at: string
}

interface FamilyMember {
  id: string
  family_id: string
  profile_id: string
  role: string
  joined_at: string
  profiles: Profile
}

export default function FamilyPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [family, setFamily] = useState<Family | null>(null)
  const [members, setMembers] = useState<FamilyMember[]>([])
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FamilyForm>({
    resolver: zodResolver(familySchema),
    defaultValues: { familyName: '' },
  })

  useEffect(() => {
    async function fetchFamily() {
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
      // Get the user's family membership (use maybeSingle for 0/1 row)
      const { data: member, error: memberError } = await supabase
        .from('family_members')
        .select('*, families(*), profiles(full_name, avatar_url)')
        .eq('profile_id', user.id)
        .maybeSingle()
      if (memberError) {
        setError('Could not load family membership')
        setFamily(null)
        setMembers([])
        setLoading(false)
        return
      }
      if (!member) {
        setFamily(null)
        setMembers([])
        setLoading(false)
        return
      }
      setFamily(member.families)
      // Get all members of the family
      const { data: allMembers, error: allMembersError } = await supabase
        .from('family_members')
        .select('*, profiles(full_name, avatar_url)')
        .eq('family_id', member.family_id)
      if (allMembersError) {
        setError('Could not load family members')
        setMembers([])
      } else {
        setMembers(allMembers)
      }
      setLoading(false)
    }
    fetchFamily()
  }, [supabase, reset])

  const onCreate = async (values: FamilyForm) => {
    setError(null)
    setLoading(true)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setError('Not authenticated')
      setLoading(false)
      return
    }
    // Create family
    const { data: newFamily, error: createError } = await supabase
      .from('families')
      .insert({ name: values.familyName, created_by: user.id })
      .select()
      .single()
    if (createError) {
      setError('Failed to create family')
      setLoading(false)
      return
    }
    // Add user as member
    await supabase
      .from('family_members')
      .insert({ family_id: newFamily.id, profile_id: user.id, role: 'admin' })
    setFamily(newFamily)
    setLoading(false)
  }

  return (
    <div className="max-w-md mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">Family Management</h1>
      {loading && <div className="text-gray-500">Loading...</div>}
      {error && <div className="text-red-500 mb-2">{error}</div>}
      {!family && (
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
              disabled={isSubmitting || loading}
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
            disabled={isSubmitting || loading}
          >
            Create Family
          </button>
        </form>
      )}
      {family && (
        <div>
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Family: {family.name}</h2>
          </div>
          <div>
            <h3 className="font-medium mb-2">Members</h3>
            <ul className="space-y-2">
              {members.map((m) => (
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
                  <span className="ml-2 text-xs text-gray-500">({m.role})</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'

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

export function useFamily(reset: () => void) {
  const supabase = createClient()
  const [error, setError] = useState<string | null>(null)
  const [family, setFamily] = useState<Family | null>(null)
  const [members, setMembers] = useState<FamilyMember[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchFamily = async () => {
      setError(null)
      setLoading(true)
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()
      if (userError || !user) {
        setError('Not authenticated')
        setLoading(false)
        return
      }
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single()
      if (profileError || !profile) {
        console.error('Profile not found for user', user.id, profileError)
        setError('Profile not found')
        setLoading(false)
        return
      }
      // Only allow one family membership
      const { data: memberships, error: memberError } = await supabase
        .from('family_members')
        .select('*, families(*), profiles(full_name, avatar_url)')
        .eq('profile_id', profile.id)
      if (memberError) {
        setError('Could not load family membership')
        setFamily(null)
        setMembers([])
        setLoading(false)
        return
      }
      if (!memberships || memberships.length === 0) {
        setFamily(null)
        setMembers([])
        setLoading(false)
        return
      }
      // Use the first (only) membership
      const member = memberships[0]
      setFamily(member.families)
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

  const onCreate = async (values: { familyName: string }) => {
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
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single()
    if (profileError || !profile) {
      setError('Profile not found')
      setLoading(false)
      return
    }
    // Prevent creating a family if already a member of any family
    const { data: memberships, error: memberError } = await supabase
      .from('family_members')
      .select('id')
      .eq('profile_id', profile.id)
    if (memberError) {
      setError('Failed to check existing family membership')
      setLoading(false)
      return
    }
    if (memberships && memberships.length > 0) {
      setError('You can only be a member of one family')
      setLoading(false)
      return
    }
    // Prevent duplicate family name for this user
    const { data: existingFamilies, error: existingError } = await supabase
      .from('families')
      .select('id')
      .eq('name', values.familyName)
      .eq('created_by', profile.id)
    if (existingError) {
      setError('Failed to check existing families')
      setLoading(false)
      return
    }
    if (existingFamilies && existingFamilies.length > 0) {
      setError('You already have a family with this name')
      setLoading(false)
      return
    }
    const { data: newFamily, error: createError } = await supabase
      .from('families')
      .insert({ name: values.familyName, created_by: profile.id })
      .select()
      .single()
    if (createError) {
      setError('Failed to create family')
      setLoading(false)
      return
    }
    await supabase.from('family_members').insert({
      family_id: newFamily.id,
      profile_id: profile.id,
      role: 'admin',
    })
    setFamily(newFamily)
    setLoading(false)
  }

  return {
    loading,
    error,
    family,
    members,
    onCreate,
    setError,
  }
}

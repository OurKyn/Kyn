'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { nanoid } from 'nanoid'
import { toast } from 'sonner'

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

interface FamilyMemberLite {
  id: string
  profile_id: string
  full_name: string | null
  avatar_url: string | null
  email: string | null
}

export function useFamily(reset: () => void, familyIdOverride?: string | null) {
  const supabase = createClient()
  const [error, setError] = useState<string | null>(null)
  const [family, setFamily] = useState<Family | null>(null)
  const [members, setMembers] = useState<FamilyMember[]>([])
  const [loading, setLoading] = useState(true)
  const [invitePassword, setInvitePassword] = useState<string | null>(null)
  const [inviteQrCodeUrl, setInviteQrCodeUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!familyIdOverride) return
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
      // Get all memberships
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
      // Find the selected family by id, or default to the first
      let member
      if (familyIdOverride) {
        member = memberships.find((m) => m.family_id === familyIdOverride)
        if (!member) {
          setError('Family not found or you are not a member')
          setFamily(null)
          setMembers([])
          setLoading(false)
          return
        }
      } else {
        member = memberships[0]
      }
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
  }, [supabase, reset, familyIdOverride])

  useEffect(() => {
    if (!family?.id) return
    // Subscribe to family_members changes (already present)
    const channelMembers = supabase
      .channel(`family_members_${family.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'family_members',
          filter: `family_id=eq.${family.id}`,
        },
        () => {
          setTimeout(() => {
            reset()
          }, 100)
        }
      )
      .subscribe()
    // Subscribe to profiles changes (onboarding/profile updates)
    const channelProfiles = supabase
      .channel(`profiles_family_${family.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
        },
        () => {
          setTimeout(() => {
            reset()
          }, 100)
        }
      )
      .subscribe()
    // Subscribe to families changes (invite password/token updates)
    const channelFamilies = supabase
      .channel(`families_${family.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'families',
          filter: `id=eq.${family.id}`,
        },
        () => {
          setTimeout(() => {
            reset()
          }, 100)
        }
      )
      .subscribe()
    // Subscribe to new invites for this family
    const channelInvites = supabase
      .channel(`family_invites_${family.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'family_invites',
          filter: `family_id=eq.${family.id}`,
        },
        () => {
          toast('New family invite created', {
            description:
              'A new invite link or QR code was generated for your family.',
          })
        }
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channelMembers)
      supabase.removeChannel(channelProfiles)
      supabase.removeChannel(channelFamilies)
      supabase.removeChannel(channelInvites)
    }
  }, [supabase, family?.id, reset])

  // Only return early after all hooks are called
  if (!familyIdOverride) {
    return {
      loading: true,
      error: null,
      family: null,
      members: [],
      onCreate: async () => {},
      setError,
      inviteByEmail: async () => false,
      inviteByPassword: async () => null,
      getInviteQrCode: async () => null,
      invitePassword: null,
      inviteQrCodeUrl: null,
    }
  }

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
    // Prevent creating more than one family (as creator)
    const { data: createdFamilies, error: createdError } = await supabase
      .from('families')
      .select('id')
      .eq('created_by', profile.id)
    if (createdError) {
      setError('Failed to check created families')
      setLoading(false)
      return
    }
    if (createdFamilies && createdFamilies.length > 0) {
      setError('You can only create one family')
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

  // Invite by email
  const inviteByEmail = async (email: string) => {
    setError(null)
    setLoading(true)
    if (!family) {
      setError('No family found')
      setLoading(false)
      return false
    }
    // Find profile by email
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email.toLowerCase())
    if (profileError || !profiles || profiles.length === 0) {
      setError(
        'No user found with that email. They must complete onboarding first.'
      )
      setLoading(false)
      return false
    }
    const profile = profiles[0]
    // Check if already a member
    const { data: existing, error: existingError } = await supabase
      .from('family_members')
      .select('id')
      .eq('family_id', family.id)
      .eq('profile_id', profile.id)
    if (existingError) {
      setError('Failed to check membership')
      setLoading(false)
      return false
    }
    if (existing && existing.length > 0) {
      setError('User is already a member')
      setLoading(false)
      return false
    }
    // Add to family_members
    const { error: addError } = await supabase.from('family_members').insert({
      family_id: family.id,
      profile_id: profile.id,
      role: 'member',
    })
    if (addError) {
      setError('Failed to add member')
      setLoading(false)
      return false
    }
    setLoading(false)
    return true
  }

  // Invite by password (set a family invite password)
  const inviteByPassword = async () => {
    setError(null)
    setLoading(true)
    if (!family) {
      setError('No family found')
      setLoading(false)
      return null
    }
    // Generate a password and store it in the family row (add a column if needed)
    const password = nanoid(8)
    const { error: updateError } = await supabase
      .from('families')
      .update({ invite_password: password })
      .eq('id', family.id)
    if (updateError) {
      setError('Failed to set invite password')
      setLoading(false)
      return null
    }
    setInvitePassword(password)
    setLoading(false)
    return password
  }

  // Invite by QR code (generate a join URL with a token)
  const getInviteQrCode = async () => {
    setError(null)
    setLoading(true)
    if (!family) {
      setError('No family found')
      setLoading(false)
      return null
    }
    // Generate a token and expiry (e.g., 1 hour from now)
    const token = nanoid(16)
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString()
    // Insert invite row
    const { error: inviteError } = await supabase
      .from('family_invites')
      .insert({
        family_id: family.id,
        token,
        expires_at: expiresAt,
        used: false,
      })
      .select()
      .single()
    if (inviteError) {
      setError('Failed to create invite')
      setLoading(false)
      return null
    }
    // Generate a join URL (replace with your actual domain)
    const url = `${window.location.origin}/join?family=${family.id}&token=${token}`
    setInviteQrCodeUrl(url)
    setLoading(false)
    return url
  }

  return {
    loading,
    error,
    family,
    members,
    onCreate,
    setError,
    inviteByEmail,
    inviteByPassword,
    getInviteQrCode,
    invitePassword,
    inviteQrCodeUrl,
  }
}

export function useFamilyMembers(familyIdOverride?: string | null) {
  const supabase = createClient()
  const [members, setMembers] = useState<FamilyMemberLite[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchMembers = async () => {
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
      let familyId = familyIdOverride
      if (!familyId) {
        // Get the user's family membership
        const { data: memberships, error: memberError } = await supabase
          .from('family_members')
          .select('family_id')
          .eq('profile_id', profile.id)
        if (memberError || !memberships || memberships.length === 0) {
          setError('Not in a family')
          setLoading(false)
          return
        }
        familyId = memberships[0].family_id
      }
      // Get all members in the family (excluding self)
      const { data: allMembers, error: allMembersError } = await supabase
        .from('family_members')
        .select('id, profile_id, profiles(full_name, avatar_url, email)')
        .eq('family_id', familyId)
        .neq('profile_id', profile.id)
      if (allMembersError) {
        setError('Could not load family members')
        setLoading(false)
        return
      }
      setMembers(
        (allMembers || []).map((m) => ({
          id: m.id,
          profile_id: m.profile_id,
          full_name: m.profiles?.full_name ?? null,
          avatar_url: m.profiles?.avatar_url ?? null,
          email: m.profiles?.email ?? null,
        }))
      )
      setLoading(false)
    }
    fetchMembers()
    // Subscribe to profiles changes (onboarding/profile updates)
    const channelProfiles = supabase
      .channel('profiles_family_members')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
        },
        () => {
          setTimeout(() => {
            fetchMembers()
          }, 100)
        }
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channelProfiles)
    }
  }, [supabase, familyIdOverride])

  return { members, loading, error }
}

/**
 * Join a family by invite password or QR token.
 * @param method 'password' | 'token'
 * @param value The password or token value
 * @returns {Promise<{ success: boolean; error?: string }>} Result
 */
export async function joinFamily(
  method: 'password' | 'token',
  value: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()
  // 1. Require authentication
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData?.user) {
    return { success: false, error: 'Not authenticated' }
  }
  // 2. Get or create profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', userData.user.id)
    .single()
  if (profileError || !profile) {
    return {
      success: false,
      error: 'Profile not found. Please complete onboarding.',
    }
  }
  // 3. Allow joining multiple families, so do not block if already a member
  // But prevent duplicate membership in the same family
  const { data: memberships, error: memberError } = await supabase
    .from('family_members')
    .select('id, family_id')
    .eq('profile_id', profile.id)
  if (memberError) {
    return { success: false, error: 'Could not check family membership' }
  }
  // 4. Find family by password or token
  let familiesRes
  if (method === 'password') {
    familiesRes = await supabase
      .from('families')
      .select('id')
      .eq('invite_password', value)
  } else {
    // Find invite by token, not used, and not expired
    const { data: invites, error: inviteError } = await supabase
      .from('family_invites')
      .select('id, family_id, used, expires_at')
      .eq('token', value)
      .eq('used', false)
    if (inviteError || !invites || invites.length === 0) {
      return { success: false, error: 'Invalid or expired invite link.' }
    }
    const invite = invites[0]
    if (new Date(invite.expires_at) < new Date()) {
      return { success: false, error: 'Invite link has expired.' }
    }
    const familyId = invite.family_id
    // 5. Add to family_members
    if (memberships && memberships.some((m) => m.family_id === familyId)) {
      return {
        success: false,
        error: 'You are already a member of this family',
      }
    }
    const { error: addError } = await supabase.from('family_members').insert({
      family_id: familyId,
      profile_id: profile.id,
      role: 'member',
    })
    if (addError) {
      return {
        success: false,
        error: 'Failed to join family. Please try again.',
      }
    }
    // Mark invite as used
    await supabase
      .from('family_invites')
      .update({ used: true })
      .eq('id', invite.id)
    return { success: true }
  }
  if (familiesRes.error || !familiesRes.data || familiesRes.data.length === 0) {
    return {
      success: false,
      error: 'Invalid invite. Please check your invite link or password.',
    }
  }
  if (familiesRes.data.length > 1) {
    return {
      success: false,
      error: 'Multiple families found for this invite. Please contact support.',
    }
  }
  const familyId = familiesRes.data[0].id
  // 5. Add to family_members
  if (memberships && memberships.some((m) => m.family_id === familyId)) {
    return { success: false, error: 'You are already a member of this family' }
  }
  const { error: addError } = await supabase.from('family_members').insert({
    family_id: familyId,
    profile_id: profile.id,
    role: 'member',
  })
  if (addError) {
    return { success: false, error: 'Failed to join family. Please try again.' }
  }
  return { success: true }
}

/**
 * Fetch all families the current user belongs to.
 * Returns: { families, loading, error }
 */
export function useUserFamilies() {
  const supabase = createClient()
  const [families, setFamilies] = useState<
    Array<{ id: string; name: string; role: string; createdByMe: boolean }>
  >([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [myProfileId, setMyProfileId] = useState<string | null>(null)

  useEffect(() => {
    const fetchFamilies = async () => {
      setLoading(true)
      setError(null)
      setFamilies([])
      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError || !userData?.user) {
        setError('Not authenticated')
        setLoading(false)
        return
      }
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', userData.user.id)
        .single()
      if (profileError || !profile) {
        setError('Profile not found')
        setLoading(false)
        return
      }
      setMyProfileId(profile.id)
      // Step 1: Get all family memberships for this user
      const { data: memberships, error: memberError } = await supabase
        .from('family_members')
        .select('family_id, role')
        .eq('profile_id', profile.id)
      if (memberError) {
        setError('Could not load families')
        setLoading(false)
        return
      }
      const familyIds = (memberships || []).map((m) => m.family_id)
      if (!familyIds.length) {
        setFamilies([])
        setLoading(false)
        return
      }
      // Step 2: Fetch all families by those IDs, including created_by
      const { data: familiesData, error: familiesError } = await supabase
        .from('families')
        .select('id, name, created_by')
        .in('id', familyIds)
      if (familiesError) {
        setError('Could not load families')
        setLoading(false)
        return
      }
      // Step 3: Merge role info and createdByMe
      const familiesWithRoles = (familiesData || []).map((fam) => {
        const membership = (memberships || []).find(
          (m) => m.family_id === fam.id
        )
        return {
          id: fam.id,
          name: fam.name,
          role: membership?.role || 'member',
          createdByMe: fam.created_by === profile.id,
        }
      })
      setFamilies(familiesWithRoles)
      setLoading(false)
    }
    fetchFamilies()
  }, [supabase])

  return { families, loading, error, myProfileId }
}

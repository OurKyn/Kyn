'use client'

import { useEffect, useState } from 'react'
import { useFamilyContext } from '@/context/family-context'
import { createClient } from '@/utils/supabase/client'
import { LoadingState } from '@/components/loading-state'
import { EmptyState } from '@/components/empty-state'
import Image from 'next/image'

interface FamilyMember {
  id: string
  profile_id: string
  full_name: string | null
  avatar_url: string | null
  parent_id: string | null // null = root
}

interface SupabaseFamilyMember {
  id: string
  profile_id: string
  parent_id: string | null
  profiles: {
    full_name: string | null
    avatar_url: string | null
  } | null
}

export default function FamilyTreePage() {
  const { selectedFamilyId } = useFamilyContext()
  const [members, setMembers] = useState<FamilyMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!selectedFamilyId) return
    setLoading(true)
    setError(null)
    const supabase = createClient()
    supabase
      .from('family_members')
      .select('id, profile_id, parent_id, profiles(full_name, avatar_url)')
      .eq('family_id', selectedFamilyId)
      .then(({ data, error }) => {
        if (error) {
          setError('Failed to load family members')
          setLoading(false)
          return
        }
        setMembers(
          ((data as SupabaseFamilyMember[] | null) || []).map((m) => ({
            id: m.id,
            profile_id: m.profile_id,
            parent_id: m.parent_id,
            full_name: m.profiles?.full_name ?? null,
            avatar_url: m.profiles?.avatar_url ?? null,
          }))
        )
        setLoading(false)
      })
  }, [selectedFamilyId])

  // Build tree structure from flat list
  function buildTree(
    nodes: FamilyMember[],
    parentId: string | null = null
  ): FamilyMember[] {
    return nodes.filter((n) => n.parent_id === parentId)
  }

  function renderTree(nodes: FamilyMember[], all: FamilyMember[], level = 0) {
    if (!nodes.length) return null
    return (
      <ul className={`ml-${level > 0 ? 8 : 0} space-y-4`}>
        {' '}
        {/* Indent children */}
        {nodes.map((node) => (
          <li key={node.id} className="flex items-center gap-2">
            {node.avatar_url && (
              <Image
                src={node.avatar_url}
                alt=""
                width={40}
                height={40}
                className="w-10 h-10 rounded-full border"
              />
            )}
            <span className="font-semibold">{node.full_name || 'Unknown'}</span>
            {/* Render children recursively */}
            {renderTree(
              all.filter((n) => n.parent_id === node.id),
              all,
              level + 1
            )}
          </li>
        ))}
      </ul>
    )
  }

  return (
    <div className="max-w-2xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">Family Tree</h1>
      {loading ? (
        <LoadingState message="Loading family tree..." />
      ) : error ? (
        <div className="text-red-500 mb-2">{error}</div>
      ) : !members.length ? (
        <EmptyState message="No family members or relationships defined yet." />
      ) : (
        <div className="overflow-x-auto">
          {renderTree(buildTree(members), members)}
        </div>
      )}
    </div>
  )
}

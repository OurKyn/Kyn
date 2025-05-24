'use client'

import { useEffect, useState } from 'react'
import { useFamilyContext } from '@/context/family-context'
import { createClient } from '@/utils/supabase/client'
import { LoadingState } from '@/components/loading-state'
import { EmptyState } from '@/components/empty-state'
import Image from 'next/image'
import clsx from 'clsx'

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

  // Render tree as horizontal flex with SVG connectors
  function renderTree(nodes: FamilyMember[], all: FamilyMember[], level = 0) {
    if (!nodes.length) return null
    return (
      <div className="flex flex-row items-start justify-center space-x-8 relative">
        {nodes.map((node) => {
          const children = all.filter((n) => n.parent_id === node.id)
          return (
            <div
              key={node.id}
              className="flex flex-col items-center relative group"
            >
              {/* Card */}
              <div
                className={clsx(
                  'bg-white dark:bg-brand-dark/80 rounded-lg shadow-md border p-3 flex flex-col items-center transition-transform duration-150',
                  'hover:scale-105 focus-within:scale-105',
                  'min-w-[120px] max-w-[160px]'
                )}
                aria-label={node.full_name || 'Unknown family member'}
              >
                {node.avatar_url ? (
                  <Image
                    src={node.avatar_url}
                    alt={node.full_name || 'Family member'}
                    width={48}
                    height={48}
                    className="w-12 h-12 rounded-full border mb-2 object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center mb-2 text-gray-400">
                    <svg width="32" height="32" fill="none" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M12 12c2.7 0 5-2.3 5-5s-2.3-5-5-5-5 2.3-5 5 2.3 5 5 5zm0 2c-3.3 0-10 1.7-10 5v3h20v-3c0-3.3-6.7-5-10-5z"
                      />
                    </svg>
                  </div>
                )}
                <span
                  className="font-semibold text-center text-sm truncate w-full"
                  title={node.full_name || 'Unknown'}
                >
                  {node.full_name || 'Unknown'}
                </span>
              </div>
              {/* SVG connector to children */}
              {children.length > 0 && (
                <svg
                  className="absolute left-1/2 top-full z-0"
                  width="2"
                  height="32"
                  viewBox="0 0 2 32"
                  fill="none"
                  style={{ transform: 'translateX(-50%)' }}
                >
                  <line
                    x1="1"
                    y1="0"
                    x2="1"
                    y2="32"
                    stroke="#cbd5e1"
                    strokeWidth="2"
                  />
                </svg>
              )}
              {/* Children */}
              {children.length > 0 && (
                <div className="flex flex-row items-start justify-center space-x-8 mt-8 relative">
                  {/* Horizontal connector between children */}
                  <svg
                    className="absolute top-0 left-0 z-0"
                    width={children.length * 120}
                    height="16"
                    viewBox={`0 0 ${children.length * 120} 16`}
                    fill="none"
                  >
                    <line
                      x1="0"
                      y1="8"
                      x2={children.length * 120}
                      y2="8"
                      stroke="#cbd5e1"
                      strokeWidth="2"
                    />
                  </svg>
                  {renderTree(children, all, level + 1)}
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="max-w-full overflow-x-auto py-8">
      <h1 className="text-2xl font-bold mb-4">Family Tree</h1>
      {loading ? (
        <LoadingState message="Loading family tree..." />
      ) : error ? (
        <div className="text-red-500 mb-2">{error}</div>
      ) : !members.length ? (
        <EmptyState message="No family members or relationships defined yet." />
      ) : (
        <div className="min-w-[600px] pb-8">
          {renderTree(buildTree(members), members)}
        </div>
      )}
    </div>
  )
}

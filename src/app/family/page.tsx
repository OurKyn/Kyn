'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useFamily, useUserFamilies } from '@/hooks/useFamily'
import { LoadingState } from '@/components/loading-state'
import { EmptyState } from '@/components/empty-state'
import Image from 'next/image'
import { z } from 'zod'
import { useState, useEffect, useCallback } from 'react'
import QRCode from 'react-qr-code'

const familySchema = z.object({
  familyName: z.string().min(2, 'Family name required'),
})

type FamilyForm = z.infer<typeof familySchema>

export default function FamilyPage() {
  const {
    families,
    loading: familiesLoading,
    error: familiesError,
  } = useUserFamilies()
  const [selectedFamilyId, setSelectedFamilyId] = useState<string | null>(null)

  // Determine if the user has created a family
  const hasCreatedFamily = families.some((f) => f.createdByMe)

  // Restore last selected family from localStorage, or pick first available
  useEffect(() => {
    if (families && families.length > 0) {
      const storedId =
        typeof window !== 'undefined'
          ? localStorage.getItem('kyn-selected-family')
          : null
      const found = storedId && families.some((f) => f.id === storedId)
      if (found && storedId !== selectedFamilyId) {
        setSelectedFamilyId(storedId)
      } else if (
        !selectedFamilyId ||
        !families.some((f) => f.id === selectedFamilyId)
      ) {
        setSelectedFamilyId(families[0].id)
        if (typeof window !== 'undefined') {
          localStorage.setItem('kyn-selected-family', families[0].id)
        }
      }
    } else if (!familiesLoading && (!families || families.length === 0)) {
      setSelectedFamilyId(null)
      if (typeof window !== 'undefined') {
        localStorage.removeItem('kyn-selected-family')
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [families, familiesLoading])

  // On dropdown change, update both state and localStorage
  const handleFamilySwitch = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedFamilyId(e.target.value)
    if (typeof window !== 'undefined') {
      localStorage.setItem('kyn-selected-family', e.target.value)
    }
  }

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FamilyForm>({
    resolver: zodResolver(familySchema),
    defaultValues: { familyName: '' },
  })
  const memoizedReset = useCallback(() => reset(), [reset])
  const {
    loading,
    error,
    family,
    members,
    onCreate,
    inviteByEmail,
    inviteByPassword,
    getInviteQrCode,
    invitePassword,
    inviteQrCodeUrl,
  } = useFamily(memoizedReset, selectedFamilyId)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteStatus, setInviteStatus] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showQr, setShowQr] = useState(false)

  return (
    <div className="max-w-md mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">
        {family ? <span>{family.name}</span> : 'Family Management'}
      </h1>
      {/* Family Switcher */}
      {familiesLoading ? (
        <div className="mb-4">Loading your families...</div>
      ) : familiesError ? (
        <div className="mb-4 text-red-500">{familiesError}</div>
      ) : families.length > 0 ? (
        <div className="mb-4">
          <label
            htmlFor="family-switcher"
            className="block text-sm font-medium mb-1"
          >
            Switch Family
          </label>
          <select
            id="family-switcher"
            value={selectedFamilyId || ''}
            onChange={handleFamilySwitch}
            className="w-full border rounded px-3 py-2 focus:outline-none focus:ring focus:border-blue-300"
            aria-label="Select family"
            disabled={families.length === 1}
          >
            {families.map((fam) => (
              <option key={fam.id} value={fam.id}>
                {fam.name} ({fam.role})
              </option>
            ))}
          </select>
          {families.length === 1 && (
            <div className="text-xs text-gray-500 mt-1">
              You are only a member of one family.
            </div>
          )}
        </div>
      ) : null}
      {error && <div className="text-red-500 mb-2">{error}</div>}
      {loading ? (
        <LoadingState message="Loading family..." />
      ) : !hasCreatedFamily ? (
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
            <h2 className="text-lg font-semibold">Family: {family?.name}</h2>
          </div>
          {/* Invite options */}
          <div className="mb-6 space-y-4">
            <h3 className="font-medium mb-2">Invite Members</h3>
            {/* Invite by email */}
            <form
              onSubmit={async (e) => {
                e.preventDefault()
                setInviteStatus(null)
                const ok = await inviteByEmail(inviteEmail)
                setInviteStatus(ok ? 'Invite sent!' : 'Failed to invite')
                setInviteEmail('')
              }}
              className="flex gap-2 items-center"
            >
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="Enter email address"
                className="flex-1 border rounded px-2 py-1 text-sm focus:outline-none focus:ring focus:border-blue-300"
                required
                disabled={loading}
              />
              <button
                type="submit"
                className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 disabled:opacity-50"
                disabled={loading || !inviteEmail}
              >
                Invite by Email
              </button>
            </form>
            {/* Invite by password */}
            <div>
              <button
                type="button"
                className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 disabled:opacity-50 mr-2"
                onClick={async () => {
                  setShowPassword(true)
                  await inviteByPassword()
                }}
                disabled={loading}
              >
                Generate Invite Password
              </button>
              {showPassword && invitePassword && (
                <span className="ml-2 font-mono bg-gray-100 px-2 py-1 rounded text-green-700">
                  {invitePassword}
                </span>
              )}
            </div>
            {/* Invite by QR code */}
            <div>
              <button
                type="button"
                className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600 disabled:opacity-50 mr-2"
                onClick={async () => {
                  setShowQr(true)
                  await getInviteQrCode()
                }}
                disabled={loading}
              >
                Generate QR Code Invite
              </button>
              {showQr && inviteQrCodeUrl && (
                <div className="flex flex-col items-start gap-2 ml-2">
                  <QRCode value={inviteQrCodeUrl} size={128} />
                  <span className="break-all text-xs bg-gray-100 px-2 py-1 rounded text-yellow-700">
                    {inviteQrCodeUrl}
                  </span>
                </div>
              )}
            </div>
            {inviteStatus && (
              <div className="text-green-600 text-sm">{inviteStatus}</div>
            )}
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

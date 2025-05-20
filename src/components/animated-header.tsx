'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState, useRef, useReducer } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { useUserFamilies } from '@/hooks/useFamily'
import { useFamilyContext } from '@/context/family-context'
import { BellIcon } from '@heroicons/react/24/outline'
import { toast } from 'react-hot-toast'

function Breadcrumbs() {
  const pathname = usePathname()
  const segments = pathname.split('/').filter(Boolean)
  const crumbs = [
    { name: 'Home', href: '/' },
    ...segments.map((seg, i) => ({
      name: seg.charAt(0).toUpperCase() + seg.slice(1),
      href: '/' + segments.slice(0, i + 1).join('/'),
    })),
  ]
  return (
    <nav aria-label="Breadcrumb" className="mb-1">
      <ol className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-300">
        {crumbs.map((crumb, i) => (
          <li key={crumb.href} className="flex items-center">
            <Link
              href={crumb.href}
              className={
                i === crumbs.length - 1
                  ? 'font-semibold text-brand-accent pointer-events-none'
                  : 'hover:underline focus:underline transition-colors'
              }
              aria-current={i === crumbs.length - 1 ? 'page' : undefined}
            >
              {crumb.name}
            </Link>
            {i < crumbs.length - 1 && (
              <span className="mx-1 text-gray-400">&gt;</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}

// Notification state and context (local to this file for now)
interface Notification {
  id: string
  type: 'message' | 'post' | 'invite'
  content: string
  createdAt: string
  read: boolean
}

type NotificationAction =
  | { type: 'add'; notification: Notification }
  | { type: 'markRead'; id: string }
  | { type: 'markAllRead' }

function notificationReducer(
  state: Notification[],
  action: NotificationAction
): Notification[] {
  switch (action.type) {
    case 'add':
      // Avoid duplicates
      if (state.some((n) => n.id === action.notification.id)) return state
      return [action.notification, ...state]
    case 'markRead':
      return state.map((n) => (n.id === action.id ? { ...n, read: true } : n))
    case 'markAllRead':
      return state.map((n) => ({ ...n, read: true }))
    default:
      return state
  }
}

export function AnimatedHeader() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const router = useRouter()
  const {
    families,
    loading: familiesLoading,
    error: familiesError,
  } = useUserFamilies()
  const { selectedFamilyId, setSelectedFamilyId } = useFamilyContext()
  const [notifications, dispatch] = useReducer(notificationReducer, [])
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // On dropdown change, update context (which syncs to localStorage)
  const handleFamilySwitch = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedFamilyId(e.target.value)
    // No need to refresh, context will update consumers
  }

  useEffect(() => {
    const supabase = createClient()
    let isMounted = true
    supabase.auth.getUser().then(({ data }) => {
      if (isMounted) {
        setIsLoggedIn(!!data?.user)
        setUserEmail(data?.user?.email || null)
      }
    })
    // Listen for auth changes
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (isMounted) {
          setIsLoggedIn(!!session?.user)
          setUserEmail(session?.user?.email || null)
        }
      }
    )
    return () => {
      isMounted = false
      listener?.subscription.unsubscribe()
    }
  }, [])

  // Listen for Sonner toasts and add to notification state
  // (Assume toast is called with { id, type, content })
  useEffect(() => {
    // Patch Sonner's toast to also dispatch to notifications
    // (This is a hack; for production, use a context/provider)
    const origToast =
      (window as unknown as { __kyn_toast?: typeof toast }).__kyn_toast || toast
    function kynToast(
      title: string,
      opts: { id?: string; type?: string; description?: string }
    ) {
      if (opts && opts.id && opts.type && opts.description) {
        dispatch({
          type: 'add',
          notification: {
            id: opts.id,
            type: opts.type as Notification['type'],
            content: opts.description,
            createdAt: new Date().toISOString(),
            read: false,
          },
        })
      }
      return origToast(title, opts)
    }
    ;(window as unknown as { __kyn_toast?: typeof kynToast }).__kyn_toast =
      kynToast
    ;(toast as typeof toast & { kyn?: typeof kynToast }).kyn = kynToast
    return () => {
      ;(window as unknown as { __kyn_toast?: typeof toast }).__kyn_toast =
        origToast
      ;(toast as typeof toast & { kyn?: typeof kynToast }).kyn = origToast
    }
  }, [])

  // Mark all as read when dropdown opens
  useEffect(() => {
    if (dropdownOpen) {
      dispatch({ type: 'markAllRead' })
    }
  }, [dropdownOpen])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false)
      }
    }
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClick)
    } else {
      document.removeEventListener('mousedown', handleClick)
    }
    return () => document.removeEventListener('mousedown', handleClick)
  }, [dropdownOpen])

  const unreadCount = notifications.filter((n) => !n.read).length

  const handleSignOut = async () => {
    await fetch('/auth/signout', { method: 'POST' })
    // After sign out, force a refresh and re-check auth state
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      setIsLoggedIn(!!data?.user)
      setUserEmail(data?.user?.email || null)
      router.push('/')
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <motion.h1
        className="text-3xl md:text-4xl font-display font-bold tracking-tight bg-gradient-to-r from-brand via-brand-accent to-brand-dark bg-clip-text text-transparent animate-gradient"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
      >
        Kyn
      </motion.h1>
      <Breadcrumbs />
      {isLoggedIn && (
        <div className="flex flex-col items-center w-full mb-2">
          {familiesLoading ? (
            <div className="text-xs text-gray-500">Loading families...</div>
          ) : familiesError ? (
            <div className="text-xs text-red-500">{familiesError}</div>
          ) : families.length > 0 ? (
            <div className="w-full max-w-xs">
              <label
                htmlFor="header-family-switcher"
                className="block text-xs font-medium mb-1"
              >
                Switch Family
              </label>
              <select
                id="header-family-switcher"
                value={selectedFamilyId || ''}
                onChange={handleFamilySwitch}
                className="w-full border rounded px-2 py-1 text-sm focus:outline-none focus:ring focus:border-blue-300"
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
        </div>
      )}
      <div className="flex items-center gap-3 mt-2">
        {/* Notification Bell */}
        <div className="relative">
          <button
            aria-label="Notifications"
            className="p-2 rounded-full bg-white dark:bg-brand-dark/80 shadow hover:bg-brand-accent/20 focus:outline-none focus:ring-2 focus:ring-brand-accent"
            onClick={() => setDropdownOpen((v) => !v)}
            aria-haspopup="true"
            aria-expanded={dropdownOpen}
          >
            <BellIcon className="h-6 w-6 text-brand-accent" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[1.25em] text-center">
                {unreadCount}
              </span>
            )}
          </button>
          {dropdownOpen && (
            <div
              ref={dropdownRef}
              className="absolute right-0 mt-2 w-72 bg-white dark:bg-brand-dark/90 border border-gray-200 dark:border-brand-accent/30 rounded shadow-lg z-50"
              role="menu"
              aria-label="Notifications"
            >
              <div className="p-2 border-b border-gray-100 dark:border-brand-accent/20 font-semibold text-sm">
                Notifications
              </div>
              <ul className="max-h-64 overflow-y-auto divide-y divide-gray-100 dark:divide-brand-accent/20">
                {notifications.length === 0 ? (
                  <li className="p-4 text-center text-gray-400 text-sm">
                    No notifications
                  </li>
                ) : (
                  notifications.slice(0, 10).map((n) => (
                    <li
                      key={n.id}
                      className={`p-3 flex flex-col gap-0.5 ${!n.read ? 'bg-brand-accent/10 dark:bg-brand-accent/20' : ''}`}
                      role="menuitem"
                    >
                      <span className="font-medium text-brand-dark dark:text-brand-accent text-xs">
                        {n.type === 'message'
                          ? 'New Message'
                          : n.type === 'post'
                            ? 'New Post'
                            : 'New Invite'}
                        <span className="ml-2 text-xs text-gray-400">
                          {new Date(n.createdAt).toLocaleTimeString()}
                        </span>
                      </span>
                      <span className="text-sm text-gray-700 dark:text-gray-200 truncate">
                        {n.content}
                      </span>
                    </li>
                  ))
                )}
              </ul>
            </div>
          )}
        </div>
        {!isLoggedIn ? (
          <>
            <Link
              href="/auth/login"
              className="px-4 py-1 rounded bg-brand-accent text-brand-dark font-semibold shadow hover:bg-brand focus:outline-none focus:ring-2 focus:ring-brand-accent focus:ring-offset-2 transition-colors"
            >
              Login
            </Link>
            <Link
              href="/auth/register"
              className="px-4 py-1 rounded bg-brand text-white font-semibold shadow hover:bg-brand-accent hover:text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 transition-colors"
            >
              Register
            </Link>
          </>
        ) : (
          <div className="flex items-center gap-2">
            {userEmail && (
              <span className="text-sm text-gray-700 dark:text-gray-200 font-mono px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded">
                {userEmail}
              </span>
            )}
            <button
              onClick={handleSignOut}
              className="px-4 py-1 rounded bg-red-500 text-white font-semibold shadow hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
              aria-label="Sign out"
            >
              Sign Out
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

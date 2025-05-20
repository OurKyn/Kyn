'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

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

export function AnimatedHeader() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      setIsLoggedIn(!!data?.user)
    })
    // Listen for auth changes
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setIsLoggedIn(!!session?.user)
      }
    )
    return () => {
      listener?.subscription.unsubscribe()
    }
  }, [])

  const handleSignOut = async () => {
    await fetch('/auth/signout', { method: 'POST' })
    router.push('/')
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
      <div className="flex gap-3 mt-2">
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
          <button
            onClick={handleSignOut}
            className="px-4 py-1 rounded bg-red-500 text-white font-semibold shadow hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
            aria-label="Sign out"
          >
            Sign Out
          </button>
        )}
      </div>
    </div>
  )
}

'use client'

import type { ReactNode } from 'react'

interface OnboardingLayoutProps {
  children: ReactNode
}

export default function OnboardingLayout({ children }: OnboardingLayoutProps) {
  return (
    <div className="relative min-h-screen flex items-center justify-center bg-brand-bg dark:bg-brand-bg-dark text-brand-dark dark:text-brand transition-colors duration-300">
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-brand/10 via-brand-accent/10 to-brand-dark/30 pointer-events-none" />
        <svg
          className="absolute inset-0 w-full h-full opacity-20"
          width="100%"
          height="100%"
        >
          <defs>
            <pattern
              id="grid-onboarding"
              width="40"
              height="40"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 40 0 L 0 0 0 40"
                fill="none"
                stroke="currentColor"
                strokeWidth="0.5"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid-onboarding)" />
        </svg>
      </div>
      <div className="w-full max-w-md p-4 sm:p-8">{children}</div>
    </div>
  )
}

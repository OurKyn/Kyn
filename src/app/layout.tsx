'use client'

import './globals.css'
import { ReactNode } from 'react'
import { DarkModeToggle } from '../components/dark-mode-toggle'
import { AnimatedHeader } from '../components/animated-header'
import { ErrorBoundaryWrapper } from '../components/error-boundary'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { FamilyProvider } from '@/context/family-context'
import { Toaster } from 'sonner'

export default function RootLayout({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())
  return (
    <QueryClientProvider client={queryClient}>
      <FamilyProvider>
        <Toaster richColors position="top-center" />
        <html lang="en" suppressHydrationWarning>
          <body className="relative min-h-screen bg-brand-bg dark:bg-brand-bg-dark text-brand-dark dark:text-brand transition-colors duration-300">
            <DarkModeToggle />
            <div className="fixed inset-0 -z-10">
              {/* Example: animated grid background, swap for Magic UI warp-background if available */}
              <div className="absolute inset-0 bg-gradient-to-br from-brand/10 via-brand-accent/10 to-brand-dark/30 pointer-events-none" />
              <svg
                className="absolute inset-0 w-full h-full opacity-20"
                width="100%"
                height="100%"
              >
                <defs>
                  <pattern
                    id="grid"
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
                <rect width="100%" height="100%" fill="url(#grid)" />
              </svg>
            </div>
            <header className="w-full flex items-center justify-center py-8 z-10 relative">
              <AnimatedHeader />
            </header>
            <main className="flex flex-col items-center justify-center min-h-[80vh] px-2 sm:px-0">
              <ErrorBoundaryWrapper>{children}</ErrorBoundaryWrapper>
            </main>
          </body>
        </html>
      </FamilyProvider>
    </QueryClientProvider>
  )
}

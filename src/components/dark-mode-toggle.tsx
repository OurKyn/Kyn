'use client'

import React from 'react'

export function DarkModeToggle() {
  // Simple dark mode toggle using localStorage and Tailwind's class strategy
  // For a more robust solution, use a context/provider
  return (
    <button
      aria-label="Toggle dark mode"
      className="fixed top-4 right-4 z-20 p-2 rounded-full bg-brand-accent/80 dark:bg-brand-dark/80 text-brand-dark dark:text-brand shadow-lg transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-brand-accent"
      onClick={() => {
        if (typeof window !== 'undefined') {
          const d = document.documentElement
          d.classList.toggle('dark')
          localStorage.setItem(
            'theme',
            d.classList.contains('dark') ? 'dark' : 'light'
          )
        }
      }}
    >
      <span className="sr-only">Toggle dark mode</span>
      <svg
        className="w-6 h-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 3v1m0 16v1m8.66-13.66l-.71.71M4.05 19.07l-.71.71M21 12h-1M4 12H3m16.66 5.66l-.71-.71M4.05 4.93l-.71-.71M16 12a4 4 0 11-8 0 4 4 0 018 0z"
        />
      </svg>
    </button>
  )
}

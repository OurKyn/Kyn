'use client'

import { motion } from 'framer-motion'

interface HomeContentProps {
  email: string
}

export function HomeContent({ email }: HomeContentProps) {
  return (
    <section className="w-full flex flex-col items-center justify-center min-h-[70vh] px-2 sm:px-0">
      <motion.div
        className="w-full max-w-md p-8 rounded-2xl shadow-xl bg-white/80 dark:bg-brand-dark/80 border border-brand/10 dark:border-brand-accent/20 backdrop-blur-md space-y-8"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
      >
        <motion.h2
          className="text-2xl md:text-3xl font-bold text-center bg-gradient-to-r from-brand via-brand-accent to-brand-dark bg-clip-text text-transparent animate-gradient"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.7 }}
        >
          Welcome to Kyn
        </motion.h2>
        <motion.div
          className="space-y-4 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.7 }}
        >
          <p className="text-lg">
            Signed in as{' '}
            <span className="font-semibold text-brand-accent">{email}</span>
          </p>
          <form action="/auth/signout" method="post">
            <motion.button
              type="submit"
              className="w-full py-2 px-4 rounded-lg bg-brand-accent text-brand-dark font-bold shadow-md hover:scale-105 active:scale-95 transition-transform duration-200 focus:outline-none focus:ring-2 focus:ring-brand-accent focus:ring-offset-2"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Sign Out
            </motion.button>
          </form>
        </motion.div>
      </motion.div>
    </section>
  )
}

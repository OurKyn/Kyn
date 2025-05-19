'use client'

import { motion } from 'framer-motion'

export function AnimatedHeader() {
  return (
    <motion.h1
      className="text-3xl md:text-4xl font-display font-bold tracking-tight bg-gradient-to-r from-brand via-brand-accent to-brand-dark bg-clip-text text-transparent animate-gradient"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7 }}
    >
      Kyn
    </motion.h1>
  )
}

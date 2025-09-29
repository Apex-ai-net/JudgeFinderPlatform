'use client'

import { ReactNode } from 'react'
import { motion } from 'framer-motion'

interface JudgesDirectoryLayoutProps {
  header: ReactNode
  search: ReactNode
  summary: ReactNode
  results: ReactNode
  metrics?: ReactNode
  topbar?: ReactNode
}

export function JudgesDirectoryLayout({ header, search, summary, results, metrics, topbar }: JudgesDirectoryLayoutProps) {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden">
      {header}
      {topbar}

      <motion.section
        className="px-4 py-16"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
      >
        <div className="mx-auto max-w-7xl space-y-8">
          {search}
          {summary}
          {results}
        </div>
      </motion.section>

      {metrics}
    </div>
  )
}


'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { AlertCircle, Gavel, RefreshCcw } from 'lucide-react'

interface JudgesDirectoryEmptyStateProps {
  showError?: boolean
  showCachedNotice?: boolean
  message?: string
  description?: string
  onRetry?: () => void
}

export function JudgesDirectoryEmptyState({
  showError = false,
  showCachedNotice = false,
  message = 'No judges found',
  description = 'Try adjusting your search filters.',
  onRetry,
}: JudgesDirectoryEmptyStateProps) {
  if (showError) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="flex flex-col items-center justify-center rounded-2xl border border-destructive/30 bg-destructive/10 px-6 py-16 text-center"
      >
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', duration: 0.4 }}>
          <AlertCircle className="h-12 w-12 text-destructive" aria-hidden="true" />
        </motion.div>
        <motion.h3 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mt-6 text-lg font-semibold text-foreground">
          {message}
        </motion.h3>
        <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mt-2 max-w-md text-sm text-muted-foreground">
          {description}
        </motion.p>
        {onRetry && (
          <motion.button
            type="button"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={onRetry}
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-lg bg-destructive px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition-transform hover:bg-destructive/90"
          >
            <RefreshCcw className="h-4 w-4" aria-hidden="true" />
            Try again
          </motion.button>
        )}
      </motion.div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="text-center py-12">
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', duration: 0.5 }}>
        <Gavel className="h-12 w-12 mx-auto text-muted-foreground/70 mb-4" />
      </motion.div>
      <motion.h3 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-lg font-medium text-foreground mb-2">
        {message}
      </motion.h3>
      <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="text-muted-foreground">
        {description}
      </motion.p>

      <AnimatePresence>
        {showCachedNotice && (
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ delay: 0.4 }}
            className="mt-4 text-xs text-muted-foreground"
          >
            Showing cached results until the latest data becomes available.
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  )
}


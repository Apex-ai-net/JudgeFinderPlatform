'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { AlertCircle, Gavel, RefreshCcw, Wifi } from 'lucide-react'
import { AnimatedButton } from '@/components/micro-interactions'

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
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mt-4 space-y-2">
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Wifi className="h-4 w-4" />
            <span>Check your internet connection</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Or try refreshing the page if the issue persists
          </p>
        </motion.div>
        {onRetry && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <AnimatedButton
              onClick={onRetry}
              variant="primary"
              size="md"
              icon={<RefreshCcw className="h-4 w-4" />}
              iconPosition="left"
              className="mt-6 bg-error hover:bg-error/90 text-white"
            >
              Try again
            </AnimatedButton>
          </motion.div>
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


'use client'

import { observer } from 'mobx-react-lite'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertCircle, Loader2 } from 'lucide-react'
import type { JudgesDirectoryViewModel } from '@/lib/judges/directory/JudgesDirectoryViewModel'

interface JudgesDirectorySummaryProps {
  viewModel: JudgesDirectoryViewModel
}

export const JudgesDirectorySummary = observer(function JudgesDirectorySummary({
  viewModel,
}: JudgesDirectorySummaryProps) {
  const { state } = viewModel
  const {
    total_count: totalCount,
    judges,
    error,
    loading,
    onlyWithDecisions,
    recentYears,
    has_more: hasMore,
    currentPage,
    per_page: perPage,
  } = state

  const filteredCount = judges.length
  const recentStart = new Date().getFullYear() - (recentYears - 1)

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.3 }}
      className="mt-6 p-4 rounded-lg border border-primary/30 bg-primary/5"
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="text-sm font-medium text-primary">
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center"
              >
                <Loader2 className="h-4 w-4 animate-spin mr-2 text-primary" />
                Loading judges...
              </motion.div>
            ) : error ? (
              <motion.div
                key="error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2 text-destructive"
              >
                <AlertCircle className="h-4 w-4" aria-hidden="true" />
                <span className="text-sm">
                  {viewModel.hasCachedResults
                    ? "We couldn't refresh the judge list. Showing cached results for now."
                    : error}
                </span>
              </motion.div>
            ) : (
              <motion.div
                key="results"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {onlyWithDecisions
                  ? `Showing page ${currentPage} of judges with decisions since ${recentStart} (${totalCount} total).`
                  : `Found ${totalCount} judges matching your criteria`}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {!loading && !error && totalCount > 0 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="text-sm text-primary font-medium"
            >
              Showing {filteredCount} of {totalCount}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
})

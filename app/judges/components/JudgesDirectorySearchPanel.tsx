'use client'

import { observer } from 'mobx-react-lite'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Loader2, RefreshCcw, Search } from 'lucide-react'
import type { JudgesDirectoryViewModel } from '@/lib/judges/directory/JudgesDirectoryViewModel'
import { useSearchDebounce } from '@/lib/hooks/useDebounce'

const RECENT_YEAR_OPTIONS = [
  { value: 1, label: 'Last 12 months' },
  { value: 3, label: 'Last 3 years' },
  { value: 5, label: 'Last 5 years' },
]

const RECENT_YEAR_CHIPS = [
  { value: 1, label: '12m' },
  { value: 3, label: '3y' },
  { value: 5, label: '5y' },
]

const JURISDICTION_OPTIONS = [
  { value: '', label: 'All jurisdictions' },
  { value: 'Federal', label: 'Federal' },
  { value: 'CA', label: 'California' },
  { value: 'Texas', label: 'Texas' },
]

interface JudgesDirectorySearchPanelProps {
  viewModel: JudgesDirectoryViewModel
}

export const JudgesDirectorySearchPanel = observer(function JudgesDirectorySearchPanel({ viewModel }: JudgesDirectorySearchPanelProps) {
  const { state } = viewModel
  const [searchInput, setSearchInput] = useState(state.searchTerm)
  const { debouncedSearchQuery, isSearching } = useSearchDebounce(searchInput, 300)

  useEffect(() => {
    if (!viewModel.state.initialized) return
    setSearchInput(viewModel.state.searchTerm)
  }, [viewModel.state.searchTerm, viewModel.state.initialized])

  useEffect(() => {
    const nextValue = debouncedSearchQuery.trim()
    if (nextValue === viewModel.state.appliedSearchTerm && !viewModel.state.loading) {
      return
    }
    viewModel.setSearchTerm(nextValue)
    void viewModel.refresh()
  }, [debouncedSearchQuery, viewModel])

  const decisionWindowLabel = useMemo(() => {
    const currentYear = new Date().getFullYear()
    const start = currentYear - (viewModel.state.recentYears - 1)
    return `${start}-${currentYear}`
  }, [viewModel.state.recentYears])

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      className="rounded-2xl border border-border ring-1 ring-border/60 p-8 backdrop-blur-sm bg-card/90 shadow-sm"
    >
      <motion.h2
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="text-2xl font-bold bg-gradient-to-r from-enterprise-primary to-enterprise-deep bg-clip-text text-transparent mb-6"
      >
        Find judges
      </motion.h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
          <label className="block text-sm font-medium text-muted-foreground mb-2">Search judges</label>
          <motion.div whileHover={{ scale: 1.02 }} className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70" />
            <input
              type="text"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search by judge name..."
              className="w-full pl-10 pr-4 py-3 border border-input bg-background text-foreground placeholder:text-muted-foreground/70 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 hover:border-primary/50"
            />
            <AnimatePresence>
              {isSearching && (
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0 }}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
          <label className="block text-sm font-medium text-muted-foreground mb-2">Jurisdiction</label>
          <motion.select
            whileHover={{ scale: 1.02 }}
            value={state.jurisdiction ?? ''}
            onChange={(event) => {
              viewModel.setJurisdiction(event.target.value || null)
              viewModel.clearError()
              void viewModel.refresh()
            }}
            className="w-full px-4 py-3 border border-input bg-background text-foreground rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 hover:border-primary/50"
          >
            {JURISDICTION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </motion.select>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mt-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between"
      >
        <motion.label whileHover={{ scale: 1.02 }} className="flex items-center cursor-pointer gap-2">
          <input
            type="checkbox"
            checked={state.onlyWithDecisions}
            onChange={(event) => {
              viewModel.toggleOnlyWithDecisions(event.target.checked)
              viewModel.clearError()
              void viewModel.refresh()
            }}
            className="h-4 w-4 text-primary focus:ring-primary border-input bg-background rounded transition-all duration-200"
          />
          <span className="text-sm text-muted-foreground">
            Show only judges with recent decisions ({decisionWindowLabel})
          </span>
        </motion.label>

        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <AnimatePresence initial={false}>
            {state.onlyWithDecisions && (
              <motion.div
                key="recent-window"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col gap-4 md:flex-row md:items-center"
              >
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Decision window</label>
                  <select
                    value={state.recentYears}
                    onChange={(event) => {
                      viewModel.setRecentYears(Number(event.target.value))
                      void viewModel.refresh()
                    }}
                    className="px-3 py-2 border border-input bg-background text-foreground rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                  >
                    {RECENT_YEAR_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="hidden md:flex items-center gap-2">
                  {RECENT_YEAR_CHIPS.map((option) => {
                    const isActive = state.recentYears === option.value
                    return (
                      <motion.button
                        key={option.value}
                        type="button"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          viewModel.setRecentYears(option.value)
                          void viewModel.refresh()
                        }}
                        className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all duration-200 ${isActive ? 'bg-primary text-primary-foreground border-primary shadow-sm' : 'bg-muted text-muted-foreground border-input hover:bg-accent/20 hover:border-accent/40'}`}
                        aria-pressed={isActive}
                      >
                        {option.label}
                      </motion.button>
                    )
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => void viewModel.refresh()}
            className="inline-flex items-center gap-2 rounded-lg bg-muted px-4 py-2 text-sm font-medium text-foreground hover:bg-muted/80 transition-colors"
          >
            <RefreshCcw className="h-4 w-4" />
            Refresh results
          </motion.button>

          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Link
              href="/judges/advanced-search"
              className="inline-flex items-center px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-enterprise-primary to-enterprise-deep rounded-lg hover:from-enterprise-accent hover:to-enterprise-primary transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <Search className="w-4 h-4 mr-2" />
              Advanced search
            </Link>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  )
})


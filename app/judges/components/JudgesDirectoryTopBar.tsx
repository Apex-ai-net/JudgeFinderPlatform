'use client'

import { observer } from 'mobx-react-lite'
import { motion } from 'framer-motion'
import { Filter, RefreshCcw, Search } from 'lucide-react'
import Link from 'next/link'
import type { JudgesDirectoryViewModel } from '@/lib/judges/directory/JudgesDirectoryViewModel'

interface JudgesDirectoryTopBarProps {
  viewModel: JudgesDirectoryViewModel
}

export const JudgesDirectoryTopBar = observer(function JudgesDirectoryTopBar({ viewModel }: JudgesDirectoryTopBarProps) {
  const { state } = viewModel

  return (
    <div className="sticky top-0 z-30 hidden md:block bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b border-border/60">
      <div className="mx-auto max-w-7xl px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Filter className="h-4 w-4" />
            <span>
              {state.jurisdiction || 'All jurisdictions'}
              {state.onlyWithDecisions ? ` • Decisions (${state.recentYears}y)` : ''}
              {state.appliedSearchTerm ? ` • “${state.appliedSearchTerm}”` : ''}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => void viewModel.refresh()}
              className="inline-flex items-center gap-2 rounded-lg bg-muted px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted/80 transition-colors"
              aria-label="Refresh results"
            >
              <RefreshCcw className="h-4 w-4" />
              Refresh
            </motion.button>
            <Link
              href="/judges/advanced-search"
              className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-white bg-gradient-to-r from-enterprise-primary to-enterprise-deep hover:from-enterprise-accent hover:to-enterprise-primary transition-all"
              aria-label="Open advanced search"
            >
              <Search className="h-4 w-4" />
              Advanced
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
})



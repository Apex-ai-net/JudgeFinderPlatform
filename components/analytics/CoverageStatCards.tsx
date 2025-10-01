'use client'

import { Database, RefreshCcw, Gavel, Building2 } from 'lucide-react'
import type { DashboardStats } from '@/app/analytics/StatsTypes'
import { formatCount } from '@/lib/analytics/formatters'
import { AnimatedNumber } from '@/components/micro-interactions'
import { motion } from 'framer-motion'

interface CoverageStatCardsProps {
  stats: DashboardStats | null
  loading?: boolean
}

const CARD_ITEMS: Array<{
  label: string
  accessor: keyof DashboardStats
  icon: React.ComponentType<{ className?: string }>
  color: string
}> = [
  { label: 'Total Judges', accessor: 'totalJudges', icon: Gavel, color: 'text-blue-500' },
  { label: 'Case Records', accessor: 'totalCases', icon: Database, color: 'text-green-500' },
  { label: 'CA Courts', accessor: 'totalCourts', icon: Building2, color: 'text-purple-500' }
]

export function CoverageStatCards({ stats, loading = false }: CoverageStatCardsProps): JSX.Element {
  return (
    <div className="bg-card rounded-lg border border-border p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold">Coverage & Freshness</h2>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Loading…' : 'Updated'}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {CARD_ITEMS.map((item, index) => {
          const Icon = item.icon
          const value = stats?.[item.accessor] as number | null

          return (
            <motion.div
              key={item.accessor}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="p-6 rounded-lg border border-border bg-background shadow-card hover:shadow-card-hover transition-shadow"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Icon className={`h-4 w-4 ${item.color}`} />
                  {item.label}
                </div>
              </div>
              <div className="text-3xl font-bold text-foreground">
                {value !== null && value !== undefined ? (
                  <AnimatedNumber end={value} />
                ) : (
                  '—'
                )}
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}


'use client'

import { observer } from 'mobx-react-lite'
import { motion } from 'framer-motion'
import type { JudgesDirectoryViewModel } from '@/lib/judges/directory/JudgesDirectoryViewModel'

interface JudgesDirectoryMetricsProps {
  viewModel: JudgesDirectoryViewModel
}

const formatTimestamp = (timestamp: number) => new Date(timestamp).toLocaleTimeString()

export const JudgesDirectoryMetrics = observer(function JudgesDirectoryMetrics({ viewModel }: JudgesDirectoryMetricsProps) {
  const metrics = viewModel.state.metricsHistory.slice(-5).reverse()
  if (metrics.length === 0) {
    return null
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="mx-auto mt-16 max-w-7xl rounded-2xl border border-border/60 bg-card/80 p-6 backdrop-blur"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-muted-foreground">Recent directory fetches</h3>
        <span className="text-xs uppercase tracking-wide text-muted-foreground">
          Last {metrics.length} events
        </span>
      </div>
      <ul className="grid gap-2 md:grid-cols-5">
        {metrics.map((metric) => (
          <li
            key={metric.traceId}
            className="rounded-lg border border-border/40 bg-background/80 px-3 py-2 text-xs text-muted-foreground"
          >
            <div className="font-medium text-foreground">{metric.durationMs}ms</div>
            <div className="truncate">Page {metric.page}</div>
            <div className="truncate">{metric.cached ? 'Cache hit' : 'Live fetch'}</div>
            <div>{formatTimestamp(metric.timestamp)}</div>
          </li>
        ))}
      </ul>
    </motion.section>
  )
})


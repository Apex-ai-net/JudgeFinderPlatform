'use client'

import { motion } from 'framer-motion'
import { Activity, Database, Zap, Clock } from 'lucide-react'
import type { DashboardStats } from '@/app/analytics/StatsTypes'
import { formatCount, formatLatency, formatPercent } from '@/lib/analytics/formatters'
import { ProgressRing } from '@/components/charts'
import { AnimatedCard } from '@/components/micro-interactions'

interface OperationalMetricsSectionProps {
  stats: DashboardStats | null
}

interface MetricCardDefinition {
  id: string
  label: string
  value: (stats: DashboardStats | null) => string
  numericValue?: (stats: DashboardStats | null) => number | null
  sublabel?: (stats: DashboardStats | null) => string
  icon: React.ComponentType<{ className?: string }>
  color: string
  bgColor: string
  showProgress?: boolean
}

const METRIC_CARDS: MetricCardDefinition[] = [
  {
    id: 'sync-success',
    label: 'Sync success',
    value: (stats) => formatPercent(stats?.syncSuccessRate ?? null),
    numericValue: (stats) => stats?.syncSuccessRate ? stats.syncSuccessRate * 100 : null,
    sublabel: (stats) => `Retry attempts: ${formatCount(stats?.retryCount ?? null)}`,
    icon: Activity,
    color: 'hsl(142, 76%, 36%)',
    bgColor: 'bg-green-500/10',
    showProgress: true
  },
  {
    id: 'pending-jobs',
    label: 'Pending jobs',
    value: (stats) => formatCount(stats?.pendingSync ?? null),
    sublabel: (stats) => `Active users: ${formatCount(stats?.activeUsers ?? null)}`,
    icon: Database,
    color: 'hsl(216, 80%, 55%)',
    bgColor: 'bg-blue-500/10',
    showProgress: false
  },
  {
    id: 'cache-hit',
    label: 'Cache hit ratio',
    value: (stats) => formatPercent(stats?.cacheHitRatio ?? null),
    numericValue: (stats) => stats?.cacheHitRatio ? stats.cacheHitRatio * 100 : null,
    sublabel: (stats) => `Lookup volume: ${formatCount(stats?.searchVolume ?? null)}`,
    icon: Zap,
    color: 'hsl(280, 65%, 60%)',
    bgColor: 'bg-purple-500/10',
    showProgress: true
  },
  {
    id: 'latency',
    label: 'Latency (p50 / p95)',
    value: (stats) => formatLatency(stats?.latencyP50 ?? null),
    sublabel: (stats) => formatLatency(stats?.latencyP95 ?? null),
    icon: Clock,
    color: 'hsl(38, 92%, 50%)',
    bgColor: 'bg-amber-500/10',
    showProgress: false
  }
]

export function OperationalMetricsSection({ stats }: OperationalMetricsSectionProps): JSX.Element {
  return (
    <div className="mt-8 border-t border-border pt-6">
      <motion.h3
        className="text-xl font-semibold text-foreground"
        initial={{ opacity: 0, x: -20 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        Operational metrics (last 24h)
      </motion.h3>
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {METRIC_CARDS.map((metric, index) => {
          const Icon = metric.icon
          const numValue = metric.numericValue?.(stats)

          return (
            <motion.div
              key={metric.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <AnimatedCard intensity="subtle" className="p-5 shadow-card hover:shadow-card-hover">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="text-sm text-muted-foreground mb-2">{metric.label}</div>
                    <div className="text-2xl font-semibold text-foreground">{metric.value(stats)}</div>
                  </div>

                  {/* Icon or Progress Ring */}
                  {metric.showProgress && numValue !== null && numValue !== undefined ? (
                    <ProgressRing
                      value={numValue}
                      size={60}
                      strokeWidth={6}
                      color={metric.color}
                      showValue={false}
                    />
                  ) : (
                    <motion.div
                      className={`p-2.5 rounded-lg ${metric.bgColor}`}
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      transition={{ type: 'spring', stiffness: 400 }}
                      style={{ color: metric.color }}
                    >
                      <Icon className="h-5 w-5" />
                    </motion.div>
                  )}
                </div>

                {metric.sublabel ? (
                  <div className="pt-3 border-t border-border/50">
                    <div className="text-xs text-muted-foreground">{metric.sublabel(stats)}</div>
                  </div>
                ) : null}
              </AnimatedCard>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}


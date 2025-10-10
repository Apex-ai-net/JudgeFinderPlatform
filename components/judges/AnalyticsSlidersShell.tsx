'use client'

import { lazy, Suspense } from 'react'
import { motion } from 'framer-motion'
import GlassCard from '@/components/ui/GlassCard'
import { AnalyticsErrorBoundary } from '@/components/judges/AnalyticsErrorBoundary'

const LazyAnalyticsSliders = lazy(() => import('@/components/judges/AnalyticsSliders'))

interface AnalyticsSlidersShellProps {
  judgeId: string
  judgeName: string
}

export function AnalyticsSlidersShell({
  judgeId,
  judgeName,
}: AnalyticsSlidersShellProps): JSX.Element {
  return (
    <AnalyticsErrorBoundary judgeId={judgeId} judgeName={judgeName}>
      <Suspense
        fallback={
          <GlassCard className="p-6 text-sm text-muted-foreground">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              Loading AI analytics…
            </motion.div>
          </GlassCard>
        }
      >
        <LazyAnalyticsSliders judgeId={judgeId} judgeName={judgeName} />
      </Suspense>
    </AnalyticsErrorBoundary>
  )
}

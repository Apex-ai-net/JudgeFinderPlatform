import type { Judge } from '@/types'

interface AnalyticsDisclaimerProps {
  judge: Judge
}

export default function AnalyticsDisclaimer({
  judge,
}: AnalyticsDisclaimerProps): JSX.Element | null {
  const hasSufficientSample = typeof judge.total_cases === 'number' && judge.total_cases >= 500

  if (hasSufficientSample) return null

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-4 text-xs text-muted-foreground">
      <p>
        Analytics are limited for this profile due to insufficient sample size. JudgeFinder displays
        data-backed insights when at least 500 cases are available and validated. Until then, some
        analytics and summaries may be hidden.
      </p>
    </div>
  )
}

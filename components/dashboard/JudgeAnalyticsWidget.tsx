'use client'

import Link from 'next/link'
import { TrendingUp, TrendingDown, Minus, Scale, BarChart3 } from 'lucide-react'
import {
  DashboardJudgeAnalytics,
  JudgeAnalyticsSummary,
} from '@/lib/analytics/judge-dashboard-analytics'

interface JudgeAnalyticsWidgetProps {
  analytics: DashboardJudgeAnalytics | null | undefined
  isLoading?: boolean
}

export default function JudgeAnalyticsWidget({
  analytics,
  isLoading = false,
}: JudgeAnalyticsWidgetProps) {
  if (isLoading) {
    return (
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="h-6 bg-muted rounded w-32 mb-6 animate-shimmer"></div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-16 bg-muted rounded animate-shimmer"
              style={{ animationDelay: `${i * 100}ms` }}
            ></div>
          ))}
        </div>
      </div>
    )
  }

  if (!analytics || analytics.judges_summary.length === 0) {
    return (
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/20 rounded-xl border border-blue-200 dark:border-blue-900/50 p-6 reshade-depth">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-blue-900 dark:text-blue-100">Judge Analytics</h3>
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-2">
              Bookmark judges to see their performance analytics
            </p>
          </div>
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
            <BarChart3 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
        </div>
        <Link
          href="/judges"
          className="inline-block mt-4 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-all hover:scale-105"
        >
          Browse Judges
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Overall Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card rounded-lg border border-border p-4 reshade-depth group transition-all hover:scale-105">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Avg Settlement Rate
          </p>
          <p className="text-2xl font-bold text-foreground mt-2 tabular-nums">
            {(analytics.avg_settlement_rate * 100).toFixed(1)}%
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {analytics.judges_summary.length} judges tracked
          </p>
        </div>

        <div className="bg-card rounded-lg border border-border p-4 reshade-depth group transition-all hover:scale-105">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Consistency Score
          </p>
          <p className="text-2xl font-bold text-foreground mt-2 tabular-nums">
            {(analytics.avg_consistency_score * 100).toFixed(0)}/100
          </p>
          <p className="text-xs text-muted-foreground mt-1">Average predictability</p>
        </div>

        <div className="bg-card rounded-lg border border-border p-4 reshade-depth group transition-all hover:scale-105">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Top Case Types
          </p>
          <div className="mt-2 flex flex-wrap gap-1">
            {analytics.top_case_types.slice(0, 2).map((type) => (
              <span
                key={type}
                className="inline-block px-2 py-1 bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 text-xs font-medium rounded"
              >
                {type}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Individual Judge Cards */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-foreground">Your Judges</h3>
        {analytics.judges_summary.map((judge, index) => (
          <div
            key={judge.judge_id}
            className="animate-in fade-in slide-in-from-bottom-4"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <JudgeAnalyticsCard judge={judge} />
          </div>
        ))}
      </div>

      {/* View All Link */}
      <Link
        href="/analytics"
        className="inline-flex items-center gap-2 px-4 py-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium text-sm transition-all hover:gap-3"
      >
        View Detailed Analytics
        <span className="transition-transform group-hover:translate-x-1">→</span>
      </Link>
    </div>
  )
}

function JudgeAnalyticsCard({ judge }: { judge: JudgeAnalyticsSummary }) {
  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving':
        return TrendingUp
      case 'declining':
        return TrendingDown
      default:
        return Minus
    }
  }

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'improving':
        return 'text-green-600 dark:text-green-400'
      case 'declining':
        return 'text-red-600 dark:text-red-400'
      default:
        return 'text-muted-foreground'
    }
  }

  const TrendIcon = getTrendIcon(judge.recent_trend)

  return (
    <Link href={`/judges/${judge.judge_id}`}>
      <div className="bg-card rounded-lg border border-border hover:border-blue-500 dark:hover:border-blue-400 hover:shadow-lg transition-all p-4 reshade-depth group">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <p className="font-semibold text-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {judge.judge_name}
            </p>
            <p className="text-sm text-muted-foreground">{judge.court_name}</p>
          </div>
          <div
            className={`transition-transform group-hover:scale-110 ${getTrendColor(judge.recent_trend)}`}
          >
            <TrendIcon className="w-6 h-6" />
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 mb-3">
          <div className="text-center">
            <p className="text-xs text-muted-foreground font-medium">Settlement</p>
            <p className="text-sm font-bold text-foreground tabular-nums">
              {(judge.settlement_rate * 100).toFixed(0)}%
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground font-medium">Dismissal</p>
            <p className="text-sm font-bold text-foreground tabular-nums">
              {(judge.dismissal_rate * 100).toFixed(0)}%
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground font-medium">Judgment</p>
            <p className="text-sm font-bold text-foreground tabular-nums">
              {(judge.judgment_rate * 100).toFixed(0)}%
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground font-medium">Consistency</p>
            <p className="text-sm font-bold text-blue-600 dark:text-blue-400 tabular-nums">
              {(judge.consistency_score * 100).toFixed(0)}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2 text-muted-foreground">
            <Scale className="w-4 h-4" />
            <span>{judge.total_cases} cases</span>
          </div>
          <span className={`font-medium capitalize ${getTrendColor(judge.recent_trend)}`}>
            {judge.recent_trend}
          </span>
        </div>

        {judge.primary_case_types.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border">
            <p className="text-xs font-semibold text-muted-foreground mb-2">
              Primary Practice Areas
            </p>
            <div className="flex gap-1 flex-wrap">
              {judge.primary_case_types.slice(0, 3).map((caseType) => (
                <span
                  key={caseType.case_type}
                  className="px-2 py-1 bg-muted text-foreground text-xs rounded transition-colors group-hover:bg-blue-100 dark:group-hover:bg-blue-950/30 group-hover:text-blue-700 dark:group-hover:text-blue-300"
                >
                  {caseType.case_type}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </Link>
  )
}

'use client'

import Link from 'next/link'
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
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-32 mb-6"></div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-100 rounded"></div>
          ))}
        </div>
      </div>
    )
  }

  if (!analytics || analytics.judges_summary.length === 0) {
    return (
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-blue-900">Judge Analytics</h3>
            <p className="text-sm text-blue-700 mt-2">
              Bookmark judges to see their performance analytics
            </p>
          </div>
          <span className="text-3xl">📊</span>
        </div>
        <Link
          href="/judges"
          className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
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
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase">Avg Settlement Rate</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">
            {(analytics.avg_settlement_rate * 100).toFixed(1)}%
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {analytics.judges_summary.length} judges tracked
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase">Consistency Score</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">
            {(analytics.avg_consistency_score * 100).toFixed(0)}/100
          </p>
          <p className="text-xs text-gray-500 mt-1">Average predictability</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase">Top Case Types</p>
          <div className="mt-2 flex flex-wrap gap-1">
            {analytics.top_case_types.slice(0, 2).map((type) => (
              <span
                key={type}
                className="inline-block px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded"
              >
                {type}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Individual Judge Cards */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-gray-900">Your Judges</h3>
        {analytics.judges_summary.map((judge) => (
          <JudgeAnalyticsCard key={judge.judge_id} judge={judge} />
        ))}
      </div>

      {/* View All Link */}
      <Link
        href="/analytics"
        className="inline-block px-4 py-2 text-blue-600 hover:text-blue-700 font-medium text-sm"
      >
        View Detailed Analytics →
      </Link>
    </div>
  )
}

function JudgeAnalyticsCard({ judge }: { judge: JudgeAnalyticsSummary }) {
  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving':
        return '📈'
      case 'declining':
        return '📉'
      default:
        return '➡️'
    }
  }

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'improving':
        return 'text-green-600'
      case 'declining':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  return (
    <Link href={`/judges/${judge.judge_id}`}>
      <div className="bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <p className="font-semibold text-gray-900">{judge.judge_name}</p>
            <p className="text-sm text-gray-500">{judge.court_name}</p>
          </div>
          <span className="text-2xl">{getTrendIcon(judge.recent_trend)}</span>
        </div>

        <div className="grid grid-cols-4 gap-2 mb-3">
          <div className="text-center">
            <p className="text-xs text-gray-500 font-medium">Settlement</p>
            <p className="text-sm font-bold text-gray-900">
              {(judge.settlement_rate * 100).toFixed(0)}%
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 font-medium">Dismissal</p>
            <p className="text-sm font-bold text-gray-900">
              {(judge.dismissal_rate * 100).toFixed(0)}%
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 font-medium">Judgment</p>
            <p className="text-sm font-bold text-gray-900">
              {(judge.judgment_rate * 100).toFixed(0)}%
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 font-medium">Consistency</p>
            <p className="text-sm font-bold text-blue-600">
              {(judge.consistency_score * 100).toFixed(0)}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2 text-gray-500">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z" />
            </svg>
            <span>{judge.total_cases} cases</span>
          </div>
          <span className={`font-medium capitalize ${getTrendColor(judge.recent_trend)}`}>
            {judge.recent_trend}
          </span>
        </div>

        {judge.primary_case_types.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-600 mb-2">Primary Practice Areas</p>
            <div className="flex gap-1 flex-wrap">
              {judge.primary_case_types.slice(0, 3).map((caseType) => (
                <span
                  key={caseType.case_type}
                  className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
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

'use client'

export const dynamic = 'force-dynamic'

/**
 * Production Data Quality Dashboard
 *
 * Real-time monitoring of data quality metrics:
 * - Total judges, cases, courts
 * - Profile completeness percentage
 * - Orphaned record counts
 * - Last successful data sync timestamp
 * - Analytics coverage
 * - Health indicators (green/yellow/red)
 */

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface DataQualityMetrics {
  totals: {
    judges: number
    courts: number
    cases: number
    analytics: number
  }
  completeness: {
    judges_with_slug: number
    judges_with_courtlistener_id: number
    courts_with_slug: number
    slug_completeness_percent: number
  }
  integrity: {
    orphaned_cases: number
    orphaned_assignments: number
    case_count_drift: number
    missing_names: number
  }
  freshness: {
    last_judge_sync: string
    last_case_sync: string
    stale_judges_count: number
  }
  analytics: {
    eligible_judges: number
    judges_with_analytics: number
    coverage_percent: number
  }
  health_score: number
  last_check: string
}

type HealthStatus = 'green' | 'yellow' | 'red'

export default function DataQualityDashboard() {
  const [metrics, setMetrics] = useState<DataQualityMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    loadMetrics()
  }, [])

  async function loadMetrics() {
    try {
      setLoading(true)
      setError(null)

      // Fetch all metrics in parallel
      const [
        totalsData,
        completenessData,
        integrityData,
        freshnessData,
        analyticsData
      ] = await Promise.all([
        fetchTotals(),
        fetchCompleteness(),
        fetchIntegrity(),
        fetchFreshness(),
        fetchAnalyticsCoverage()
      ])

      const metricsData: DataQualityMetrics = {
        totals: totalsData,
        completeness: completenessData,
        integrity: integrityData,
        freshness: freshnessData,
        analytics: analyticsData,
        health_score: calculateHealthScore(integrityData, completenessData, analyticsData),
        last_check: new Date().toISOString()
      }

      setMetrics(metricsData)
    } catch (err: any) {
      setError(err.message)
      console.error('Failed to load metrics:', err)
    } finally {
      setLoading(false)
    }
  }

  async function fetchTotals() {
    const [judges, courts, cases, analytics] = await Promise.all([
      supabase.from('judges').select('*', { count: 'exact', head: true }),
      supabase.from('courts').select('*', { count: 'exact', head: true }),
      supabase.from('cases').select('*', { count: 'exact', head: true }),
      supabase.from('judge_analytics').select('*', { count: 'exact', head: true })
    ])

    return {
      judges: judges.count || 0,
      courts: courts.count || 0,
      cases: cases.count || 0,
      analytics: analytics.count || 0
    }
  }

  async function fetchCompleteness() {
    const [judgesWithSlug, judgesWithCL, courtsWithSlug, totalJudges, totalCourts] = await Promise.all([
      supabase.from('judges').select('*', { count: 'exact', head: true }).not('slug', 'is', null),
      supabase.from('judges').select('*', { count: 'exact', head: true }).not('courtlistener_id', 'is', null),
      supabase.from('courts').select('*', { count: 'exact', head: true }).not('slug', 'is', null),
      supabase.from('judges').select('*', { count: 'exact', head: true }),
      supabase.from('courts').select('*', { count: 'exact', head: true })
    ])

    const totalEntities = (totalJudges.count || 0) + (totalCourts.count || 0)
    const entitiesWithSlug = (judgesWithSlug.count || 0) + (courtsWithSlug.count || 0)
    const slugCompleteness = totalEntities > 0 ? (entitiesWithSlug / totalEntities) * 100 : 0

    return {
      judges_with_slug: judgesWithSlug.count || 0,
      judges_with_courtlistener_id: judgesWithCL.count || 0,
      courts_with_slug: courtsWithSlug.count || 0,
      slug_completeness_percent: slugCompleteness
    }
  }

  async function fetchIntegrity() {
    const [orphanedCases, orphanedAssignments, caseCountDrift, missingNames] = await Promise.all([
      supabase.rpc('find_orphaned_cases'),
      supabase.rpc('find_orphaned_assignments'),
      supabase.rpc('validate_judge_case_counts'),
      supabase.from('judges').select('*', { count: 'exact', head: true }).or('name.is.null,name.eq.')
    ])

    return {
      orphaned_cases: orphanedCases.data?.length || 0,
      orphaned_assignments: orphanedAssignments.data?.length || 0,
      case_count_drift: caseCountDrift.data?.length || 0,
      missing_names: missingNames.count || 0
    }
  }

  async function fetchFreshness() {
    const [lastJudgeSync, lastCaseSync, staleJudges] = await Promise.all([
      supabase.from('judges').select('updated_at').order('updated_at', { ascending: false }).limit(1).single(),
      supabase.from('cases').select('updated_at').order('updated_at', { ascending: false }).limit(1).single(),
      supabase.rpc('find_stale_judges', { days_threshold: 180 })
    ])

    return {
      last_judge_sync: lastJudgeSync.data?.updated_at || 'Never',
      last_case_sync: lastCaseSync.data?.updated_at || 'Never',
      stale_judges_count: staleJudges.data?.length || 0
    }
  }

  async function fetchAnalyticsCoverage() {
    const eligibleJudges = await supabase
      .from('judges')
      .select('id', { count: 'exact', head: true })
      .gte('total_cases', 500)

    const judgesWithAnalytics = await supabase
      .from('judge_analytics')
      .select('judge_id', { count: 'exact', head: true })

    const eligible = eligibleJudges.count || 0
    const withAnalytics = judgesWithAnalytics.count || 0
    const coverage = eligible > 0 ? (withAnalytics / eligible) * 100 : 100

    return {
      eligible_judges: eligible,
      judges_with_analytics: withAnalytics,
      coverage_percent: coverage
    }
  }

  function calculateHealthScore(
    integrity: any,
    completeness: any,
    analytics: any
  ): number {
    let score = 100

    // Deduct for integrity issues
    if (integrity.missing_names > 0) score -= 20
    if (integrity.orphaned_cases > 10) score -= 15
    if (integrity.orphaned_assignments > 5) score -= 10
    if (integrity.case_count_drift > 20) score -= 10

    // Deduct for completeness issues
    if (completeness.slug_completeness_percent < 90) score -= 10
    if (completeness.slug_completeness_percent < 70) score -= 10

    // Deduct for analytics coverage
    if (analytics.coverage_percent < 80) score -= 10
    if (analytics.coverage_percent < 50) score -= 10

    return Math.max(0, score)
  }

  function getHealthStatus(score: number): HealthStatus {
    if (score >= 80) return 'green'
    if (score >= 60) return 'yellow'
    return 'red'
  }

  function getStatusColor(status: HealthStatus): string {
    switch (status) {
      case 'green': return 'bg-green-500'
      case 'yellow': return 'bg-yellow-500'
      case 'red': return 'bg-red-500'
    }
  }

  function getStatusTextColor(status: HealthStatus): string {
    switch (status) {
      case 'green': return 'text-green-600'
      case 'yellow': return 'text-yellow-600'
      case 'red': return 'text-red-600'
    }
  }

  async function handleRefresh() {
    setRefreshing(true)
    await loadMetrics()
    setRefreshing(false)
  }

  async function handleRunCleanup() {
    if (confirm('This will run the automated cleanup script. Continue?')) {
      try {
        // Trigger cleanup via API endpoint
        alert('Cleanup functionality requires backend integration')
      } catch (err: any) {
        alert(`Cleanup failed: ${err.message}`)
      }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Data Quality Dashboard</h1>
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading metrics...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Data Quality Dashboard</h1>
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-red-800 mb-2">Error Loading Metrics</h2>
            <p className="text-red-600">{error}</p>
            <button
              onClick={() => loadMetrics()}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!metrics) return null

  const healthStatus = getHealthStatus(metrics.health_score)
  const statusColor = getStatusColor(healthStatus)
  const statusTextColor = getStatusTextColor(healthStatus)

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Data Quality Dashboard</h1>
          <div className="flex gap-3">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
            <button
              onClick={handleRunCleanup}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Run Cleanup
            </button>
          </div>
        </div>

        {/* Overall Health Score */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold mb-2">Overall Health Score</h2>
              <p className="text-gray-600">Last checked: {new Date(metrics.last_check).toLocaleString()}</p>
            </div>
            <div className="text-right">
              <div className={`text-6xl font-bold ${statusTextColor}`}>
                {metrics.health_score}
              </div>
              <div className={`inline-block px-4 py-1 rounded-full text-white font-semibold ${statusColor} mt-2`}>
                {healthStatus.toUpperCase()}
              </div>
            </div>
          </div>
        </div>

        {/* Totals Grid */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <MetricCard title="Total Judges" value={metrics.totals.judges.toLocaleString()} status="green" />
          <MetricCard title="Total Courts" value={metrics.totals.courts.toLocaleString()} status="green" />
          <MetricCard title="Total Cases" value={metrics.totals.cases.toLocaleString()} status="green" />
          <MetricCard title="Analytics Generated" value={metrics.totals.analytics.toLocaleString()} status="green" />
        </div>

        {/* Data Completeness */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Data Completeness</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">Profile Completeness</span>
                <span className="font-semibold">{metrics.completeness.slug_completeness_percent.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    metrics.completeness.slug_completeness_percent >= 90 ? 'bg-green-500' :
                    metrics.completeness.slug_completeness_percent >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${metrics.completeness.slug_completeness_percent}%` }}
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Judges with Slugs</span>
                <span className="font-semibold">{metrics.completeness.judges_with_slug.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Courts with Slugs</span>
                <span className="font-semibold">{metrics.completeness.courts_with_slug.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Judges with CourtListener ID</span>
                <span className="font-semibold">{metrics.completeness.judges_with_courtlistener_id.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Data Integrity Issues */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Data Integrity</h2>
          <div className="grid grid-cols-4 gap-4">
            <IntegrityMetric
              title="Missing Names"
              value={metrics.integrity.missing_names}
              critical
            />
            <IntegrityMetric
              title="Orphaned Cases"
              value={metrics.integrity.orphaned_cases}
              threshold={10}
            />
            <IntegrityMetric
              title="Orphaned Assignments"
              value={metrics.integrity.orphaned_assignments}
              threshold={5}
            />
            <IntegrityMetric
              title="Case Count Drift"
              value={metrics.integrity.case_count_drift}
              threshold={20}
            />
          </div>
        </div>

        {/* Analytics Coverage */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Analytics Coverage</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-gray-600 mb-1">Eligible Judges (500+ cases)</div>
              <div className="text-2xl font-bold">{metrics.analytics.eligible_judges.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">Judges with Analytics</div>
              <div className="text-2xl font-bold">{metrics.analytics.judges_with_analytics.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">Coverage</div>
              <div className={`text-2xl font-bold ${
                metrics.analytics.coverage_percent >= 80 ? 'text-green-600' :
                metrics.analytics.coverage_percent >= 50 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {metrics.analytics.coverage_percent.toFixed(1)}%
              </div>
            </div>
          </div>
        </div>

        {/* Data Freshness */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Data Freshness</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-gray-600 mb-1">Last Judge Sync</div>
              <div className="text-lg font-semibold">
                {metrics.freshness.last_judge_sync !== 'Never'
                  ? new Date(metrics.freshness.last_judge_sync).toLocaleString()
                  : 'Never'}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">Last Case Sync</div>
              <div className="text-lg font-semibold">
                {metrics.freshness.last_case_sync !== 'Never'
                  ? new Date(metrics.freshness.last_case_sync).toLocaleString()
                  : 'Never'}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">Stale Judges (180+ days)</div>
              <div className={`text-lg font-semibold ${
                metrics.freshness.stale_judges_count > 100 ? 'text-red-600' :
                metrics.freshness.stale_judges_count > 50 ? 'text-yellow-600' : 'text-green-600'
              }`}>
                {metrics.freshness.stale_judges_count.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function MetricCard({ title, value, status }: { title: string; value: string; status: HealthStatus }) {
  const statusColor = status === 'green' ? 'border-green-500' : status === 'yellow' ? 'border-yellow-500' : 'border-red-500'

  return (
    <div className={`bg-white rounded-lg shadow p-6 border-l-4 ${statusColor}`}>
      <div className="text-sm text-gray-600 mb-2">{title}</div>
      <div className="text-3xl font-bold">{value}</div>
    </div>
  )
}

function IntegrityMetric({ title, value, threshold, critical }: {
  title: string
  value: number
  threshold?: number
  critical?: boolean
}) {
  const getColor = () => {
    if (critical) return value > 0 ? 'text-red-600' : 'text-green-600'
    if (!threshold) return 'text-green-600'
    return value > threshold ? 'text-red-600' : value > threshold / 2 ? 'text-yellow-600' : 'text-green-600'
  }

  return (
    <div className="text-center">
      <div className="text-sm text-gray-600 mb-2">{title}</div>
      <div className={`text-3xl font-bold ${getColor()}`}>{value.toLocaleString()}</div>
      {threshold && <div className="text-xs text-gray-500 mt-1">Threshold: {threshold}</div>}
    </div>
  )
}

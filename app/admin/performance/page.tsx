import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { resolveAdminStatus } from '@/lib/auth/is-admin'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getPerformanceSnapshot, getCacheStats } from '@/lib/monitoring/metrics'

export const dynamic = 'force-dynamic'

interface PerformanceMetric {
  metric_type: string
  operation: string
  total_count: number
  success_count: number
  error_count: number
  avg_duration_ms: number
  p50_duration_ms: number
  p95_duration_ms: number
  p99_duration_ms: number
  min_duration_ms: number
  max_duration_ms: number
  error_rate_percent: number
  first_recorded_at: string
  last_recorded_at: string
}

async function getPerformanceData() {
  const supabase = await createServiceRoleClient()

  // Get summary statistics from the view
  const { data: summary, error: summaryError } = await supabase
    .from('performance_summary')
    .select('*')
    .limit(50)

  if (summaryError) {
    console.error('Failed to fetch performance summary:', summaryError)
  }

  // Get critical endpoint performance
  const criticalEndpoints = [
    'execute_search',
    'generate_bias_analytics',
    'load_profile',
  ]

  const endpointStats = await Promise.all(
    criticalEndpoints.map(async (endpoint) => {
      const snapshot = await getPerformanceSnapshot(endpoint, 60)
      return { endpoint, snapshot }
    })
  )

  // Get cache statistics
  const cacheStats = await getCacheStats()

  // Get recent errors (last 24 hours)
  const { data: recentErrors, error: errorsError } = await supabase
    .from('performance_metrics')
    .select('metric_type, operation, error_message, duration_ms, recorded_at')
    .eq('success', false)
    .gte('recorded_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .order('recorded_at', { ascending: false })
    .limit(20)

  if (errorsError) {
    console.error('Failed to fetch recent errors:', errorsError)
  }

  // Get slow queries (P99 > 2000ms in last hour)
  const { data: slowQueries, error: slowError } = await supabase
    .from('performance_metrics')
    .select('operation, duration_ms, recorded_at, metadata')
    .gte('duration_ms', 2000)
    .gte('recorded_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
    .order('duration_ms', { ascending: false })
    .limit(20)

  if (slowError) {
    console.error('Failed to fetch slow queries:', slowError)
  }

  return {
    summary: summary || [],
    endpointStats,
    cacheStats,
    recentErrors: recentErrors || [],
    slowQueries: slowQueries || [],
  }
}

export default async function PerformancePage() {
  const { userId } = await auth()

  if (!userId) {
    redirect('/sign-in?redirect_url=/admin/performance')
  }

  const { isAdmin } = await resolveAdminStatus()

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white shadow-sm border border-gray-200 rounded-lg p-8 text-center">
          <h1 className="text-2xl font-semibold text-gray-900 mb-3">Not authorized</h1>
          <p className="text-gray-600">
            You need administrator access to view performance metrics.
          </p>
        </div>
      </div>
    )
  }

  const { summary, endpointStats, cacheStats, recentErrors, slowQueries } = await getPerformanceData()

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Performance Dashboard</h1>
          <p className="mt-2 text-sm text-gray-600">
            Real-time performance metrics and monitoring for JudgeFinder.io
          </p>
        </div>

        {/* Critical Endpoints Performance */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Critical Endpoints (Last Hour)</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {endpointStats.map(({ endpoint, snapshot }) => (
              <div key={endpoint} className="bg-white shadow-sm border border-gray-200 rounded-lg p-6">
                <h3 className="text-sm font-medium text-gray-700 mb-4">{endpoint}</h3>
                {snapshot ? (
                  <>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-xs text-gray-500">P50</span>
                        <span className="text-sm font-semibold text-gray-900">{Math.round(snapshot.p50)}ms</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-gray-500">P95</span>
                        <span className={`text-sm font-semibold ${snapshot.p95 > 1000 ? 'text-orange-600' : 'text-gray-900'}`}>
                          {Math.round(snapshot.p95)}ms
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-gray-500">P99</span>
                        <span className={`text-sm font-semibold ${snapshot.p99 > 2000 ? 'text-red-600' : 'text-gray-900'}`}>
                          {Math.round(snapshot.p99)}ms
                        </span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-gray-100">
                        <span className="text-xs text-gray-500">Count</span>
                        <span className="text-sm font-semibold text-gray-900">{snapshot.count}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-gray-500">Error Rate</span>
                        <span className={`text-sm font-semibold ${snapshot.error_rate > 0.01 ? 'text-red-600' : 'text-green-600'}`}>
                          {(snapshot.error_rate * 100).toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-gray-500">No data available</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Cache Statistics */}
        {cacheStats && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Cache Performance (Last Hour)</h2>
            <div className="bg-white shadow-sm border border-gray-200 rounded-lg p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <div className="text-sm text-gray-500 mb-1">Hit Rate</div>
                  <div className={`text-2xl font-bold ${cacheStats.hit_rate > 0.7 ? 'text-green-600' : 'text-orange-600'}`}>
                    {(cacheStats.hit_rate * 100).toFixed(1)}%
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-1">Total Operations</div>
                  <div className="text-2xl font-bold text-gray-900">{cacheStats.total_operations.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-1">Avg Latency</div>
                  <div className="text-2xl font-bold text-gray-900">{cacheStats.avg_latency_ms.toFixed(1)}ms</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* All Metrics Summary (Last 24 Hours) */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">All Metrics (Last 24 Hours)</h2>
          <div className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Operation
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Count
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Avg (ms)
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      P95 (ms)
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      P99 (ms)
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Error Rate
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {summary.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                        No performance data available yet
                      </td>
                    </tr>
                  ) : (
                    summary.map((metric: PerformanceMetric, index: number) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{metric.operation}</div>
                          <div className="text-xs text-gray-500">{metric.metric_type}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                          {metric.total_count.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                          {Math.round(metric.avg_duration_ms)}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-right text-sm font-medium ${metric.p95_duration_ms > 1000 ? 'text-orange-600' : 'text-gray-900'}`}>
                          {Math.round(metric.p95_duration_ms)}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-right text-sm font-medium ${metric.p99_duration_ms > 2000 ? 'text-red-600' : 'text-gray-900'}`}>
                          {Math.round(metric.p99_duration_ms)}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-right text-sm font-medium ${metric.error_rate_percent > 1 ? 'text-red-600' : 'text-green-600'}`}>
                          {metric.error_rate_percent.toFixed(2)}%
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Slow Queries */}
        {slowQueries.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Slow Queries (Last Hour, &gt;2s)</h2>
            <div className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Operation
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Duration (ms)
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Recorded At
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {slowQueries.map((query: any, index: number) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {query.operation}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-red-600">
                          {query.duration_ms.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(query.recorded_at).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Recent Errors */}
        {recentErrors.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Errors (Last 24 Hours)</h2>
            <div className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Operation
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Error
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Time
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {recentErrors.map((error: any, index: number) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {error.metric_type}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {error.operation}
                        </td>
                        <td className="px-6 py-4 text-sm text-red-600 max-w-md truncate">
                          {error.error_message}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(error.recorded_at).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export const metadata = {
  title: 'Performance Dashboard - JudgeFinder.io',
  description: 'Real-time performance metrics and monitoring',
}

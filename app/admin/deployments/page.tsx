'use client'

export const dynamic = 'force-dynamic'

/**
 * Production Deployments Monitoring Dashboard
 *
 * Displays deployment status, environment configuration,
 * health metrics, and recent deployment history.
 */

import { useEffect, useState } from 'react'

interface HealthStatus {
  timestamp: string
  status: 'healthy' | 'degraded' | 'unhealthy'
  version: string
  environment: string
  uptime: number
  checks: {
    database: string
    redis: string
    memory: string
    external_apis: string
  }
  performance: {
    responseTime: number
    databaseLatency?: number
    redisLatency?: number
    courtListenerLatency?: number
    memoryUsage?: {
      used: number
      total: number
      percentage: number
    }
  }
}

interface EnvSummary {
  configured: string[]
  missing: string[]
  invalid: string[]
  warnings: string[]
}

export default function DeploymentsPage() {
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null)
  const [envSummary, setEnvSummary] = useState<EnvSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  useEffect(() => {
    fetchData()
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [])

  async function fetchData() {
    try {
      setLoading(true)
      setError(null)

      // Fetch health status
      const healthRes = await fetch('/api/health')
      if (!healthRes.ok) throw new Error('Failed to fetch health status')
      const healthData = await healthRes.json()
      setHealthStatus(healthData)

      // Fetch environment summary (you'll need to create this endpoint)
      const envRes = await fetch('/api/admin/env-summary').catch(() => null)
      if (envRes && envRes.ok) {
        const envData = await envRes.json()
        setEnvSummary(envData)
      }

      setLastRefresh(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  function getStatusColor(status: string): string {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-50'
      case 'degraded': return 'text-yellow-600 bg-yellow-50'
      case 'unhealthy': return 'text-red-600 bg-red-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  function getStatusIcon(status: string): string {
    switch (status) {
      case 'healthy': return '✓'
      case 'degraded': return '⚠'
      case 'unhealthy': return '✗'
      default: return '?'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Production Deployments</h1>
          <p className="mt-2 text-sm text-gray-600">
            Monitor deployment status, environment configuration, and system health
          </p>
        </div>

        {/* Refresh Controls */}
        <div className="mb-6 flex justify-between items-center">
          <div className="text-sm text-gray-500">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Health Status Overview */}
        {healthStatus && (
          <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500">Overall Status</h3>
              <div className={`mt-2 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(healthStatus.status)}`}>
                <span className="mr-1">{getStatusIcon(healthStatus.status)}</span>
                {healthStatus.status.toUpperCase()}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500">Environment</h3>
              <p className="mt-2 text-2xl font-semibold text-gray-900">{healthStatus.environment}</p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500">Response Time</h3>
              <p className="mt-2 text-2xl font-semibold text-gray-900">{healthStatus.performance.responseTime}ms</p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500">Uptime</h3>
              <p className="mt-2 text-2xl font-semibold text-gray-900">
                {Math.floor(healthStatus.uptime / 3600)}h {Math.floor((healthStatus.uptime % 3600) / 60)}m
              </p>
            </div>
          </div>
        )}

        {/* Detailed Checks */}
        {healthStatus && (
          <div className="mb-6 bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">System Health Checks</h2>
            </div>
            <div className="divide-y divide-gray-200">
              {Object.entries(healthStatus.checks).map(([key, status]) => (
                <div key={key} className="px-6 py-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 capitalize">
                      {key.replace(/_/g, ' ')}
                    </h3>
                    {key === 'database' && healthStatus.performance.databaseLatency && (
                      <p className="text-sm text-gray-500">Latency: {healthStatus.performance.databaseLatency}ms</p>
                    )}
                    {key === 'redis' && healthStatus.performance.redisLatency && (
                      <p className="text-sm text-gray-500">Latency: {healthStatus.performance.redisLatency}ms</p>
                    )}
                  </div>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(status)}`}>
                    {getStatusIcon(status)} {status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Performance Metrics */}
        {healthStatus?.performance.memoryUsage && (
          <div className="mb-6 bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Performance Metrics</h2>
            </div>
            <div className="px-6 py-4">
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">Memory Usage</span>
                    <span className="text-sm text-gray-500">
                      {healthStatus.performance.memoryUsage.used}MB / {healthStatus.performance.memoryUsage.total}MB
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        healthStatus.performance.memoryUsage.percentage > 90 ? 'bg-red-600' :
                        healthStatus.performance.memoryUsage.percentage > 70 ? 'bg-yellow-500' :
                        'bg-green-600'
                      }`}
                      style={{ width: `${healthStatus.performance.memoryUsage.percentage}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{healthStatus.performance.memoryUsage.percentage}%</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Environment Configuration */}
        {envSummary && (
          <div className="mb-6 bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Environment Configuration</h2>
            </div>
            <div className="px-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-green-700 mb-2">
                    Configured ({envSummary.configured.length})
                  </h3>
                  <ul className="text-sm text-gray-600 space-y-1 max-h-40 overflow-y-auto">
                    {envSummary.configured.slice(0, 10).map(key => (
                      <li key={key} className="truncate" title={key}>✓ {key}</li>
                    ))}
                    {envSummary.configured.length > 10 && (
                      <li className="text-gray-400">+ {envSummary.configured.length - 10} more</li>
                    )}
                  </ul>
                </div>

                {envSummary.missing.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-yellow-700 mb-2">
                      Missing ({envSummary.missing.length})
                    </h3>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {envSummary.missing.map(key => (
                        <li key={key}>⚠ {key}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {envSummary.invalid.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-red-700 mb-2">
                      Invalid ({envSummary.invalid.length})
                    </h3>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {envSummary.invalid.map(key => (
                        <li key={key}>✗ {key}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {envSummary.warnings.length > 0 && (
                <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                  <h4 className="text-sm font-medium text-yellow-800 mb-2">Warnings</h4>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    {envSummary.warnings.map((warning, idx) => (
                      <li key={idx}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Quick Actions</h2>
          </div>
          <div className="px-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <a
                href="/api/health"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-4 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                <span className="text-sm font-medium text-gray-900">View Raw Health Data</span>
                <span className="text-gray-400">→</span>
              </a>

              <a
                href="https://app.netlify.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-4 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                <span className="text-sm font-medium text-gray-900">Open Netlify Dashboard</span>
                <span className="text-gray-400">→</span>
              </a>

              <a
                href="https://app.supabase.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-4 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                <span className="text-sm font-medium text-gray-900">Open Supabase Dashboard</span>
                <span className="text-gray-400">→</span>
              </a>

              <a
                href="https://sentry.io"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-4 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                <span className="text-sm font-medium text-gray-900">Open Sentry Dashboard</span>
                <span className="text-gray-400">→</span>
              </a>
            </div>
          </div>
        </div>

        {/* Documentation Link */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>
            For deployment procedures, see{' '}
            <a href="/docs/DEPLOYMENT_CHECKLIST.md" className="text-blue-600 hover:underline">
              Deployment Checklist
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}

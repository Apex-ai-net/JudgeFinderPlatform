import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { resolveAdminStatus, adminHasMFA } from '@/lib/auth/is-admin'
import { getRecentAuditLogs, getAuditLogStats, getRecentSecurityEvents } from '@/lib/audit/logger'
import { Shield, AlertTriangle, Lock, Activity, Eye, FileKey } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function SecurityDashboardPage(): Promise<JSX.Element> {
  const { userId } = await auth()

  if (!userId) {
    redirect('/sign-in?redirect_url=/admin/security')
  }

  const status = await resolveAdminStatus()

  if (!status.isAdmin) {
    redirect('/admin')
  }

  // Fetch security data
  const [recentLogs, stats, securityEvents, hasMFA] = await Promise.all([
    getRecentAuditLogs(50),
    getAuditLogStats('24 hours'),
    getRecentSecurityEvents(20),
    adminHasMFA(),
  ])

  // Calculate summary metrics
  const totalEvents = stats.reduce((sum, stat) => sum + Number(stat.count), 0)
  const criticalEvents = stats
    .filter((s) => s.severity === 'critical')
    .reduce((sum, stat) => sum + Number(stat.count), 0)
  const warningEvents = stats
    .filter((s) => s.severity === 'warning')
    .reduce((sum, stat) => sum + Number(stat.count), 0)
  const piiAccessCount = stats
    .filter((s) => s.action_type === 'pii_access')
    .reduce((sum, stat) => sum + Number(stat.count), 0)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Security Dashboard</h1>
          </div>
          <p className="text-gray-600">
            Monitor security events, audit logs, and compliance metrics
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <Activity className="w-5 h-5 text-blue-600" />
              <span className="text-2xl font-bold text-gray-900">{totalEvents}</span>
            </div>
            <p className="text-sm text-gray-600">Total Events (24h)</p>
          </div>

          <div className="bg-white rounded-lg shadow border border-red-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <span className="text-2xl font-bold text-red-600">{criticalEvents}</span>
            </div>
            <p className="text-sm text-gray-600">Critical Events</p>
          </div>

          <div className="bg-white rounded-lg shadow border border-yellow-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              <span className="text-2xl font-bold text-yellow-600">{warningEvents}</span>
            </div>
            <p className="text-sm text-gray-600">Warnings</p>
          </div>

          <div className="bg-white rounded-lg shadow border border-green-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <Eye className="w-5 h-5 text-green-600" />
              <span className="text-2xl font-bold text-gray-900">{piiAccessCount}</span>
            </div>
            <p className="text-sm text-gray-600">PII Access Events</p>
          </div>
        </div>

        {/* MFA Status Banner */}
        {!hasMFA && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-8">
            <div className="flex items-start gap-3">
              <Lock className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-amber-900 mb-1">
                  Multi-Factor Authentication Not Enabled
                </h3>
                <p className="text-sm text-amber-800">
                  For enhanced security, enable MFA on your account. In production, MFA is required
                  for admin access.
                </p>
                <a
                  href="/admin/mfa-required"
                  className="text-sm text-amber-900 underline hover:text-amber-950 mt-1 inline-block"
                >
                  Learn how to enable MFA
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Recent Security Events */}
        <div className="bg-white rounded-lg shadow border border-gray-200 mb-8">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              Recent Security Events
            </h2>
          </div>
          <div className="divide-y divide-gray-200">
            {securityEvents.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-500">No recent security events</div>
            ) : (
              securityEvents.slice(0, 10).map((event: any) => (
                <div key={event.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            event.severity === 'critical'
                              ? 'bg-red-100 text-red-800'
                              : event.severity === 'warning'
                                ? 'bg-yellow-100 text-yellow-800'
                                : event.severity === 'error'
                                  ? 'bg-orange-100 text-orange-800'
                                  : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {event.severity}
                        </span>
                        <span className="text-sm font-medium text-gray-900">
                          {event.action_type.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        {event.resource_type} {event.resource_id ? `(${event.resource_id})` : ''}
                      </p>
                      {event.error_message && (
                        <p className="text-xs text-red-600 mt-1">{event.error_message}</p>
                      )}
                      {event.ip_address && (
                        <p className="text-xs text-gray-500 mt-1">IP: {event.ip_address}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">
                        {new Date(event.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Event Statistics */}
        <div className="bg-white rounded-lg shadow border border-gray-200 mb-8">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-600" />
              Event Statistics (24h)
            </h2>
          </div>
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Severity
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Count
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Failed
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {stats.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                        No statistics available
                      </td>
                    </tr>
                  ) : (
                    stats.map((stat: any, index: number) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {stat.action_type.replace(/_/g, ' ')}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              stat.severity === 'critical'
                                ? 'bg-red-100 text-red-800'
                                : stat.severity === 'warning'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : stat.severity === 'error'
                                    ? 'bg-orange-100 text-orange-800'
                                    : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {stat.severity}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right font-mono">
                          {stat.count}
                        </td>
                        <td className="px-4 py-3 text-sm text-red-600 text-right font-mono">
                          {stat.failed_count}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Recent Audit Logs */}
        <div className="bg-white rounded-lg shadow border border-gray-200">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <FileKey className="w-5 h-5 text-purple-600" />
              Recent Audit Log Entries
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Resource
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Severity
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    IP Address
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                      No audit logs available
                    </td>
                  </tr>
                ) : (
                  recentLogs.map((log: any) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {log.action_type.replace(/_/g, ' ')}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{log.resource_type}</td>
                      <td className="px-4 py-3 text-sm">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            log.severity === 'critical'
                              ? 'bg-red-100 text-red-800'
                              : log.severity === 'warning'
                                ? 'bg-yellow-100 text-yellow-800'
                                : log.severity === 'error'
                                  ? 'bg-orange-100 text-orange-800'
                                  : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {log.severity}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 font-mono">
                        {log.ip_address || 'N/A'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Back to Admin Link */}
        <div className="mt-8 text-center">
          <a href="/admin" className="text-blue-600 hover:text-blue-700 underline text-sm">
            Back to Admin Dashboard
          </a>
        </div>
      </div>
    </div>
  )
}

export const metadata = {
  title: 'Security Dashboard - JudgeFinder Admin',
  description: 'Security monitoring and audit log dashboard',
}

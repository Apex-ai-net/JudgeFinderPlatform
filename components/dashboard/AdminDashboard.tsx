'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  queueSyncJob,
  cancelSyncJobs,
  restartSyncQueue,
  transitionProfileIssue,
} from '@/app/admin/actions'
import type { SyncStatusResponse } from '@/lib/admin/sync-status'
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  RefreshCcw,
  RefreshCw,
  Server,
  Activity,
  BarChart3,
  PlayCircle,
  Square,
  Triangle,
} from 'lucide-react'

type ProfileIssueStatus = 'new' | 'researching' | 'resolved' | 'dismissed'

interface ProfileIssueSummary {
  id: string
  judge_slug: string
  court_id: string | null
  issue_type: string
  status: ProfileIssueStatus
  reporter_email: string | null
  created_at: string
  severity: 'high' | 'medium' | 'low'
  priority: number
  sla_due_at: string | null
  last_status_change_at: string | null
  breached_at: string | null
}

interface IssueCount {
  status: ProfileIssueStatus
  count: number
}

interface AdminDashboardProps {
  status: SyncStatusResponse | null
  profileIssues: ProfileIssueSummary[]
  profileIssueCounts: IssueCount[]
  overdueCount: number
}

type ActionType = 'queue-decisions' | 'cancel-decisions' | 'restart-queue'

interface Feedback {
  type: 'success' | 'error'
  message: string
}

const ACTION_META: Record<
  ActionType,
  { title: string; description: string; confirmLabel: string }
> = {
  'queue-decisions': {
    title: 'Queue CA decision document sync',
    description: 'Adds a high-priority job to pull recent CourtListener decisions for California.',
    confirmLabel: 'Queue job',
  },
  'cancel-decisions': {
    title: 'Cancel pending decision jobs',
    description: 'Stops queued decision document jobs to prevent duplicates.',
    confirmLabel: 'Cancel jobs',
  },
  'restart-queue': {
    title: 'Restart sync queue processor',
    description: 'Stops and restarts the queue worker to clear stuck jobs.',
    confirmLabel: 'Restart queue',
  },
}

function formatNumber(value: number | null | undefined, fallback = '0'): string {
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback
  return value.toLocaleString()
}

function formatRelative(dateString: string | null | undefined): string {
  if (!dateString) return 'Unknown'
  const target = new Date(dateString)
  if (Number.isNaN(target.getTime())) return 'Unknown'

  const diffMs = Date.now() - target.getTime()
  if (diffMs < 0) return 'Just now'

  const diffMinutes = Math.floor(diffMs / 60000)
  if (diffMinutes < 1) return 'Just now'
  if (diffMinutes < 60) return `${diffMinutes} min ago`

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours} hr${diffHours === 1 ? '' : 's'} ago`

  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`
}

function maskEmail(email: string | null): string {
  if (!email) return '—'
  const [user, domain] = email.split('@')
  if (!domain) return email
  if (user.length <= 2) {
    return `${user[0] ?? ''}***@${domain}`
  }
  return `${user.slice(0, 2)}***@${domain}`
}

function formatDuration(ms: number): string {
  const absMs = Math.abs(ms)
  const minutes = Math.round(absMs / 60000)
  if (minutes < 60) return `${minutes} min`
  const hours = Math.round(minutes / 60)
  if (hours < 48) return `${hours} hr${hours === 1 ? '' : 's'}`
  const days = Math.round(hours / 24)
  return `${days} day${days === 1 ? '' : 's'}`
}

function formatSeverity(severity: string): { label: string; className: string } {
  switch (severity) {
    case 'high':
      return { label: 'High', className: 'bg-red-50 text-red-600 border border-red-200' }
    case 'medium':
      return { label: 'Medium', className: 'bg-amber-50 text-amber-600 border border-amber-200' }
    default:
      return { label: 'Low', className: 'bg-primary/5 text-primary border border-blue-200' }
  }
}

function isIssueOverdue(issue: ProfileIssueSummary): boolean {
  if (!issue.sla_due_at) return false
  if (issue.status === 'resolved' || issue.status === 'dismissed') return false
  const due = new Date(issue.sla_due_at)
  if (Number.isNaN(due.getTime())) return false
  return due.getTime() < Date.now()
}

function resolveSlaDescriptor(
  slaDue: string | null,
  status: ProfileIssueStatus
): { label: string; tone: 'critical' | 'warn' | 'ok' | 'muted' } {
  if (!slaDue) return { label: 'Not set', tone: 'muted' as const }
  if (status === 'resolved' || status === 'dismissed')
    return { label: 'Closed', tone: 'muted' as const }

  const due = new Date(slaDue)
  if (Number.isNaN(due.getTime())) return { label: 'Invalid', tone: 'muted' as const }

  const diff = due.getTime() - Date.now()
  if (diff < 0) {
    return { label: `Overdue by ${formatDuration(diff)}`, tone: 'critical' as const }
  }
  if (diff <= 24 * 60 * 60 * 1000) {
    return { label: `Due in ${formatDuration(diff)}`, tone: 'warn' as const }
  }
  return { label: `Due in ${formatDuration(diff)}`, tone: 'ok' as const }
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (!Number.isNaN(parsed)) return parsed
  }
  return null
}

function extractMetricName(metric: Record<string, unknown>): string {
  const candidates = ['metric_name', 'metric', 'name', 'key', 'label', 'title']
  for (const key of candidates) {
    const value = metric[key]
    if (typeof value === 'string' && value.trim().length > 0) {
      return value
    }
  }
  return 'metric'
}

function extractMetricValue(metric: Record<string, unknown>): number | null {
  const candidates = ['metric_value', 'value', 'count', 'total', 'amount', 'ratio', 'percentage']
  for (const key of candidates) {
    const extracted = toNumber(metric[key])
    if (typeof extracted === 'number') {
      return extracted
    }
  }
  return null
}

function isRateLimitMetric(metric: Record<string, unknown>): boolean {
  const name = extractMetricName(metric).toLowerCase()
  return name.includes('rate_limit') || name.includes('rate limit') || name.includes('throttle')
}

function formatPercent(value: number | null, fallback = '—'): string {
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback
  const normalized = value <= 1 ? value * 100 : value
  return `${Math.min(100, Math.max(0, Math.round(normalized)))}%`
}

function deriveCircuitSeverity(external: {
  courtlistener_failures_24h?: number
  courtlistener_circuit_opens_24h?: number
  courtlistener_circuit_shortcircuits_24h?: number
}) {
  const opens = external?.courtlistener_circuit_opens_24h ?? 0
  const shortCircuits = external?.courtlistener_circuit_shortcircuits_24h ?? 0
  if (shortCircuits > 0) {
    return {
      tone: 'critical' as const,
      label: 'Short-circuiting',
      message: `${shortCircuits} short-circuit${shortCircuits === 1 ? '' : 's'} in 24h`,
    }
  }
  if (opens > 0) {
    return {
      tone: 'warn' as const,
      label: 'Circuit open',
      message: `${opens} open event${opens === 1 ? '' : 's'} in 24h`,
    }
  }
  return { tone: 'good' as const, label: 'Stable', message: 'No circuit interrupts in 24h' }
}

function healthPill(status: SyncStatusResponse['health']['status']): {
  label: string
  className: string
  icon: React.ComponentType<any>
} {
  switch (status) {
    case 'healthy':
      return {
        label: 'Healthy',
        className: 'bg-green-50 text-green-700 border border-green-200',
        icon: CheckCircle2,
      }
    case 'warning':
      return {
        label: 'Warning',
        className: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
        icon: AlertTriangle,
      }
    case 'critical':
      return {
        label: 'Critical',
        className: 'bg-red-50 text-red-700 border border-red-200',
        icon: AlertTriangle,
      }
    case 'caution':
      return {
        label: 'Caution',
        className: 'bg-orange-50 text-orange-700 border border-orange-200',
        icon: AlertTriangle,
      }
    default:
      return {
        label: 'Unknown',
        className: 'bg-muted text-foreground border border-border',
        icon: Clock,
      }
  }
}

const ISSUE_STATUS_META: Record<ProfileIssueStatus, { label: string; className: string }> = {
  new: {
    label: 'New',
    className:
      'border-[rgba(110,168,254,0.45)] bg-[rgba(110,168,254,0.14)] text-[color:hsl(var(--accent))]',
  },
  researching: {
    label: 'Researching',
    className:
      'border-[rgba(251,211,141,0.45)] bg-[rgba(251,211,141,0.2)] text-[color:hsl(var(--warn))]',
  },
  resolved: {
    label: 'Resolved',
    className:
      'border-[rgba(103,232,169,0.4)] bg-[rgba(103,232,169,0.14)] text-[color:hsl(var(--pos))]',
  },
  dismissed: {
    label: 'Dismissed',
    className: 'border-border/60 bg-[hsl(var(--bg-1))] text-[color:hsl(var(--text-3))]',
  },
}

const ISSUE_TYPE_LABELS: Record<string, string> = {
  data_accuracy: 'Data accuracy or coverage',
  bias_context: 'Bias context clarification',
  assignment_change: 'Assignment change',
  ads_or_policy: 'Advertising or policy',
  other: 'Other',
}

const ISSUE_FILTERS: Array<{ id: 'all' | 'overdue' | ProfileIssueStatus; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'overdue', label: 'Overdue' },
  { id: 'new', label: 'New' },
  { id: 'researching', label: 'Researching' },
  { id: 'resolved', label: 'Resolved' },
  { id: 'dismissed', label: 'Dismissed' },
]

export default function AdminDashboard({
  status,
  profileIssues,
  profileIssueCounts,
  overdueCount,
}: AdminDashboardProps): JSX.Element {
  const router = useRouter()
  const [pendingAction, setPendingAction] = useState<ActionType | null>(null)
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [isPending, startTransition] = useTransition()
  const [issueFilter, setIssueFilter] = useState<'all' | ProfileIssueStatus | 'overdue'>('all')
  const [issuePendingId, setIssuePendingId] = useState<string | null>(null)
  const [issueTransitionPending, startIssueTransition] = useTransition()

  const health = useMemo(
    () => healthPill(status?.health.status || 'caution'),
    [status?.health.status]
  )

  const handleAction = (action: ActionType) => {
    setPendingAction(action)
  }

  const executeAction = () => {
    if (!pendingAction) return
    const action = pendingAction

    startTransition(async () => {
      try {
        switch (action) {
          case 'queue-decisions':
            await queueSyncJob({
              type: 'decision',
              options: {
                jurisdiction: 'CA',
                schedule: 'daily',
                priority: 'high',
                forceRefresh: true,
              },
              priority: 80,
            })
            setFeedback({ type: 'success', message: 'Decision job queued successfully.' })
            break
          case 'cancel-decisions':
            await cancelSyncJobs('decision')
            setFeedback({ type: 'success', message: 'Pending decision jobs cancelled.' })
            break
          case 'restart-queue':
            await restartSyncQueue()
            setFeedback({ type: 'success', message: 'Queue restarted successfully.' })
            break
        }
      } catch (error) {
        console.error(error)
        setFeedback({ type: 'error', message: 'Action failed. Check server logs for details.' })
      } finally {
        setPendingAction(null)
        router.refresh()
      }
    })
  }

  const cancelAction = () => {
    setPendingAction(null)
  }

  const handleIssueTransition = (
    issueId: string,
    nextStatus: ProfileIssueStatus,
    actionLabel: string
  ) => {
    setIssuePendingId(issueId)
    startIssueTransition(async () => {
      try {
        await transitionProfileIssue({ id: issueId, nextStatus })
        setFeedback({ type: 'success', message: `Issue ${actionLabel.toLowerCase()}.` })
      } catch (error) {
        console.error(error)
        setFeedback({
          type: 'error',
          message: 'Failed to update issue. Check server logs for details.',
        })
      } finally {
        setIssuePendingId(null)
        router.refresh()
      }
    })
  }

  const filteredIssues = useMemo(() => {
    if (issueFilter === 'all') return profileIssues
    if (issueFilter === 'overdue') {
      return profileIssues.filter((issue) => isIssueOverdue(issue))
    }
    return profileIssues.filter((issue) => issue.status === issueFilter)
  }, [profileIssues, issueFilter])

  if (!status) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <AlertTriangle className="h-10 w-10 text-red-500" />
        <div className="text-center">
          <p className="text-lg font-medium text-foreground">Unable to load operations data</p>
          <p className="text-sm text-muted-foreground">
            Verify SYNC_API_KEY and admin API availability.
          </p>
        </div>
        <button
          onClick={() => router.refresh()}
          className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-md hover:bg-blue-700"
        >
          <RefreshCcw className="h-4 w-4 mr-2" />
          Try again
        </button>
      </div>
    )
  }

  const queueStats = status.queue?.stats || { pending: 0, running: 0, succeeded: 0, failed: 0 }
  const external = status.performance?.external_api || {
    courtlistener_failures_24h: 0,
    courtlistener_circuit_opens_24h: 0,
    courtlistener_circuit_shortcircuits_24h: 0,
  }
  const uptime = toNumber(status.health?.uptime)
  const combinedMetrics: Record<string, unknown>[] = [
    ...(Array.isArray(status.health?.metrics) ? status.health?.metrics : []),
    ...(Array.isArray(status.sync_breakdown) ? status.sync_breakdown : []),
  ]

  const cacheMetric = combinedMetrics.find((metric) => {
    const name = extractMetricName(metric as Record<string, unknown>).toLowerCase()
    return (
      name.includes('cache') &&
      (name.includes('hit') || name.includes('ttl') || name.includes('efficiency'))
    )
  }) as Record<string, unknown> | undefined

  const cacheHitValue = cacheMetric ? extractMetricValue(cacheMetric) : null
  const cacheHitLabel = cacheHitValue === null ? '—' : formatPercent(cacheHitValue)

  const rateLimitMetrics = combinedMetrics
    .filter(
      (metric): metric is Record<string, unknown> => Boolean(metric) && typeof metric === 'object'
    )
    .filter((metric) => isRateLimitMetric(metric))
    .map((metric) => ({
      name: extractMetricName(metric),
      value: extractMetricValue(metric),
      window: typeof metric.window === 'string' ? metric.window : undefined,
    }))

  const queueBreakdown = Array.isArray(status.queue?.status)
    ? status.queue.status
        .map((entry: any) => {
          const labelCandidate =
            entry?.job_type ||
            entry?.type ||
            entry?.entity_type ||
            entry?.queue_name ||
            entry?.queue ||
            entry?.worker
          const label = typeof labelCandidate === 'string' ? labelCandidate : null
          return {
            label: label || 'Queue',
            pending: toNumber(entry?.pending) ?? 0,
            running: toNumber(entry?.running) ?? 0,
            failed: toNumber(entry?.failed) ?? 0,
            succeeded: toNumber(entry?.succeeded ?? entry?.completed) ?? 0,
          }
        })
        .filter((row) => row.label && (row.pending || row.running || row.failed || row.succeeded))
    : []

  const circuitSeverity = deriveCircuitSeverity(external)
  const dailyFailedRuns = status.performance?.daily?.failed_runs ?? 0
  const weeklyFailedRuns = status.performance?.weekly?.failed_runs ?? 0
  const backlog = status.queue?.backlog ?? queueStats.pending + queueStats.running
  const judgeFreshnessRelative = formatRelative(status.freshness?.judges?.last_sync)
  const decisionFreshnessRelative = formatRelative(status.freshness?.decisions?.last_created)

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Operations Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor sync pipelines, queue health, and CourtListener integrations.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium ${health.className}`}
          >
            <health.icon className="h-4 w-4" />
            {health.label}
          </div>
          <div className="text-sm text-muted-foreground">
            Last updated {formatRelative(status.timestamp)}
          </div>
          <button
            onClick={() => router.refresh()}
            className="inline-flex items-center rounded-md border border-border bg-white px-3 py-2 text-sm font-medium text-foreground shadow-sm hover:bg-muted"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`rounded-md border px-4 py-3 text-sm ${
            feedback.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-700'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {feedback.message}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border border-border bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">System uptime</p>
              <p className="mt-2 text-3xl font-semibold text-foreground">
                {formatPercent(uptime, '—')}
              </p>
            </div>
            <CheckCircle2 className="h-10 w-10 text-emerald-500" />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            {formatNumber(status.performance?.daily?.total_runs)} jobs today ·{' '}
            {formatNumber(status.recent_logs?.length ?? 0)} recent runs tracked
          </p>
        </div>
        <div className="rounded-lg border border-border bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Queue depth</p>
              <p className="mt-2 text-3xl font-semibold text-foreground">{formatNumber(backlog)}</p>
            </div>
            <Server className="h-10 w-10 text-blue-500" />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Pending {formatNumber(queueStats.pending)} · Running {formatNumber(queueStats.running)}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">CourtListener circuit</p>
              <p
                className={`mt-2 text-2xl font-semibold ${
                  circuitSeverity.tone === 'critical'
                    ? 'text-red-600'
                    : circuitSeverity.tone === 'warn'
                      ? 'text-amber-600'
                      : 'text-emerald-600'
                }`}
              >
                {circuitSeverity.label}
              </p>
            </div>
            <AlertTriangle
              className={`h-10 w-10 ${
                circuitSeverity.tone === 'critical'
                  ? 'text-red-500'
                  : circuitSeverity.tone === 'warn'
                    ? 'text-amber-500'
                    : 'text-emerald-500'
              }`}
            />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            {circuitSeverity.message} · Failures {formatNumber(external.courtlistener_failures_24h)}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Cache efficiency</p>
              <p className="mt-2 text-3xl font-semibold text-foreground">{cacheHitLabel}</p>
            </div>
            <Clock className="h-10 w-10 text-teal-500" />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Judges synced {judgeFreshnessRelative} · Decisions {decisionFreshnessRelative}
          </p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-lg border border-border bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <h2 className="text-sm font-semibold text-foreground">Queue status</h2>
            <Activity className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="px-6 py-4">
            <dl className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
              <div className="rounded-md bg-muted p-4">
                <dt className="font-medium text-muted-foreground">Pending</dt>
                <dd className="mt-1 text-xl font-semibold text-foreground">
                  {formatNumber(queueStats.pending)}
                </dd>
              </div>
              <div className="rounded-md bg-muted p-4">
                <dt className="font-medium text-muted-foreground">Running</dt>
                <dd className="mt-1 text-xl font-semibold text-foreground">
                  {formatNumber(queueStats.running)}
                </dd>
              </div>
              <div className="rounded-md bg-muted p-4">
                <dt className="font-medium text-muted-foreground">Succeeded (24h)</dt>
                <dd className="mt-1 text-xl font-semibold text-foreground">
                  {formatNumber(queueStats.succeeded)}
                </dd>
              </div>
              <div className="rounded-md bg-muted p-4">
                <dt className="font-medium text-muted-foreground">Failed (24h)</dt>
                <dd className="mt-1 text-xl font-semibold text-foreground">
                  {formatNumber(queueStats.failed)}
                </dd>
              </div>
            </dl>
            {queueBreakdown.length > 0 && (
              <div className="mt-4 overflow-hidden rounded-md border border-border">
                <table className="min-w-full divide-y divide-gray-200 text-xs">
                  <thead className="bg-muted text-muted-foreground">
                    <tr>
                      <th scope="col" className="px-3 py-2 text-left font-semibold">
                        Queue
                      </th>
                      <th scope="col" className="px-3 py-2 text-right font-semibold">
                        Pending
                      </th>
                      <th scope="col" className="px-3 py-2 text-right font-semibold">
                        Running
                      </th>
                      <th scope="col" className="px-3 py-2 text-right font-semibold">
                        Failed
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white text-muted-foreground">
                    {queueBreakdown.map((row) => (
                      <tr key={row.label}>
                        <td className="px-3 py-2 font-medium text-foreground">{row.label}</td>
                        <td className="px-3 py-2 text-right">{formatNumber(row.pending)}</td>
                        <td className="px-3 py-2 text-right">{formatNumber(row.running)}</td>
                        <td className="px-3 py-2 text-right">{formatNumber(row.failed)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <h2 className="text-sm font-semibold text-foreground">Performance summary</h2>
            <BarChart3 className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="grid grid-cols-1 gap-4 px-6 py-4 md:grid-cols-2">
            <div className="rounded-md bg-muted p-4">
              <p className="text-xs font-medium uppercase text-muted-foreground">Daily</p>
              <p className="mt-2 text-3xl font-semibold text-foreground">
                {formatNumber(status.performance?.daily?.total_runs)}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Success {formatPercent(status.performance?.daily?.success_rate ?? null, '—')} ·
                Failures {formatNumber(dailyFailedRuns)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Avg duration {formatNumber(status.performance?.daily?.avg_duration_ms)} ms
              </p>
            </div>
            <div className="rounded-md bg-muted p-4">
              <p className="text-xs font-medium uppercase text-muted-foreground">Weekly</p>
              <p className="mt-2 text-3xl font-semibold text-foreground">
                {formatNumber(status.performance?.weekly?.total_runs)}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Success {formatPercent(status.performance?.weekly?.success_rate ?? null, '—')} ·
                Failures {formatNumber(weeklyFailedRuns)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-sm font-semibold text-foreground">Recent sync activity</h2>
          <Triangle className="h-5 w-5 text-muted-foreground rotate-180" />
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-muted">
              <tr>
                <th scope="col" className="px-6 py-3 text-left font-semibold text-foreground">
                  Sync type
                </th>
                <th scope="col" className="px-6 py-3 text-left font-semibold text-foreground">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left font-semibold text-foreground">
                  Started
                </th>
                <th scope="col" className="px-6 py-3 text-left font-semibold text-foreground">
                  Duration (ms)
                </th>
                <th scope="col" className="px-6 py-3 text-left font-semibold text-foreground">
                  Error
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {status.recent_logs.slice(0, 8).map((log) => (
                <tr key={log.id}>
                  <td className="px-6 py-3 text-foreground">{log.sync_type}</td>
                  <td className="px-6 py-3">
                    <span
                      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${
                        log.status === 'completed'
                          ? 'bg-green-50 text-green-700'
                          : log.status === 'failed'
                            ? 'bg-red-50 text-red-700'
                            : 'bg-muted text-foreground'
                      }`}
                    >
                      {log.status === 'completed' ? (
                        <CheckCircle2 className="h-3 w-3" />
                      ) : log.status === 'failed' ? (
                        <AlertTriangle className="h-3 w-3" />
                      ) : (
                        <Square className="h-3 w-3" />
                      )}
                      {log.status}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-muted-foreground">
                    {formatRelative(log.started_at)}
                  </td>
                  <td className="px-6 py-3 text-muted-foreground">
                    {formatNumber(log.duration_ms)}
                  </td>
                  <td className="px-6 py-3 text-muted-foreground">{log.error_message || '—'}</td>
                </tr>
              ))}
              {status.recent_logs.length === 0 && (
                <tr>
                  <td className="px-6 py-4 text-center text-muted-foreground" colSpan={5}>
                    No recent sync jobs recorded.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="rounded-lg border border-border bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <h2 className="text-sm font-semibold text-foreground">Rate limit counters</h2>
            <Clock className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="px-6 py-5 text-sm text-muted-foreground">
            {rateLimitMetrics.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No active throttling signals from the last 24 hours.
              </p>
            ) : (
              <div className="space-y-3">
                {rateLimitMetrics.map((metric) => (
                  <div
                    key={metric.name}
                    className="flex items-center justify-between rounded-md bg-muted px-4 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">{metric.name}</p>
                      {metric.window && (
                        <p className="text-xs text-muted-foreground">Window: {metric.window}</p>
                      )}
                    </div>
                    <span className="text-sm font-semibold text-foreground">
                      {formatNumber(metric.value, '—')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-border px-6 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Corrections queue</h2>
            <p className="text-xs text-muted-foreground">Public data issues flagged for review.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {overdueCount > 0 && (
              <span className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                Over SLA
                <span className="text-foreground">{overdueCount.toLocaleString()}</span>
              </span>
            )}
            {profileIssueCounts.map(({ status, count }) => (
              <span
                key={status}
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${ISSUE_STATUS_META[status].className}`}
              >
                {ISSUE_STATUS_META[status].label}
                <span className="text-foreground">{count.toLocaleString()}</span>
              </span>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {ISSUE_FILTERS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => setIssueFilter(id)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                  issueFilter === id
                    ? 'border-blue-400 bg-primary/5 text-blue-700'
                    : 'border-border bg-muted text-muted-foreground hover:border-border hover:text-foreground'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-muted">
              <tr>
                <th scope="col" className="px-6 py-3 text-left font-semibold text-foreground">
                  Judge
                </th>
                <th scope="col" className="px-6 py-3 text-left font-semibold text-foreground">
                  Court
                </th>
                <th scope="col" className="px-6 py-3 text-left font-semibold text-foreground">
                  Issue
                </th>
                <th scope="col" className="px-6 py-3 text-left font-semibold text-foreground">
                  Severity
                </th>
                <th scope="col" className="px-6 py-3 text-left font-semibold text-foreground">
                  SLA
                </th>
                <th scope="col" className="px-6 py-3 text-left font-semibold text-foreground">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left font-semibold text-foreground">
                  Reported
                </th>
                <th scope="col" className="px-6 py-3 text-left font-semibold text-foreground">
                  Contact
                </th>
                <th scope="col" className="px-6 py-3 text-left font-semibold text-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {filteredIssues.map((issue) => {
                const severityMeta = formatSeverity(issue.severity)
                const slaInfo = resolveSlaDescriptor(issue.sla_due_at, issue.status)
                const rowClass =
                  slaInfo.tone === 'critical'
                    ? 'bg-red-50'
                    : slaInfo.tone === 'warn'
                      ? 'bg-amber-50'
                      : undefined

                return (
                  <tr key={issue.id} className={rowClass}>
                    <td className="px-6 py-3 text-foreground">{issue.judge_slug}</td>
                    <td className="px-6 py-3 text-muted-foreground">{issue.court_id || '—'}</td>
                    <td className="px-6 py-3 text-muted-foreground">
                      {ISSUE_TYPE_LABELS[issue.issue_type] || issue.issue_type}
                    </td>
                    <td className="px-6 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${severityMeta.className}`}
                      >
                        {severityMeta.label}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-sm">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                          slaInfo.tone === 'critical'
                            ? 'bg-red-100 text-red-700'
                            : slaInfo.tone === 'warn'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-muted text-foreground'
                        }`}
                      >
                        {slaInfo.label}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${ISSUE_STATUS_META[issue.status].className}`}
                      >
                        {ISSUE_STATUS_META[issue.status].label}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-muted-foreground">
                      {formatRelative(issue.created_at)}
                    </td>
                    <td className="px-6 py-3 text-muted-foreground">
                      {maskEmail(issue.reporter_email)}
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        {issue.status === 'new' && (
                          <button
                            type="button"
                            onClick={() =>
                              handleIssueTransition(issue.id, 'researching', 'Acknowledged')
                            }
                            className="rounded-full border border-blue-200 bg-primary/5 px-3 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-60"
                            disabled={issueTransitionPending || issuePendingId === issue.id}
                          >
                            {issuePendingId === issue.id && issueTransitionPending
                              ? 'Updating…'
                              : 'Acknowledge'}
                          </button>
                        )}
                        {(issue.status === 'new' || issue.status === 'researching') && (
                          <button
                            type="button"
                            onClick={() => handleIssueTransition(issue.id, 'resolved', 'Resolved')}
                            className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-60"
                            disabled={issueTransitionPending || issuePendingId === issue.id}
                          >
                            {issuePendingId === issue.id && issueTransitionPending
                              ? 'Updating…'
                              : 'Resolve'}
                          </button>
                        )}
                        {(issue.status === 'new' || issue.status === 'researching') && (
                          <button
                            type="button"
                            onClick={() =>
                              handleIssueTransition(issue.id, 'dismissed', 'Dismissed')
                            }
                            className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-60"
                            disabled={issueTransitionPending || issuePendingId === issue.id}
                          >
                            {issuePendingId === issue.id && issueTransitionPending
                              ? 'Updating…'
                              : 'Dismiss'}
                          </button>
                        )}
                        {(issue.status === 'resolved' || issue.status === 'dismissed') && (
                          <button
                            type="button"
                            onClick={() =>
                              handleIssueTransition(issue.id, 'researching', 'Reopened')
                            }
                            className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-100 disabled:opacity-60"
                            disabled={issueTransitionPending || issuePendingId === issue.id}
                          >
                            {issuePendingId === issue.id && issueTransitionPending
                              ? 'Updating…'
                              : 'Reopen'}
                          </button>
                        )}
                        {issue.status === 'researching' && (
                          <button
                            type="button"
                            onClick={() => handleIssueTransition(issue.id, 'new', 'Reset')}
                            className="rounded-full border border-border bg-white px-3 py-1 text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-60"
                            disabled={issueTransitionPending || issuePendingId === issue.id}
                          >
                            {issuePendingId === issue.id && issueTransitionPending
                              ? 'Updating…'
                              : 'Reset'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
              {filteredIssues.length === 0 && (
                <tr>
                  <td className="px-6 py-5 text-center text-sm text-muted-foreground" colSpan={9}>
                    No open issues. Incoming corrections will appear here.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Admin actions</h2>
            <p className="text-xs text-muted-foreground">
              Actions run via secure server-side API key.
            </p>
          </div>
          {isPending && (
            <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <RefreshCcw className="h-4 w-4 animate-spin" />
              Processing…
            </div>
          )}
        </div>
        <div className="grid gap-4 px-6 py-6 md:grid-cols-3">
          <button
            onClick={() => handleAction('queue-decisions')}
            className="rounded-md border border-blue-200 bg-primary/5 px-4 py-3 text-left text-sm font-medium text-blue-700 hover:bg-blue-100"
          >
            <div className="flex items-center gap-2">
              <PlayCircle className="h-4 w-4" />
              Queue CA decision sync
            </div>
            <p className="mt-1 text-xs font-normal text-primary/80">
              Runs the daily high-priority CA decision ingest.
            </p>
          </button>
          <button
            onClick={() => handleAction('cancel-decisions')}
            className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-left text-sm font-medium text-amber-700 hover:bg-amber-100"
          >
            <div className="flex items-center gap-2">
              <Square className="h-4 w-4" />
              Cancel decision jobs
            </div>
            <p className="mt-1 text-xs font-normal text-amber-600/80">
              Stops duplicate or stale decision sync jobs.
            </p>
          </button>
          <button
            onClick={() => handleAction('restart-queue')}
            className="rounded-md border border-border bg-muted px-4 py-3 text-left text-sm font-medium text-foreground hover:bg-muted"
          >
            <div className="flex items-center gap-2">
              <RefreshCcw className="h-4 w-4" />
              Restart queue processor
            </div>
            <p className="mt-1 text-xs font-normal text-muted-foreground">
              Gracefully restarts the queue worker.
            </p>
          </button>
        </div>
      </div>

      {pendingAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg border border-border bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-foreground">
              {ACTION_META[pendingAction].title}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {ACTION_META[pendingAction].description}
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={cancelAction}
                className="rounded-md border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
                disabled={isPending}
              >
                Cancel
              </button>
              <button
                onClick={executeAction}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                disabled={isPending}
              >
                {ACTION_META[pendingAction].confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, DollarSign, Eye, MousePointerClick, Target } from 'lucide-react'
import { logger } from '@/lib/utils/logger'

interface PerformanceData {
  summary: {
    total_spend: number
    total_impressions: number
    total_clicks: number
    avg_ctr: number
    avg_cpc: number
  }
  campaigns: Array<{
    campaign_id: string
    campaign_name: string
    spend: number
    impressions: number
    clicks: number
    ctr: number
    cpc: number
  }>
  time_series: Array<{
    date: string
    impressions: number
    clicks: number
    spend: number
  }>
}

interface PerformanceAnalyticsDashboardProps {
  userId: string
}

export function PerformanceAnalyticsDashboard({ userId }: PerformanceAnalyticsDashboardProps) {
  const [data, setData] = useState<PerformanceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d')

  useEffect(() => {
    const fetchPerformance = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/advertising/performance?time_range=${timeRange}`)

        if (!response.ok) {
          throw new Error('Failed to fetch performance data')
        }

        const performanceData = await response.json()
        setData(performanceData)
        setError(null)
      } catch (err) {
        logger.error('Failed to fetch performance', { error: err })
        setError(err instanceof Error ? err.message : 'Failed to load performance data')
      } finally {
        setLoading(false)
      }
    }

    fetchPerformance()
  }, [timeRange])

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="text-muted-foreground">Loading performance data...</div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="text-center py-12">
        <div className="text-destructive mb-2">Error loading performance data</div>
        <div className="text-sm text-muted-foreground">{error}</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex justify-end">
        <div className="inline-flex rounded-md shadow-sm" role="group">
          {(['7d', '30d', '90d'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 text-sm font-medium ${
                timeRange === range
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background text-foreground hover:bg-muted'
              } ${
                range === '7d'
                  ? 'rounded-l-md'
                  : range === '90d'
                    ? 'rounded-r-md'
                    : ''
              } border border-border`}
            >
              {range === '7d' ? 'Last 7 days' : range === '30d' ? 'Last 30 days' : 'Last 90 days'}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard
          title="Total Spend"
          value={`$${data.summary.total_spend.toLocaleString()}`}
          icon={<DollarSign className="h-5 w-5" />}
          trend={null}
        />

        <MetricCard
          title="Impressions"
          value={data.summary.total_impressions.toLocaleString()}
          icon={<Eye className="h-5 w-5" />}
          trend={null}
        />

        <MetricCard
          title="Clicks"
          value={data.summary.total_clicks.toLocaleString()}
          icon={<MousePointerClick className="h-5 w-5" />}
          trend={null}
        />

        <MetricCard
          title="Click-Through Rate"
          value={`${data.summary.avg_ctr.toFixed(2)}%`}
          icon={<Target className="h-5 w-5" />}
          trend={data.summary.avg_ctr > 2 ? 'up' : data.summary.avg_ctr > 1 ? null : 'down'}
          trendLabel={data.summary.avg_ctr > 2 ? 'Above average' : data.summary.avg_ctr > 1 ? 'Average' : 'Below average'}
        />

        <MetricCard
          title="Cost Per Click"
          value={`$${data.summary.avg_cpc.toFixed(2)}`}
          icon={<DollarSign className="h-5 w-5" />}
          trend={data.summary.avg_cpc < 10 ? 'up' : null}
          trendLabel={data.summary.avg_cpc < 10 ? 'Good CPC' : 'Monitor CPC'}
        />
      </div>

      {/* Campaign Performance Table */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">
            Campaign Performance
          </h2>
        </div>

        {data.campaigns.length === 0 ? (
          <div className="px-6 py-12 text-center text-muted-foreground">
            No campaign data yet. Create a campaign to start tracking performance.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Campaign
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Spend
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Impressions
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Clicks
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    CTR
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    CPC
                  </th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border">
                {data.campaigns.map((campaign) => (
                  <tr key={campaign.campaign_id} className="hover:bg-muted/50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                      {campaign.campaign_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-foreground">
                      ${campaign.spend.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-muted-foreground">
                      {campaign.impressions.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-muted-foreground">
                      {campaign.clicks.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-muted-foreground">
                      {campaign.ctr.toFixed(2)}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-muted-foreground">
                      ${campaign.cpc.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Time Series Chart Placeholder */}
      <div className="bg-card rounded-lg border border-border p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Performance Over Time
        </h2>
        <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
          Chart visualization coming soon (integrate Chart.js or Recharts)
          <br />
          <span className="text-xs mt-2">
            Data available: {data.time_series.length} data points
          </span>
        </div>
      </div>
    </div>
  )
}

interface MetricCardProps {
  title: string
  value: string
  icon: React.ReactNode
  trend?: 'up' | 'down' | null
  trendLabel?: string
}

function MetricCard({ title, value, icon, trend, trendLabel }: MetricCardProps) {
  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm text-muted-foreground">{title}</div>
        <div className="text-muted-foreground/70">{icon}</div>
      </div>
      <div className="text-2xl font-bold text-foreground">{value}</div>
      {trendLabel && (
        <div className="mt-2 flex items-center gap-1 text-xs">
          {trend === 'up' && <TrendingUp className="h-3 w-3 text-success" />}
          {trend === 'down' && <TrendingDown className="h-3 w-3 text-destructive" />}
          <span
            className={
              trend === 'up'
                ? 'text-success'
                : trend === 'down'
                  ? 'text-destructive'
                  : 'text-muted-foreground'
            }
          >
            {trendLabel}
          </span>
        </div>
      )}
    </div>
  )
}

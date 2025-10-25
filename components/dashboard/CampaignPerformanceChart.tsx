'use client'

import { useMemo } from 'react'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { TrendingUp } from 'lucide-react'

interface PerformanceDataPoint {
  date: string
  impressions: number
  clicks: number
  ctr: number
}

interface CampaignPerformanceChartProps {
  timeRange: '7d' | '30d' | '90d'
}

/**
 * Generates mock performance data based on time range
 * In production, this would fetch real data from the API
 */
function generateMockData(timeRange: '7d' | '30d' | '90d'): PerformanceDataPoint[] {
  const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90
  const data: PerformanceDataPoint[] = []

  const now = new Date()
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)

    const impressions = Math.floor(Math.random() * 500) + 200
    const clicks = Math.floor(Math.random() * 50) + 10
    const ctr = parseFloat(((clicks / impressions) * 100).toFixed(2))

    data.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      impressions,
      clicks,
      ctr,
    })
  }

  return data
}

export default function CampaignPerformanceChart({ timeRange }: CampaignPerformanceChartProps) {
  const data = useMemo(() => generateMockData(timeRange), [timeRange])

  // Calculate summary stats
  const totalImpressions = data.reduce((sum, d) => sum + d.impressions, 0)
  const totalClicks = data.reduce((sum, d) => sum + d.clicks, 0)
  const avgCTR = totalClicks > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : '0.00'

  // Determine data sampling for display (show every nth point for 90d to avoid clutter)
  const sampledData = useMemo(() => {
    if (timeRange === '90d') {
      return data.filter((_, index) => index % 3 === 0) // Show every 3rd day
    }
    if (timeRange === '30d') {
      return data.filter((_, index) => index % 2 === 0) // Show every 2nd day
    }
    return data // Show all days for 7d
  }, [data, timeRange])

  return (
    <div className="bg-card rounded-lg shadow-sm border border-border p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Performance Overview</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Campaign metrics over the last{' '}
            {timeRange === '7d' ? '7 days' : timeRange === '30d' ? '30 days' : '90 days'}
          </p>
        </div>
        <TrendingUp className="h-5 w-5 text-success" />
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-muted/50 rounded-lg p-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Impressions</p>
          <p className="text-xl font-bold text-foreground mt-1">
            {totalImpressions.toLocaleString()}
          </p>
        </div>
        <div className="bg-muted/50 rounded-lg p-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Clicks</p>
          <p className="text-xl font-bold text-foreground mt-1">{totalClicks.toLocaleString()}</p>
        </div>
        <div className="bg-muted/50 rounded-lg p-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Avg CTR</p>
          <p className="text-xl font-bold text-foreground mt-1">{avgCTR}%</p>
        </div>
      </div>

      {/* Dual Chart: Impressions & Clicks */}
      <div className="mb-6">
        <p className="text-sm font-medium text-foreground mb-3">Impressions & Clicks</p>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={sampledData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorImpressions" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis
              dataKey="date"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
            />
            <YAxis
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                color: 'hsl(var(--foreground))',
              }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
            />
            <Legend wrapperStyle={{ fontSize: '12px', color: 'hsl(var(--muted-foreground))' }} />
            <Area
              type="monotone"
              dataKey="impressions"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorImpressions)"
              name="Impressions"
            />
            <Area
              type="monotone"
              dataKey="clicks"
              stroke="hsl(var(--success))"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorClicks)"
              name="Clicks"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* CTR Trend Line */}
      <div>
        <p className="text-sm font-medium text-foreground mb-3">Click-Through Rate (%)</p>
        <ResponsiveContainer width="100%" height={150}>
          <LineChart data={sampledData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis
              dataKey="date"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
            />
            <YAxis
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              domain={[0, 'auto']}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                color: 'hsl(var(--foreground))',
              }}
              formatter={(value: number) => [`${value}%`, 'CTR']}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
            />
            <Line
              type="monotone"
              dataKey="ctr"
              stroke="hsl(var(--accent))"
              strokeWidth={2}
              dot={{ fill: 'hsl(var(--accent))', r: 3 }}
              activeDot={{ r: 5 }}
              name="CTR"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Footer Note */}
      <div className="mt-4 pt-4 border-t border-border">
        <p className="text-xs text-muted-foreground text-center">
          💡 Performance data updates every 24 hours. For real-time analytics, visit the{' '}
          <a href="/dashboard/advertiser/performance" className="text-primary hover:underline">
            detailed performance dashboard
          </a>
          .
        </p>
      </div>
    </div>
  )
}

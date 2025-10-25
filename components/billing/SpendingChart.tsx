'use client'

import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { TrendingUp, TrendingDown, Minus, DollarSign, Loader2, Calendar } from 'lucide-react'
import { SpendingAnalytics, getLastNMonths, formatMonthLabel } from '@/lib/billing/analytics'
import { ZoomableChart } from '@/components/ui/ZoomableChart'

export default function SpendingChart() {
  const [analytics, setAnalytics] = useState<SpendingAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const response = await fetch('/api/billing/analytics')
        if (!response.ok) {
          throw new Error('Failed to fetch spending analytics')
        }
        const data = await response.json()
        setAnalytics(data)
      } catch (err) {
        console.error('Error fetching spending analytics:', err)
        setError(err instanceof Error ? err.message : 'Failed to load analytics')
      } finally {
        setLoading(false)
      }
    }

    fetchAnalytics()
  }, [])

  if (loading) {
    return (
      <div className="bg-card rounded-lg border border-border shadow-sm p-8">
        <div className="flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-3 text-muted-foreground">Loading spending analytics...</span>
        </div>
      </div>
    )
  }

  if (error || !analytics) {
    return null // Gracefully hide if no data
  }

  const chartData = getLastNMonths(analytics.monthlyBreakdown, 6).map((item) => ({
    month: formatMonthLabel(item.month),
    amount: item.amount,
  }))

  const getTrendIcon = () => {
    switch (analytics.spendTrend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
      default:
        return <Minus className="h-4 w-4 text-gray-600 dark:text-gray-400" />
    }
  }

  const getTrendText = () => {
    const change =
      ((analytics.currentMonthSpend - analytics.previousMonthSpend) /
        analytics.previousMonthSpend) *
      100
    if (isNaN(change) || !isFinite(change)) return 'vs. last month'

    const formatted = Math.abs(change).toFixed(1)
    if (analytics.spendTrend === 'up') return `↑ ${formatted}% vs. last month`
    if (analytics.spendTrend === 'down') return `↓ ${formatted}% vs. last month`
    return 'vs. last month'
  }

  return (
    <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
      {/* Header with Key Metrics */}
      <div className="px-6 py-4 border-b border-border bg-muted/30">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Spending Analytics
          </h3>
        </div>

        {/* Mini Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Spent</p>
            <p className="text-xl font-bold text-foreground mt-1">
              $
              {analytics.totalSpent.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Avg / Month</p>
            <p className="text-xl font-bold text-foreground mt-1">
              $
              {analytics.avgMonthlySpend.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">This Month</p>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-xl font-bold text-foreground">
                $
                {analytics.currentMonthSpend.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
              {getTrendIcon()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{getTrendText()}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Last Invoice
            </p>
            <p className="text-sm font-medium text-foreground mt-1">
              {analytics.lastInvoiceDate
                ? analytics.lastInvoiceDate.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : 'N/A'}
            </p>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="p-6">
        {chartData.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="font-medium">No spending data yet</p>
            <p className="text-sm mt-1">
              Your spending history will appear here once you make purchases
            </p>
          </div>
        ) : (
          <>
            <div className="mb-3">
              <p className="text-sm font-medium text-foreground">Monthly Spending Trend</p>
              <p className="text-xs text-muted-foreground">Last 6 months · Use zoom controls to explore</p>
            </div>
            <ZoomableChart>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis
                    dataKey="month"
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                  />
                  <YAxis
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                    tickFormatter={(value) => `$${value.toLocaleString()}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    color: 'hsl(var(--foreground))',
                  }}
                  formatter={(value: number) => [
                    `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                    'Spent',
                  ]}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                />
                  <Bar
                    dataKey="amount"
                    fill="hsl(var(--primary))"
                    radius={[8, 8, 0, 0]}
                    maxBarSize={60}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ZoomableChart>
          </>
        )}
      </div>
    </div>
  )
}

'use client'

import React, { useState } from 'react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import type { OutcomePattern, TemporalTrend } from '@/lib/analytics/case-statistics'

interface JurisdictionAnalyticsChartsProps {
  outcomePatterns: OutcomePattern[]
  temporalTrends: TemporalTrend[]
  caseTypes: Array<{ case_type: string; count: number; avg_duration_days: number }>
}

const OUTCOME_COLORS: Record<string, string> = {
  settled: 'hsl(var(--success))',
  dismissed: 'hsl(var(--muted))',
  decided: 'hsl(var(--primary))',
  pending: 'hsl(var(--warning))',
}

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--success))',
  'hsl(var(--warning))',
  'hsl(var(--destructive))',
  '#8884d8',
  '#82ca9d',
  '#ffc658',
  '#ff8042',
]

export function JurisdictionAnalyticsCharts({
  outcomePatterns,
  temporalTrends,
  caseTypes,
}: JurisdictionAnalyticsChartsProps) {
  const [temporalMetric, setTemporalMetric] = useState<'case_count' | 'settlement_rate'>(
    'case_count'
  )

  // Prepare outcome data for pie chart
  const outcomeData = outcomePatterns.map((op) => ({
    name: op.outcome.charAt(0).toUpperCase() + op.outcome.slice(1),
    value: op.count,
    percentage: op.percentage,
    avgDuration: op.avg_duration_days,
  }))

  const outcomeColors = outcomeData.map((item) => {
    const key = item.name.toLowerCase()
    return OUTCOME_COLORS[key] || 'hsl(var(--muted))'
  })

  // Prepare temporal data
  const temporalData = temporalTrends.map((trend) => ({
    month: `${trend.year}-${String(trend.month).padStart(2, '0')}`,
    displayMonth: new Date(trend.year, trend.month - 1).toLocaleDateString('en-US', {
      month: 'short',
      year: '2-digit',
    }),
    case_count: trend.case_count,
    settlement_rate: trend.settlement_rate,
    avg_duration_days: trend.avg_duration_days,
  }))

  // Prepare case types data (top 10)
  const caseTypesData = caseTypes.slice(0, 10).map((ct) => ({
    name: ct.case_type.length > 20 ? ct.case_type.substring(0, 20) + '...' : ct.case_type,
    fullName: ct.case_type,
    cases: ct.count,
    avgDays: ct.avg_duration_days,
  }))

  return (
    <div className="space-y-12">
      {/* Outcome Patterns Chart */}
      {outcomeData.length > 0 && (
        <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
          <h2 className="text-2xl font-semibold text-foreground mb-6">Case Outcome Breakdown</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={outcomeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }) => `${name}: ${(percentage as number).toFixed(1)}%`}
                  outerRadius={100}
                  fill="hsl(var(--primary))"
                  dataKey="value"
                >
                  {outcomeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={outcomeColors[index]} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload
                      return (
                        <div className="bg-card border border-border rounded-lg p-4 shadow-lg">
                          <p className="font-semibold text-foreground mb-2">{data.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Cases:{' '}
                            <span className="font-medium text-foreground">
                              {data.value.toLocaleString()}
                            </span>
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Percentage:{' '}
                            <span className="font-medium text-foreground">
                              {data.percentage.toFixed(1)}%
                            </span>
                          </p>
                          {data.avgDuration > 0 && (
                            <p className="text-sm text-muted-foreground">
                              Avg. Duration:{' '}
                              <span className="font-medium text-foreground">
                                {data.avgDuration} days
                              </span>
                            </p>
                          )}
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Temporal Trends Chart */}
      {temporalData.length > 0 && (
        <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-foreground">Case Trends Over Time</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setTemporalMetric('case_count')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  temporalMetric === 'case_count'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                Case Volume
              </button>
              <button
                onClick={() => setTemporalMetric('settlement_rate')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  temporalMetric === 'settlement_rate'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                Settlement Rate
              </button>
            </div>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={temporalData} margin={{ top: 5, right: 30, left: 20, bottom: 50 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="displayMonth"
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  label={{
                    value:
                      temporalMetric === 'case_count' ? 'Number of Cases' : 'Settlement Rate (%)',
                    angle: -90,
                    position: 'insideLeft',
                    style: { fill: 'hsl(var(--muted-foreground))' },
                  }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    color: 'hsl(var(--foreground))',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey={temporalMetric}
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--primary))', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Case Types Chart */}
      {caseTypesData.length > 0 && (
        <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
          <h2 className="text-2xl font-semibold text-foreground mb-6">Top Case Types</h2>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={caseTypesData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="name"
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  label={{
                    value: 'Number of Cases',
                    angle: -90,
                    position: 'insideLeft',
                    style: { fill: 'hsl(var(--muted-foreground))' },
                  }}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload
                      return (
                        <div className="bg-card border border-border rounded-lg p-4 shadow-lg">
                          <p className="font-semibold text-foreground mb-2">{data.fullName}</p>
                          <p className="text-sm text-muted-foreground">
                            Cases:{' '}
                            <span className="font-medium text-foreground">
                              {data.cases.toLocaleString()}
                            </span>
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Avg. Duration:{' '}
                            <span className="font-medium text-foreground">{data.avgDays} days</span>
                          </p>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Bar dataKey="cases" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Case Duration by Type */}
      {caseTypesData.length > 0 && (
        <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
          <h2 className="text-2xl font-semibold text-foreground mb-6">
            Average Decision Time by Case Type
          </h2>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={caseTypesData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="name"
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  label={{
                    value: 'Days',
                    angle: -90,
                    position: 'insideLeft',
                    style: { fill: 'hsl(var(--muted-foreground))' },
                  }}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload
                      return (
                        <div className="bg-card border border-border rounded-lg p-4 shadow-lg">
                          <p className="font-semibold text-foreground mb-2">{data.fullName}</p>
                          <p className="text-sm text-muted-foreground">
                            Avg. Duration:{' '}
                            <span className="font-medium text-foreground">{data.avgDays} days</span>
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Total Cases:{' '}
                            <span className="font-medium text-foreground">
                              {data.cases.toLocaleString()}
                            </span>
                          </p>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Bar dataKey="avgDays" fill="hsl(var(--success))" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}

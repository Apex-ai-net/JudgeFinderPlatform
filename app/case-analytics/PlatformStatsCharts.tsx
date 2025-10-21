'use client'

import React from 'react'
import {
  BarChart,
  Bar,
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
import type { CaseStatistics } from '@/lib/analytics/case-statistics'

interface PlatformStatsChartsProps {
  platformStats: CaseStatistics
}

const OUTCOME_COLORS = {
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
  'hsl(var(--muted))',
  '#8884d8',
  '#82ca9d',
  '#ffc658',
  '#ff8042',
  '#a4de6c',
]

export function PlatformStatsCharts({ platformStats }: PlatformStatsChartsProps) {
  // Prepare outcome distribution data for pie chart
  const outcomeData = [
    { name: 'Settled', value: platformStats.outcome_distribution.settled },
    { name: 'Dismissed', value: platformStats.outcome_distribution.dismissed },
    { name: 'Decided', value: platformStats.outcome_distribution.decided },
    { name: 'Pending', value: platformStats.outcome_distribution.pending },
  ].filter((item) => item.value > 0)

  const outcomeColors = outcomeData.map((item) => {
    const key = item.name.toLowerCase() as keyof typeof OUTCOME_COLORS
    return OUTCOME_COLORS[key] || 'hsl(var(--muted))'
  })

  // Prepare case types data for bar chart
  const caseTypesData = platformStats.case_types.map((ct) => ({
    name: ct.case_type.length > 20 ? ct.case_type.substring(0, 20) + '...' : ct.case_type,
    fullName: ct.case_type,
    cases: ct.count,
    avgDays: ct.avg_duration_days,
  }))

  return (
    <div className="space-y-12">
      {/* Outcome Distribution Chart */}
      <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
        <h3 className="text-xl font-semibold text-foreground mb-6">Case Outcome Distribution</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={outcomeData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${((percent as number) * 100).toFixed(1)}%`}
                outerRadius={100}
                fill="hsl(var(--primary))"
                dataKey="value"
              >
                {outcomeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={outcomeColors[index]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  color: 'hsl(var(--foreground))',
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          {outcomeData.map((item, index) => (
            <div key={item.name} className="text-center">
              <div
                className="w-4 h-4 rounded-full mx-auto mb-2"
                style={{ backgroundColor: outcomeColors[index] }}
              />
              <p className="text-sm font-medium text-foreground">{item.value.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">{item.name}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Case Types Chart */}
      {caseTypesData.length > 0 && (
        <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
          <h3 className="text-xl font-semibold text-foreground mb-6">Top Case Types by Volume</h3>
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

      {/* Case Duration by Type Chart */}
      {caseTypesData.length > 0 && (
        <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
          <h3 className="text-xl font-semibold text-foreground mb-6">
            Average Decision Time by Case Type
          </h3>
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

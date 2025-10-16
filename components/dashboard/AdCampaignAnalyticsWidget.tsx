'use client'

import { useState } from 'react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { ProgressRing } from '@/components/charts/ProgressRing'

interface PerformanceMetric {
  date: string
  impressions: number
  clicks: number
  ctr: number
  spend: number
}

interface AdCampaignAnalyticsWidgetProps {
  campaigns: any[]
  recentMetrics: PerformanceMetric[]
  totalMetrics: {
    impressions: number
    clicks: number
    spend: number
    avgCTR: number
  }
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

export default function AdCampaignAnalyticsWidget({
  campaigns = [],
  recentMetrics = [],
  totalMetrics,
}: AdCampaignAnalyticsWidgetProps) {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d')
  const [selectedMetric, setSelectedMetric] = useState<'impressions' | 'clicks'>('impressions')

  if (campaigns.length === 0 || !recentMetrics || recentMetrics.length === 0) {
    return (
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-8">
        <div className="text-center">
          <div className="text-4xl mb-3">📊</div>
          <h3 className="font-semibold text-blue-900 text-lg">No Campaign Data</h3>
          <p className="text-sm text-blue-700 mt-2">
            Create your first ad campaign to see performance analytics
          </p>
        </div>
      </div>
    )
  }

  // Calculate ROI
  const totalRevenue = campaigns.reduce((sum, c) => sum + (c.conversions || 0) * 100, 0)
  const roi =
    totalMetrics.spend > 0 ? ((totalRevenue - totalMetrics.spend) / totalMetrics.spend) * 100 : 0
  const costPerClick =
    totalMetrics.clicks > 0 ? (totalMetrics.spend / totalMetrics.clicks).toFixed(2) : '0.00'
  const costPerMille =
    totalMetrics.impressions > 0
      ? ((totalMetrics.spend / totalMetrics.impressions) * 1000).toFixed(2)
      : '0.00'

  // Campaign status breakdown
  const campaignStatusData = [
    {
      name: 'Active',
      value: campaigns.filter((c) => c.status === 'active').length,
      color: '#10b981',
    },
    {
      name: 'Paused',
      value: campaigns.filter((c) => c.status === 'paused').length,
      color: '#f59e0b',
    },
    {
      name: 'Draft',
      value: campaigns.filter((c) => c.status === 'draft').length,
      color: '#6b7280',
    },
  ].filter((item) => item.value > 0)

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase">Cost Per Click</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">${costPerClick}</p>
          <p className="text-xs text-gray-500 mt-2">Last 30 days</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase">Cost Per 1k Impressions</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">${costPerMille}</p>
          <p className="text-xs text-gray-500 mt-2">CPM (Cost per Mille)</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase">Average CTR</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">
            {(totalMetrics.avgCTR * 100).toFixed(2)}%
          </p>
          <p className="text-xs text-gray-500 mt-2">Click-through rate</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase">Estimated ROI</p>
          <p className={`text-2xl font-bold mt-2 ${roi >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {roi >= 0 ? '+' : ''}
            {roi.toFixed(0)}%
          </p>
          <p className="text-xs text-gray-500 mt-2">Return on investment</p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Impressions vs Clicks Trend */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Performance Trend</h3>
            <div className="flex gap-2">
              {(['7d', '30d', '90d'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
                    timeRange === range
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={recentMetrics.slice(-30)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  stroke="#9ca3af"
                  tickLine={{ stroke: '#e5e7eb' }}
                />
                <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" tickLine={{ stroke: '#e5e7eb' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                  formatter={(value: any) => value.toLocaleString()}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="impressions"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                  name="Impressions"
                />
                <Line
                  type="monotone"
                  dataKey="clicks"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={false}
                  name="Clicks"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CTR Trend */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Click-Through Rate Trend</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={recentMetrics.slice(-14)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  stroke="#9ca3af"
                  tickLine={{ stroke: '#e5e7eb' }}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  stroke="#9ca3af"
                  tickLine={{ stroke: '#e5e7eb' }}
                  label={{ value: 'CTR (%)', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                  formatter={(value: any) => `${(value * 100).toFixed(2)}%`}
                />
                <Bar dataKey="ctr" fill="#f59e0b" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Spend Distribution */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Campaign Status</h3>
          <div className="h-64 flex items-center justify-center">
            {campaignStatusData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={campaignStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {campaignStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => `${value} campaigns`} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-500">No campaign data</p>
            )}
          </div>
          <div className="mt-4 space-y-2">
            {campaignStatusData.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  ></div>
                  <span className="text-gray-700">{item.name}</span>
                </div>
                <span className="font-semibold text-gray-900">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Budget Utilization */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-6">Campaign Budgets</h3>
          <div className="space-y-4">
            {campaigns.slice(0, 4).map((campaign) => {
              const spent = campaign.budget_spent || 0
              const total = campaign.budget_total || 1
              const percent = (spent / total) * 100
              return (
                <div key={campaign.id}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-900 truncate">{campaign.name}</p>
                    <p className="text-sm text-gray-600">
                      ${spent.toFixed(0)} / ${total.toFixed(0)}
                    </p>
                  </div>
                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 transition-all duration-500"
                      style={{ width: `${Math.min(percent, 100)}%` }}
                    ></div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

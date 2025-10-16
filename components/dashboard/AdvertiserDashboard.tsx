'use client'

import Link from 'next/link'
import { UserRoleInfo } from '@/lib/auth/user-roles'
import AdCampaignAnalyticsWidget from './AdCampaignAnalyticsWidget'

interface AdvertiserDashboardProps {
  user: any
  roleInfo: UserRoleInfo
  dashboardData: any
  stats: any
}

export default function AdvertiserDashboard({
  user,
  roleInfo,
  dashboardData,
  stats,
}: AdvertiserDashboardProps) {
  const { campaigns = [], activeBookings = [], recentMetrics = [] } = dashboardData || {}

  // Calculate total metrics
  const totalImpressions = recentMetrics.reduce(
    (sum: number, m: any) => sum + (m.impressions || 0),
    0
  )
  const totalClicks = recentMetrics.reduce((sum: number, m: any) => sum + (m.clicks || 0), 0)
  const totalSpend = recentMetrics.reduce((sum: number, m: any) => sum + (m.spend || 0), 0)
  const avgCTR =
    recentMetrics.length > 0
      ? (
          recentMetrics.reduce((sum: number, m: any) => sum + (m.ctr || 0), 0) /
          recentMetrics.length
        ).toFixed(2)
      : '0.00'

  const activeCampaigns = campaigns.filter((c: any) => c.status === 'active').length
  const budgetUtilization =
    campaigns.length > 0
      ? (
          (campaigns.reduce((sum: any, c: any) => sum + (c.budget_spent || 0), 0) /
            campaigns.reduce((sum: any, c: any) => sum + (c.budget_total || 0), 0)) *
          100
        ).toFixed(1)
      : '0'

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900">Advertising Dashboard</h1>
              <p className="mt-2 text-gray-600">
                Welcome back,{' '}
                {roleInfo.advertiserProfile?.firm_name || user?.full_name || user?.email || 'User'}
              </p>
            </div>
            <div className="hidden sm:block text-right">
              <p className="text-sm text-gray-500">Legal Advertiser</p>
              <div className="mt-2 flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <p className="text-xs text-green-600 font-medium">
                  {roleInfo.advertiserProfile?.account_status === 'active'
                    ? 'Account Active'
                    : 'Account Pending'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Performance Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Impressions */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Total Impressions
                </p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {totalImpressions.toLocaleString()}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
                </svg>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-3">Ads viewed in last 30 days</p>
          </div>

          {/* Total Clicks */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Total Clicks
                </p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {totalClicks.toLocaleString()}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14l-5-2.18L7 17V9h10v8z" />
                </svg>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-3">Qualified legal professionals</p>
          </div>

          {/* Click-Through Rate */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Avg CTR
                </p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{avgCTR}%</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2V17zm4 0h-2V7h2V17zm4 0h-2v-4h2V17z" />
                </svg>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-3">Click-through rate</p>
          </div>

          {/* Total Spend */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Total Spend
                </p>
                <p className="text-3xl font-bold text-gray-900 mt-2">${totalSpend.toFixed(2)}</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-orange-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
                </svg>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-3">Last 30 days</p>
          </div>
        </div>

        {/* Campaigns & Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Quick Actions */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
              <div className="space-y-3">
                <Link
                  href="/dashboard/advertiser"
                  className="block w-full px-4 py-3 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-all text-center"
                >
                  📢 Create Campaign
                </Link>
                <Link
                  href="/dashboard/advertiser/ad-spots"
                  className="block w-full px-4 py-3 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-all"
                >
                  🎯 Browse Ad Spots
                </Link>
                <Link
                  href="/dashboard/billing"
                  className="block w-full px-4 py-3 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-all"
                >
                  💳 Billing & Invoices
                </Link>
                <Link
                  href="/dashboard/settings"
                  className="block w-full px-4 py-3 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-all"
                >
                  ⚙️ Account Settings
                </Link>
              </div>
            </div>
          </div>

          {/* Active Campaigns Summary */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Active Campaigns</h2>
                <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 text-sm font-semibold rounded-full">
                  {activeCampaigns}
                </span>
              </div>

              {campaigns.length > 0 ? (
                <div className="space-y-4">
                  {campaigns.slice(0, 3).map((campaign: any) => (
                    <div
                      key={campaign.id}
                      className="border border-gray-100 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{campaign.name}</p>
                          <p className="text-sm text-gray-500 mt-1">
                            Status:{' '}
                            <span className="font-medium capitalize">{campaign.status}</span>
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-gray-900">
                            ${campaign.budget_spent?.toFixed(2) || '0.00'} / $
                            {campaign.budget_total?.toFixed(2) || '0.00'}
                          </p>
                          <div className="mt-2 w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-600"
                              style={{
                                width: `${
                                  ((campaign.budget_spent || 0) / (campaign.budget_total || 1)) *
                                  100
                                }%`,
                              }}
                            ></div>
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between text-xs">
                        <div>
                          <span className="text-gray-500">Impressions:</span>{' '}
                          <span className="font-medium">
                            {campaign.impressions_total?.toLocaleString() || 0}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Clicks:</span>{' '}
                          <span className="font-medium">
                            {campaign.clicks_total?.toLocaleString() || 0}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <svg
                    className="w-12 h-12 text-gray-300 mx-auto mb-3"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                  </svg>
                  <p className="text-sm text-gray-500">No campaigns yet</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Start by creating your first campaign
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Ad Campaign Analytics Widget */}
        <div className="mb-8">
          <AdCampaignAnalyticsWidget
            campaigns={campaigns}
            recentMetrics={recentMetrics}
            totalMetrics={{
              impressions: totalImpressions,
              clicks: totalClicks,
              spend: totalSpend,
              avgCTR: parseFloat(avgCTR),
            }}
          />
        </div>

        {/* Insight Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border border-blue-200 p-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-blue-900">Active Bookings</h3>
                <p className="text-sm text-blue-700 mt-2">
                  {activeBookings.length} active advertising placement
                  {activeBookings.length !== 1 ? 's' : ''}
                </p>
              </div>
              <span className="text-2xl">🎯</span>
            </div>
            <div className="mt-4">
              <p className="text-xs text-blue-600 font-medium">
                Combined reach: High-value legal professionals
              </p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200 p-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-green-900">Budget Status</h3>
                <p className="text-sm text-green-700 mt-2">
                  {budgetUtilization}% of total budget used
                </p>
              </div>
              <span className="text-2xl">💰</span>
            </div>
            <div className="mt-4">
              <p className="text-xs text-green-600 font-medium">
                Optimize spending for maximum ROI
              </p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-200 p-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-purple-900">Verification Status</h3>
                <p className="text-sm text-purple-700 mt-2">
                  {roleInfo.advertiserProfile?.verification_status === 'verified' ? (
                    <span className="text-green-600 font-medium">✓ Verified</span>
                  ) : (
                    <span className="text-orange-600 font-medium">Pending Review</span>
                  )}
                </p>
              </div>
              <span className="text-2xl">✨</span>
            </div>
            <div className="mt-4">
              <p className="text-xs text-purple-600 font-medium">
                Bar number verification complete
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

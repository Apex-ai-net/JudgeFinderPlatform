'use client'

import Link from 'next/link'
import { UserRoleInfo } from '@/lib/auth/user-roles'
import { DashboardJudgeAnalytics } from '@/lib/analytics/judge-dashboard-analytics'
import JudgeAnalyticsWidget from './JudgeAnalyticsWidget'

interface LegalProfessionalDashboardProps {
  user: any
  roleInfo: UserRoleInfo
  dashboardData: any
  stats: any
  judgeAnalytics?: DashboardJudgeAnalytics | null | undefined
}

export default function LegalProfessionalDashboard({
  user,
  roleInfo,
  dashboardData,
  stats,
  judgeAnalytics,
}: LegalProfessionalDashboardProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900">Dashboard</h1>
              <p className="mt-2 text-gray-600">
                Welcome back, {user?.full_name || user?.email || 'User'}
              </p>
            </div>
            <div className="hidden sm:block text-right">
              <p className="text-sm text-gray-500">Legal Professional</p>
              <p className="text-xs text-gray-400">Judicial Research Platform</p>
            </div>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {/* Bookmarked Judges */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Bookmarked Judges
                </p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.bookmarksCount}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14l-5-2.18L7 17V9h10v8z" />
                </svg>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-3">Judges you&apos;re actively tracking</p>
          </div>

          {/* Saved Searches */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Saved Searches
                </p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.savedSearchesCount}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
                </svg>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-3">Saved judicial research queries</p>
          </div>

          {/* Recent Activities */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Recent Activities
                </p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {stats.recentActivity.length}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42A8.954 8.954 0 0 0 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z" />
                </svg>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-3">Latest searches and views</p>
          </div>

          {/* Quick Stats Placeholder */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-sm border border-blue-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
                  Practice Area
                </p>
                <p className="text-sm text-gray-600 mt-2 font-medium">Customize Your Research</p>
              </div>
              <div className="w-12 h-12 bg-blue-200 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-700" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Quick Actions - Left Column */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
              <div className="space-y-3">
                <Link
                  href="/judges"
                  className="block w-full px-4 py-3 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-all hover:border-gray-400"
                >
                  🔍 Search Judges
                </Link>
                <Link
                  href="/dashboard/bookmarks"
                  className="block w-full px-4 py-3 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-all hover:border-gray-400"
                >
                  📑 My Bookmarks
                </Link>
                <Link
                  href="/dashboard/searches"
                  className="block w-full px-4 py-3 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-all hover:border-gray-400"
                >
                  💾 Saved Searches
                </Link>
                <Link
                  href="/dashboard/compare"
                  className="block w-full px-4 py-3 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-all hover:border-gray-400"
                >
                  ⚖️ Compare Judges
                </Link>
                <Link
                  href="/dashboard/activity"
                  className="block w-full px-4 py-3 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-all hover:border-gray-400"
                >
                  📊 Activity History
                </Link>
                <Link
                  href="/dashboard/practice-areas"
                  className="block w-full px-4 py-3 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-all hover:border-gray-400"
                >
                  ⚖️ Practice Areas
                </Link>
                <Link
                  href="/analytics"
                  className="block w-full px-4 py-3 border border-blue-300 rounded-lg text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 transition-all"
                >
                  📈 Platform Analytics
                </Link>
                <Link
                  href="/dashboard/billing"
                  className="block w-full px-4 py-3 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-all hover:border-gray-400"
                >
                  💳 Billing & Purchases
                </Link>
                <Link
                  href="/settings"
                  className="block w-full px-4 py-3 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-all hover:border-gray-400"
                >
                  ⚙️ Settings
                </Link>
              </div>
            </div>
          </div>

          {/* Recent Activity - Right Columns */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
              {stats.recentActivity.length > 0 ? (
                <div className="space-y-4">
                  {stats.recentActivity.map((activity: any) => (
                    <div
                      key={activity.id}
                      className="flex items-start space-x-3 pb-4 border-b border-gray-100 last:border-0 last:pb-0"
                    >
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          {activity.activity_type === 'search' && (
                            <svg
                              className="w-5 h-5 text-blue-600"
                              fill="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
                            </svg>
                          )}
                          {activity.activity_type === 'bookmark' && (
                            <svg
                              className="w-5 h-5 text-green-600"
                              fill="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z" />
                            </svg>
                          )}
                          {activity.activity_type === 'view' && (
                            <svg
                              className="w-5 h-5 text-purple-600"
                              fill="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
                            </svg>
                          )}
                          {activity.activity_type === 'compare' && (
                            <svg
                              className="w-5 h-5 text-orange-600"
                              fill="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path d="M9 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h4c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h4v14zm10-7h4v2h-4zm0 7h4v2h-4zm0-14h4v2h-4z" />
                            </svg>
                          )}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          {activity.activity_type === 'search' && 'Searched for judges'}
                          {activity.activity_type === 'view' && 'Viewed judge profile'}
                          {activity.activity_type === 'bookmark' && 'Bookmarked a judge'}
                          {activity.activity_type === 'compare' && 'Compared judges'}
                        </p>
                        {activity.search_query && (
                          <p className="text-sm text-gray-500 mt-1 truncate">
                            <span className="font-medium">Query:</span> {activity.search_query}
                          </p>
                        )}
                        <p className="text-xs text-gray-400 mt-2">
                          {new Date(activity.created_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
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
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                  </svg>
                  <p className="text-sm text-gray-500">No recent activity to display</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Judge Analytics Widget */}
        <div className="mb-8">
          <JudgeAnalyticsWidget analytics={judgeAnalytics} />
        </div>

        {/* Suggested Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200 p-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-green-900">Judge Analytics</h3>
                <p className="text-sm text-green-700 mt-2">
                  Explore bias patterns and case outcomes for judges
                </p>
              </div>
              <span className="text-2xl">📊</span>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border border-blue-200 p-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-blue-900">Practice Areas</h3>
                <p className="text-sm text-blue-700 mt-2">
                  Filter judges and courts by your practice area specialization
                </p>
              </div>
              <span className="text-2xl">⚖️</span>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-200 p-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-purple-900">Case Insights</h3>
                <p className="text-sm text-purple-700 mt-2">
                  Track recent decisions and outcomes in your jurisdiction
                </p>
              </div>
              <span className="text-2xl">📋</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

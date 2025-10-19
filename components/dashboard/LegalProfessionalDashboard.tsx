'use client'

import Link from 'next/link'
import { UserRoleInfo } from '@/lib/auth/user-roles'
import { DashboardJudgeAnalytics } from '@/lib/analytics/judge-dashboard-analytics'
import JudgeAnalyticsWidget from './JudgeAnalyticsWidget'
import {
  Bookmark,
  Search,
  Clock,
  Smile,
  BarChart3,
  FileText,
  Scale,
  Activity,
  CreditCard,
  Settings,
  Eye,
  GitCompare,
} from 'lucide-react'

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
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-foreground tracking-tight">Dashboard</h1>
              <p className="mt-2 text-lg text-muted-foreground">
                Welcome back,{' '}
                <span className="font-medium text-foreground">
                  {user?.full_name || user?.email || 'User'}
                </span>
              </p>
            </div>
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium text-muted-foreground">Legal Professional</p>
              <p className="text-xs text-muted-foreground/60 tracking-wide">
                Judicial Research Platform
              </p>
            </div>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {/* Bookmarked Judges */}
          <div className="bg-card rounded-xl border border-border reshade-depth group p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Bookmarked Judges
                </p>
                <p className="text-3xl font-bold text-foreground mt-2 tabular-nums">
                  {stats.bookmarksCount}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-950/30 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110">
                <Bookmark className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Judges you&apos;re actively tracking
            </p>
          </div>

          {/* Saved Searches */}
          <div className="bg-card rounded-xl border border-border reshade-depth group p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Saved Searches
                </p>
                <p className="text-3xl font-bold text-foreground mt-2 tabular-nums">
                  {stats.savedSearchesCount}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 dark:bg-green-950/30 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110">
                <Search className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3">Saved judicial research queries</p>
          </div>

          {/* Recent Activities */}
          <div className="bg-card rounded-xl border border-border reshade-depth group p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Recent Activities
                </p>
                <p className="text-3xl font-bold text-foreground mt-2 tabular-nums">
                  {stats.recentActivity.length}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-950/30 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110">
                <Clock className="w-4 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3">Latest searches and views</p>
          </div>

          {/* Quick Stats Placeholder */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-xl border border-blue-200 dark:border-blue-800 reshade-depth group p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide">
                  Practice Area
                </p>
                <p className="text-sm text-muted-foreground mt-2 font-medium">
                  Customize Your Research
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-200 dark:bg-blue-900/50 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110">
                <Smile className="w-6 h-6 text-blue-700 dark:text-blue-300" />
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Quick Actions - Left Column */}
          <div className="lg:col-span-1">
            <div className="bg-card rounded-xl border border-border reshade-layer-1 p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h2>
              <div className="space-y-2">
                <Link
                  href="/judges"
                  className="group flex items-center gap-3 w-full px-4 py-3 border border-border rounded-lg text-sm font-medium text-foreground bg-card hover:bg-muted transition-all hover:border-primary/50"
                >
                  <Search className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  <span>Search Judges</span>
                </Link>
                <Link
                  href="/dashboard/bookmarks"
                  className="group flex items-center gap-3 w-full px-4 py-3 border border-border rounded-lg text-sm font-medium text-foreground bg-card hover:bg-muted transition-all hover:border-primary/50"
                >
                  <Bookmark className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  <span>My Bookmarks</span>
                </Link>
                <Link
                  href="/dashboard/searches"
                  className="group flex items-center gap-3 w-full px-4 py-3 border border-border rounded-lg text-sm font-medium text-foreground bg-card hover:bg-muted transition-all hover:border-primary/50"
                >
                  <FileText className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  <span>Saved Searches</span>
                </Link>
                <Link
                  href="/dashboard/compare"
                  className="group flex items-center gap-3 w-full px-4 py-3 border border-border rounded-lg text-sm font-medium text-foreground bg-card hover:bg-muted transition-all hover:border-primary/50"
                >
                  <GitCompare className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  <span>Compare Judges</span>
                </Link>
                <Link
                  href="/dashboard/activity"
                  className="group flex items-center gap-3 w-full px-4 py-3 border border-border rounded-lg text-sm font-medium text-foreground bg-card hover:bg-muted transition-all hover:border-primary/50"
                >
                  <Activity className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  <span>Activity History</span>
                </Link>
                <Link
                  href="/dashboard/practice-areas"
                  className="group flex items-center gap-3 w-full px-4 py-3 border border-border rounded-lg text-sm font-medium text-foreground bg-card hover:bg-muted transition-all hover:border-primary/50"
                >
                  <Scale className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  <span>Practice Areas</span>
                </Link>
                <Link
                  href="/analytics"
                  className="group flex items-center gap-3 w-full px-4 py-3 border border-blue-300 dark:border-blue-800 rounded-lg text-sm font-medium text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-950/50 transition-all"
                >
                  <BarChart3 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  <span>Platform Analytics</span>
                </Link>
                <Link
                  href="/dashboard/billing"
                  className="group flex items-center gap-3 w-full px-4 py-3 border border-border rounded-lg text-sm font-medium text-foreground bg-card hover:bg-muted transition-all hover:border-primary/50"
                >
                  <CreditCard className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  <span>Billing & Purchases</span>
                </Link>
                <Link
                  href="/settings"
                  className="group flex items-center gap-3 w-full px-4 py-3 border border-border rounded-lg text-sm font-medium text-foreground bg-card hover:bg-muted transition-all hover:border-primary/50"
                >
                  <Settings className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  <span>Settings</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Recent Activity - Right Columns */}
          <div className="lg:col-span-2">
            <div className="bg-card rounded-xl border border-border reshade-layer-1 p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">Recent Activity</h2>
              {stats.recentActivity.length > 0 ? (
                <div className="space-y-4">
                  {stats.recentActivity.map((activity: any) => (
                    <div
                      key={activity.id}
                      className="flex items-start space-x-3 pb-4 border-b border-border last:border-0 last:pb-0"
                    >
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-950/30 dark:to-blue-900/20 rounded-full flex items-center justify-center">
                          {activity.activity_type === 'search' && (
                            <Search className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          )}
                          {activity.activity_type === 'bookmark' && (
                            <Bookmark className="w-5 h-5 text-green-600 dark:text-green-400" />
                          )}
                          {activity.activity_type === 'view' && (
                            <Eye className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                          )}
                          {activity.activity_type === 'compare' && (
                            <GitCompare className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                          )}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          {activity.activity_type === 'search' && 'Searched for judges'}
                          {activity.activity_type === 'view' && 'Viewed judge profile'}
                          {activity.activity_type === 'bookmark' && 'Bookmarked a judge'}
                          {activity.activity_type === 'compare' && 'Compared judges'}
                        </p>
                        {activity.search_query && (
                          <p className="text-sm text-muted-foreground mt-1 truncate">
                            <span className="font-medium">Query:</span> {activity.search_query}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground/60 mt-2">
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
                    className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                  </svg>
                  <p className="text-sm text-muted-foreground">No recent activity to display</p>
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
          <Link
            href="/analytics"
            className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-xl border border-green-200 dark:border-green-800 reshade-hover group p-6"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-green-900 dark:text-green-100">
                  Judge Analytics
                </h3>
                <p className="text-sm text-green-700 dark:text-green-300 mt-2">
                  Explore bias patterns and case outcomes for judges
                </p>
              </div>
              <div className="w-10 h-10 bg-green-200/50 dark:bg-green-900/30 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                <BarChart3 className="w-5 h-5 text-green-700 dark:text-green-300" />
              </div>
            </div>
          </Link>

          <Link
            href="/dashboard/practice-areas"
            className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 rounded-xl border border-blue-200 dark:border-blue-800 reshade-hover group p-6"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-blue-900 dark:text-blue-100">Practice Areas</h3>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-2">
                  Filter judges and courts by your practice area specialization
                </p>
              </div>
              <div className="w-10 h-10 bg-blue-200/50 dark:bg-blue-900/30 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                <Scale className="w-5 h-5 text-blue-700 dark:text-blue-300" />
              </div>
            </div>
          </Link>

          <Link
            href="/judges"
            className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 rounded-xl border border-purple-200 dark:border-purple-800 reshade-hover group p-6"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-purple-900 dark:text-purple-100">
                  Case Insights
                </h3>
                <p className="text-sm text-purple-700 dark:text-purple-300 mt-2">
                  Track recent decisions and outcomes in your jurisdiction
                </p>
              </div>
              <div className="w-10 h-10 bg-purple-200/50 dark:bg-purple-900/30 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                <FileText className="w-5 h-5 text-purple-700 dark:text-purple-300" />
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}

'use client'

import Link from 'next/link'
import { UserRoleInfo } from '@/lib/auth/user-roles'
import { DashboardJudgeAnalytics } from '@/lib/analytics/judge-dashboard-analytics'
import JudgeAnalyticsWidget from './JudgeAnalyticsWidget'
import { AnimatedMetricCard } from './AnimatedMetricCard'
import { ActivityTimeline } from './ActivityTimeline'
import { PersonalizedGreeting } from './PersonalizedGreeting'
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
  GitCompare,
  ArrowRight,
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
        {/* Personalized Greeting */}
        <PersonalizedGreeting
          userName={user?.full_name || user?.email?.split('@')[0]}
          roleInfo={roleInfo}
        />

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <AnimatedMetricCard
            title="Bookmarked Judges"
            value={stats.bookmarksCount}
            description="Judges you're actively tracking"
            icon={Bookmark}
            iconColor="text-blue-600 dark:text-blue-400"
            iconBgColor="bg-blue-100 dark:bg-blue-950/30"
            trend={stats.bookmarksCount > 0 ? { value: 12, isPositive: true } : undefined}
          />
          <AnimatedMetricCard
            title="Saved Searches"
            value={stats.savedSearchesCount}
            description="Saved judicial research queries"
            icon={Search}
            iconColor="text-green-600 dark:text-green-400"
            iconBgColor="bg-green-100 dark:bg-green-950/30"
          />
          <AnimatedMetricCard
            title="Recent Activities"
            value={stats.recentActivity.length}
            description="Latest searches and views"
            icon={Clock}
            iconColor="text-purple-600 dark:text-purple-400"
            iconBgColor="bg-purple-100 dark:bg-purple-950/30"
          />
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
              <ActivityTimeline activities={stats.recentActivity} />
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
            className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-xl border border-green-200 dark:border-green-800 reshade-hover group p-6 transition-all hover:border-green-400 dark:hover:border-green-600 hover:shadow-lg"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className="font-semibold text-green-900 dark:text-green-100 group-hover:text-green-700 dark:group-hover:text-green-200 transition-colors">
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
            <div className="flex items-center gap-2 text-xs font-medium text-green-700 dark:text-green-300 group-hover:gap-3 transition-all">
              <span>Explore now</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          <Link
            href="/dashboard/practice-areas"
            className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 rounded-xl border border-blue-200 dark:border-blue-800 reshade-hover group p-6 transition-all hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-lg"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900 dark:text-blue-100 group-hover:text-blue-700 dark:group-hover:text-blue-200 transition-colors">
                  Practice Areas
                </h3>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-2">
                  Filter judges and courts by your practice area specialization
                </p>
              </div>
              <div className="w-10 h-10 bg-blue-200/50 dark:bg-blue-900/30 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                <Scale className="w-5 h-5 text-blue-700 dark:text-blue-300" />
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs font-medium text-blue-700 dark:text-blue-300 group-hover:gap-3 transition-all">
              <span>View areas</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          <Link
            href="/judges"
            className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 rounded-xl border border-purple-200 dark:border-purple-800 reshade-hover group p-6 transition-all hover:border-purple-400 dark:hover:border-purple-600 hover:shadow-lg"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className="font-semibold text-purple-900 dark:text-purple-100 group-hover:text-purple-700 dark:group-hover:text-purple-200 transition-colors">
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
            <div className="flex items-center gap-2 text-xs font-medium text-purple-700 dark:text-purple-300 group-hover:gap-3 transition-all">
              <span>View insights</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}

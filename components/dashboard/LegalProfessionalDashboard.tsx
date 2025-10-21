'use client'

import Link from 'next/link'
import { UserRoleInfo } from '@/lib/auth/user-roles'
import { DashboardJudgeAnalytics } from '@/lib/analytics/judge-dashboard-analytics'
import JudgeAnalyticsWidget from './JudgeAnalyticsWidget'
import { AnimatedMetricCard } from './AnimatedMetricCard'
import { ActivityTimeline } from './ActivityTimeline'
import { PersonalizedGreeting } from './PersonalizedGreeting'
import { SkipLink } from '@/components/ui/SkipLink'
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
    <>
      <SkipLink />
      <main id="main-content" role="main" className="min-h-screen bg-background">
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
              iconColor="text-primary"
              iconBgColor="bg-primary/10"
              trend={stats.bookmarksCount > 0 ? { value: 12, isPositive: true } : undefined}
            />
            <AnimatedMetricCard
              title="Saved Searches"
              value={stats.savedSearchesCount}
              description="Saved judicial research queries"
              icon={Search}
              iconColor="text-success"
              iconBgColor="bg-success/10"
            />
            <AnimatedMetricCard
              title="Recent Activities"
              value={stats.recentActivity.length}
              description="Latest searches and views"
              icon={Clock}
              iconColor="text-accent"
              iconBgColor="bg-accent/10"
            />
            <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl border border-primary/30 reshade-depth group p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-primary uppercase tracking-wide">
                    Practice Area
                  </p>
                  <p className="text-sm text-muted-foreground mt-2 font-medium">
                    Customize Your Research
                  </p>
                </div>
                <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110">
                  <Smile className="w-6 h-6 text-primary" />
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Quick Actions - Left Column */}
            <nav aria-label="Quick actions navigation" className="lg:col-span-1">
              <div className="bg-card rounded-xl border border-border reshade-layer-1 p-6">
                <h2
                  id="quick-actions-heading"
                  className="text-lg font-semibold text-foreground mb-4"
                >
                  Quick Actions
                </h2>
                <div className="space-y-2">
                  <Link
                    href="/judges"
                    className="group flex items-center justify-between w-full px-4 py-3 border border-border rounded-lg text-sm font-medium text-foreground bg-card hover:bg-muted transition-all hover:border-primary/50 hover:scale-[1.02] hover:shadow-md"
                    style={{ animationDelay: '0ms' }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Search className="w-4 h-4 text-primary" />
                      </div>
                      <span>Search Judges</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform opacity-0 group-hover:opacity-100" />
                  </Link>
                  <Link
                    href="/dashboard/bookmarks"
                    className="group flex items-center justify-between w-full px-4 py-3 border border-border rounded-lg text-sm font-medium text-foreground bg-card hover:bg-muted transition-all hover:border-primary/50 hover:scale-[1.02] hover:shadow-md"
                    style={{ animationDelay: '50ms' }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-success/10 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Bookmark className="w-4 h-4 text-success" />
                      </div>
                      <span>My Bookmarks</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform opacity-0 group-hover:opacity-100" />
                  </Link>
                  <Link
                    href="/dashboard/searches"
                    className="group flex items-center justify-between w-full px-4 py-3 border border-border rounded-lg text-sm font-medium text-foreground bg-card hover:bg-muted transition-all hover:border-primary/50 hover:scale-[1.02] hover:shadow-md"
                    style={{ animationDelay: '100ms' }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-accent/10 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                        <FileText className="w-4 h-4 text-accent" />
                      </div>
                      <span>Saved Searches</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform opacity-0 group-hover:opacity-100" />
                  </Link>
                  <Link
                    href="/dashboard/compare"
                    className="group flex items-center justify-between w-full px-4 py-3 border border-border rounded-lg text-sm font-medium text-foreground bg-card hover:bg-muted transition-all hover:border-primary/50 hover:scale-[1.02] hover:shadow-md"
                    style={{ animationDelay: '150ms' }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-warning/10 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                        <GitCompare className="w-4 h-4 text-warning" />
                      </div>
                      <span>Compare Judges</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform opacity-0 group-hover:opacity-100" />
                  </Link>
                  <Link
                    href="/dashboard/activity"
                    className="group flex items-center justify-between w-full px-4 py-3 border border-border rounded-lg text-sm font-medium text-foreground bg-card hover:bg-muted transition-all hover:border-primary/50 hover:scale-[1.02] hover:shadow-md"
                    style={{ animationDelay: '200ms' }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-info/10 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Activity className="w-4 h-4 text-info" />
                      </div>
                      <span>Activity History</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform opacity-0 group-hover:opacity-100" />
                  </Link>
                  <Link
                    href="/dashboard/practice-areas"
                    className="group flex items-center justify-between w-full px-4 py-3 border border-border rounded-lg text-sm font-medium text-foreground bg-card hover:bg-muted transition-all hover:border-primary/50 hover:scale-[1.02] hover:shadow-md"
                    style={{ animationDelay: '250ms' }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-secondary/10 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Scale className="w-4 h-4 text-secondary" />
                      </div>
                      <span>Practice Areas</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform opacity-0 group-hover:opacity-100" />
                  </Link>
                  <Link
                    href="/analytics"
                    className="group flex items-center justify-between w-full px-4 py-3 border border-primary/30 rounded-lg text-sm font-medium text-primary bg-primary/10 hover:bg-primary/20 transition-all hover:scale-[1.02] hover:shadow-lg hover:border-primary/50"
                    style={{ animationDelay: '300ms' }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                        <BarChart3 className="w-4 h-4 text-primary" />
                      </div>
                      <span className="font-semibold">Platform Analytics</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-primary group-hover:translate-x-1 transition-transform" />
                  </Link>
                  <Link
                    href="/dashboard/billing"
                    className="group flex items-center justify-between w-full px-4 py-3 border border-border rounded-lg text-sm font-medium text-foreground bg-card hover:bg-muted transition-all hover:border-primary/50 hover:scale-[1.02] hover:shadow-md"
                    style={{ animationDelay: '350ms' }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-success/10 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                        <CreditCard className="w-4 h-4 text-success" />
                      </div>
                      <span>Billing & Purchases</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform opacity-0 group-hover:opacity-100" />
                  </Link>
                  <Link
                    href="/settings"
                    className="group flex items-center justify-between w-full px-4 py-3 border border-border rounded-lg text-sm font-medium text-foreground bg-card hover:bg-muted transition-all hover:border-primary/50 hover:scale-[1.02] hover:shadow-md"
                    style={{ animationDelay: '400ms' }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Settings className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <span>Settings</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform opacity-0 group-hover:opacity-100" />
                  </Link>
                </div>
              </div>
            </nav>

            {/* Recent Activity - Right Columns */}
            <section aria-labelledby="recent-activity-heading" className="lg:col-span-2">
              <div className="bg-card rounded-xl border border-border reshade-layer-1 p-6">
                <h2
                  id="recent-activity-heading"
                  className="text-lg font-semibold text-foreground mb-4"
                >
                  Recent Activity
                </h2>
                <ActivityTimeline activities={stats.recentActivity} />
              </div>
            </section>
          </div>

          {/* Judge Analytics Widget */}
          <section aria-labelledby="judge-analytics-heading" className="mb-8">
            <h2 id="judge-analytics-heading" className="sr-only">
              Judge Analytics
            </h2>
            <JudgeAnalyticsWidget analytics={judgeAnalytics} />
          </section>

          {/* Suggested Features */}
          <section aria-labelledby="suggested-features-heading">
            <h2 id="suggested-features-heading" className="sr-only">
              Suggested Features
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Link
                href="/analytics"
                className="bg-gradient-to-br from-success/5 to-success/10 rounded-xl border border-success/30 reshade-hover group p-6 transition-all hover:border-success/50 hover:shadow-lg"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground group-hover:text-success transition-colors">
                      Judge Analytics
                    </h3>
                    <p className="text-sm text-muted-foreground mt-2">
                      Explore bias patterns and case outcomes for judges
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-success/20 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                    <BarChart3 className="w-5 h-5 text-success" />
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-success group-hover:gap-3 transition-all">
                  <span>Explore now</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>

              <Link
                href="/dashboard/practice-areas"
                className="bg-gradient-to-br from-primary/5 to-info/5 rounded-xl border border-primary/30 reshade-hover group p-6 transition-all hover:border-primary/50 hover:shadow-lg"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                      Practice Areas
                    </h3>
                    <p className="text-sm text-muted-foreground mt-2">
                      Filter judges and courts by your practice area specialization
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Scale className="w-5 h-5 text-primary" />
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-primary group-hover:gap-3 transition-all">
                  <span>View areas</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>

              <Link
                href="/judges"
                className="bg-gradient-to-br from-accent/5 to-accent/10 rounded-xl border border-accent/30 reshade-hover group p-6 transition-all hover:border-accent/50 hover:shadow-lg"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground group-hover:text-accent transition-colors">
                      Case Insights
                    </h3>
                    <p className="text-sm text-muted-foreground mt-2">
                      Track recent decisions and outcomes in your jurisdiction
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-accent/20 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                    <FileText className="w-5 h-5 text-accent" />
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-accent group-hover:gap-3 transition-all">
                  <span>View insights</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            </div>
          </section>
        </div>
      </main>
    </>
  )
}

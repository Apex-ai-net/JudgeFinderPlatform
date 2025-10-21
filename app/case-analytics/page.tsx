import { Suspense } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { Scale, TrendingUp, Clock, FileText, BarChart3, MapPin } from 'lucide-react'
import { TypewriterText } from '@/components/ui/TypewriterText'
import { ScrollIndicator } from '@/components/ui/ScrollIndicator'
import { createServerClient } from '@/lib/supabase/server'
import { getPlatformStatistics, getJurisdictionsList } from '@/lib/analytics/case-statistics'
import { getBaseUrl } from '@/lib/utils/baseUrl'
import { createCanonicalSlug } from '@/lib/utils/slug'
import { PlatformStatsCharts } from './PlatformStatsCharts'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

const BASE_URL = getBaseUrl()

export const metadata: Metadata = {
  title: 'Case Analytics | California Judicial Statistics & Trends',
  description:
    'Explore comprehensive case analytics for California courts. View outcome patterns, decision trends, settlement rates, and performance metrics across jurisdictions.',
  alternates: {
    canonical: `${BASE_URL}/case-analytics`,
  },
  openGraph: {
    title: 'Case Analytics | California Judicial Statistics',
    description:
      'Comprehensive case statistics, outcome patterns, and performance metrics for California courts.',
    url: `${BASE_URL}/case-analytics`,
    type: 'website',
    siteName: 'JudgeFinder',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Case Analytics | California Judicial Statistics',
    description: 'View case outcomes, trends, and performance metrics for California courts.',
  },
}

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="animate-pulse space-y-8">
          <div className="h-12 bg-muted rounded w-3/4" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-muted rounded" />
            ))}
          </div>
          <div className="h-96 bg-muted rounded" />
        </div>
      </div>
    </div>
  )
}

async function CaseAnalyticsContent() {
  const supabase = await createServerClient()

  const [platformStats, jurisdictions] = await Promise.all([
    getPlatformStatistics(supabase),
    getJurisdictionsList(supabase),
  ])

  const hasData = platformStats && platformStats.total_cases > 0

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero Section */}
      <section className="relative min-h-[50vh] flex items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/5 to-background" />
        <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:50px_50px]" />

        <div className="relative z-10 text-center px-4 max-w-7xl mx-auto w-full">
          <h1 className="mb-6 text-5xl md:text-7xl font-bold tracking-tight">
            <span className="bg-gradient-to-r from-primary via-primary/80 to-primary bg-clip-text text-transparent">
              Case Analytics
            </span>
            <br />
            <span className="text-foreground">
              <TypewriterText text="Data-Driven Insights" />
            </span>
          </h1>

          <p className="mx-auto mb-12 max-w-2xl text-lg md:text-xl text-muted-foreground">
            Comprehensive analysis of judicial case outcomes, trends, and performance metrics across
            California courts.
          </p>
        </div>

        <ScrollIndicator />
      </section>

      {/* Platform Statistics */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {hasData ? (
          <>
            {/* Quick Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
              <div className="bg-card border border-border rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                </div>
                <h3 className="text-3xl font-bold text-foreground mb-1">
                  {platformStats.total_cases.toLocaleString()}
                </h3>
                <p className="text-sm text-muted-foreground">Total Cases Analyzed</p>
              </div>

              <div className="bg-card border border-border rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <MapPin className="h-6 w-6 text-primary" />
                  </div>
                </div>
                <h3 className="text-3xl font-bold text-foreground mb-1">
                  {platformStats.total_jurisdictions}
                </h3>
                <p className="text-sm text-muted-foreground">Jurisdictions Covered</p>
              </div>

              <div className="bg-card border border-border rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <Clock className="h-6 w-6 text-primary" />
                  </div>
                </div>
                <h3 className="text-3xl font-bold text-foreground mb-1">
                  {platformStats.avg_decision_time_days}
                </h3>
                <p className="text-sm text-muted-foreground">Avg. Decision Time (Days)</p>
              </div>

              <div className="bg-card border border-border rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <Scale className="h-6 w-6 text-primary" />
                  </div>
                </div>
                <h3 className="text-3xl font-bold text-foreground mb-1">
                  {platformStats.case_types.length}
                </h3>
                <p className="text-sm text-muted-foreground">Case Types Tracked</p>
              </div>
            </div>

            {/* Charts Section */}
            <PlatformStatsCharts platformStats={platformStats} />

            {/* Jurisdictions List */}
            <div className="mt-16">
              <div className="mb-8">
                <h2 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
                  <BarChart3 className="h-8 w-8 text-primary" />
                  Analytics by Jurisdiction
                </h2>
                <p className="text-muted-foreground">
                  Explore detailed case statistics and trends for each California jurisdiction
                </p>
              </div>

              {jurisdictions.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {jurisdictions.map((jurisdiction) => {
                    const slug = createCanonicalSlug(jurisdiction.jurisdiction)
                    const displayName = jurisdiction.county
                      ? `${jurisdiction.county} County`
                      : jurisdiction.jurisdiction

                    return (
                      <Link
                        key={jurisdiction.jurisdiction}
                        href={`/case-analytics/${slug}`}
                        className="block bg-card border border-border rounded-lg p-6 shadow-sm hover:shadow-lg hover:border-primary/50 transition-all group"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="text-xl font-semibold text-foreground group-hover:text-primary transition-colors">
                              {displayName}
                            </h3>
                            {jurisdiction.county && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {jurisdiction.jurisdiction}
                              </p>
                            )}
                          </div>
                          <div className="p-2 bg-primary/10 rounded-lg">
                            <TrendingUp className="h-5 w-5 text-primary" />
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Total Cases</span>
                            <span className="font-semibold text-foreground">
                              {jurisdiction.total_cases.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Judges</span>
                            <span className="font-semibold text-foreground">
                              {jurisdiction.total_judges}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Avg. Decision Time</span>
                            <span className="font-semibold text-foreground">
                              {jurisdiction.avg_decision_time_days} days
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Settlement Rate</span>
                            <span className="font-semibold text-foreground">
                              {jurisdiction.settlement_rate.toFixed(1)}%
                            </span>
                          </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-border">
                          <div className="flex items-center text-sm text-primary group-hover:text-primary/80 transition-colors">
                            View Detailed Analytics
                            <svg
                              className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 5l7 7-7 7"
                              />
                            </svg>
                          </div>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-12 bg-muted/30 rounded-lg">
                  <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No jurisdiction data available</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="text-center py-24">
            <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-6" />
            <h2 className="text-2xl font-semibold text-foreground mb-2">No Case Data Available</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Case analytics data is being collected. Please check back soon for comprehensive
              insights.
            </p>
          </div>
        )}
      </div>

      {/* Features Section */}
      <div className="bg-muted/30 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              What You'll Find in Case Analytics
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Comprehensive insights powered by data from thousands of California court cases
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="inline-flex p-4 bg-primary/10 rounded-full mb-4">
                <Scale className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Outcome Patterns</h3>
              <p className="text-sm text-muted-foreground">
                Analyze case outcomes including settlements, dismissals, and decisions across
                different case types and jurisdictions
              </p>
            </div>

            <div className="text-center">
              <div className="inline-flex p-4 bg-primary/10 rounded-full mb-4">
                <TrendingUp className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Temporal Trends</h3>
              <p className="text-sm text-muted-foreground">
                Track case volume and outcome trends over time to identify patterns and seasonal
                variations
              </p>
            </div>

            <div className="text-center">
              <div className="inline-flex p-4 bg-primary/10 rounded-full mb-4">
                <Clock className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Performance Metrics</h3>
              <p className="text-sm text-muted-foreground">
                Compare average decision times, settlement rates, and other key metrics across
                courts and judges
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default async function CaseAnalyticsPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <CaseAnalyticsContent />
    </Suspense>
  )
}

import { Suspense } from 'react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, TrendingUp, Scale, Clock, FileText, BarChart3 } from 'lucide-react'
import { createServerClient } from '@/lib/supabase/server'
import { getJurisdictionStatistics, getJurisdictionsList } from '@/lib/analytics/case-statistics'
import { getBaseUrl } from '@/lib/utils/baseUrl'
import { createCanonicalSlug } from '@/lib/utils/slug'
import { JurisdictionAnalyticsCharts } from './JurisdictionAnalyticsCharts'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

const BASE_URL = getBaseUrl()

interface PageProps {
  params: Promise<{ jurisdiction: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { jurisdiction: jurisdictionSlug } = await params
  const supabase = await createServerClient()

  // Find the jurisdiction from the list
  const jurisdictions = await getJurisdictionsList(supabase)
  const jurisdiction = jurisdictions.find(
    (j) => createCanonicalSlug(j.jurisdiction) === jurisdictionSlug
  )

  const displayName = jurisdiction?.county
    ? `${jurisdiction.county} County`
    : jurisdiction?.jurisdiction || jurisdictionSlug

  return {
    title: `${displayName} Case Analytics | JudgeFinder`,
    description: `Comprehensive case analytics for ${displayName}. View outcome patterns, settlement rates, decision trends, and performance metrics.`,
    alternates: {
      canonical: `${BASE_URL}/case-analytics/${jurisdictionSlug}`,
    },
    openGraph: {
      title: `${displayName} Case Analytics | JudgeFinder`,
      description: `Analyze case outcomes, trends, and performance metrics for ${displayName}.`,
      url: `${BASE_URL}/case-analytics/${jurisdictionSlug}`,
      type: 'website',
      siteName: 'JudgeFinder',
    },
  }
}

export async function generateStaticParams() {
  try {
    const supabase = await createServerClient()
    const jurisdictions = await getJurisdictionsList(supabase)

    return jurisdictions.slice(0, 50).map((j) => ({
      jurisdiction: createCanonicalSlug(j.jurisdiction),
    }))
  } catch (error) {
    console.error('[Case Analytics] Error generating static params:', error)
    return []
  }
}

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="animate-pulse space-y-8">
          <div className="h-12 bg-muted rounded w-3/4" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-muted rounded" />
            ))}
          </div>
          <div className="h-96 bg-muted rounded" />
        </div>
      </div>
    </div>
  )
}

async function JurisdictionAnalyticsContent({ jurisdictionSlug }: { jurisdictionSlug: string }) {
  const supabase = await createServerClient()

  // Find the actual jurisdiction from the slug
  const jurisdictions = await getJurisdictionsList(supabase)
  const jurisdictionData = jurisdictions.find(
    (j) => createCanonicalSlug(j.jurisdiction) === jurisdictionSlug
  )

  if (!jurisdictionData) {
    notFound()
  }

  const { stats, outcomePatterns, temporalTrends, caseTypes } = await getJurisdictionStatistics(
    supabase,
    jurisdictionData.jurisdiction
  )

  if (!stats) {
    notFound()
  }

  const displayName = stats.county ? `${stats.county} County` : stats.jurisdiction

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="bg-gradient-to-b from-primary/5 to-background border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Link
            href="/case-analytics"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-colors mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to All Analytics
          </Link>

          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">{displayName}</h1>
          <p className="text-lg text-muted-foreground max-w-3xl">
            Comprehensive case analytics and performance metrics for {displayName}
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <div className="bg-card border border-border rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <FileText className="h-6 w-6 text-primary" />
              </div>
            </div>
            <h3 className="text-3xl font-bold text-foreground mb-1">
              {stats.total_cases.toLocaleString()}
            </h3>
            <p className="text-sm text-muted-foreground">Total Cases</p>
          </div>

          <div className="bg-card border border-border rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Scale className="h-6 w-6 text-primary" />
              </div>
            </div>
            <h3 className="text-3xl font-bold text-foreground mb-1">{stats.total_judges}</h3>
            <p className="text-sm text-muted-foreground">Judges</p>
          </div>

          <div className="bg-card border border-border rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Clock className="h-6 w-6 text-primary" />
              </div>
            </div>
            <h3 className="text-3xl font-bold text-foreground mb-1">
              {stats.avg_decision_time_days}
            </h3>
            <p className="text-sm text-muted-foreground">Avg. Decision Time (Days)</p>
          </div>

          <div className="bg-card border border-border rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
            </div>
            <h3 className="text-3xl font-bold text-foreground mb-1">
              {stats.settlement_rate.toFixed(1)}%
            </h3>
            <p className="text-sm text-muted-foreground">Settlement Rate</p>
          </div>
        </div>

        {/* Outcome Distribution Stats */}
        <div className="bg-card border border-border rounded-lg p-6 shadow-sm mb-12">
          <h2 className="text-2xl font-semibold text-foreground mb-6 flex items-center gap-3">
            <BarChart3 className="h-6 w-6 text-primary" />
            Outcome Distribution
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-foreground mb-1">
                {stats.settlement_rate.toFixed(1)}%
              </div>
              <div className="text-sm text-muted-foreground">Settled</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-foreground mb-1">
                {stats.dismissal_rate.toFixed(1)}%
              </div>
              <div className="text-sm text-muted-foreground">Dismissed</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-foreground mb-1">
                {stats.decided_rate.toFixed(1)}%
              </div>
              <div className="text-sm text-muted-foreground">Decided</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-foreground mb-1">
                {stats.pending_rate.toFixed(1)}%
              </div>
              <div className="text-sm text-muted-foreground">Pending</div>
            </div>
          </div>
        </div>

        {/* Charts */}
        <JurisdictionAnalyticsCharts
          outcomePatterns={outcomePatterns}
          temporalTrends={temporalTrends}
          caseTypes={caseTypes}
        />

        {/* Most Common Case Type */}
        {stats.most_common_case_type && (
          <div className="bg-card border border-border rounded-lg p-6 shadow-sm mt-12">
            <h2 className="text-2xl font-semibold text-foreground mb-4">Most Common Case Type</h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xl font-semibold text-primary">{stats.most_common_case_type}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {stats.most_common_case_type_count.toLocaleString()} cases (
                  {((stats.most_common_case_type_count / stats.total_cases) * 100).toFixed(1)}% of
                  total)
                </p>
              </div>
              <div className="p-4 bg-primary/10 rounded-lg">
                <FileText className="h-8 w-8 text-primary" />
              </div>
            </div>
          </div>
        )}

        {/* Related Links */}
        <div className="mt-12 bg-muted/30 rounded-lg p-8">
          <h2 className="text-2xl font-semibold text-foreground mb-6">Related Resources</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link
              href="/judges"
              className="flex items-center justify-between p-4 bg-card border border-border rounded-lg hover:border-primary/50 transition-colors group"
            >
              <span className="text-foreground group-hover:text-primary transition-colors">
                View Judges in {displayName}
              </span>
              <svg
                className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all"
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
            </Link>
            <Link
              href="/courts"
              className="flex items-center justify-between p-4 bg-card border border-border rounded-lg hover:border-primary/50 transition-colors group"
            >
              <span className="text-foreground group-hover:text-primary transition-colors">
                View Courts in {displayName}
              </span>
              <svg
                className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all"
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
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default async function JurisdictionAnalyticsPage({ params }: PageProps) {
  const { jurisdiction } = await params

  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <JurisdictionAnalyticsContent jurisdictionSlug={jurisdiction} />
    </Suspense>
  )
}

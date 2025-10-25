import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { createServerClient } from '@/lib/supabase/server'
import { createCanonicalSlug } from '@/lib/utils/slug'
import { SEOBreadcrumbs } from '@/components/seo/SEOBreadcrumbs'
import {
  BarChart3,
  TrendingUp,
  Scale,
  MapPin,
  Users,
  Building,
  Activity,
  FileText,
} from 'lucide-react'

interface PageProps {
  params: Promise<{ jurisdiction: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { jurisdiction: jurisdictionSlug } = await params

  // Convert slug to readable name
  const jurisdictionName = jurisdictionSlug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')

  return {
    title: `Case Analytics for ${jurisdictionName} | JudgeFinder`,
    description: `Analyze judicial case patterns, outcomes, and trends in ${jurisdictionName}. Comprehensive case analytics and court performance metrics.`,
    alternates: {
      canonical: `/case-analytics/${jurisdictionSlug}`,
    },
    openGraph: {
      title: `Case Analytics for ${jurisdictionName} | JudgeFinder`,
      description: `Case analytics and judicial patterns in ${jurisdictionName}`,
      type: 'website',
    },
  }
}

export const dynamic = 'force-dynamic'

export default async function CaseAnalyticsJurisdictionPage({ params }: PageProps) {
  const { jurisdiction: jurisdictionSlug } = await params
  const supabase = await createServerClient()

  // Convert slug to jurisdiction name
  const jurisdictionName = jurisdictionSlug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')

  // Verify jurisdiction exists
  const { data: courts, error: courtsError } = await supabase
    .from('courts')
    .select('*')
    .ilike('jurisdiction', jurisdictionName)

  if (courtsError || !courts || courts.length === 0) {
    notFound()
  }

  // Get all courts in jurisdiction
  const { data: allCourts } = await supabase
    .from('courts')
    .select('id, name, slug, type')
    .ilike('jurisdiction', jurisdictionName)

  // Get judges in jurisdiction
  const { data: judges } = await supabase
    .from('judges')
    .select('id, name, slug, appointed_date, court_id')
    .ilike('jurisdiction', jurisdictionName)

  const courtCount = allCourts?.length || 0
  const judgeCount = judges?.length || 0

  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Case Analytics', href: '/case-analytics' },
    { label: jurisdictionName, href: `/case-analytics/${jurisdictionSlug}` },
  ]

  return (
    <div className="min-h-screen bg-background">
      <SEOBreadcrumbs items={breadcrumbs} />

      {/* Header Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-12">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="max-w-3xl">
            <div className="flex items-center text-blue-100 mb-2">
              <MapPin className="h-5 w-5 mr-2" />
              <span>{jurisdictionName}</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Case Analytics</h1>
            <p className="text-xl text-blue-100">
              Comprehensive case outcome analysis and judicial patterns for {jurisdictionName}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12 max-w-7xl">
        {/* Jurisdiction Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card>
            <CardHeader>
              <Users className="h-8 w-8 text-blue-600 mb-2" />
              <CardTitle className="text-2xl">{judgeCount}</CardTitle>
              <CardDescription>Active Judges</CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href={`/jurisdictions/${jurisdictionSlug}`}
                className="text-sm text-primary hover:text-blue-800 font-medium"
              >
                View all judges →
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Building className="h-8 w-8 text-blue-600 mb-2" />
              <CardTitle className="text-2xl">{courtCount}</CardTitle>
              <CardDescription>Courts</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Courts in {jurisdictionName}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Activity className="h-8 w-8 text-blue-600 mb-2" />
              <CardTitle className="text-2xl">Live</CardTitle>
              <CardDescription>Analytics Data</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Real-time case analytics</p>
            </CardContent>
          </Card>
        </div>

        {/* Analytics Categories */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-foreground mb-6">
            Available Analytics for {jurisdictionName}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-blue-200">
              <CardHeader>
                <BarChart3 className="h-8 w-8 text-blue-600 mb-2" />
                <CardTitle>Outcome Patterns</CardTitle>
                <CardDescription>
                  Analyze case outcomes and settlement rates by judge
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground mb-4">
                  <li>• Settlement vs trial outcomes</li>
                  <li>• Motion grant/denial rates</li>
                  <li>• Case disposition methods</li>
                  <li>• Statistical confidence scores</li>
                </ul>
                <p className="text-xs text-blue-700 bg-blue-50 p-3 rounded-lg">
                  View individual judge profiles to see detailed outcome analytics with minimum 500
                  cases for statistical confidence.
                </p>
              </CardContent>
            </Card>

            <Card className="border-blue-200">
              <CardHeader>
                <TrendingUp className="h-8 w-8 text-blue-600 mb-2" />
                <CardTitle>Temporal Trends</CardTitle>
                <CardDescription>Track how judicial patterns change over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground mb-4">
                  <li>• Year-over-year comparisons</li>
                  <li>• Decision timeline analysis</li>
                  <li>• Case volume trends</li>
                  <li>• Seasonal pattern detection</li>
                </ul>
                <p className="text-xs text-blue-700 bg-blue-50 p-3 rounded-lg">
                  Temporal analytics available for judges with at least 2 years of case history.
                </p>
              </CardContent>
            </Card>

            <Card className="border-blue-200">
              <CardHeader>
                <Scale className="h-8 w-8 text-blue-600 mb-2" />
                <CardTitle>Court Performance</CardTitle>
                <CardDescription>Efficiency and throughput metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground mb-4">
                  <li>• Average case decision time</li>
                  <li>• Case backlog analysis</li>
                  <li>• Clearance rate metrics</li>
                  <li>• Jurisdiction benchmarks</li>
                </ul>
                <p className="text-xs text-blue-700 bg-blue-50 p-3 rounded-lg">
                  Court-level analytics aggregate data across all judges in the court.
                </p>
              </CardContent>
            </Card>

            <Card className="border-blue-200">
              <CardHeader>
                <FileText className="h-8 w-8 text-blue-600 mb-2" />
                <CardTitle>Comparative Analysis</CardTitle>
                <CardDescription>Compare judges within {jurisdictionName}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground mb-4">
                  <li>• Multi-judge side-by-side</li>
                  <li>• Jurisdiction baseline comparison</li>
                  <li>• Practice area patterns</li>
                  <li>• Relative performance metrics</li>
                </ul>
                <Link
                  href="/compare"
                  className="inline-block text-xs text-primary hover:text-blue-800 font-medium"
                >
                  Use Judge Comparison Tool →
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Judges in Jurisdiction */}
        {judges && judges.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-foreground mb-6">
              Judges with Analytics in {jurisdictionName}
            </h2>
            <p className="text-muted-foreground mb-6">
              Browse individual judge profiles to access detailed case analytics, outcome patterns,
              and bias reports. Each profile includes statistical analysis with confidence scoring.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {judges.slice(0, 12).map((judge) => {
                const judgeSlug = judge.slug || createCanonicalSlug(judge.name)

                return (
                  <Link key={judge.id} href={`/judges/${judgeSlug}`}>
                    <Card className="h-full hover:shadow-lg transition-shadow hover:border-blue-300">
                      <CardHeader>
                        <CardTitle className="text-base line-clamp-1">
                          Judge {judge.name.replace(/^(judge|justice|the honorable)\s+/i, '')}
                        </CardTitle>
                        {judge.appointed_date && (
                          <CardDescription className="text-xs">
                            Appointed {new Date(judge.appointed_date).getFullYear()}
                          </CardDescription>
                        )}
                      </CardHeader>
                      <CardContent>
                        <Badge variant="outline" className="text-xs">
                          View Analytics
                        </Badge>
                      </CardContent>
                    </Card>
                  </Link>
                )
              })}
            </div>

            {judges.length > 12 && (
              <div className="mt-6 text-center">
                <Link
                  href={`/jurisdictions/${jurisdictionSlug}`}
                  className="text-primary hover:text-blue-800 font-medium"
                >
                  View all {judgeCount} judges in {jurisdictionName} →
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Courts in Jurisdiction */}
        {allCourts && allCourts.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-foreground mb-6">
              Courts in {jurisdictionName}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {allCourts.map((court) => {
                const courtSlug = court.slug || createCanonicalSlug(court.name)
                const judgesInCourt = judges?.filter((j) => j.court_id === court.id).length || 0

                return (
                  <Link key={court.id} href={`/courts/${courtSlug}`}>
                    <Card className="h-full hover:shadow-lg transition-shadow hover:border-blue-300">
                      <CardHeader>
                        <CardTitle className="text-base line-clamp-2">{court.name}</CardTitle>
                        <Badge variant="outline" className="w-fit text-xs">
                          {court.type || 'Court'}
                        </Badge>
                      </CardHeader>
                      <CardContent>
                        <div className="text-sm text-muted-foreground">
                          {judgesInCourt} {judgesInCourt === 1 ? 'judge' : 'judges'}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* Related Resources */}
        <Card>
          <CardHeader>
            <CardTitle>More Analytics Tools</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Link
                href="/compare"
                className="p-4 border border-border rounded-lg hover:border-blue-300 hover:bg-primary/5 transition-colors"
              >
                <h3 className="font-semibold text-foreground mb-1">Compare Judges</h3>
                <p className="text-sm text-muted-foreground">
                  Side-by-side comparison of judges in {jurisdictionName}
                </p>
              </Link>

              <Link
                href="/judicial-analytics"
                className="p-4 border border-border rounded-lg hover:border-blue-300 hover:bg-primary/5 transition-colors"
              >
                <h3 className="font-semibold text-foreground mb-1">Platform Analytics</h3>
                <p className="text-sm text-muted-foreground">
                  Aggregate analytics across all jurisdictions
                </p>
              </Link>

              <Link
                href={`/jurisdictions/${jurisdictionSlug}`}
                className="p-4 border border-border rounded-lg hover:border-blue-300 hover:bg-primary/5 transition-colors"
              >
                <h3 className="font-semibold text-foreground mb-1">All Judges</h3>
                <p className="text-sm text-muted-foreground">
                  Browse all judges in {jurisdictionName}
                </p>
              </Link>

              <Link
                href="/case-analytics"
                className="p-4 border border-border rounded-lg hover:border-blue-300 hover:bg-primary/5 transition-colors"
              >
                <h3 className="font-semibold text-foreground mb-1">Other Jurisdictions</h3>
                <p className="text-sm text-muted-foreground">
                  View analytics for other California counties
                </p>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

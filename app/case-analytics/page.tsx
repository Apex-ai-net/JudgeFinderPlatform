import { Metadata } from 'next'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { createServerClient } from '@/lib/supabase/server'
import { createCanonicalSlug } from '@/lib/utils/slug'
import { SEOBreadcrumbs } from '@/components/seo/SEOBreadcrumbs'
import { BarChart3, TrendingUp, Scale, MapPin, PieChart, Activity } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Case Analytics by Jurisdiction | JudgeFinder',
  description:
    'Analyze judicial case patterns, outcomes, and decision trends by jurisdiction. Comprehensive case analytics for California courts.',
  alternates: {
    canonical: '/case-analytics',
  },
  openGraph: {
    title: 'Case Analytics by Jurisdiction | JudgeFinder',
    description: 'Analyze judicial case patterns and outcomes by jurisdiction',
    type: 'website',
  },
}

export const dynamic = 'force-dynamic'

interface JurisdictionStats {
  jurisdiction: string
  judgeCount: number
  courtCount: number
}

export default async function CaseAnalyticsPage() {
  const supabase = await createServerClient()

  // Get jurisdictions with stats
  const { data: jurisdictions, error } = await supabase
    .from('courts')
    .select('jurisdiction')
    .not('jurisdiction', 'is', null)

  if (error) {
    console.error('[Case Analytics] Error fetching jurisdictions:', error)
  }

  // Aggregate jurisdiction stats
  const jurisdictionMap = new Map<string, JurisdictionStats>()

  jurisdictions?.forEach((row) => {
    if (!row.jurisdiction) return
    const jurisdiction = row.jurisdiction as string

    if (!jurisdictionMap.has(jurisdiction)) {
      jurisdictionMap.set(jurisdiction, {
        jurisdiction,
        judgeCount: 0,
        courtCount: 1,
      })
    } else {
      const stats = jurisdictionMap.get(jurisdiction)!
      stats.courtCount += 1
    }
  })

  // Get judge counts per jurisdiction
  const { data: judgeData } = await supabase
    .from('judges')
    .select('jurisdiction')
    .not('jurisdiction', 'is', null)

  judgeData?.forEach((row) => {
    const jurisdiction = row.jurisdiction as string
    if (jurisdictionMap.has(jurisdiction)) {
      jurisdictionMap.get(jurisdiction)!.judgeCount += 1
    }
  })

  const jurisdictionList = Array.from(jurisdictionMap.values()).sort((a, b) =>
    a.jurisdiction.localeCompare(b.jurisdiction)
  )

  // Prioritize major counties
  const majorCounties = [
    'Los Angeles County',
    'Orange County',
    'San Diego County',
    'San Francisco County',
    'Santa Clara County',
    'Alameda County',
  ]

  const sortedJurisdictions = jurisdictionList.sort((a, b) => {
    const aIndex = majorCounties.indexOf(a.jurisdiction)
    const bIndex = majorCounties.indexOf(b.jurisdiction)

    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex
    if (aIndex !== -1) return -1
    if (bIndex !== -1) return 1
    return a.jurisdiction.localeCompare(b.jurisdiction)
  })

  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Case Analytics', href: '/case-analytics' },
  ]

  return (
    <div className="min-h-screen bg-background">
      <SEOBreadcrumbs items={breadcrumbs} />

      {/* Header Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-12">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Case Analytics</h1>
            <p className="text-xl text-blue-100">
              Comprehensive judicial analytics and case outcome patterns across California
              jurisdictions
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12 max-w-7xl">
        {/* Feature Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card>
            <CardHeader>
              <BarChart3 className="h-8 w-8 text-blue-600 mb-2" />
              <CardTitle className="text-lg">Outcome Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Analyze case outcomes, settlement rates, and decision patterns by jurisdiction and
                judge.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <TrendingUp className="h-8 w-8 text-blue-600 mb-2" />
              <CardTitle className="text-lg">Trend Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Track judicial decision trends over time with statistical confidence scoring.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <PieChart className="h-8 w-8 text-blue-600 mb-2" />
              <CardTitle className="text-lg">Performance Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Court efficiency metrics including average decision time and case volume statistics.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Analytics by Jurisdiction */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-foreground mb-6">Analytics by Jurisdiction</h2>
          <p className="text-muted-foreground mb-6">
            Select a jurisdiction to view detailed case analytics, outcome distributions, and
            judicial performance metrics for that area.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedJurisdictions.map((stats) => {
              const slug = createCanonicalSlug(stats.jurisdiction)

              return (
                <Link key={stats.jurisdiction} href={`/case-analytics/${slug}`}>
                  <Card className="h-full hover:shadow-lg transition-shadow hover:border-blue-300">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg mb-1">{stats.jurisdiction}</CardTitle>
                          <div className="flex items-center text-sm text-muted-foreground">
                            <MapPin className="h-4 w-4 mr-1" />
                            California
                          </div>
                        </div>
                        <Activity className="h-5 w-5 text-blue-600" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Active Judges</span>
                          <span className="font-medium">{stats.judgeCount}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Courts</span>
                          <span className="font-medium">{stats.courtCount}</span>
                        </div>
                      </div>
                      <div className="mt-4 pt-4 border-t">
                        <Badge variant="outline" className="text-xs">
                          View Analytics
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Analytics Categories */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-foreground mb-6">Analytics Categories</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <Scale className="h-8 w-8 text-blue-600 mb-2" />
                <CardTitle>Judicial Decision Patterns</CardTitle>
                <CardDescription>
                  Analyze how judges rule on specific case types and motion types
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Motion grant/denial rates by judge</li>
                  <li>• Case outcome distributions</li>
                  <li>• Settlement vs trial patterns</li>
                  <li>• Statistical confidence scoring</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <TrendingUp className="h-8 w-8 text-blue-600 mb-2" />
                <CardTitle>Temporal Trends</CardTitle>
                <CardDescription>Track how judicial patterns evolve over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Year-over-year comparison</li>
                  <li>• Seasonal trend analysis</li>
                  <li>• Case volume fluctuations</li>
                  <li>• Decision time trends</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <BarChart3 className="h-8 w-8 text-blue-600 mb-2" />
                <CardTitle>Court Performance</CardTitle>
                <CardDescription>Measure efficiency and throughput metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Average case decision time</li>
                  <li>• Backlog analysis</li>
                  <li>• Clearance rates</li>
                  <li>• Jurisdiction benchmarks</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <PieChart className="h-8 w-8 text-blue-600 mb-2" />
                <CardTitle>Comparative Analytics</CardTitle>
                <CardDescription>Compare judges and jurisdictions side-by-side</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Multi-judge comparisons</li>
                  <li>• Cross-jurisdiction analysis</li>
                  <li>• Practice area specialization</li>
                  <li>• Baseline deviation metrics</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Related Resources */}
        <Card>
          <CardHeader>
            <CardTitle>Related Resources</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Link
                href="/judges"
                className="p-4 border border-border rounded-lg hover:border-blue-300 hover:bg-primary/5 transition-colors"
              >
                <h3 className="font-semibold text-foreground mb-1">Judge Directory</h3>
                <p className="text-sm text-muted-foreground">
                  Browse judges with detailed analytics and bias reports
                </p>
              </Link>

              <Link
                href="/judicial-analytics"
                className="p-4 border border-border rounded-lg hover:border-blue-300 hover:bg-primary/5 transition-colors"
              >
                <h3 className="font-semibold text-foreground mb-1">Judicial Analytics Dashboard</h3>
                <p className="text-sm text-muted-foreground">
                  Platform-wide analytics and aggregate statistics
                </p>
              </Link>

              <Link
                href="/compare"
                className="p-4 border border-border rounded-lg hover:border-blue-300 hover:bg-primary/5 transition-colors"
              >
                <h3 className="font-semibold text-foreground mb-1">Compare Judges</h3>
                <p className="text-sm text-muted-foreground">
                  Side-by-side comparison of judicial decision patterns
                </p>
              </Link>

              <Link
                href="/legal-research-tools"
                className="p-4 border border-border rounded-lg hover:border-blue-300 hover:bg-primary/5 transition-colors"
              >
                <h3 className="font-semibold text-foreground mb-1">Research Tools</h3>
                <p className="text-sm text-muted-foreground">
                  Advanced legal research and analytics tools
                </p>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

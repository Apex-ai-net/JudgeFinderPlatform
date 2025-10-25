import { Metadata } from 'next'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { createServerClient } from '@/lib/supabase/server'
import { SEOBreadcrumbs } from '@/components/seo/SEOBreadcrumbs'
import {
  BarChart3,
  TrendingUp,
  Scale,
  Users,
  Activity,
  Database,
  Award,
  Building,
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'Judicial Analytics Dashboard | JudgeFinder',
  description:
    'Platform-wide judicial analytics including aggregate statistics, performance metrics, and comparison tools for California judges and courts.',
  alternates: {
    canonical: '/judicial-analytics',
  },
  openGraph: {
    title: 'Judicial Analytics Dashboard | JudgeFinder',
    description: 'Platform-wide judicial analytics and aggregate statistics',
    type: 'website',
  },
}

export const dynamic = 'force-dynamic'

export default async function JudicialAnalyticsPage() {
  const supabase = await createServerClient()

  // Get platform-wide statistics
  const { count: judgeCount } = await supabase
    .from('judges')
    .select('*', { count: 'exact', head: true })

  const { count: courtCount } = await supabase
    .from('courts')
    .select('*', { count: 'exact', head: true })

  const { data: jurisdictions } = await supabase
    .from('courts')
    .select('jurisdiction')
    .not('jurisdiction', 'is', null)

  const uniqueJurisdictions = new Set(jurisdictions?.map((j) => j.jurisdiction) || [])
  const jurisdictionCount = uniqueJurisdictions.size

  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Judicial Analytics', href: '/judicial-analytics' },
  ]

  return (
    <div className="min-h-screen bg-background">
      <SEOBreadcrumbs items={breadcrumbs} />

      {/* Header Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-12">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Judicial Analytics Dashboard</h1>
            <p className="text-xl text-blue-100">
              Platform-wide judicial statistics, performance metrics, and analytical insights across
              California courts
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12 max-w-7xl">
        {/* Platform Statistics */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-foreground mb-6">Platform Coverage</h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader>
                <Users className="h-8 w-8 text-blue-600 mb-2" />
                <CardTitle className="text-3xl">{judgeCount || 0}</CardTitle>
                <CardDescription>Active Judges</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Judges with profile data and analytics
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Building className="h-8 w-8 text-blue-600 mb-2" />
                <CardTitle className="text-3xl">{courtCount || 0}</CardTitle>
                <CardDescription>Courts</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">Courts across California</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Database className="h-8 w-8 text-blue-600 mb-2" />
                <CardTitle className="text-3xl">{jurisdictionCount}</CardTitle>
                <CardDescription>Jurisdictions</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">California counties and districts</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Activity className="h-8 w-8 text-blue-600 mb-2" />
                <CardTitle className="text-3xl">Live</CardTitle>
                <CardDescription>Data Status</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">Real-time analytics updates</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Analytics Categories */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-foreground mb-6">Analytics Categories</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-blue-200">
              <CardHeader>
                <BarChart3 className="h-10 w-10 text-blue-600 mb-3" />
                <CardTitle className="text-xl">Judicial Decision Patterns</CardTitle>
                <CardDescription>
                  Analyze how judges rule on motions, cases, and legal issues
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground mb-4">
                  <li>• Motion grant/denial rates by judge and case type</li>
                  <li>• Case outcome distributions with confidence scoring</li>
                  <li>• Settlement vs trial outcome patterns</li>
                  <li>• Statistical bias detection and analysis</li>
                </ul>
                <Link
                  href="/judges"
                  className="text-primary hover:text-blue-800 font-medium text-sm"
                >
                  Browse Judge Profiles →
                </Link>
              </CardContent>
            </Card>

            <Card className="border-blue-200">
              <CardHeader>
                <TrendingUp className="h-10 w-10 text-blue-600 mb-3" />
                <CardTitle className="text-xl">Temporal Trend Analysis</CardTitle>
                <CardDescription>Track how judicial patterns change over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground mb-4">
                  <li>• Year-over-year decision pattern changes</li>
                  <li>• Case volume and backlog trends</li>
                  <li>• Seasonal variation analysis</li>
                  <li>• Long-term performance trajectory</li>
                </ul>
                <Link
                  href="/case-analytics"
                  className="text-primary hover:text-blue-800 font-medium text-sm"
                >
                  View Case Analytics →
                </Link>
              </CardContent>
            </Card>

            <Card className="border-blue-200">
              <CardHeader>
                <Scale className="h-10 w-10 text-blue-600 mb-3" />
                <CardTitle className="text-xl">Comparative Analytics</CardTitle>
                <CardDescription>Compare judges and courts side-by-side</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground mb-4">
                  <li>• Multi-judge statistical comparison</li>
                  <li>• Jurisdiction baseline benchmarking</li>
                  <li>• Practice area specialization patterns</li>
                  <li>• Relative performance metrics</li>
                </ul>
                <Link
                  href="/compare"
                  className="text-primary hover:text-blue-800 font-medium text-sm"
                >
                  Use Comparison Tool →
                </Link>
              </CardContent>
            </Card>

            <Card className="border-blue-200">
              <CardHeader>
                <Award className="h-10 w-10 text-blue-600 mb-3" />
                <CardTitle className="text-xl">Court Performance Metrics</CardTitle>
                <CardDescription>Evaluate court efficiency and throughput</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground mb-4">
                  <li>• Average case decision time by court</li>
                  <li>• Clearance rate and backlog analysis</li>
                  <li>• Judge workload distribution</li>
                  <li>• Geographic performance comparison</li>
                </ul>
                <Link
                  href="/courts"
                  className="text-primary hover:text-blue-800 font-medium text-sm"
                >
                  Browse Courts →
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Methodology & Transparency */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-foreground mb-6">Methodology & Transparency</h2>

          <Card>
            <CardHeader>
              <CardTitle>How We Calculate Analytics</CardTitle>
              <CardDescription>
                Our analytical approach prioritizes statistical rigor and transparency
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-foreground mb-2">Statistical Confidence</h3>
                  <p className="text-sm text-muted-foreground">
                    We require a minimum of 500 cases for bias pattern analysis to ensure
                    statistical significance. All analytics include confidence intervals and sample
                    size disclosure.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-foreground mb-2">Baseline Comparison</h3>
                  <p className="text-sm text-muted-foreground">
                    Judge-specific patterns are compared against jurisdiction-wide baselines to
                    identify meaningful deviations. This contextualizes individual judicial behavior
                    within broader court norms.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-foreground mb-2">Data Sources</h3>
                  <p className="text-sm text-muted-foreground">
                    Analytics are derived from publicly available court records, judicial opinions,
                    and case outcomes. We continuously update our database to reflect recent
                    decisions and appointments.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-foreground mb-2">Limitations & Disclaimers</h3>
                  <p className="text-sm text-muted-foreground">
                    Past judicial patterns do not guarantee future outcomes. Analytics should
                    inform, not replace, professional legal judgment. Individual case circumstances
                    always matter more than statistical tendencies.
                  </p>
                </div>

                <div className="pt-4 border-t">
                  <Link
                    href="/docs/methodology"
                    className="text-primary hover:text-blue-800 font-medium text-sm"
                  >
                    Read Full Methodology Documentation →
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Access Tools */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-foreground mb-6">Quick Access Tools</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link href="/judges">
              <Card className="h-full hover:shadow-lg transition-shadow hover:border-blue-300">
                <CardHeader>
                  <Users className="h-8 w-8 text-blue-600 mb-2" />
                  <CardTitle>Judge Directory</CardTitle>
                  <CardDescription>Browse and search all judges with analytics</CardDescription>
                </CardHeader>
              </Card>
            </Link>

            <Link href="/compare">
              <Card className="h-full hover:shadow-lg transition-shadow hover:border-blue-300">
                <CardHeader>
                  <Scale className="h-8 w-8 text-blue-600 mb-2" />
                  <CardTitle>Compare Judges</CardTitle>
                  <CardDescription>Side-by-side judicial comparison tool</CardDescription>
                </CardHeader>
              </Card>
            </Link>

            <Link href="/case-analytics">
              <Card className="h-full hover:shadow-lg transition-shadow hover:border-blue-300">
                <CardHeader>
                  <BarChart3 className="h-8 w-8 text-blue-600 mb-2" />
                  <CardTitle>Case Analytics</CardTitle>
                  <CardDescription>Jurisdiction-level case pattern analysis</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          </div>
        </div>

        {/* Related Resources */}
        <Card>
          <CardHeader>
            <CardTitle>Additional Resources</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Link
                href="/legal-research-tools"
                className="p-4 border border-border rounded-lg hover:border-blue-300 hover:bg-primary/5 transition-colors"
              >
                <h3 className="font-semibold text-foreground mb-1">Research Tools</h3>
                <p className="text-sm text-muted-foreground">
                  Full suite of legal research and analytics tools
                </p>
              </Link>

              <Link
                href="/docs/methodology"
                className="p-4 border border-border rounded-lg hover:border-blue-300 hover:bg-primary/5 transition-colors"
              >
                <h3 className="font-semibold text-foreground mb-1">Methodology</h3>
                <p className="text-sm text-muted-foreground">
                  Learn how we calculate judicial analytics
                </p>
              </Link>

              <Link
                href="/help-center"
                className="p-4 border border-border rounded-lg hover:border-blue-300 hover:bg-primary/5 transition-colors"
              >
                <h3 className="font-semibold text-foreground mb-1">Help Center</h3>
                <p className="text-sm text-muted-foreground">
                  Guides and tutorials for using analytics
                </p>
              </Link>

              <Link
                href="/jurisdictions"
                className="p-4 border border-border rounded-lg hover:border-blue-300 hover:bg-primary/5 transition-colors"
              >
                <h3 className="font-semibold text-foreground mb-1">By Jurisdiction</h3>
                <p className="text-sm text-muted-foreground">
                  Browse judges and analytics by county
                </p>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

import { Metadata } from 'next'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { createServerClient } from '@/lib/supabase/server'
import { createCanonicalSlug } from '@/lib/utils/slug'
import { SEOBreadcrumbs } from '@/components/seo/SEOBreadcrumbs'
import { MapPin, Scale, Users, FileText } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Attorney Directory by Jurisdiction | JudgeFinder',
  description:
    'Find experienced attorneys by jurisdiction in California. Search by county, practice area, and court experience.',
  alternates: {
    canonical: '/attorneys',
  },
  openGraph: {
    title: 'Attorney Directory by Jurisdiction | JudgeFinder',
    description: 'Find experienced attorneys by jurisdiction in California',
    type: 'website',
  },
}

export const dynamic = 'force-dynamic'

interface JurisdictionStats {
  jurisdiction: string
  judgeCount: number
  courtCount: number
}

export default async function AttorneysPage() {
  const supabase = await createServerClient()

  // Get jurisdictions with stats from courts table
  const { data: jurisdictions, error } = await supabase
    .from('courts')
    .select('jurisdiction')
    .not('jurisdiction', 'is', null)

  if (error) {
    console.error('[Attorneys] Error fetching jurisdictions:', error)
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
    { label: 'Attorney Directory', href: '/attorneys' },
  ]

  return (
    <div className="min-h-screen bg-background">
      <SEOBreadcrumbs items={breadcrumbs} />

      {/* Header Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-12">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Attorney Directory</h1>
            <p className="text-xl text-blue-100">
              Find experienced attorneys by jurisdiction, practice area, and court experience
              throughout California
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12 max-w-7xl">
        {/* Coming Soon Notice */}
        <Card className="mb-8 border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-900">Attorney Directory Coming Soon</CardTitle>
            <CardDescription className="text-blue-700">
              We are building a comprehensive attorney directory with verified profiles, practice
              areas, and court experience. Check back soon!
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-blue-600 mb-4">In the meantime, you can:</p>
            <ul className="space-y-2 text-sm text-blue-700">
              <li className="flex items-start">
                <Scale className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                <span>Research judges and their decision patterns by jurisdiction</span>
              </li>
              <li className="flex items-start">
                <FileText className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                <span>Analyze case outcomes and judicial analytics</span>
              </li>
              <li className="flex items-start">
                <Users className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                <span>Compare judges serving in different courts</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Browse by Jurisdiction */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-foreground mb-6">
            Browse Attorneys by Jurisdiction
          </h2>
          <p className="text-muted-foreground mb-6">
            Select a jurisdiction to view attorneys practicing in that area. Our directory will
            include verified bar members with court appearance history.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedJurisdictions.map((stats) => {
              const slug = createCanonicalSlug(stats.jurisdiction)

              return (
                <Link key={stats.jurisdiction} href={`/attorneys/${slug}`}>
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
                        <Badge variant="outline" className="text-xs">
                          Coming Soon
                        </Badge>
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
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Features Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card>
            <CardHeader>
              <Scale className="h-8 w-8 text-blue-600 mb-2" />
              <CardTitle className="text-lg">Practice Area Focus</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Find attorneys specialized in family law, criminal defense, civil litigation, and
                more.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Users className="h-8 w-8 text-blue-600 mb-2" />
              <CardTitle className="text-lg">Court Experience</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                See which attorneys have appeared before specific judges with detailed case history.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <FileText className="h-8 w-8 text-blue-600 mb-2" />
              <CardTitle className="text-lg">Verified Profiles</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                All attorneys verified through State Bar membership with active license status.
              </p>
            </CardContent>
          </Card>
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
                  Research judicial officers and their decision patterns
                </p>
              </Link>

              <Link
                href="/courts"
                className="p-4 border border-border rounded-lg hover:border-blue-300 hover:bg-primary/5 transition-colors"
              >
                <h3 className="font-semibold text-foreground mb-1">Court Directory</h3>
                <p className="text-sm text-muted-foreground">
                  Find courts by jurisdiction and type
                </p>
              </Link>

              <Link
                href="/case-analytics"
                className="p-4 border border-border rounded-lg hover:border-blue-300 hover:bg-primary/5 transition-colors"
              >
                <h3 className="font-semibold text-foreground mb-1">Case Analytics</h3>
                <p className="text-sm text-muted-foreground">
                  Analyze case outcomes and judicial patterns
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

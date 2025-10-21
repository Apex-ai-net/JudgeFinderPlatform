import { createServerClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'
import Link from 'next/link'
import { getBaseUrl } from '@/lib/utils/baseUrl'
import { createCanonicalSlug } from '@/lib/utils/slug'
import { MapPin, Building, Scale, Users } from 'lucide-react'

export const dynamic = 'force-dynamic'

const BASE_URL = getBaseUrl()

export const metadata: Metadata = {
  title: 'Browse Judges by County | JudgeFinder',
  description:
    'Find California judges organized by county. Search by geographic location to find courts and judges in your area with comprehensive judicial analytics.',
  keywords:
    'judges by county, California counties, local judges, county courts, judge directory by location',
  alternates: {
    canonical: `${BASE_URL}/judges/by-county`,
  },
  openGraph: {
    title: 'Browse Judges by County | JudgeFinder',
    description:
      'Explore California judges organized by county with comprehensive court information and analytics.',
    url: `${BASE_URL}/judges/by-county`,
    type: 'website',
    siteName: 'JudgeFinder',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Browse Judges by County | JudgeFinder',
    description: 'Find judges and courts by county with detailed profiles and analytics.',
  },
}

interface CountyStats {
  county: string
  judgeCount: number
  courtCount: number
  slug: string
}

async function getCountyStats(): Promise<CountyStats[]> {
  try {
    const supabase = await createServerClient()

    // Get all judges with their jurisdictions
    const { data: judges } = await supabase
      .from('judges')
      .select('jurisdiction, court_id')
      .not('jurisdiction', 'is', null)

    // Get all courts with their jurisdictions
    const { data: courts } = await supabase
      .from('courts')
      .select('jurisdiction, id')
      .not('jurisdiction', 'is', null)

    if (!judges && !courts) {
      return []
    }

    // Extract county names from jurisdictions
    // Common patterns: "Los Angeles County", "Orange County", "CA", etc.
    const countyMap = new Map<string, { judges: Set<string>; courts: Set<string> }>()

    // Process judges
    judges?.forEach((judge) => {
      if (!judge.jurisdiction) return

      let county = judge.jurisdiction

      // Normalize county names
      // If it's just a state code, skip it
      if (county.length === 2 && county.toUpperCase() === county) {
        return
      }

      // Extract county name from patterns like "Los Angeles County, CA" or "Los Angeles County"
      const countyMatch = county.match(/^([^,]+?)(?:\s+County)?(?:,\s*[A-Z]{2})?$/i)
      if (countyMatch) {
        county = countyMatch[1].trim()
        if (!county.toLowerCase().endsWith('county')) {
          county = `${county} County`
        }
      }

      if (!countyMap.has(county)) {
        countyMap.set(county, { judges: new Set(), courts: new Set() })
      }

      const stats = countyMap.get(county)!
      stats.judges.add(judge.court_id || 'unknown')
    })

    // Process courts
    courts?.forEach((court) => {
      if (!court.jurisdiction) return

      let county = court.jurisdiction

      // Skip state codes
      if (county.length === 2 && county.toUpperCase() === county) {
        return
      }

      // Extract county name
      const countyMatch = county.match(/^([^,]+?)(?:\s+County)?(?:,\s*[A-Z]{2})?$/i)
      if (countyMatch) {
        county = countyMatch[1].trim()
        if (!county.toLowerCase().endsWith('county')) {
          county = `${county} County`
        }
      }

      if (!countyMap.has(county)) {
        countyMap.set(county, { judges: new Set(), courts: new Set() })
      }

      const stats = countyMap.get(county)!
      stats.courts.add(court.id)
    })

    // Count judges per county
    const judgeCountByCounty = new Map<string, number>()
    judges?.forEach((judge) => {
      if (!judge.jurisdiction) return

      let county = judge.jurisdiction

      // Skip state codes
      if (county.length === 2 && county.toUpperCase() === county) {
        return
      }

      // Extract county name
      const countyMatch = county.match(/^([^,]+?)(?:\s+County)?(?:,\s*[A-Z]{2})?$/i)
      if (countyMatch) {
        county = countyMatch[1].trim()
        if (!county.toLowerCase().endsWith('county')) {
          county = `${county} County`
        }
      }

      judgeCountByCounty.set(county, (judgeCountByCounty.get(county) || 0) + 1)
    })

    // Convert to array and sort by judge count
    const countyStats: CountyStats[] = Array.from(countyMap.entries())
      .map(([county, stats]) => ({
        county,
        judgeCount: judgeCountByCounty.get(county) || 0,
        courtCount: stats.courts.size,
        slug: createCanonicalSlug(county),
      }))
      .filter((stat) => stat.judgeCount > 0 || stat.courtCount > 0)
      .sort((a, b) => b.judgeCount - a.judgeCount)

    return countyStats
  } catch (error) {
    console.error('Error fetching county stats:', error)
    return []
  }
}

async function getOverallStats(): Promise<{
  totalCounties: number
  totalJudges: number
  totalCourts: number
}> {
  try {
    const supabase = await createServerClient()

    const { count: judgeCount } = await supabase
      .from('judges')
      .select('*', { count: 'exact', head: true })

    const { count: courtCount } = await supabase
      .from('courts')
      .select('*', { count: 'exact', head: true })

    const counties = await getCountyStats()

    return {
      totalCounties: counties.length,
      totalJudges: judgeCount || 0,
      totalCourts: courtCount || 0,
    }
  } catch (error) {
    console.error('Error fetching overall stats:', error)
    return { totalCounties: 0, totalJudges: 0, totalCourts: 0 }
  }
}

export default async function JudgesByCountyPage() {
  const counties = await getCountyStats()
  const overallStats = await getOverallStats()

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary/20 via-primary/10 to-background px-4 py-12">
        <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:50px_50px]" />

        <div className="relative z-10 max-w-7xl mx-auto">
          {/* Breadcrumb */}
          <div className="mb-4 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-primary">
              Home
            </Link>
            <span className="mx-2">/</span>
            <Link href="/judges" className="hover:text-primary">
              Judges
            </Link>
            <span className="mx-2">/</span>
            <span className="text-foreground">By County</span>
          </div>

          <div className="flex items-start">
            <MapPin className="h-16 w-16 text-primary mr-4 flex-shrink-0" />
            <div>
              <h1 className="mb-4 text-4xl md:text-5xl font-bold">
                <span className="bg-gradient-to-r from-primary via-primary/80 to-primary bg-clip-text text-transparent">
                  Browse Judges
                </span>
                <br />
                <span className="text-foreground">by County</span>
              </h1>

              <p className="text-lg md:text-xl text-muted-foreground max-w-3xl">
                Find California judges and courts organized by county. Search by geographic location
                to discover judicial profiles, court information, and analytics in your area.
              </p>
            </div>
          </div>

          {/* Overall Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="text-3xl font-bold text-primary">{overallStats.totalCounties}</div>
              <div className="text-sm text-muted-foreground">Counties</div>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="text-3xl font-bold text-primary">{overallStats.totalJudges}</div>
              <div className="text-sm text-muted-foreground">Total Judges</div>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="text-3xl font-bold text-primary">{overallStats.totalCourts}</div>
              <div className="text-sm text-muted-foreground">Total Courts</div>
            </div>
          </div>
        </div>
      </section>

      {/* Counties List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {counties.length === 0 ? (
          <div className="text-center py-12">
            <MapPin className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">No Counties Found</h2>
            <p className="text-muted-foreground">
              There are currently no counties with judges in our database.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-2">
                {counties.length} California {counties.length === 1 ? 'County' : 'Counties'}
              </h2>
              <p className="text-muted-foreground">
                Sorted by number of judges (largest counties first)
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {counties.map((county) => {
                // Create link to jurisdictions page (existing functionality)
                const jurisdictionSlug = county.slug

                return (
                  <Link
                    key={county.county}
                    href={`/jurisdictions/${jurisdictionSlug}`}
                    className="group block bg-card border border-border rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden hover:scale-105"
                  >
                    {/* Card Header */}
                    <div className="bg-gradient-to-r from-primary to-primary/80 p-4 text-white">
                      <div className="flex items-start justify-between">
                        <MapPin className="h-8 w-8 flex-shrink-0" />
                        <div className="text-right ml-2">
                          <div className="text-2xl font-bold">{county.judgeCount}</div>
                          <div className="text-xs text-white/80">
                            {county.judgeCount === 1 ? 'Judge' : 'Judges'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-4 space-y-3">
                      <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors">
                        {county.county}
                      </h3>

                      <div className="space-y-2 text-sm text-muted-foreground">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <Scale className="h-4 w-4 mr-2" />
                            <span>{county.judgeCount} judges</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <Building className="h-4 w-4 mr-2" />
                            <span>{county.courtCount} courts</span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-border">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center text-primary">
                            <Users className="h-4 w-4 mr-1" />
                            <span className="font-semibold">View All</span>
                          </div>
                          <span className="text-primary group-hover:text-primary/80 font-medium">
                            Explore →
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </>
        )}

        {/* Info Section */}
        <div className="mt-12 bg-card border border-border rounded-xl p-8">
          <h2 className="text-2xl font-bold text-foreground mb-4">Finding Judges in Your County</h2>
          <div className="space-y-4 text-muted-foreground">
            <p>
              California's judicial system is organized by county, with each county having its own
              Superior Court and assigned judges. Use this directory to:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Find judges serving in your local county courts for cases filed in your area</li>
              <li>
                Research judicial patterns and decision-making trends specific to your jurisdiction
              </li>
              <li>
                Compare judges within the same county to make informed decisions about legal
                representation
              </li>
              <li>Access contact information and courthouse details for courts in your county</li>
              <li>
                Review judicial analytics and case statistics relevant to your local legal community
              </li>
            </ul>
            <p className="text-sm italic mt-4">
              Note: Some judges may serve multiple counties or courts. County assignments are based
              on primary court jurisdiction.
            </p>
          </div>
        </div>

        {/* Back Link */}
        <div className="mt-8 text-center">
          <Link
            href="/judges"
            className="inline-flex items-center text-primary hover:text-primary/80 font-medium"
          >
            ← Browse All Judges
          </Link>
        </div>
      </div>
    </div>
  )
}

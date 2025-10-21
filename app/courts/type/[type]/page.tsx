import { createServerClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getBaseUrl } from '@/lib/utils/baseUrl'
import { resolveCourtSlug } from '@/lib/utils/slug'
import { Building, MapPin, Phone, Globe, Users } from 'lucide-react'
import type { Court } from '@/types'

export const dynamic = 'force-dynamic'

const BASE_URL = getBaseUrl()

// Valid court types
const VALID_TYPES = ['superior', 'appellate', 'supreme', 'federal', 'municipal'] as const
type CourtType = (typeof VALID_TYPES)[number]

// Type labels for display
const TYPE_LABELS: Record<CourtType, string> = {
  superior: 'Superior Courts',
  appellate: 'Appellate Courts',
  supreme: 'Supreme Courts',
  federal: 'Federal Courts',
  municipal: 'Municipal Courts',
}

// Type descriptions
const TYPE_DESCRIPTIONS: Record<CourtType, string> = {
  superior:
    'Superior courts are trial courts with general jurisdiction over civil and criminal cases, family law, probate, and juvenile matters.',
  appellate:
    'Appellate courts review decisions from trial courts to ensure proper application of law and legal procedures.',
  supreme:
    'Supreme courts serve as the highest judicial authority, providing final appellate review and setting legal precedents.',
  federal:
    'Federal courts handle cases involving federal law, constitutional issues, disputes between states, and matters involving the United States government.',
  municipal:
    'Municipal courts handle local matters such as traffic violations, city ordinance violations, and minor civil disputes.',
}

type Params = Promise<{ type: string }>

// Generate static params for all valid court types
export async function generateStaticParams() {
  return VALID_TYPES.map((type) => ({ type }))
}

interface CourtWithJudges extends Court {
  judge_count: number
}

async function getCourtsByType(courtType: CourtType): Promise<CourtWithJudges[]> {
  try {
    const supabase = await createServerClient()

    const { data, error } = await supabase
      .from('courts')
      .select('*')
      .ilike('type', `%${courtType}%`)
      .order('jurisdiction', { ascending: true })
      .order('name', { ascending: true })

    if (error) {
      console.error('Error fetching courts by type:', error)
      return []
    }

    return (data || []) as CourtWithJudges[]
  } catch (error) {
    console.error('Error in getCourtsByType:', error)
    return []
  }
}

async function getTypeStats(courtType: CourtType): Promise<{
  totalCourts: number
  totalJudges: number
  jurisdictions: string[]
}> {
  try {
    const supabase = await createServerClient()

    const { data: courts } = await supabase
      .from('courts')
      .select('judge_count, jurisdiction')
      .ilike('type', `%${courtType}%`)

    const totalCourts = courts?.length || 0
    const totalJudges = courts?.reduce((sum, court) => sum + (court.judge_count || 0), 0) || 0
    const jurisdictions = Array.from(
      new Set(courts?.map((c) => c.jurisdiction).filter(Boolean) as string[])
    ).sort()

    return { totalCourts, totalJudges, jurisdictions }
  } catch (error) {
    console.error('Error fetching type stats:', error)
    return { totalCourts: 0, totalJudges: 0, jurisdictions: [] }
  }
}

export default async function CourtTypeFilterPage({ params }: { params: Params }) {
  const { type } = await params

  // Validate court type
  if (!VALID_TYPES.includes(type as CourtType)) {
    notFound()
  }

  const courtType = type as CourtType
  const courts = await getCourtsByType(courtType)
  const stats = await getTypeStats(courtType)

  // Group courts by jurisdiction
  const courtsByJurisdiction = courts.reduce(
    (acc, court) => {
      const jurisdiction = court.jurisdiction || 'Other'
      if (!acc[jurisdiction]) {
        acc[jurisdiction] = []
      }
      acc[jurisdiction].push(court)
      return acc
    },
    {} as Record<string, CourtWithJudges[]>
  )

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-enterprise-primary/20 via-enterprise-deep/10 to-background px-4 py-12">
        <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:50px_50px]" />

        <div className="relative z-10 max-w-7xl mx-auto">
          {/* Breadcrumb */}
          <div className="mb-4 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-primary">
              Home
            </Link>
            <span className="mx-2">/</span>
            <Link href="/courts" className="hover:text-primary">
              Courts
            </Link>
            <span className="mx-2">/</span>
            <Link href="/courts/type" className="hover:text-primary">
              Types
            </Link>
            <span className="mx-2">/</span>
            <span className="text-foreground">{TYPE_LABELS[courtType]}</span>
          </div>

          <h1 className="mb-4 text-4xl md:text-5xl font-bold">
            <span className="bg-gradient-to-r from-enterprise-primary to-enterprise-deep bg-clip-text text-transparent">
              {TYPE_LABELS[courtType]}
            </span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mb-6">
            {TYPE_DESCRIPTIONS[courtType]}
          </p>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="text-3xl font-bold text-primary">{stats.totalCourts}</div>
              <div className="text-sm text-muted-foreground">
                {stats.totalCourts === 1 ? 'Court' : 'Courts'}
              </div>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="text-3xl font-bold text-primary">{stats.totalJudges}</div>
              <div className="text-sm text-muted-foreground">Active Judges</div>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="text-3xl font-bold text-primary">{stats.jurisdictions.length}</div>
              <div className="text-sm text-muted-foreground">
                {stats.jurisdictions.length === 1 ? 'Jurisdiction' : 'Jurisdictions'}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Courts List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {courts.length === 0 ? (
          <div className="text-center py-12">
            <Building className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">No Courts Found</h2>
            <p className="text-muted-foreground">
              There are currently no {TYPE_LABELS[courtType].toLowerCase()} in our database.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(courtsByJurisdiction)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([jurisdiction, jurisdictionCourts]) => (
                <div key={jurisdiction}>
                  <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center">
                    <MapPin className="h-6 w-6 mr-2 text-primary" />
                    {jurisdiction}
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {jurisdictionCourts.map((court) => {
                      const courtSlug = resolveCourtSlug(court) || court.id
                      return (
                        <Link
                          key={court.id}
                          href={`/courts/${courtSlug}`}
                          className="group block bg-card border border-border rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden hover:scale-105"
                        >
                          {/* Card Header */}
                          <div className="bg-gradient-to-r from-primary to-primary/80 p-4 text-white">
                            <div className="flex items-start justify-between">
                              <Building className="h-8 w-8 flex-shrink-0" />
                              <div className="text-right ml-2">
                                <div className="text-2xl font-bold">{court.judge_count || 0}</div>
                                <div className="text-xs text-white/80">Judges</div>
                              </div>
                            </div>
                          </div>

                          {/* Card Body */}
                          <div className="p-4 space-y-3">
                            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                              {court.name}
                            </h3>

                            <div className="space-y-2 text-sm text-muted-foreground">
                              {court.address && (
                                <div className="flex items-start">
                                  <MapPin className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                                  <span className="line-clamp-2">{court.address}</span>
                                </div>
                              )}

                              {court.phone && (
                                <div className="flex items-center">
                                  <Phone className="h-4 w-4 mr-2 flex-shrink-0" />
                                  <span>{court.phone}</span>
                                </div>
                              )}

                              {court.website && (
                                <div className="flex items-center">
                                  <Globe className="h-4 w-4 mr-2 flex-shrink-0" />
                                  <span className="text-primary hover:text-primary/80 truncate">
                                    Visit Website
                                  </span>
                                </div>
                              )}
                            </div>

                            <div className="pt-3 border-t border-border flex items-center justify-between text-sm">
                              <div className="flex items-center text-muted-foreground">
                                <Users className="h-4 w-4 mr-1" />
                                <span>
                                  {court.judge_count || 0}{' '}
                                  {court.judge_count === 1 ? 'Judge' : 'Judges'}
                                </span>
                              </div>
                              <span className="text-primary group-hover:text-primary/80 font-medium">
                                View Details →
                              </span>
                            </div>
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              ))}
          </div>
        )}

        {/* Back Link */}
        <div className="mt-12 text-center">
          <Link
            href="/courts/type"
            className="inline-flex items-center text-primary hover:text-primary/80 font-medium"
          >
            ← Browse All Court Types
          </Link>
        </div>
      </div>
    </div>
  )
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { type } = await params

  if (!VALID_TYPES.includes(type as CourtType)) {
    return {
      title: 'Court Type Not Found | JudgeFinder',
      description: 'The requested court type could not be found.',
    }
  }

  const courtType = type as CourtType
  const label = TYPE_LABELS[courtType]
  const description = TYPE_DESCRIPTIONS[courtType]

  return {
    title: `${label} in California | JudgeFinder`,
    description: `${description} Browse all California ${label.toLowerCase()} with comprehensive judge information and analytics.`,
    keywords: `${label}, California ${label.toLowerCase()}, court directory, judge information`,
    alternates: {
      canonical: `${BASE_URL}/courts/type/${type}`,
    },
    openGraph: {
      title: `${label} in California | JudgeFinder`,
      description: `Explore California ${label.toLowerCase()} with detailed judge directories and court information.`,
      url: `${BASE_URL}/courts/type/${type}`,
      type: 'website',
      siteName: 'JudgeFinder',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${label} in California | JudgeFinder`,
      description: `Find comprehensive information about California ${label.toLowerCase()}.`,
    },
  }
}

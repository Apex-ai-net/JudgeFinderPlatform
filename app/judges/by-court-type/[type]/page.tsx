import { createServerClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getBaseUrl } from '@/lib/utils/baseUrl'
import { createCanonicalSlug } from '@/lib/utils/slug'
import { Scale, MapPin, Building, Calendar, Gavel } from 'lucide-react'
import type { Judge } from '@/types'

export const dynamic = 'force-dynamic'

const BASE_URL = getBaseUrl()

// Valid court types
const VALID_TYPES = ['superior', 'appellate', 'supreme', 'federal', 'municipal'] as const
type CourtType = (typeof VALID_TYPES)[number]

// Type labels for display
const TYPE_LABELS: Record<CourtType, string> = {
  superior: 'Superior Court',
  appellate: 'Appellate Court',
  supreme: 'Supreme Court',
  federal: 'Federal Court',
  municipal: 'Municipal Court',
}

// Type descriptions
const TYPE_DESCRIPTIONS: Record<CourtType, string> = {
  superior:
    'Judges presiding over trial courts with general jurisdiction over civil and criminal cases.',
  appellate: 'Justices reviewing decisions from trial courts and hearing appeals.',
  supreme: 'Justices serving on the highest courts with final appellate jurisdiction.',
  federal:
    'Judges serving in U.S. District Courts and Federal Circuit Courts handling federal law matters.',
  municipal: 'Judges handling local matters such as traffic violations and city ordinances.',
}

type Params = Promise<{ type: string }>

// Generate static params for all valid court types
export async function generateStaticParams() {
  return VALID_TYPES.map((type) => ({ type }))
}

interface JudgeWithCourt extends Judge {
  courts?: {
    id: string
    name: string
    type: string
    jurisdiction: string
  } | null
}

async function getJudgesByCourtType(courtType: CourtType): Promise<JudgeWithCourt[]> {
  try {
    const supabase = await createServerClient()

    // Join judges with courts and filter by court type
    const { data, error } = await supabase
      .from('judges')
      .select('*, courts!inner(id, name, type, jurisdiction)')
      .ilike('courts.type', `%${courtType}%`)
      .order('name', { ascending: true })

    if (error) {
      console.error('Error fetching judges by court type:', error)
      return []
    }

    return (data || []) as JudgeWithCourt[]
  } catch (error) {
    console.error('Error in getJudgesByCourtType:', error)
    return []
  }
}

async function getCourtTypeStats(courtType: CourtType): Promise<{
  totalJudges: number
  totalCourts: number
  jurisdictions: string[]
}> {
  try {
    const supabase = await createServerClient()

    // Get unique courts and jurisdictions
    const { data: judges } = await supabase
      .from('judges')
      .select('court_id, jurisdiction, courts!inner(id, type)')
      .ilike('courts.type', `%${courtType}%`)

    const totalJudges = judges?.length || 0
    const uniqueCourts = new Set(judges?.map((j) => j.court_id).filter(Boolean))
    const uniqueJurisdictions = new Set(judges?.map((j) => j.jurisdiction).filter(Boolean))

    return {
      totalJudges,
      totalCourts: uniqueCourts.size,
      jurisdictions: Array.from(uniqueJurisdictions).sort() as string[],
    }
  } catch (error) {
    console.error('Error fetching court type stats:', error)
    return { totalJudges: 0, totalCourts: 0, jurisdictions: [] }
  }
}

export default async function JudgesByCourtTypePage({ params }: { params: Params }) {
  const { type } = await params

  // Validate court type
  if (!VALID_TYPES.includes(type as CourtType)) {
    notFound()
  }

  const courtType = type as CourtType
  const judges = await getJudgesByCourtType(courtType)
  const stats = await getCourtTypeStats(courtType)

  // Group judges by court
  const judgesByCourt = judges.reduce(
    (acc, judge) => {
      const courtName = judge.courts?.name || 'Unknown Court'
      if (!acc[courtName]) {
        acc[courtName] = []
      }
      acc[courtName].push(judge)
      return acc
    },
    {} as Record<string, JudgeWithCourt[]>
  )

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
            <span className="text-foreground">{TYPE_LABELS[courtType]} Judges</span>
          </div>

          <h1 className="mb-4 text-4xl md:text-5xl font-bold">
            <span className="bg-gradient-to-r from-primary via-primary/80 to-primary bg-clip-text text-transparent">
              {TYPE_LABELS[courtType]} Judges
            </span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mb-6">
            {TYPE_DESCRIPTIONS[courtType]}
          </p>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="text-3xl font-bold text-primary">{stats.totalJudges}</div>
              <div className="text-sm text-muted-foreground">
                {stats.totalJudges === 1 ? 'Judge' : 'Judges'}
              </div>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="text-3xl font-bold text-primary">{stats.totalCourts}</div>
              <div className="text-sm text-muted-foreground">
                {stats.totalCourts === 1 ? 'Court' : 'Courts'}
              </div>
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

      {/* Judges List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {judges.length === 0 ? (
          <div className="text-center py-12">
            <Gavel className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">No Judges Found</h2>
            <p className="text-muted-foreground">
              There are currently no {TYPE_LABELS[courtType].toLowerCase()} judges in our database.
            </p>
          </div>
        ) : (
          <div className="space-y-10">
            {Object.entries(judgesByCourt)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([courtName, courtJudges]) => (
                <div key={courtName}>
                  <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center">
                    <Building className="h-6 w-6 mr-2 text-primary" />
                    {courtName}
                    <span className="ml-3 text-sm font-normal text-muted-foreground">
                      ({courtJudges.length} {courtJudges.length === 1 ? 'judge' : 'judges'})
                    </span>
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {courtJudges.map((judge) => {
                      const judgeSlug = judge.slug || createCanonicalSlug(judge.name)
                      const appointedDate = judge.appointed_date
                        ? new Date(judge.appointed_date).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                          })
                        : null

                      return (
                        <Link
                          key={judge.id}
                          href={`/judges/${judgeSlug}`}
                          className="group block bg-card border border-border rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden hover:scale-105"
                        >
                          {/* Card Header */}
                          <div className="bg-gradient-to-r from-primary to-primary/80 p-4 text-white">
                            <div className="flex items-start justify-between">
                              <Scale className="h-8 w-8 flex-shrink-0" />
                              <div className="text-right ml-2">
                                <div className="text-xs text-white/80 uppercase tracking-wide">
                                  {TYPE_LABELS[courtType]}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Card Body */}
                          <div className="p-4 space-y-3">
                            <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors">
                              {judge.name}
                            </h3>

                            <div className="space-y-2 text-sm text-muted-foreground">
                              {judge.courts?.name && (
                                <div className="flex items-start">
                                  <Building className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                                  <span className="line-clamp-2">{judge.courts.name}</span>
                                </div>
                              )}

                              {judge.jurisdiction && (
                                <div className="flex items-center">
                                  <MapPin className="h-4 w-4 mr-2 flex-shrink-0" />
                                  <span>{judge.jurisdiction}</span>
                                </div>
                              )}

                              {appointedDate && (
                                <div className="flex items-center">
                                  <Calendar className="h-4 w-4 mr-2 flex-shrink-0" />
                                  <span className="text-xs">Appointed: {appointedDate}</span>
                                </div>
                              )}
                            </div>

                            <div className="pt-3 border-t border-border">
                              <div className="flex items-center justify-between text-sm">
                                <div className="text-muted-foreground">
                                  {judge.total_cases > 0 && (
                                    <span>
                                      {judge.total_cases}{' '}
                                      {judge.total_cases === 1 ? 'case' : 'cases'}
                                    </span>
                                  )}
                                </div>
                                <span className="text-primary group-hover:text-primary/80 font-medium">
                                  View Profile →
                                </span>
                              </div>
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
    title: `${label} Judges in California | JudgeFinder`,
    description: `Browse California ${label.toLowerCase()} judges. ${description}`,
    keywords: `${label} judges, California ${label.toLowerCase()}, judge directory, judicial profiles`,
    alternates: {
      canonical: `${BASE_URL}/judges/by-court-type/${type}`,
    },
    openGraph: {
      title: `${label} Judges in California | JudgeFinder`,
      description: `Explore California ${label.toLowerCase()} judges with detailed profiles and analytics.`,
      url: `${BASE_URL}/judges/by-court-type/${type}`,
      type: 'website',
      siteName: 'JudgeFinder',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${label} Judges in California | JudgeFinder`,
      description: `Find comprehensive information about California ${label.toLowerCase()} judges.`,
    },
  }
}

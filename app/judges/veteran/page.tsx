import { createServerClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'
import Link from 'next/link'
import { getBaseUrl } from '@/lib/utils/baseUrl'
import { createCanonicalSlug } from '@/lib/utils/slug'
import { Award, Calendar, Scale, MapPin, Building } from 'lucide-react'
import type { Judge } from '@/types'

export const dynamic = 'force-dynamic'

const BASE_URL = getBaseUrl()

export const metadata: Metadata = {
  title: 'Veteran Judges (15+ Years Experience) | JudgeFinder',
  description:
    'Browse experienced California judges with 15 or more years on the bench. View their appointment dates, courts, and comprehensive judicial analytics.',
  keywords:
    'veteran judges, experienced judges, senior judges, judicial experience, California judges, seasoned judges',
  alternates: {
    canonical: `${BASE_URL}/judges/veteran`,
  },
  openGraph: {
    title: 'Veteran Judges (15+ Years Experience) | JudgeFinder',
    description:
      'Explore California judges with 15+ years of judicial experience. Comprehensive profiles and analytics.',
    url: `${BASE_URL}/judges/veteran`,
    type: 'website',
    siteName: 'JudgeFinder',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Veteran Judges (15+ Years Experience) | JudgeFinder',
    description: 'Find experienced California judges with detailed profiles and analytics.',
  },
}

interface VeteranJudge extends Judge {
  years_of_service: number
  court_name: string | null
}

async function getVeteranJudges(): Promise<VeteranJudge[]> {
  try {
    const supabase = await createServerClient()

    // Calculate date 15 years ago
    const fifteenYearsAgo = new Date()
    fifteenYearsAgo.setFullYear(fifteenYearsAgo.getFullYear() - 15)

    const { data, error } = await supabase
      .from('judges')
      .select('*')
      .not('appointed_date', 'is', null)
      .lte('appointed_date', fifteenYearsAgo.toISOString())
      .order('appointed_date', { ascending: true })

    if (error) {
      console.error('Error fetching veteran judges:', error)
      return []
    }

    // Calculate years of service for each judge
    const judgesWithService = (data || []).map((judge) => {
      const appointedDate = new Date(judge.appointed_date!)
      const now = new Date()
      const years = now.getFullYear() - appointedDate.getFullYear()
      return {
        ...judge,
        years_of_service: years,
      } as VeteranJudge
    })

    return judgesWithService
  } catch (error) {
    console.error('Error in getVeteranJudges:', error)
    return []
  }
}

async function getVeteranStats(): Promise<{
  totalJudges: number
  averageExperience: number
  mostSeniorYears: number
}> {
  try {
    const supabase = await createServerClient()

    const fifteenYearsAgo = new Date()
    fifteenYearsAgo.setFullYear(fifteenYearsAgo.getFullYear() - 15)

    const { data } = await supabase
      .from('judges')
      .select('appointed_date')
      .not('appointed_date', 'is', null)
      .lte('appointed_date', fifteenYearsAgo.toISOString())

    if (!data || data.length === 0) {
      return { totalJudges: 0, averageExperience: 0, mostSeniorYears: 0 }
    }

    const now = new Date()
    const experiences = data.map((judge) => {
      const appointedDate = new Date(judge.appointed_date!)
      return now.getFullYear() - appointedDate.getFullYear()
    })

    const averageExperience = Math.round(
      experiences.reduce((sum, exp) => sum + exp, 0) / experiences.length
    )
    const mostSeniorYears = Math.max(...experiences)

    return {
      totalJudges: data.length,
      averageExperience,
      mostSeniorYears,
    }
  } catch (error) {
    console.error('Error fetching veteran stats:', error)
    return { totalJudges: 0, averageExperience: 0, mostSeniorYears: 0 }
  }
}

export default async function VeteranJudgesPage() {
  const judges = await getVeteranJudges()
  const stats = await getVeteranStats()

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-amber-500/20 via-amber-700/10 to-background px-4 py-12">
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
            <span className="text-foreground">Veteran Judges</span>
          </div>

          <div className="flex items-start">
            <Award className="h-16 w-16 text-amber-500 mr-4 flex-shrink-0" />
            <div>
              <h1 className="mb-4 text-4xl md:text-5xl font-bold">
                <span className="bg-gradient-to-r from-amber-500 to-amber-700 bg-clip-text text-transparent">
                  Veteran Judges
                </span>
              </h1>

              <p className="text-lg md:text-xl text-muted-foreground max-w-3xl">
                Experienced California judges with 15 or more years of judicial service. These
                seasoned jurists bring extensive knowledge and precedent to their courtrooms.
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="text-3xl font-bold text-amber-500">{stats.totalJudges}</div>
              <div className="text-sm text-muted-foreground">Veteran Judges</div>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="text-3xl font-bold text-amber-500">{stats.averageExperience}</div>
              <div className="text-sm text-muted-foreground">Average Years Experience</div>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="text-3xl font-bold text-amber-500">{stats.mostSeniorYears}</div>
              <div className="text-sm text-muted-foreground">Most Senior Judge (Years)</div>
            </div>
          </div>
        </div>
      </section>

      {/* Judges List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {judges.length === 0 ? (
          <div className="text-center py-12">
            <Award className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">No Veteran Judges Found</h2>
            <p className="text-muted-foreground">
              There are currently no judges with 15+ years of experience in our database.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-2">
                {stats.totalJudges} Veteran {stats.totalJudges === 1 ? 'Judge' : 'Judges'}
              </h2>
              <p className="text-muted-foreground">
                Sorted by seniority (longest-serving judges first)
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {judges.map((judge) => {
                const judgeSlug = judge.slug || createCanonicalSlug(judge.name)
                const appointedDate = judge.appointed_date
                  ? new Date(judge.appointed_date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })
                  : 'Date not available'

                return (
                  <Link
                    key={judge.id}
                    href={`/judges/${judgeSlug}`}
                    className="group block bg-card border border-border rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden hover:scale-105"
                  >
                    {/* Card Header */}
                    <div className="bg-gradient-to-r from-amber-500 to-amber-700 p-4 text-white">
                      <div className="flex items-start justify-between">
                        <Scale className="h-8 w-8 flex-shrink-0" />
                        <div className="text-right ml-2">
                          <div className="text-2xl font-bold">{judge.years_of_service}</div>
                          <div className="text-xs text-white/80">Years</div>
                        </div>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-4 space-y-3">
                      <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors">
                        {judge.name}
                      </h3>

                      <div className="space-y-2 text-sm text-muted-foreground">
                        {judge.court_name && (
                          <div className="flex items-start">
                            <Building className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                            <span className="line-clamp-2">{judge.court_name}</span>
                          </div>
                        )}

                        {judge.jurisdiction && (
                          <div className="flex items-center">
                            <MapPin className="h-4 w-4 mr-2 flex-shrink-0" />
                            <span>{judge.jurisdiction}</span>
                          </div>
                        )}

                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-2 flex-shrink-0" />
                          <span className="text-xs">Appointed: {appointedDate}</span>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-border">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center text-amber-600">
                            <Award className="h-4 w-4 mr-1" />
                            <span className="font-semibold">
                              {judge.years_of_service} years experience
                            </span>
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
          </>
        )}

        {/* Info Section */}
        <div className="mt-12 bg-gradient-to-br from-amber-500/10 to-amber-700/5 border border-amber-500/20 rounded-xl p-8">
          <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center">
            <Award className="h-6 w-6 mr-2 text-amber-500" />
            Why Experience Matters
          </h2>
          <div className="space-y-3 text-muted-foreground">
            <p>
              Veteran judges with 15+ years of experience bring invaluable knowledge to the bench:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Deep understanding of legal precedent and statutory interpretation</li>
              <li>Extensive courtroom management experience</li>
              <li>Established patterns and predictable decision-making</li>
              <li>Mentorship role for newer judges in their jurisdiction</li>
              <li>Historical perspective on evolving areas of law</li>
            </ul>
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

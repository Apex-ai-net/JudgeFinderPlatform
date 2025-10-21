import { createServerClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'
import Link from 'next/link'
import { getBaseUrl } from '@/lib/utils/baseUrl'
import { createCanonicalSlug } from '@/lib/utils/slug'
import { Sparkles, Calendar, Scale, MapPin, Building, TrendingUp } from 'lucide-react'
import type { Judge } from '@/types'

export const dynamic = 'force-dynamic'

const BASE_URL = getBaseUrl()

export const metadata: Metadata = {
  title: 'Recently Appointed Judges (Last 2 Years) | JudgeFinder',
  description:
    'Browse California judges appointed in the last 2 years. View their appointment dates, courts, and track new judicial appointments.',
  keywords:
    'new judges, recently appointed judges, new appointments, California judges, judicial appointments, newest judges',
  alternates: {
    canonical: `${BASE_URL}/judges/recently-appointed`,
  },
  openGraph: {
    title: 'Recently Appointed Judges (Last 2 Years) | JudgeFinder',
    description:
      'Explore California judges appointed in the last 2 years. Track new appointments and view judicial profiles.',
    url: `${BASE_URL}/judges/recently-appointed`,
    type: 'website',
    siteName: 'JudgeFinder',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Recently Appointed Judges (Last 2 Years) | JudgeFinder',
    description: 'Find recently appointed California judges with detailed profiles.',
  },
}

interface RecentJudge extends Judge {
  days_since_appointment: number
  months_since_appointment: number
}

async function getRecentlyAppointedJudges(): Promise<RecentJudge[]> {
  try {
    const supabase = await createServerClient()

    // Calculate date 2 years ago
    const twoYearsAgo = new Date()
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2)

    const { data, error } = await supabase
      .from('judges')
      .select('*')
      .not('appointed_date', 'is', null)
      .gte('appointed_date', twoYearsAgo.toISOString())
      .order('appointed_date', { ascending: false })

    if (error) {
      console.error('Error fetching recently appointed judges:', error)
      return []
    }

    // Calculate time since appointment for each judge
    const judgesWithDuration = (data || []).map((judge) => {
      const appointedDate = new Date(judge.appointed_date!)
      const now = new Date()
      const daysDiff = Math.floor((now.getTime() - appointedDate.getTime()) / (1000 * 60 * 60 * 24))
      const monthsDiff = Math.floor(daysDiff / 30)

      return {
        ...judge,
        days_since_appointment: daysDiff,
        months_since_appointment: monthsDiff,
      } as RecentJudge
    })

    return judgesWithDuration
  } catch (error) {
    console.error('Error in getRecentlyAppointedJudges:', error)
    return []
  }
}

async function getRecentAppointmentStats(): Promise<{
  totalJudges: number
  thisYear: number
  lastYear: number
  newestDaysAgo: number
}> {
  try {
    const supabase = await createServerClient()

    const twoYearsAgo = new Date()
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2)

    const currentYear = new Date().getFullYear()
    const lastYear = currentYear - 1

    const { data } = await supabase
      .from('judges')
      .select('appointed_date')
      .not('appointed_date', 'is', null)
      .gte('appointed_date', twoYearsAgo.toISOString())

    if (!data || data.length === 0) {
      return { totalJudges: 0, thisYear: 0, lastYear: 0, newestDaysAgo: 0 }
    }

    const now = new Date()
    const thisYearCount = data.filter(
      (j) => new Date(j.appointed_date!).getFullYear() === currentYear
    ).length
    const lastYearCount = data.filter(
      (j) => new Date(j.appointed_date!).getFullYear() === lastYear
    ).length

    const newestDate = new Date(Math.max(...data.map((j) => new Date(j.appointed_date!).getTime())))
    const newestDaysAgo = Math.floor((now.getTime() - newestDate.getTime()) / (1000 * 60 * 60 * 24))

    return {
      totalJudges: data.length,
      thisYear: thisYearCount,
      lastYear: lastYearCount,
      newestDaysAgo,
    }
  } catch (error) {
    console.error('Error fetching recent appointment stats:', error)
    return { totalJudges: 0, thisYear: 0, lastYear: 0, newestDaysAgo: 0 }
  }
}

export default async function RecentlyAppointedJudgesPage() {
  const judges = await getRecentlyAppointedJudges()
  const stats = await getRecentAppointmentStats()

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-emerald-500/20 via-emerald-700/10 to-background px-4 py-12">
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
            <span className="text-foreground">Recently Appointed</span>
          </div>

          <div className="flex items-start">
            <Sparkles className="h-16 w-16 text-emerald-500 mr-4 flex-shrink-0" />
            <div>
              <h1 className="mb-4 text-4xl md:text-5xl font-bold">
                <span className="bg-gradient-to-r from-emerald-500 to-emerald-700 bg-clip-text text-transparent">
                  Recently Appointed Judges
                </span>
              </h1>

              <p className="text-lg md:text-xl text-muted-foreground max-w-3xl">
                California judges appointed within the last 2 years. Track new appointments and
                explore profiles of the newest members of the judiciary.
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-8">
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="text-3xl font-bold text-emerald-500">{stats.totalJudges}</div>
              <div className="text-sm text-muted-foreground">Recent Appointments</div>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="text-3xl font-bold text-emerald-500">{stats.thisYear}</div>
              <div className="text-sm text-muted-foreground">This Year</div>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="text-3xl font-bold text-emerald-500">{stats.lastYear}</div>
              <div className="text-sm text-muted-foreground">Last Year</div>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="text-3xl font-bold text-emerald-500">{stats.newestDaysAgo}</div>
              <div className="text-sm text-muted-foreground">Days Since Newest</div>
            </div>
          </div>
        </div>
      </section>

      {/* Judges List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {judges.length === 0 ? (
          <div className="text-center py-12">
            <Sparkles className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">
              No Recent Appointments Found
            </h2>
            <p className="text-muted-foreground">
              There are currently no judges appointed in the last 2 years in our database.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-2">
                {stats.totalJudges} Recent{' '}
                {stats.totalJudges === 1 ? 'Appointment' : 'Appointments'}
              </h2>
              <p className="text-muted-foreground">Sorted by appointment date (newest first)</p>
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

                // Determine time display
                const timeDisplay =
                  judge.months_since_appointment < 1
                    ? `${judge.days_since_appointment} days ago`
                    : judge.months_since_appointment < 12
                      ? `${judge.months_since_appointment} ${judge.months_since_appointment === 1 ? 'month' : 'months'} ago`
                      : `${Math.floor(judge.months_since_appointment / 12)} ${Math.floor(judge.months_since_appointment / 12) === 1 ? 'year' : 'years'} ago`

                // Newest badge for judges appointed in last 30 days
                const isVeryNew = judge.days_since_appointment < 30

                return (
                  <Link
                    key={judge.id}
                    href={`/judges/${judgeSlug}`}
                    className="group block bg-card border border-border rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden hover:scale-105"
                  >
                    {/* Card Header */}
                    <div className="bg-gradient-to-r from-emerald-500 to-emerald-700 p-4 text-white relative">
                      {isVeryNew && (
                        <div className="absolute top-2 right-2">
                          <span className="bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-1 rounded-full">
                            NEW
                          </span>
                        </div>
                      )}
                      <div className="flex items-start justify-between">
                        <Scale className="h-8 w-8 flex-shrink-0" />
                        <div className="text-right ml-2">
                          <div className="text-sm font-bold">{timeDisplay}</div>
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
                          <div className="flex items-center text-emerald-600">
                            <TrendingUp className="h-4 w-4 mr-1" />
                            <span className="font-semibold">New to bench</span>
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
        <div className="mt-12 bg-gradient-to-br from-emerald-500/10 to-emerald-700/5 border border-emerald-500/20 rounded-xl p-8">
          <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center">
            <Sparkles className="h-6 w-6 mr-2 text-emerald-500" />
            Understanding New Appointments
          </h2>
          <div className="space-y-3 text-muted-foreground">
            <p>Recently appointed judges bring fresh perspectives to the bench:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Current legal education and modern interpretations of law</li>
              <li>Fresh approach to case management and courtroom procedures</li>
              <li>Often bring specialized expertise from their previous legal practice</li>
              <li>May be building their judicial philosophy and case patterns</li>
              <li>Tend to have lighter caseload histories for analytics purposes</li>
            </ul>
            <p className="text-sm italic mt-4">
              Note: Judges appointed within the last year may have limited case history data
              available for statistical analysis.
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

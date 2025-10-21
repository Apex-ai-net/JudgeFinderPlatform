import { createServerClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'
import Link from 'next/link'
import { getBaseUrl } from '@/lib/utils/baseUrl'
import { Building, Scale, Landmark, Flag, MapPin } from 'lucide-react'

export const dynamic = 'force-dynamic'

const BASE_URL = getBaseUrl()

// Valid court types with display information
const COURT_TYPES = [
  {
    type: 'superior',
    label: 'Superior Courts',
    description: 'Trial courts with general jurisdiction over civil and criminal cases',
    icon: Building,
    color: 'from-blue-500 to-blue-700',
  },
  {
    type: 'appellate',
    label: 'Appellate Courts',
    description: 'Review decisions from trial courts and hear appeals',
    icon: Scale,
    color: 'from-purple-500 to-purple-700',
  },
  {
    type: 'supreme',
    label: 'Supreme Courts',
    description: 'Highest courts with final appellate jurisdiction',
    icon: Landmark,
    color: 'from-amber-500 to-amber-700',
  },
  {
    type: 'federal',
    label: 'Federal Courts',
    description: 'U.S. District Courts and Federal Circuit Courts',
    icon: Flag,
    color: 'from-red-500 to-red-700',
  },
  {
    type: 'municipal',
    label: 'Municipal Courts',
    description: 'Local courts handling city ordinances and minor matters',
    icon: MapPin,
    color: 'from-green-500 to-green-700',
  },
]

export const metadata: Metadata = {
  title: 'Browse Courts by Type | JudgeFinder',
  description:
    'Explore California courts organized by type. Find Superior, Appellate, Supreme, Federal, and Municipal courts with comprehensive information and assigned judges.',
  keywords:
    'court types, superior courts, appellate courts, supreme courts, federal courts, municipal courts, California courts',
  alternates: {
    canonical: `${BASE_URL}/courts/type`,
  },
  openGraph: {
    title: 'Browse Courts by Type | JudgeFinder',
    description:
      'Explore California courts organized by type with comprehensive judge information and analytics.',
    url: `${BASE_URL}/courts/type`,
    type: 'website',
    siteName: 'JudgeFinder',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Browse Courts by Type | JudgeFinder',
    description: 'Find courts by type with comprehensive judge directories and analytics.',
  },
}

interface CourtTypeStats {
  type: string
  count: number
  judgeCount: number
}

async function getCourtTypeStats(): Promise<CourtTypeStats[]> {
  try {
    const supabase = await createServerClient()

    // Get counts for each court type
    const stats = await Promise.all(
      COURT_TYPES.map(async ({ type }) => {
        const { count: courtCount } = await supabase
          .from('courts')
          .select('*', { count: 'exact', head: true })
          .ilike('type', `%${type}%`)

        const { data: courts } = await supabase
          .from('courts')
          .select('judge_count')
          .ilike('type', `%${type}%`)

        const judgeCount = courts?.reduce((sum, court) => sum + (court.judge_count || 0), 0) || 0

        return {
          type,
          count: courtCount || 0,
          judgeCount,
        }
      })
    )

    return stats
  } catch (error) {
    console.error('Error fetching court type stats:', error)
    return []
  }
}

export default async function CourtTypesHubPage() {
  const stats = await getCourtTypeStats()
  const statsMap = new Map(stats.map((s) => [s.type, s]))

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero Section */}
      <section className="relative min-h-[40vh] flex items-center justify-center bg-gradient-to-b from-background via-primary/5 to-background">
        <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:50px_50px]" />

        <div className="relative z-10 text-center px-4 max-w-7xl mx-auto w-full py-16">
          <h1 className="mb-6 text-5xl md:text-6xl font-bold tracking-tight">
            <span className="bg-gradient-to-r from-primary via-primary/80 to-primary bg-clip-text text-transparent">
              Browse Courts
            </span>
            <br />
            <span className="text-foreground">by Type</span>
          </h1>

          <p className="mx-auto mb-8 max-w-2xl text-lg md:text-xl text-muted-foreground">
            Explore California courts organized by their function and jurisdiction level. Find
            detailed information about judges, contact details, and court analytics.
          </p>
        </div>
      </section>

      {/* Court Types Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {COURT_TYPES.map(({ type, label, description, icon: Icon, color }) => {
            const stat = statsMap.get(type)
            return (
              <Link
                key={type}
                href={`/courts/type/${type}`}
                className="group block bg-card border border-border rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden hover:scale-105"
              >
                {/* Card Header with Gradient */}
                <div className={`bg-gradient-to-r ${color} p-6 text-white`}>
                  <div className="flex items-center justify-between mb-4">
                    <Icon className="h-12 w-12" />
                    <div className="text-right">
                      <div className="text-3xl font-bold">{stat?.count || 0}</div>
                      <div className="text-sm text-white/80">
                        {stat?.count === 1 ? 'Court' : 'Courts'}
                      </div>
                    </div>
                  </div>
                  <h2 className="text-2xl font-bold">{label}</h2>
                </div>

                {/* Card Body */}
                <div className="p-6">
                  <p className="text-muted-foreground mb-4">{description}</p>

                  <div className="flex items-center justify-between text-sm">
                    <div>
                      <span className="font-semibold text-foreground">{stat?.judgeCount || 0}</span>
                      <span className="text-muted-foreground ml-1">Judges</span>
                    </div>
                    <div className="text-primary group-hover:text-primary/80 font-medium">
                      View Courts →
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>

        {/* Additional Information Section */}
        <div className="mt-16 bg-card border border-border rounded-xl p-8">
          <h2 className="text-2xl font-bold mb-4 text-foreground">Understanding Court Types</h2>
          <div className="space-y-4 text-muted-foreground">
            <p>
              California's judicial system is organized into different court types, each serving
              specific functions and jurisdictions:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>
                <strong className="text-foreground">Superior Courts</strong> handle most trial cases
                including civil, criminal, family law, and probate matters
              </li>
              <li>
                <strong className="text-foreground">Appellate Courts</strong> review decisions from
                trial courts to ensure proper application of law
              </li>
              <li>
                <strong className="text-foreground">Supreme Courts</strong> serve as the highest
                judicial authority with discretionary review powers
              </li>
              <li>
                <strong className="text-foreground">Federal Courts</strong> handle cases involving
                federal law, constitutional issues, and interstate disputes
              </li>
              <li>
                <strong className="text-foreground">Municipal Courts</strong> address local matters
                such as traffic violations and city ordinance violations
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

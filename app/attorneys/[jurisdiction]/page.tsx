import { createServerClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'
import { getBaseUrl } from '@/lib/utils/baseUrl'
import { notFound } from 'next/navigation'
import { JurisdictionAttorneysClient } from './JurisdictionAttorneysClient'
import { createCanonicalSlug } from '@/lib/utils/slug'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

const BASE_URL = getBaseUrl()

interface Attorney {
  id: string
  bar_number?: string
  firm_name?: string
  specialty?: string
  years_experience?: number
  cases_won?: number
  cases_total?: number
  rating?: number
  verified?: boolean
}

interface PageProps {
  params: Promise<{
    jurisdiction: string
  }>
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}

// Common California jurisdictions for static generation
const COMMON_JURISDICTIONS = [
  'los-angeles-county',
  'orange-county',
  'san-diego-county',
  'san-francisco-county',
  'santa-clara-county',
  'alameda-county',
  'sacramento-county',
  'riverside-county',
  'san-bernardino-county',
  'contra-costa-county',
]

export async function generateStaticParams() {
  return COMMON_JURISDICTIONS.map((jurisdiction) => ({
    jurisdiction,
  }))
}

// Helper to convert slug to readable name
function slugToName(slug: string): string {
  return slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = await params
  const jurisdictionName = slugToName(resolvedParams.jurisdiction)

  return {
    title: `Attorneys in ${jurisdictionName} | JudgeFinder`,
    description: `Find experienced attorneys practicing in ${jurisdictionName}. Browse verified legal professionals, view ratings, and connect with lawyers who know the local courts.`,
    keywords: `${jurisdictionName} attorneys, ${jurisdictionName} lawyers, legal professionals ${jurisdictionName}, find attorney`,
    alternates: {
      canonical: `${BASE_URL}/attorneys/${resolvedParams.jurisdiction}`,
    },
    openGraph: {
      title: `Attorneys in ${jurisdictionName} | JudgeFinder`,
      description: `Browse verified attorneys practicing in ${jurisdictionName}. Find legal professionals with proven track records.`,
      url: `${BASE_URL}/attorneys/${resolvedParams.jurisdiction}`,
      type: 'website',
      siteName: 'JudgeFinder',
    },
    twitter: {
      card: 'summary_large_image',
      title: `Attorneys in ${jurisdictionName} | JudgeFinder`,
      description: `Find experienced attorneys in ${jurisdictionName}.`,
    },
  }
}

async function getAttorneysByJurisdiction(jurisdictionSlug: string): Promise<{
  attorneys: Attorney[]
  totalCount: number
  jurisdictionName: string
}> {
  try {
    const supabase = await createServerClient()
    const jurisdictionName = slugToName(jurisdictionSlug)

    // Query attorneys table - for now, we'll get all verified attorneys
    // In the future, this can be filtered by jurisdiction once we have that data
    const { data, error, count } = await supabase
      .from('attorneys')
      .select(
        'id, bar_number, firm_name, specialty, years_experience, cases_won, cases_total, rating, verified',
        { count: 'exact' }
      )
      .order('verified', { ascending: false })
      .order('rating', { ascending: false, nullsFirst: false })
      .order('cases_total', { ascending: false, nullsFirst: false })
      .limit(50)

    if (error) {
      console.error('[Jurisdiction Attorneys] Error fetching attorneys:', error)
      return {
        attorneys: [],
        totalCount: 0,
        jurisdictionName,
      }
    }

    return {
      attorneys: data || [],
      totalCount: count || 0,
      jurisdictionName,
    }
  } catch (error) {
    console.error('[Jurisdiction Attorneys] Error in getAttorneysByJurisdiction:', error)
    return {
      attorneys: [],
      totalCount: 0,
      jurisdictionName: slugToName(jurisdictionSlug),
    }
  }
}

async function getJurisdictionJudges(jurisdictionSlug: string): Promise<
  Array<{
    id: string
    name: string
    slug: string
    court_name?: string
  }>
> {
  try {
    const supabase = await createServerClient()
    const jurisdictionName = slugToName(jurisdictionSlug)

    // Try to find judges in courts that match this jurisdiction
    const { data: courts, error: courtsError } = await supabase
      .from('courts')
      .select('id')
      .ilike('jurisdiction', `%${jurisdictionName}%`)
      .limit(10)

    if (courtsError || !courts || courts.length === 0) {
      return []
    }

    const courtIds = courts.map((c) => c.id)

    // Get judges from these courts
    const { data: judges, error: judgesError } = await supabase
      .from('judges')
      .select('id, name, slug, court_name')
      .in('court_id', courtIds)
      .limit(20)

    if (judgesError) {
      console.error('[Jurisdiction Attorneys] Error fetching judges:', judgesError)
      return []
    }

    return judges || []
  } catch (error) {
    console.error('[Jurisdiction Attorneys] Error in getJurisdictionJudges:', error)
    return []
  }
}

export default async function JurisdictionAttorneysPage({ params }: PageProps) {
  const resolvedParams = await params

  // Validate jurisdiction slug format
  if (!resolvedParams.jurisdiction || !/^[a-z0-9-]+$/.test(resolvedParams.jurisdiction)) {
    notFound()
  }

  const [attorneyData, judges] = await Promise.all([
    getAttorneysByJurisdiction(resolvedParams.jurisdiction),
    getJurisdictionJudges(resolvedParams.jurisdiction),
  ])

  return (
    <JurisdictionAttorneysClient
      attorneys={attorneyData.attorneys}
      totalCount={attorneyData.totalCount}
      jurisdictionName={attorneyData.jurisdictionName}
      jurisdictionSlug={resolvedParams.jurisdiction}
      relatedJudges={judges}
    />
  )
}

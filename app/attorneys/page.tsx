import { createServerClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'
import { getBaseUrl } from '@/lib/utils/baseUrl'
import { AttorneysPageClient } from './AttorneysPageClient'

// Force dynamic rendering since we need to query the database with cookies
export const dynamic = 'force-dynamic'

const BASE_URL = getBaseUrl()

export const metadata: Metadata = {
  title: 'Attorney Directory | JudgeFinder',
  description:
    'Find experienced attorneys in California. Browse by jurisdiction, practice area, and specialization. Connect with verified legal professionals.',
  keywords:
    'attorney directory, California lawyers, legal professionals, find attorney, law firms, legal representation',
  alternates: {
    canonical: `${BASE_URL}/attorneys`,
  },
  openGraph: {
    title: 'Attorney Directory | JudgeFinder',
    description:
      'Browse attorneys by jurisdiction and practice area. Find verified legal professionals with proven track records.',
    url: `${BASE_URL}/attorneys`,
    type: 'website',
    siteName: 'JudgeFinder',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Attorney Directory | JudgeFinder',
    description: 'Find experienced attorneys and legal professionals in California.',
  },
}

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

interface Jurisdiction {
  jurisdiction: string
  attorney_count: number
}

async function getAttorneyStats(): Promise<{
  totalAttorneys: number
  verifiedAttorneys: number
  jurisdictions: Jurisdiction[]
}> {
  try {
    const supabase = await createServerClient()

    // Get total attorney count
    const { count: totalCount, error: countError } = await supabase
      .from('attorneys')
      .select('*', { count: 'exact', head: true })

    if (countError) {
      console.error('[Attorneys Page] Error fetching attorney count:', countError)
    }

    // Get verified attorney count
    const { count: verifiedCount, error: verifiedError } = await supabase
      .from('attorneys')
      .select('*', { count: 'exact', head: true })
      .eq('verified', true)

    if (verifiedError) {
      console.error('[Attorneys Page] Error fetching verified attorney count:', verifiedError)
    }

    // Get unique jurisdictions from case_attorneys table
    const { data: jurisdictionData, error: jurisdictionError } = await supabase.rpc(
      'get_attorney_jurisdictions'
    )

    // Fallback: If RPC doesn't exist, use default California counties
    const fallbackJurisdictions: Jurisdiction[] = [
      { jurisdiction: 'Los Angeles County', attorney_count: 0 },
      { jurisdiction: 'Orange County', attorney_count: 0 },
      { jurisdiction: 'San Diego County', attorney_count: 0 },
      { jurisdiction: 'San Francisco County', attorney_count: 0 },
      { jurisdiction: 'Santa Clara County', attorney_count: 0 },
      { jurisdiction: 'Alameda County', attorney_count: 0 },
      { jurisdiction: 'Sacramento County', attorney_count: 0 },
      { jurisdiction: 'Riverside County', attorney_count: 0 },
    ]

    return {
      totalAttorneys: totalCount || 0,
      verifiedAttorneys: verifiedCount || 0,
      jurisdictions:
        jurisdictionError || !jurisdictionData ? fallbackJurisdictions : jurisdictionData,
    }
  } catch (error) {
    console.error('[Attorneys Page] Error in getAttorneyStats:', error)
    return {
      totalAttorneys: 0,
      verifiedAttorneys: 0,
      jurisdictions: [],
    }
  }
}

async function getFeaturedAttorneys(): Promise<Attorney[]> {
  try {
    const supabase = await createServerClient()

    const { data, error } = await supabase
      .from('attorneys')
      .select(
        'id, bar_number, firm_name, specialty, years_experience, cases_won, cases_total, rating, verified'
      )
      .eq('verified', true)
      .order('rating', { ascending: false, nullsFirst: false })
      .order('cases_total', { ascending: false, nullsFirst: false })
      .limit(12)

    if (error) {
      console.error('[Attorneys Page] Error fetching featured attorneys:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('[Attorneys Page] Error in getFeaturedAttorneys:', error)
    return []
  }
}

export default async function AttorneysPage() {
  const [stats, featuredAttorneys] = await Promise.all([getAttorneyStats(), getFeaturedAttorneys()])

  return <AttorneysPageClient stats={stats} featuredAttorneys={featuredAttorneys} />
}

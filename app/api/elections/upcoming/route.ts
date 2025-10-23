import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

/**
 * GET /api/elections/upcoming
 *
 * Fetches upcoming judicial elections with filters
 *
 * Query Parameters:
 * - county: Filter by county/jurisdiction
 * - days: Number of days ahead to look (default: 365)
 * - limit: Maximum results to return (default: 50)
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const searchParams = request.nextUrl.searchParams
    const county = searchParams.get('county')
    const days = parseInt(searchParams.get('days') || '365', 10)
    const limit = parseInt(searchParams.get('limit') || '50', 10)

    // Initialize Supabase client
    const supabase = await createServerClient()

    // Calculate date range
    const today = new Date()
    const futureDate = new Date()
    futureDate.setDate(today.getDate() + days)

    // Build query for upcoming elections
    let query = supabase
      .from('judge_elections')
      .select(`
        *,
        judges!inner (
          id,
          name,
          slug,
          court_id
        ),
        courts (
          name,
          county
        )
      `)
      .eq('result', 'pending')
      .gte('election_date', today.toISOString().split('T')[0])
      .lte('election_date', futureDate.toISOString().split('T')[0])
      .order('election_date', { ascending: true })
      .limit(limit)

    // Apply county filter if provided
    if (county && county !== 'all') {
      query = query.eq('jurisdiction', county)
    }

    const { data: elections, error } = await query

    if (error) {
      console.error('Error fetching upcoming elections:', error)
      return NextResponse.json(
        { error: 'Failed to fetch upcoming elections' },
        { status: 500 }
      )
    }

    // Calculate days until each election
    const electionsWithCountdown = (elections || []).map((election: any) => {
      const electionDate = new Date(election.election_date)
      const daysUntil = Math.ceil(
        (electionDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      )

      return {
        judge_id: election.judge_id,
        judge_name: election.judges?.name || 'Unknown',
        court_name: election.courts?.name || null,
        county: election.courts?.county || election.jurisdiction || null,
        election_date: election.election_date,
        election_type: election.election_type,
        position_sought: election.position_sought,
        jurisdiction: election.jurisdiction,
        days_until_election: daysUntil,
      }
    })

    // Count elections by time period
    const next_30_days = electionsWithCountdown.filter(e => e.days_until_election <= 30).length
    const next_90_days = electionsWithCountdown.filter(e => e.days_until_election <= 90).length
    const next_180_days = electionsWithCountdown.filter(e => e.days_until_election <= 180).length

    // Get unique counties
    const counties = Array.from(
      new Set(electionsWithCountdown.map(e => e.county).filter(Boolean))
    ).sort()

    return NextResponse.json({
      total_count: electionsWithCountdown.length,
      elections: electionsWithCountdown,
      next_30_days,
      next_90_days,
      next_180_days,
      counties,
    })
  } catch (error) {
    console.error('Unexpected error in elections API:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { enforceRateLimit, getClientKey } from '@/lib/security/rate-limit'
import { requireApiKeyIfEnabled } from '@/lib/security/api-auth'
import type { UpcomingElectionResponse } from '@/types/elections'

export const dynamic = 'force-dynamic'

/**
 * GET /api/v1/elections/upcoming
 *
 * Returns judges with upcoming elections within a specified date range.
 *
 * Query Parameters:
 * - `jurisdiction` (optional): Filter by jurisdiction (state, county, etc.)
 * - `start_date` (optional): Start of date range (ISO 8601 format, default: today)
 * - `end_date` (optional): End of date range (ISO 8601 format, default: 1 year from now)
 * - `election_type` (optional): Filter by election type
 * - `limit` (optional): Number of results to return (default: 50, max: 200)
 * - `offset` (optional): Pagination offset (default: 0)
 * - `sort` (optional): Sort order - 'date_asc' (default) or 'date_desc'
 *
 * Response Format:
 * ```json
 * {
 *   "total_count": 15,
 *   "elections": [...],
 *   "next_30_days": 5,
 *   "next_90_days": 10,
 *   "next_180_days": 15
 * }
 * ```
 *
 * Status Codes:
 * - 200: Success
 * - 400: Bad request (invalid parameters)
 * - 401: Unauthorized (if API key required)
 * - 429: Rate limit exceeded
 * - 500: Internal server error
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Authentication and rate limiting
    const auth = requireApiKeyIfEnabled(request.headers, request.url)
    if (!auth.ok) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const key = getClientKey(request.headers)
    const rateState = await enforceRateLimit(`v1:elections:upcoming:${key}`)
    if (!rateState.allowed) {
      const res = NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      )
      if (typeof rateState.remaining === 'number') {
        res.headers.set('RateLimit-Remaining', String(rateState.remaining))
      }
      if (rateState.reset) {
        res.headers.set('RateLimit-Reset', String(rateState.reset))
      }
      return res
    }

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url)

    const jurisdiction = searchParams.get('jurisdiction') || undefined
    const electionType = searchParams.get('election_type') || undefined
    const sort = searchParams.get('sort') || 'date_asc'

    const resultLimit = Math.min(
      200,
      Math.max(1, parseInt(searchParams.get('limit') || '50', 10))
    )
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10))

    // Parse and validate dates
    const today = new Date().toISOString().split('T')[0]
    const oneYearFromNow = new Date()
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1)
    const defaultEndDate = oneYearFromNow.toISOString().split('T')[0]

    const startDate = searchParams.get('start_date') || today
    const endDate = searchParams.get('end_date') || defaultEndDate

    // Validate date format (basic ISO 8601 check)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
      return NextResponse.json(
        { error: 'Invalid date format. Use ISO 8601 format (YYYY-MM-DD)' },
        { status: 400 }
      )
    }

    // Validate date range
    if (new Date(startDate) > new Date(endDate)) {
      return NextResponse.json(
        { error: 'start_date must be before or equal to end_date' },
        { status: 400 }
      )
    }

    const supabase = await createServerClient()

    // Build query for upcoming elections
    let electionsQuery = supabase
      .from('judge_elections')
      .select(`
        id,
        judge_id,
        election_date,
        election_type,
        election_name,
        jurisdiction,
        district,
        vote_percentage,
        term_start_date,
        term_end_date,
        term_length_years,
        is_incumbent,
        is_contested,
        opponent_count,
        source_name,
        source_url,
        verified,
        judges!inner(
          id,
          name,
          court_id,
          court_name,
          jurisdiction,
          selection_method,
          is_elected
        )
      `)
      .gte('election_date', startDate)
      .lte('election_date', endDate)
      .is('won', null) // Only include pending elections

    // Apply filters
    if (jurisdiction) {
      electionsQuery = electionsQuery.eq('jurisdiction', jurisdiction)
    }
    if (electionType) {
      electionsQuery = electionsQuery.eq('election_type', electionType)
    }

    // Apply sorting
    const ascending = sort === 'date_asc'
    electionsQuery = electionsQuery
      .order('election_date', { ascending })
      .range(offset, offset + resultLimit - 1)

    const { data: elections, error: electionsError } = await electionsQuery

    if (electionsError) {
      console.error('Upcoming elections query error:', electionsError)
      return NextResponse.json(
        { error: 'Failed to fetch upcoming elections' },
        { status: 500 }
      )
    }

    // Get total count for pagination
    let countQuery = supabase
      .from('judge_elections')
      .select('id', { count: 'exact', head: true })
      .gte('election_date', startDate)
      .lte('election_date', endDate)
      .is('won', null)

    if (jurisdiction) {
      countQuery = countQuery.eq('jurisdiction', jurisdiction)
    }
    if (electionType) {
      countQuery = countQuery.eq('election_type', electionType)
    }

    const { count: totalCount } = await countQuery

    // Calculate days until election and format response
    const todayDate = new Date(today)
    const electionsWithDays = (elections || []).map((election: any) => {
      const electionDate = new Date(election.election_date)
      const daysUntil = Math.ceil(
        (electionDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24)
      )

      return {
        id: election.id,
        judge_id: election.judge_id,
        judge_name: election.judges?.name || 'Unknown',
        court_name: election.judges?.court_name || null,
        election_date: election.election_date,
        election_type: election.election_type,
        election_name: election.election_name,
        jurisdiction: election.jurisdiction,
        district: election.district,
        is_incumbent: election.is_incumbent,
        is_contested: election.is_contested,
        opponent_count: election.opponent_count,
        term_start_date: election.term_start_date,
        term_end_date: election.term_end_date,
        term_length_years: election.term_length_years,
        source_name: election.source_name,
        source_url: election.source_url,
        verified: election.verified,
        days_until_election: daysUntil
      }
    })

    // Calculate time-window statistics
    const thirtyDaysOut = new Date(todayDate)
    thirtyDaysOut.setDate(thirtyDaysOut.getDate() + 30)

    const ninetyDaysOut = new Date(todayDate)
    ninetyDaysOut.setDate(ninetyDaysOut.getDate() + 90)

    const oneEightyDaysOut = new Date(todayDate)
    oneEightyDaysOut.setDate(oneEightyDaysOut.getDate() + 180)

    const next30Days = electionsWithDays.filter(
      e => new Date(e.election_date) <= thirtyDaysOut
    ).length

    const next90Days = electionsWithDays.filter(
      e => new Date(e.election_date) <= ninetyDaysOut
    ).length

    const next180Days = electionsWithDays.filter(
      e => new Date(e.election_date) <= oneEightyDaysOut
    ).length

    // Build response
    const response: UpcomingElectionResponse = {
      total_count: totalCount || 0,
      elections: electionsWithDays as any,
      next_30_days: next30Days,
      next_90_days: next90Days,
      next_180_days: next180Days
    }

    const res = NextResponse.json(response)

    // Cache for 1 hour since elections data doesn't change frequently
    res.headers.set(
      'Cache-Control',
      'public, s-maxage=3600, stale-while-revalidate=300'
    )

    if (typeof rateState.remaining === 'number') {
      res.headers.set('RateLimit-Remaining', String(rateState.remaining))
    }
    if (rateState.reset) {
      res.headers.set('RateLimit-Reset', String(rateState.reset))
    }

    return res
  } catch (error) {
    console.error('Upcoming elections error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

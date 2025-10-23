import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { enforceRateLimit, getClientKey } from '@/lib/security/rate-limit'
import { requireApiKeyIfEnabled } from '@/lib/security/api-auth'
import type { ElectionStatisticsResponse, ElectionType } from '@/types/elections'

export const dynamic = 'force-dynamic'

/**
 * GET /api/v1/elections/statistics
 *
 * Returns aggregated statistics about judicial elections in a jurisdiction.
 *
 * Query Parameters:
 * - `jurisdiction` (optional): Filter by jurisdiction (state, county, etc.)
 * - `court_type` (optional): Filter by court type (e.g., 'Superior Court', 'Supreme Court')
 * - `start_date` (optional): Start of date range (ISO 8601 format, default: 10 years ago)
 * - `end_date` (optional): End of date range (ISO 8601 format, default: today)
 * - `election_type` (optional): Filter by specific election type
 *
 * Response Format:
 * ```json
 * {
 *   "jurisdiction": "California",
 *   "time_period": {
 *     "start_date": "2014-01-01",
 *     "end_date": "2024-01-01"
 *   },
 *   "total_elections": 150,
 *   "by_election_type": {
 *     "retention": 80,
 *     "competitive": 50,
 *     "initial_election": 20
 *   },
 *   "average_turnout": 65.5,
 *   "incumbent_win_rate": 0.92,
 *   "average_winner_percentage": 68.3,
 *   "unopposed_count": 25,
 *   "retention_pass_rate": 0.98
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
    const rateState = await enforceRateLimit(`v1:elections:statistics:${key}`)
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

    const jurisdiction = searchParams.get('jurisdiction') || 'All Jurisdictions'
    const courtType = searchParams.get('court_type') || undefined
    const electionType = searchParams.get('election_type') || undefined

    // Default date range: last 10 years
    const today = new Date().toISOString().split('T')[0]
    const tenYearsAgo = new Date()
    tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10)
    const defaultStartDate = tenYearsAgo.toISOString().split('T')[0]

    const startDate = searchParams.get('start_date') || defaultStartDate
    const endDate = searchParams.get('end_date') || today

    // Validate date format
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

    // Build base query for statistics
    let baseQuery = supabase
      .from('judge_elections')
      .select(`
        id,
        election_type,
        election_date,
        won,
        vote_count,
        vote_percentage,
        total_votes_cast,
        yes_votes,
        no_votes,
        is_incumbent,
        is_contested,
        opponent_count,
        judges!inner(
          court_name,
          jurisdiction
        )
      `)
      .gte('election_date', startDate)
      .lte('election_date', endDate)

    // Apply filters
    if (jurisdiction && jurisdiction !== 'All Jurisdictions') {
      baseQuery = baseQuery.eq('jurisdiction', jurisdiction)
    }
    if (electionType) {
      baseQuery = baseQuery.eq('election_type', electionType)
    }

    const { data: elections, error: electionsError } = await baseQuery

    if (electionsError) {
      console.error('Elections statistics query error:', electionsError)
      return NextResponse.json(
        { error: 'Failed to fetch election statistics' },
        { status: 500 }
      )
    }

    // Filter by court type if specified (done after query due to nested field)
    let filteredElections = elections || []
    if (courtType) {
      filteredElections = filteredElections.filter(
        (e: any) => e.judges?.court_name?.includes(courtType)
      )
    }

    // Calculate statistics
    const totalElections = filteredElections.length

    // Count by election type
    const byElectionType: Record<string, number> = {}
    filteredElections.forEach((election: any) => {
      const type = election.election_type || 'unknown'
      byElectionType[type] = (byElectionType[type] || 0) + 1
    })

    // Calculate average turnout (where data is available)
    const electionsWithTurnout = filteredElections.filter(
      (e: any) => e.total_votes_cast !== null && e.total_votes_cast > 0
    )
    const averageTurnout = electionsWithTurnout.length > 0
      ? electionsWithTurnout.reduce(
          (sum: number, e: any) => sum + (e.total_votes_cast || 0),
          0
        ) / electionsWithTurnout.length
      : null

    // Calculate incumbent win rate
    const incumbentElections = filteredElections.filter(
      (e: any) => e.is_incumbent === true && e.won !== null
    )
    const incumbentWins = incumbentElections.filter((e: any) => e.won === true)
    const incumbentWinRate = incumbentElections.length > 0
      ? incumbentWins.length / incumbentElections.length
      : null

    // Calculate average winner percentage
    const winnersWithPercentage = filteredElections.filter(
      (e: any) => e.won === true && e.vote_percentage !== null
    )
    const averageWinnerPercentage = winnersWithPercentage.length > 0
      ? winnersWithPercentage.reduce(
          (sum: number, e: any) => sum + (e.vote_percentage || 0),
          0
        ) / winnersWithPercentage.length
      : null

    // Count unopposed elections
    const unopposedCount = filteredElections.filter(
      (e: any) => e.is_contested === false || e.opponent_count === 0
    ).length

    // Calculate retention pass rate
    const retentionElections = filteredElections.filter(
      (e: any) =>
        e.election_type === 'retention' &&
        e.yes_votes !== null &&
        e.no_votes !== null
    )
    const retentionPasses = retentionElections.filter((e: any) => {
      const totalVotes = (e.yes_votes || 0) + (e.no_votes || 0)
      if (totalVotes === 0) return false
      const yesPercentage = (e.yes_votes / totalVotes) * 100
      return yesPercentage >= (e.retention_threshold || 50)
    })
    const retentionPassRate = retentionElections.length > 0
      ? retentionPasses.length / retentionElections.length
      : null

    // Build response
    const response: ElectionStatisticsResponse = {
      jurisdiction: jurisdiction || 'All Jurisdictions',
      time_period: {
        start_date: startDate,
        end_date: endDate
      },
      total_elections: totalElections,
      by_election_type: byElectionType as Record<ElectionType, number>,
      average_turnout: averageTurnout ? Number(averageTurnout.toFixed(0)) : null,
      incumbent_win_rate: incumbentWinRate
        ? Number(incumbentWinRate.toFixed(2))
        : null,
      average_winner_percentage: averageWinnerPercentage
        ? Number(averageWinnerPercentage.toFixed(2))
        : null,
      unopposed_count: unopposedCount,
      retention_pass_rate: retentionPassRate
        ? Number(retentionPassRate.toFixed(2))
        : null
    }

    const res = NextResponse.json(response)

    // Cache statistics for 1 hour since aggregate data changes infrequently
    res.headers.set(
      'Cache-Control',
      'public, s-maxage=3600, stale-while-revalidate=600'
    )

    if (typeof rateState.remaining === 'number') {
      res.headers.set('RateLimit-Remaining', String(rateState.remaining))
    }
    if (rateState.reset) {
      res.headers.set('RateLimit-Reset', String(rateState.reset))
    }

    return res
  } catch (error) {
    console.error('Election statistics error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

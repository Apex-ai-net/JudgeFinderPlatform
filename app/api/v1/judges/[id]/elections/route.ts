import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { enforceRateLimit, getClientKey } from '@/lib/security/rate-limit'
import { requireApiKeyIfEnabled } from '@/lib/security/api-auth'
import type {
  JudgeElection,
  ElectionOpponent,
  ElectionHistoryResponse,
  ElectionType,
  ElectionResult
} from '@/types/elections'

export const dynamic = 'force-dynamic'

/**
 * GET /api/v1/judges/[id]/elections
 *
 * Returns complete election history for a specific judge.
 *
 * Query Parameters:
 * - `type` (optional): Filter by election type (partisan, nonpartisan, retention, recall)
 * - `limit` (optional): Number of elections to return (default: 50, max: 100)
 * - `offset` (optional): Pagination offset (default: 0)
 * - `include_opponents` (optional): Include opponent data (default: true)
 *
 * Response Format:
 * ```json
 * {
 *   "judge_id": "uuid",
 *   "judge_name": "John Doe",
 *   "total_elections": 3,
 *   "elections": [...],
 *   "win_rate": 1.0,
 *   "average_vote_percentage": 65.3,
 *   "total_votes_received": 500000
 * }
 * ```
 *
 * Status Codes:
 * - 200: Success
 * - 401: Unauthorized (if API key required)
 * - 404: Judge not found
 * - 429: Rate limit exceeded
 * - 500: Internal server error
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authentication and rate limiting
    const auth = requireApiKeyIfEnabled(request.headers, (request as any).url)
    if (!auth.ok) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const key = getClientKey(request.headers)
    const limit = await enforceRateLimit(`v1:judges:elections:${key}`)
    if (!limit.allowed) {
      const res = NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      )
      if (typeof limit.remaining === 'number') {
        res.headers.set('RateLimit-Remaining', String(limit.remaining))
      }
      if (limit.reset) {
        res.headers.set('RateLimit-Reset', String(limit.reset))
      }
      return res
    }

    // Parse parameters
    const { id } = await params
    const { searchParams } = new URL(request.url)

    // Validate and parse query parameters
    const electionType = searchParams.get('type') || undefined
    const resultLimit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get('limit') || '50', 10))
    )
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10))
    const includeOpponents = searchParams.get('include_opponents') !== 'false'

    const supabase = await createServerClient()

    // Fetch judge basic info
    const { data: judge, error: judgeError } = await supabase
      .from('judges')
      .select('id, name, selection_method, is_elected')
      .eq('id', id)
      .single()

    if (judgeError || !judge) {
      return NextResponse.json(
        { error: 'Judge not found' },
        { status: 404 }
      )
    }

    // Build elections query
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
        won,
        vote_count,
        vote_percentage,
        total_votes_cast,
        yes_votes,
        no_votes,
        retention_threshold,
        term_start_date,
        term_end_date,
        term_length_years,
        is_incumbent,
        is_contested,
        opponent_count,
        source_name,
        source_url,
        notes,
        verified,
        created_at,
        updated_at
      `)
      .eq('judge_id', id)
      .order('election_date', { ascending: false })
      .range(offset, offset + resultLimit - 1)

    // Apply type filter if provided
    if (electionType) {
      electionsQuery = electionsQuery.eq('election_type', electionType)
    }

    const { data: elections, error: electionsError } = await electionsQuery

    if (electionsError) {
      console.error('Elections query error:', electionsError)
      return NextResponse.json(
        { error: 'Failed to fetch election data' },
        { status: 500 }
      )
    }

    // Get total count for pagination
    let countQuery = supabase
      .from('judge_elections')
      .select('id', { count: 'exact', head: true })
      .eq('judge_id', id)

    if (electionType) {
      countQuery = countQuery.eq('election_type', electionType)
    }

    const { count: totalCount } = await countQuery

    // Fetch opponents for each election if requested
    let electionsWithOpponents = elections || []
    if (includeOpponents && elections && elections.length > 0) {
      const electionIds = elections.map(e => e.id)
      const { data: opponents } = await supabase
        .from('judge_election_opponents')
        .select(`
          id,
          election_id,
          opponent_name,
          opponent_party,
          vote_count,
          vote_percentage,
          is_incumbent,
          occupation,
          background,
          source_url,
          created_at,
          updated_at
        `)
        .in('election_id', electionIds)

      // Group opponents by election_id
      const opponentsMap = new Map<string, ElectionOpponent[]>()
      opponents?.forEach(opponent => {
        const existing = opponentsMap.get(opponent.election_id) || []
        const mappedOpponent: ElectionOpponent = {
          id: opponent.id,
          election_id: opponent.election_id,
          opponent_name: opponent.opponent_name,
          political_party: (opponent.opponent_party as any) || null,
          vote_percentage: opponent.vote_percentage || null,
          total_votes: opponent.vote_count || null,
          is_incumbent: opponent.is_incumbent || false,
          website_url: opponent.source_url || null,
          bio: opponent.background || null,
          metadata: {},
          created_at: opponent.created_at,
        }
        opponentsMap.set(opponent.election_id, [...existing, mappedOpponent])
      })

      // Attach opponents to elections
      electionsWithOpponents = elections.map(election => ({
        ...election,
        opponents: opponentsMap.get(election.id) || []
      }))
    }

    // Calculate statistics
    const validElections = elections?.filter(e => e.won !== null) || []
    const wins = validElections.filter(e => e.won === true).length
    const winRate = validElections.length > 0 ? wins / validElections.length : 0

    const electionsWithVotePercentage = elections?.filter(
      e => e.vote_percentage !== null
    ) || []
    const averageVotePercentage = electionsWithVotePercentage.length > 0
      ? electionsWithVotePercentage.reduce((sum, e) => sum + (e.vote_percentage || 0), 0)
        / electionsWithVotePercentage.length
      : null

    const totalVotesReceived = elections?.reduce(
      (sum, e) => sum + (e.vote_count || 0),
      0
    ) || null

    // Build response
    const response: ElectionHistoryResponse = {
      judge_id: judge.id,
      judge_name: judge.name,
      total_elections: totalCount || 0,
      elections: electionsWithOpponents as any,
      win_rate: Number(winRate.toFixed(2)),
      average_vote_percentage: averageVotePercentage
        ? Number(averageVotePercentage.toFixed(2))
        : null,
      total_votes_received: totalVotesReceived
    }

    const res = NextResponse.json(response)

    // Cache for 5 minutes with stale-while-revalidate
    res.headers.set(
      'Cache-Control',
      'public, s-maxage=300, stale-while-revalidate=60'
    )

    if (typeof limit.remaining === 'number') {
      res.headers.set('RateLimit-Remaining', String(limit.remaining))
    }
    if (limit.reset) {
      res.headers.set('RateLimit-Reset', String(limit.reset))
    }

    return res
  } catch (error) {
    console.error('Election history error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

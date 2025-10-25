import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireApiKey } from '@/lib/security/api-auth'
import { logger } from '@/lib/utils/logger'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

interface SyncProgressSummary {
  total_judges: number
  complete_judges: number
  analytics_ready_judges: number
  judges_with_positions: number
  judges_with_education: number
  judges_with_affiliations: number
  judges_with_opinions: number
  judges_with_dockets: number
  avg_opinions_per_judge: number
  avg_dockets_per_judge: number
  avg_total_cases_per_judge: number
  in_discovery_phase: number
  in_positions_phase: number
  in_details_phase: number
  in_opinions_phase: number
  in_dockets_phase: number
  in_complete_phase: number
  judges_with_errors: number
  most_recent_sync: string | null
  oldest_sync: string | null
}

interface SyncProgressDetail {
  id: number
  judge_id: number
  judge_name: string
  has_positions: boolean
  has_education: boolean
  has_political_affiliations: boolean
  opinions_count: number
  dockets_count: number
  total_cases_count: number
  is_complete: boolean
  is_analytics_ready: boolean
  sync_phase: string
  last_synced_at: string
  error_count: number
  last_error: string | null
}

/**
 * GET /api/admin/sync-progress
 * Returns comprehensive sync progress statistics
 *
 * Query params:
 * - summary: 'true' to get only summary stats (default: false)
 * - phase: Filter by sync phase (discovery, positions, details, opinions, dockets, complete)
 * - incomplete: 'true' to show only incomplete judges
 * - analytics_ready: 'true' to show only analytics-ready judges
 * - limit: Number of records to return (default: 100, max: 1000)
 * - offset: Pagination offset (default: 0)
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Require API key authentication
    const auth = requireApiKey(request, { allow: ['SYNC_API_KEY'] })
    if (!('ok' in auth && auth.ok === true)) {
      return auth
    }

    const { searchParams } = new URL(request.url)
    const summaryOnly = searchParams.get('summary') === 'true'
    const phase = searchParams.get('phase')
    const incompleteOnly = searchParams.get('incomplete') === 'true'
    const analyticsReadyOnly = searchParams.get('analytics_ready') === 'true'
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 1000)
    const offset = parseInt(searchParams.get('offset') || '0')

    const supabase = await createClient()

    // Get summary statistics
    const { data: summary, error: summaryError } = await supabase
      .from('sync_progress_summary')
      .select('*')
      .single()

    if (summaryError) {
      logger.error('[Sync Progress] Error fetching summary', { error: summaryError })
      return NextResponse.json(
        {
          error: 'Failed to fetch sync progress summary',
          message: summaryError.message,
        },
        { status: 500 }
      )
    }

    // If only summary requested, return early
    if (summaryOnly) {
      return NextResponse.json({
        success: true,
        summary: summary as SyncProgressSummary,
        timestamp: new Date().toISOString(),
      })
    }

    // Build detailed query
    let query = supabase
      .from('sync_progress')
      .select(
        `
        id,
        judge_id,
        has_positions,
        has_education,
        has_political_affiliations,
        opinions_count,
        dockets_count,
        total_cases_count,
        is_complete,
        is_analytics_ready,
        sync_phase,
        last_synced_at,
        error_count,
        last_error,
        judges!inner (
          id,
          name
        )
      `
      )
      .order('last_synced_at', { ascending: false })

    // Apply filters
    if (phase) {
      query = query.eq('sync_phase', phase)
    }

    if (incompleteOnly) {
      query = query.eq('is_complete', false)
    }

    if (analyticsReadyOnly) {
      query = query.eq('is_analytics_ready', true)
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data: details, error: detailsError, count } = await query

    if (detailsError) {
      logger.error('[Sync Progress] Error fetching details', { error: detailsError })
      return NextResponse.json(
        {
          error: 'Failed to fetch sync progress details',
          message: detailsError.message,
        },
        { status: 500 }
      )
    }

    // Format detailed records
    const formattedDetails = (details || []).map((record: any) => ({
      id: record.id,
      judge_id: record.judge_id,
      judge_name: record.judges?.name || 'Unknown',
      has_positions: record.has_positions,
      has_education: record.has_education,
      has_political_affiliations: record.has_political_affiliations,
      opinions_count: record.opinions_count,
      dockets_count: record.dockets_count,
      total_cases_count: record.total_cases_count,
      is_complete: record.is_complete,
      is_analytics_ready: record.is_analytics_ready,
      sync_phase: record.sync_phase,
      last_synced_at: record.last_synced_at,
      error_count: record.error_count,
      last_error: record.last_error,
    }))

    // Calculate completion percentage
    const completionPercentage =
      summary.total_judges > 0
        ? ((summary.complete_judges / summary.total_judges) * 100).toFixed(2)
        : '0.00'

    const analyticsReadyPercentage =
      summary.total_judges > 0
        ? ((summary.analytics_ready_judges / summary.total_judges) * 100).toFixed(2)
        : '0.00'

    return NextResponse.json({
      success: true,
      summary: summary as SyncProgressSummary,
      metrics: {
        completion_percentage: parseFloat(completionPercentage),
        analytics_ready_percentage: parseFloat(analyticsReadyPercentage),
        avg_completion_per_phase: {
          positions: summary.judges_with_positions,
          education: summary.judges_with_education,
          affiliations: summary.judges_with_affiliations,
          opinions: summary.judges_with_opinions,
          dockets: summary.judges_with_dockets,
        },
      },
      details: formattedDetails,
      pagination: {
        limit,
        offset,
        total: count || 0,
        returned: formattedDetails.length,
      },
      filters: {
        phase: phase || 'all',
        incomplete_only: incompleteOnly,
        analytics_ready_only: analyticsReadyOnly,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    logger.error('[Sync Progress] Unexpected error', { error })
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/sync-progress
 * Update or create sync progress for a judge
 *
 * Body:
 * {
 *   judge_id: number
 *   has_positions?: boolean
 *   has_education?: boolean
 *   has_political_affiliations?: boolean
 *   opinions_count?: number
 *   dockets_count?: number
 *   total_cases_count?: number
 * }
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Require API key authentication
    const auth = requireApiKey(request, { allow: ['SYNC_API_KEY'] })
    if (!('ok' in auth && auth.ok === true)) {
      return auth
    }

    const body = await request.json()
    const {
      judge_id,
      has_positions,
      has_education,
      has_political_affiliations,
      opinions_count,
      dockets_count,
      total_cases_count,
    } = body

    if (!judge_id) {
      return NextResponse.json({ error: 'judge_id is required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Prepare update data
    const updateData: any = {
      judge_id,
      last_synced_at: new Date().toISOString(),
    }

    if (has_positions !== undefined) {
      updateData.has_positions = has_positions
      updateData.positions_synced_at = new Date().toISOString()
    }

    if (has_education !== undefined) {
      updateData.has_education = has_education
      updateData.education_synced_at = new Date().toISOString()
    }

    if (has_political_affiliations !== undefined) {
      updateData.has_political_affiliations = has_political_affiliations
      updateData.political_affiliations_synced_at = new Date().toISOString()
    }

    if (opinions_count !== undefined) {
      updateData.opinions_count = opinions_count
      updateData.opinions_synced_at = new Date().toISOString()
    }

    if (dockets_count !== undefined) {
      updateData.dockets_count = dockets_count
      updateData.dockets_synced_at = new Date().toISOString()
    }

    if (total_cases_count !== undefined) {
      updateData.total_cases_count = total_cases_count
    }

    // Upsert progress record
    const { data, error } = await supabase
      .from('sync_progress')
      .upsert(updateData, {
        onConflict: 'judge_id',
        ignoreDuplicates: false,
      })
      .select()
      .single()

    if (error) {
      logger.error('[Sync Progress] Error upserting progress', { error, judge_id })
      return NextResponse.json(
        {
          error: 'Failed to update sync progress',
          message: error.message,
        },
        { status: 500 }
      )
    }

    logger.info('[Sync Progress] Updated successfully', {
      judge_id,
      is_complete: data.is_complete,
      sync_phase: data.sync_phase,
    })

    return NextResponse.json({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    logger.error('[Sync Progress] Unexpected error in POST', { error })
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

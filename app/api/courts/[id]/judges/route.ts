import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'
import { validateParams, validateSearchParams, courtJudgesSearchParamsSchema } from '@/lib/utils/validation'
import { z } from 'zod'
import type { Judge } from '@/types'

export const dynamic = 'force-dynamic'

// Validation schemas
const courtIdParamsSchema = z.object({
  id: z.string().uuid('Invalid court ID format')
})

interface JudgeWithPosition extends Judge {
  position_type: string
  status: string
  assignment_start_date: string | null
  assignment_end_date: string | null
}

interface JudgePositionRow {
  id?: string
  status: string
  position_type: string | null
  start_date: string | null
  end_date: string | null
  judge: Judge | Judge[] | null
}

interface CourtJudgesResponse {
  judges: JudgeWithPosition[]
  total_count: number
  page: number
  per_page: number
  has_more: boolean
  court_info: {
    id: string
    name: string
    jurisdiction: string
  } | null
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now()
  
  try {
    const resolvedParams = await params
    // Validate court ID parameter
    const paramsValidation = validateParams(courtIdParamsSchema, resolvedParams, 'courts/[id]/judges')
    if (!paramsValidation.success) {
      return paramsValidation.response
    }

    const { id: courtId } = paramsValidation.data
    const { searchParams } = new URL(request.url)
    
    // Validate query parameters
    const queryValidation = validateSearchParams(courtJudgesSearchParamsSchema, searchParams, 'courts/[id]/judges')
    if (!queryValidation.success) {
      return queryValidation.response
    }

    const { limit = 20, page = 1, status, position_type } = queryValidation.data

    logger.apiRequest('GET', `/api/courts/${courtId}/judges`, {
      limit,
      page,
      status,
      position_type
    })

    const supabase = await createServerClient()
    const from = (page - 1) * limit
    const to = from + limit - 1

    // First, verify the court exists and get court info
    const { data: courtData, error: courtError } = await supabase
      .from('courts')
      .select('id, name, jurisdiction')
      .eq('id', courtId)
      .single()

    if (courtError || !courtData) {
      logger.warn('Court not found', { courtId, error: courtError?.message })
      return NextResponse.json(
        { 
          error: 'Court not found',
          code: 'COURT_NOT_FOUND'
        }, 
        { status: 404 }
      )
    }

    const inactiveStatuses: string[] = ['inactive', 'resigned', 'transferred', 'deceased']

    let positionQuery = supabase
      .from('judge_court_positions')
      .select(
        `
          id,
          status,
          position_type,
          start_date,
          end_date,
          judge:judges!inner(*)
        `,
        { count: 'exact' }
      )
      .eq('court_id', courtId)
      .order('position_type', { ascending: true })
      .order('start_date', { ascending: false, nullsFirst: false })
      .range(from, to)

    if (status && status !== 'all') {
      if (status === 'inactive') {
        positionQuery = positionQuery.in('status', inactiveStatuses)
      } else {
        positionQuery = positionQuery.eq('status', status)
      }
    }

    if (position_type) {
      positionQuery = positionQuery.ilike('position_type', `%${position_type}%`)
    }

    const { data: positionRows, error: positionError, count } = await positionQuery

    if (positionError && positionError.code !== 'PGRST116') {
      logger.error('Supabase error fetching judge positions', {
        courtId,
        error: positionError.message
      })

      return NextResponse.json(
        { error: 'Failed to fetch judges for court' },
        { status: 500 }
      )
    }

    const rows = (positionRows || []) as unknown as JudgePositionRow[]

    let judgesWithPosition: JudgeWithPosition[] = []
    let totalCount = count || rows.length

    if (rows.length > 0) {
      const statusPriority: Record<string, number> = {
        active: 3,
        presiding: 2,
        retired: 1,
        inactive: 0,
      }

      const deduped = new Map<string, JudgeWithPosition>()

      for (const row of rows) {
        const judgeData = Array.isArray(row.judge) ? row.judge[0] : row.judge
        if (!judgeData) {
          continue
        }

        const judge = judgeData as Judge
        const normalizedStatus = (row.status || inferStatus(judge)).toLowerCase()
        const effectiveStatus = normalizedStatus === 'presiding' ? 'active' : normalizedStatus
        const weight = statusPriority[effectiveStatus] ?? (effectiveStatus === 'active' ? 3 : 1)

        const existing = deduped.get(judge.id)
        const statusLabel = effectiveStatus || 'active'
        const candidate: JudgeWithPosition = {
          ...judge,
          position_type: row.position_type || judge.position_type || inferPositionType(judge.name),
          status: statusLabel,
          assignment_start_date: row.start_date,
          assignment_end_date: row.end_date
        }

        if (!existing) {
          deduped.set(judge.id, candidate)
          continue
        }

        const existingWeight = statusPriority[existing.status?.toLowerCase() ?? ''] ?? (existing.status === 'active' ? 3 : 1)

        const existingStart = existing.assignment_start_date ? new Date(existing.assignment_start_date).getTime() : 0
        const candidateStart = candidate.assignment_start_date ? new Date(candidate.assignment_start_date).getTime() : 0

        if (weight > existingWeight || (weight === existingWeight && candidateStart > existingStart)) {
          deduped.set(judge.id, candidate)
        }
      }

      judgesWithPosition = Array.from(deduped.values())
      totalCount = count || judgesWithPosition.length
    } else {
      // Fallback to legacy judge query if junction data unavailable
      let fallbackQuery = supabase
        .from('judges')
        .select('*', { count: 'exact' })
        .eq('court_id', courtId)
        .order('name')
        .range(from, to)

      if (status && status !== 'all') {
        if (status === 'retired') {
          fallbackQuery = fallbackQuery.or('name.ilike.%retired%,name.ilike.%emeritus%')
        } else if (status === 'inactive') {
          fallbackQuery = fallbackQuery.eq('id', '00000000-0000-0000-0000-000000000000')
        }
      }

      if (position_type) {
        fallbackQuery = fallbackQuery.ilike('name', `%${position_type}%`)
      }

      const { data: fallbackData, error: fallbackError, count: fallbackCount } = await fallbackQuery

      if (fallbackError) {
        logger.error('Supabase fallback error fetching court judges', {
          courtId,
          error: fallbackError.message
        })

        return NextResponse.json(
          { error: 'Failed to fetch judges for court' },
          { status: 500 }
        )
      }

      const judges = (fallbackData || []) as Judge[]
      judgesWithPosition = judges.map((judge) => ({
        ...judge,
        position_type: judge.position_type || inferPositionType(judge.name),
        status: inferStatus(judge),
        assignment_start_date: null,
        assignment_end_date: null
      }))

      totalCount = fallbackCount || judges.length
    }

    const hasMore = from + (judgesWithPosition.length || 0) < totalCount

    const result: CourtJudgesResponse = {
      judges: judgesWithPosition,
      total_count: totalCount,
      page: page as number,
      per_page: limit as number,
      has_more: hasMore,
      court_info: {
        id: courtData.id,
        name: courtData.name,
        jurisdiction: courtData.jurisdiction
      }
    }

    // Set cache headers for performance
    const response = NextResponse.json(result)
    
    // Cache for 30 minutes with stale-while-revalidate
    response.headers.set('Cache-Control', 'public, s-maxage=1800, max-age=900, stale-while-revalidate=900')
    response.headers.set('CDN-Cache-Control', 'public, s-maxage=3600')
    response.headers.set('Vary', 'Accept-Encoding')
    
    const duration = Date.now() - startTime
    logger.apiResponse('GET', `/api/courts/${courtId}/judges`, 200, duration, {
      resultsCount: judgesWithPosition.length,
      totalCount,
      courtName: courtData.name
    })
    
    return response

  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('API error in courts/[id]/judges', { 
      courtId: (await params).id,
      duration 
    }, error instanceof Error ? error : undefined)
    
    logger.apiResponse('GET', `/api/courts/${(await params).id}/judges`, 500, duration)
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Infer position type from judge name or other available data
 * This is a temporary solution until proper position tracking is implemented
 */
function inferPositionType(judgeName: string): string {
  const name = judgeName.toLowerCase()
  
  if (name.includes('chief')) {
    return 'Chief Judge'
  } else if (name.includes('presiding')) {
    return 'Presiding Judge'
  } else if (name.includes('commissioner')) {
    return 'Commissioner'
  } else if (name.includes('magistrate')) {
    return 'Magistrate Judge'
  } else if (name.includes('retired') || name.includes('emeritus')) {
    return 'Retired Judge'
  } else if (name.includes('acting')) {
    return 'Acting Judge'
  } else if (name.includes('temporary')) {
    return 'Temporary Judge'
  } else {
    return 'Judge'
  }
}

/**
 * Infer status from judge data
 * This is a temporary solution until proper status tracking is implemented
 */
function inferStatus(judge: Judge): string {
  const name = judge.name.toLowerCase()
  
  if (name.includes('retired') || name.includes('emeritus')) {
    return 'retired'
  } else if (name.includes('inactive')) {
    return 'inactive'
  } else {
    return 'active'
  }
}

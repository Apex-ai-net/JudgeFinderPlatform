import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Ensure required env is present; mirror judges/list behavior
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return NextResponse.json({
        courts: [],
        total_count: 0,
        page: 1,
        per_page: 20,
        has_more: false,
        error: 'Database configuration pending',
      })
    }

    let remaining: number | undefined
    try {
      const { buildRateLimiter, getClientIp } = await import('@/lib/security/rate-limit')
      const rl = buildRateLimiter({ tokens: 180, window: '1 m', prefix: 'api:courts:list' })
      const res = await rl.limit(`${getClientIp(request)}:global`)
      if (!res.success) {
        return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
      }
      remaining = res.remaining
    } catch (e) {
      // In production without Redis, allow requests to proceed
      console.warn('Rate limiter unavailable, proceeding without rate limiting for /api/courts')
      remaining = undefined
    }
    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q') || ''
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    const page = Math.max(parseInt(searchParams.get('page') || '1'), 1)
    const type = searchParams.get('type') || undefined
    // CRITICAL: Always enforce California-only filtering for judgefinder.io
    // The platform is CA-specific, so we must filter out non-CA courts
    const requestedJurisdiction = searchParams.get('jurisdiction') || 'CA'
    const jurisdiction = requestedJurisdiction === 'ALL' ? 'CA' : requestedJurisdiction
    const courtLevel = searchParams.get('court_level') || undefined

    const supabase = await createServerClient()
    const from = (page - 1) * limit
    const to = from + limit - 1

    let queryBuilder = supabase
      .from('courts')
      .select('id, name, type, jurisdiction, address, phone, website, judge_count, slug', {
        count: 'exact',
      })
      .order('name')
      .range(from, to)

    // Apply filters
    if (q.trim()) {
      queryBuilder = queryBuilder.ilike('name', `%${q}%`)
    }

    if (type && type !== '') {
      queryBuilder = queryBuilder.ilike('type', `%${type}%`)
    }

    if (jurisdiction && jurisdiction !== '') {
      queryBuilder = queryBuilder.eq('jurisdiction', jurisdiction)
    }

    const { data, error, count } = await queryBuilder

    if (error) {
      console.error('Supabase error fetching courts:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        query: { q, jurisdiction, courtLevel, type, page, limit },
      })
      return NextResponse.json(
        {
          error: 'Failed to load courts. Please try again.',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        },
        { status: 500 }
      )
    }

    const totalCount = count || 0
    const hasMore = from + (data?.length || 0) < totalCount

    const result = {
      courts: data || [],
      total_count: totalCount,
      page,
      per_page: limit,
      has_more: hasMore,
    }

    // Set cache headers for better performance
    const response = NextResponse.json({ ...result, rate_limit_remaining: remaining })
    response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=60')

    return response
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

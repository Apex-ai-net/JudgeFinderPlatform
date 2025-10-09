import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import type { Judge, SearchResult } from '@/types'
import { sanitizeSearchQuery, normalizeJudgeSearchQuery } from '@/lib/utils/validation'
import { buildCacheKey, withRedisCache } from '@/lib/cache/redis'

export const dynamic = 'force-dynamic'
// Removed edge runtime - incompatible with cookies() API
export const revalidate = 60

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { buildRateLimiter, getClientIp } = await import('@/lib/security/rate-limit')
    const rl = buildRateLimiter({ tokens: 40, window: '1 m', prefix: 'api:judges:search:get' })
    const { success, remaining } = await rl.limit(`${getClientIp(request)}:global`)
    if (!success) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
    }
    const { searchParams } = new URL(request.url)
    const rawQuery = searchParams.get('q') || ''
    const sanitized = sanitizeSearchQuery(rawQuery)
    const normalizedQuery = normalizeJudgeSearchQuery(sanitized)
    const limit = parseInt(searchParams.get('limit') || '20')
    const page = parseInt(searchParams.get('page') || '1')
    const jurisdiction = searchParams.get('jurisdiction')
    const courtType = searchParams.get('court_type')

    if (limit > 500) {
      return NextResponse.json({ error: 'Limit cannot exceed 500' }, { status: 400 })
    }

    const supabase = await createServerClient()
    const cacheKey = buildCacheKey('judges:search', {
      q: normalizedQuery,
      limit,
      page,
      jurisdiction,
      courtType,
    })
    const isSearchQuery = normalizedQuery.trim().length >= 2
    const ttlSeconds = isSearchQuery ? 60 : 180

    const { data: cachedResult } = await withRedisCache(cacheKey, ttlSeconds, async () => {
      const offset = (page - 1) * limit

      let judges, error

      if (isSearchQuery) {
        // Use PostgreSQL full-text search with ranking (94% faster than ILIKE)
        const { data, error: searchError } = await supabase.rpc('search_judges_ranked', {
          search_query: normalizedQuery,
          jurisdiction_filter: jurisdiction || null,
          result_limit: limit,
          similarity_threshold: 0.3,
        })
        judges = data
        error = searchError
      } else {
        // No search query - show top judges by case count
        let queryBuilder = supabase
          .from('judges')
          .select('id, name, court_name, jurisdiction, total_cases, slug')
          .order('total_cases', { ascending: false, nullsFirst: false })
          .range(offset, offset + limit - 1)

        if (jurisdiction) {
          queryBuilder = queryBuilder.eq('jurisdiction', jurisdiction)
        }

        if (courtType) {
          queryBuilder = queryBuilder.eq('court_type', courtType)
        }

        const result = await queryBuilder
        judges = result.data
        error = result.error
      }

      if (error) {
        throw error
      }

      const hasMore = (judges?.length || 0) === limit
      const totalCount = judges?.length || 0

      const results = (judges || []).map((judge: any) => ({
        id: judge.id,
        type: 'judge' as const,
        title: judge.name,
        subtitle: judge.court_name || '',
        description: `${judge.jurisdiction || 'California'} • ${judge.total_cases || 0} cases`,
        url: `/judges/${judge.slug || judge.id}`,
      }))

      return {
        results,
        total_count: totalCount,
        page,
        per_page: limit,
        has_more: hasMore,
      }
    })

    const response = NextResponse.json({ ...cachedResult, rate_limit_remaining: remaining })
    response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=60')

    return response
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { buildRateLimiter, getClientIp } = await import('@/lib/security/rate-limit')
    const rl = buildRateLimiter({ tokens: 20, window: '1 m', prefix: 'api:judges:search:post' })
    const { success, remaining } = await rl.limit(`${getClientIp(request)}:global`)
    if (!success) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
    }
    const body = await request.json()
    const { query, filters = {} } = body

    const supabase = await createServerClient()
    const limit = filters.limit || 20
    const page = filters.page || 1
    const offset = (page - 1) * limit

    let judges, error

    if (query?.trim()) {
      // Use PostgreSQL full-text search with ranking (94% faster than ILIKE)
      const { data, error: searchError } = await supabase.rpc('search_judges_ranked', {
        search_query: query,
        jurisdiction_filter: filters.jurisdiction || null,
        result_limit: limit,
        similarity_threshold: 0.3,
      })
      judges = data
      error = searchError
    } else {
      // No search query - show judges with most cases
      let queryBuilder = supabase
        .from('judges')
        .select('id, name, court_name, jurisdiction, total_cases, slug')
        .order('total_cases', { ascending: false, nullsFirst: false })
        .range(offset, offset + limit - 1)

      if (filters.jurisdiction) {
        queryBuilder = queryBuilder.eq('jurisdiction', filters.jurisdiction)
      }
      if (filters.court_type) {
        queryBuilder = queryBuilder.eq('court_type', filters.court_type)
      }

      const result = await queryBuilder
      judges = result.data
      error = result.error
    }

    if (error) {
      console.error('Search function error:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      })
      return NextResponse.json({ error: 'Failed to search judges' }, { status: 500 })
    }

    // Transform judges to search results format
    const results = (judges || []).map((judge: any) => ({
      id: judge.id,
      type: 'judge' as const,
      title: judge.name,
      subtitle: judge.court_name || '',
      description: `${judge.jurisdiction || 'California'} • ${judge.total_cases || 0} cases`,
      url: `/judges/${judge.slug || judge.id}`,
    }))

    const totalCount = judges?.length || 0
    const hasMore = (judges?.length || 0) === limit

    const response = NextResponse.json({
      results,
      total_count: totalCount,
      page,
      per_page: limit,
      has_more: hasMore,
      rate_limit_remaining: remaining,
    })

    return response
  } catch (error) {
    console.error('POST search error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

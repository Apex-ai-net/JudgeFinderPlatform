import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'
import { sanitizeSearchQuery, normalizeJudgeSearchQuery } from '@/lib/utils/validation'
import { sanitizeLikePattern } from '@/lib/utils/sql-sanitize'
import type {
  SearchResponse,
  SearchResult,
  JudgeSearchResult,
  CourtSearchResult,
  JurisdictionSearchResult,
  SearchSuggestionsResponse,
  SearchSuggestion,
} from '@/types/search'
import { fetchSponsoredTiles } from '@/lib/search/sponsored'
import type { SponsoredSearchResult } from '@/types/search'
import {
  processNaturalLanguageQuery,
  type EnhancedQuery,
  type SearchIntent,
} from '@/lib/ai/search-intelligence'
import { rankSearchResults, normalizeLocation } from '@/lib/search/ranking-engine'
import { trackAISearchMetrics } from '@/lib/analytics/ai-search-metrics'
import { searchCache, CACHE_TTL, buildCacheKey } from '@/lib/cache/multi-tier-cache'

export const dynamic = 'force-dynamic'

// Predefined jurisdictions for search
const PREDEFINED_JURISDICTIONS: JurisdictionSearchResult[] = [
  {
    id: 'ca',
    type: 'jurisdiction',
    title: 'California',
    subtitle: 'State Courts',
    description: 'State courts across California handling various civil and criminal matters.',
    url: '/jurisdictions/california',
    jurisdictionValue: 'CA',
    displayName: 'California',
  },
  {
    id: 'federal',
    type: 'jurisdiction',
    title: 'Federal',
    subtitle: 'Federal Courts',
    description: 'Federal courts handling federal matters across California districts.',
    url: '/jurisdictions/federal',
    jurisdictionValue: 'F',
    displayName: 'Federal',
  },
  {
    id: 'los-angeles-county',
    type: 'jurisdiction',
    title: 'Los Angeles County',
    subtitle: 'County Courts',
    description:
      'Largest judicial system in California with comprehensive trial and appellate courts.',
    url: '/jurisdictions/los-angeles-county',
    jurisdictionValue: 'CA',
    displayName: 'Los Angeles County',
  },
  {
    id: 'orange-county',
    type: 'jurisdiction',
    title: 'Orange County',
    subtitle: 'County Courts',
    description:
      'Major Southern California jurisdiction serving diverse communities and businesses.',
    url: '/jurisdictions/orange-county',
    jurisdictionValue: 'Orange County, CA',
    displayName: 'Orange County',
  },
  {
    id: 'san-diego-county',
    type: 'jurisdiction',
    title: 'San Diego County',
    subtitle: 'County Courts',
    description: 'Southern California coastal jurisdiction with federal and state court systems.',
    url: '/jurisdictions/san-diego-county',
    jurisdictionValue: 'CA',
    displayName: 'San Diego County',
  },
  {
    id: 'san-francisco-county',
    type: 'jurisdiction',
    title: 'San Francisco County',
    subtitle: 'County Courts',
    description: 'Metropolitan jurisdiction with specialized business and technology courts.',
    url: '/jurisdictions/san-francisco-county',
    jurisdictionValue: 'CA',
    displayName: 'San Francisco County',
  },
  {
    id: 'santa-clara-county',
    type: 'jurisdiction',
    title: 'Santa Clara County',
    subtitle: 'County Courts',
    description: 'Silicon Valley jurisdiction handling technology and intellectual property cases.',
    url: '/jurisdictions/santa-clara-county',
    jurisdictionValue: 'CA',
    displayName: 'Santa Clara County',
  },
  {
    id: 'alameda-county',
    type: 'jurisdiction',
    title: 'Alameda County',
    subtitle: 'County Courts',
    description: 'Bay Area jurisdiction with diverse civil and criminal caseloads.',
    url: '/jurisdictions/alameda-county',
    jurisdictionValue: 'CA',
    displayName: 'Alameda County',
  },
]

export async function GET(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now()

  try {
    const { buildRateLimiter, getClientIp } = await import('@/lib/security/rate-limit')
    const rl = buildRateLimiter({ tokens: 60, window: '1 m', prefix: 'api:search:get' })
    const { success, remaining } = await rl.limit(`${getClientIp(request)}:global`)
    if (!success) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
    }
    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q') || ''
    const type = (searchParams.get('type') as 'judge' | 'court' | 'jurisdiction' | 'all') || 'all'
    const limit = Math.min(parseInt(searchParams.get('limit') || '200'), 2000) // Increased max to 2000 to handle all judges
    const suggestions = searchParams.get('suggestions') === 'true'

    const sanitizedQuery = sanitizeSearchQuery(q).trim()

    // If no query, return popular judges and jurisdictions
    if (!sanitizedQuery) {
      const supabase = await createServerClient()

      // Get popular judges (those with most cases)
      const { data: popularJudges } = await supabase
        .from('judges')
        .select('id, name, court_name, jurisdiction, total_cases, profile_image_url, slug')
        .order('total_cases', { ascending: false, nullsFirst: false })
        .limit(limit)

      const judgeResults: JudgeSearchResult[] = (popularJudges || []).map((judge: any) => {
        const slug =
          judge.slug ||
          judge.name
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, '')
            .replace(/\s+/g, '-')
        return {
          id: judge.id,
          type: 'judge',
          title: judge.name,
          subtitle: judge.court_name || 'Court information pending',
          description: `${judge.jurisdiction || 'CA'} jurisdiction • ${judge.total_cases || 0} cases`,
          url: `/judges/${slug}`,
          court_name: judge.court_name,
          jurisdiction: judge.jurisdiction || 'CA',
          total_cases: judge.total_cases || 0,
          profile_image_url: judge.profile_image_url,
        }
      })

      // Add top jurisdictions
      const topJurisdictions = PREDEFINED_JURISDICTIONS.slice(0, 3)

      const allResults = [...judgeResults, ...topJurisdictions]

      const emptySponsored: SponsoredSearchResult[] = []

      return NextResponse.json({
        results: allResults,
        total_count: allResults.length,
        results_by_type: {
          judges: judgeResults,
          courts: [],
          jurisdictions: topJurisdictions,
          sponsored: emptySponsored,
        },
        counts_by_type: {
          judges: judgeResults.length,
          courts: 0,
          jurisdictions: topJurisdictions.length,
          sponsored: 0,
        },
        query: q,
        took_ms: Date.now() - startTime,
        rate_limit_remaining: remaining,
      } as SearchResponse)
    }

    logger.apiRequest('GET', '/api/search', {
      query: sanitizedQuery,
      type,
      limit,
      suggestions,
    })

    // Handle suggestions endpoint
    if (suggestions) {
      const suggestionsResponse = await generateSearchSuggestions(sanitizedQuery, limit)
      const duration = Date.now() - startTime
      logger.apiResponse('GET', '/api/search/suggestions', 200, duration)
      return NextResponse.json(suggestionsResponse)
    }

    const supabase = await createServerClient()

    // Process query with AI to extract intent and entities
    let enhancedQuery: EnhancedQuery | null = null
    let aiIntent: SearchIntent | undefined

    try {
      enhancedQuery = await processNaturalLanguageQuery(sanitizedQuery)
      aiIntent = enhancedQuery.searchIntent

      logger.info('AI search intent detected', {
        query: sanitizedQuery,
        intent: aiIntent.type,
        searchType: aiIntent.searchType,
        confidence: aiIntent.confidence,
        locations: aiIntent.extractedEntities.locations,
        caseTypes: aiIntent.extractedEntities.caseTypes,
      })
    } catch (error) {
      // AI processing is optional - continue with basic search if it fails
      logger.warn('AI search processing failed, falling back to basic search', {
        query: sanitizedQuery,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }

    // Extract location filter from AI insights
    let jurisdictionFilter: string | undefined
    if (aiIntent?.extractedEntities.locations && aiIntent.extractedEntities.locations.length > 0) {
      const primaryLocation = aiIntent.extractedEntities.locations[0]
      jurisdictionFilter = normalizeLocation(primaryLocation)
    }

    // Search in parallel for better performance
    const searchPromises: Promise<SearchResult[]>[] = []

    if (type === 'all' || type === 'judge') {
      searchPromises.push(
        searchJudges(supabase, sanitizedQuery, limit, jurisdictionFilter, aiIntent)
      )
    }

    if (type === 'all' || type === 'court') {
      searchPromises.push(searchCourts(supabase, sanitizedQuery, limit, jurisdictionFilter))
    }

    if (type === 'all' || type === 'jurisdiction') {
      searchPromises.push(searchJurisdictions(sanitizedQuery, limit))
    }

    const searchResults = await Promise.all(searchPromises)
    const allResults = searchResults.flat()

    // Apply AI-enhanced ranking and cast back to SearchResult[]
    const rankedResults = rankSearchResults(allResults, sanitizedQuery, aiIntent) as SearchResult[]

    // Track AI search metrics for analytics
    try {
      await trackAISearchMetrics({
        query: sanitizedQuery,
        aiIntent: aiIntent || null,
        resultsCount: rankedResults.length,
        topResults: rankedResults.slice(0, 5).map((r) => ({
          id: r.id,
          type: r.type,
          title: r.title,
          score: r.relevanceScore || 0,
        })),
        processingTimeMs: Date.now() - startTime,
      })
    } catch (error) {
      // Analytics tracking is non-critical
      logger.error('Failed to track AI search metrics', {
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }

    // Categorize ranked results
    const judges = rankedResults.filter((r) => r.type === 'judge') as JudgeSearchResult[]
    const courts = rankedResults.filter((r) => r.type === 'court') as CourtSearchResult[]
    const jurisdictions = rankedResults.filter(
      (r) => r.type === 'jurisdiction'
    ) as JurisdictionSearchResult[]

    const sponsoredResults = await fetchSponsoredTiles({ query: sanitizedQuery, limit })

    const response: SearchResponse = {
      results: rankedResults.slice(0, limit),
      total_count: rankedResults.length,
      results_by_type: {
        judges: judges.slice(0, limit),
        courts: courts.slice(0, limit),
        jurisdictions: jurisdictions.slice(0, limit),
        sponsored: sponsoredResults,
      },
      counts_by_type: {
        judges: judges.length,
        courts: courts.length,
        jurisdictions: jurisdictions.length,
        sponsored: sponsoredResults.length,
      },
      query: q,
      took_ms: Date.now() - startTime,
      // Include AI metadata if available
      ...(enhancedQuery && {
        ai_insights: {
          intent: aiIntent?.type,
          searchType: aiIntent?.searchType,
          confidence: aiIntent?.confidence,
          suggestedFilters: {
            locations: aiIntent?.extractedEntities.locations,
            caseTypes: aiIntent?.extractedEntities.caseTypes,
          },
          expandedTerms: enhancedQuery.expandedTerms,
        },
      }),
    }

    // Set cache headers
    const responseObj = NextResponse.json({ ...response, rate_limit_remaining: remaining })
    responseObj.headers.set(
      'Cache-Control',
      'public, s-maxage=300, max-age=60, stale-while-revalidate=180'
    )
    responseObj.headers.set('Vary', 'Accept-Encoding')

    const duration = Date.now() - startTime
    logger.apiResponse('GET', '/api/search', 200, duration, {
      totalResults: rankedResults.length,
      judgeResults: judges.length,
      courtResults: courts.length,
      jurisdictionResults: jurisdictions.length,
      aiProcessed: !!enhancedQuery,
      intentDetected: aiIntent?.type,
    })

    return responseObj
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('API error in search', { duration }, error instanceof Error ? error : undefined)

    logger.apiResponse('GET', '/api/search', 500, duration)

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function searchJudges(
  supabase: any,
  query: string,
  limit: number,
  jurisdictionFilter?: string,
  aiIntent?: SearchIntent
): Promise<JudgeSearchResult[]> {
  try {
    // Use the increased limit for better results
    const actualLimit = Math.min(limit, 2000) // Increased cap to 2000 to handle all judges in database

    // Build cache key for search results
    const cacheKey = buildCacheKey({
      query,
      limit: actualLimit,
      jurisdiction: jurisdictionFilter || 'all',
      type: 'judge',
    })

    // Try to get from cache first with SWR support
    const cachedResult = await searchCache.getOrComputeSWR(
      cacheKey,
      async () => {
        // Perform the actual search (using full-text search RPC function)
        const cleaned = normalizeJudgeSearchQuery(query)

        // Use the full-text search RPC function from migration 20250930_003
        const { data: rpcData, error: rpcError } = await supabase.rpc('search_judges_ranked', {
          search_query: cleaned,
          jurisdiction_filter: jurisdictionFilter || null,
          result_limit: actualLimit,
          similarity_threshold: 0.3,
        })

        if (rpcError) {
          logger.warn('Full-text search RPC failed, falling back to ILIKE', {
            query,
            error: rpcError.message,
          })

          // Fallback to ILIKE search if RPC fails
          return await searchJudgesFallback(supabase, query, actualLimit, jurisdictionFilter)
        }

        if (!rpcData || rpcData.length === 0) {
          logger.info('No judges found via full-text search', { query })
          return []
        }

        // Transform RPC results to JudgeSearchResult format
        return rpcData.map((judge: any): JudgeSearchResult => {
          const slug =
            judge.slug ||
            judge.name
              .toLowerCase()
              .replace(/[^a-z0-9\s]/g, '')
              .replace(/\s+/g, '-')

          return {
            id: judge.id,
            type: 'judge',
            title: judge.name,
            subtitle: judge.court_name || 'Court information pending',
            description: `${judge.jurisdiction || 'CA'} jurisdiction • ${judge.total_cases || 0} cases`,
            url: `/judges/${slug}`,
            court_name: judge.court_name,
            jurisdiction: judge.jurisdiction || 'CA',
            total_cases: judge.total_cases || 0,
            profile_image_url: judge.profile_image_url,
            relevanceScore: judge.rank || 0, // Use relevance rank from RPC
          }
        })
      },
      {
        ttl: CACHE_TTL.MEDIUM, // 5 minutes
        tags: ['search', 'judges'],
      }
    )

    logger.info('Judge search completed', {
      query,
      resultsFound: cachedResult.data.length,
      cached: cachedResult.cached,
      wasStale: cachedResult.wasStale,
      tier: cachedResult.tier,
      latencyMs: cachedResult.latencyMs,
    })

    return cachedResult.data
  } catch (error) {
    logger.error('Unexpected error in searchJudges', {
      query,
      limit,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    })
    // Return empty array to allow other searches to continue
    return []
  }
}

/**
 * Fallback search using ILIKE (slower but more compatible)
 */
async function searchJudgesFallback(
  supabase: any,
  query: string,
  limit: number,
  jurisdictionFilter?: string
): Promise<JudgeSearchResult[]> {
  const cleaned = normalizeJudgeSearchQuery(query)
  const queryWords = cleaned
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length > 0)

  let searchQuery = supabase
    .from('judges')
    .select('id, name, court_name, jurisdiction, total_cases, profile_image_url, slug')

  // Apply jurisdiction filter from AI if available
  if (jurisdictionFilter) {
    searchQuery = searchQuery.or(
      `jurisdiction.ilike.%${sanitizeLikePattern(jurisdictionFilter)}%,court_name.ilike.%${sanitizeLikePattern(jurisdictionFilter)}%`
    )
  }

  // If single word, search anywhere in the name
  if (queryWords.length === 1) {
    const sanitizedCleaned = sanitizeLikePattern(cleaned)
    if (sanitizedCleaned) {
      searchQuery = searchQuery.ilike('name', `%${sanitizedCleaned}%`)
    }
  } else {
    // For multiple words, search for the full phrase first
    const sanitizedCleaned = sanitizeLikePattern(cleaned)
    const sanitizedWords = queryWords
      .map((w) => sanitizeLikePattern(w))
      .filter(Boolean)
      .join('%')
    if (sanitizedCleaned && sanitizedWords) {
      searchQuery = searchQuery.or(
        `name.ilike.%${sanitizedCleaned}%,name.ilike.%${sanitizedWords}%`
      )
    }
  }

  const { data, error } = await searchQuery.range(0, limit - 1).order('name')

  if (error) {
    logger.error('Database error in fallback search', {
      query,
      limit,
      error: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    })
    return []
  }

  if (!data || data.length === 0) {
    return []
  }

  return data.map((judge: any): JudgeSearchResult => {
    const slug =
      judge.slug ||
      judge.name
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '-')

    return {
      id: judge.id,
      type: 'judge',
      title: judge.name,
      subtitle: judge.court_name || 'Court information pending',
      description: `${judge.jurisdiction || 'CA'} jurisdiction • ${judge.total_cases || 0} cases`,
      url: `/judges/${slug}`,
      court_name: judge.court_name,
      jurisdiction: judge.jurisdiction || 'CA',
      total_cases: judge.total_cases || 0,
      profile_image_url: judge.profile_image_url,
      relevanceScore: calculateRelevanceScore(query, judge.name),
    }
  })
}

async function searchCourts(
  supabase: any,
  query: string,
  limit: number,
  jurisdictionFilter?: string
): Promise<CourtSearchResult[]> {
  try {
    // Use the increased limit for better results
    const actualLimit = Math.min(limit, 2000) // Increased cap to 2000 for consistency

    let courtQuery = supabase
      .from('courts')
      .select('id, name, type, jurisdiction, address, phone, website, judge_count', {
        count: 'exact',
      })
      .ilike('name', `%${sanitizeLikePattern(query)}%`)

    // Apply jurisdiction filter if available
    if (jurisdictionFilter) {
      courtQuery = courtQuery.ilike('jurisdiction', `%${sanitizeLikePattern(jurisdictionFilter)}%`)
    }

    const { data, error, count } = await courtQuery.range(0, actualLimit - 1).order('name')

    if (error) {
      logger.error('Database error searching courts', {
        query,
        limit: actualLimit,
        error: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      })
      // Return empty array but don't throw - let other searches continue
      return []
    }

    if (!data || data.length === 0) {
      logger.info('No courts found for query', { query })
      return []
    }

    logger.info(`Court search successful`, {
      query,
      resultsFound: data.length,
      totalCount: count || 0,
      limit: actualLimit,
    })

    return data.map((court: any): CourtSearchResult => {
      const slug = court.name
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '-')

      return {
        id: court.id,
        type: 'court',
        title: court.name,
        subtitle: `${court.type || 'Superior'} Court`,
        description: `${court.jurisdiction || 'CA'} • ${court.judge_count || 0} judges`,
        url: `/courts/${slug}`,
        court_type: court.type || 'Superior',
        jurisdiction: court.jurisdiction || 'CA',
        address: court.address,
        judge_count: court.judge_count || 0,
        phone: court.phone,
        website: court.website,
        relevanceScore: calculateRelevanceScore(query, court.name),
      }
    })
  } catch (error) {
    logger.error('Unexpected error in searchCourts', {
      query,
      limit,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    })
    // Return empty array to allow other searches to continue
    return []
  }
}

async function searchJurisdictions(
  query: string,
  limit: number
): Promise<JurisdictionSearchResult[]> {
  const queryLower = query.toLowerCase()

  return PREDEFINED_JURISDICTIONS.filter(
    (jurisdiction) =>
      jurisdiction.title.toLowerCase().includes(queryLower) ||
      jurisdiction.displayName.toLowerCase().includes(queryLower) ||
      jurisdiction.description.toLowerCase().includes(queryLower)
  )
    .slice(0, limit)
    .map((jurisdiction) => ({
      ...jurisdiction,
      relevanceScore: calculateRelevanceScore(query, jurisdiction.title),
    }))
}

async function generateSearchSuggestions(
  query: string,
  limit: number
): Promise<SearchSuggestionsResponse> {
  const suggestions: SearchSuggestion[] = []

  try {
    // Search for actual judges in the database
    const supabase = await createServerClient()

    const { data: judges, error } = await supabase
      .from('judges')
      .select('id, name, court_name, jurisdiction, total_cases, slug')
      .ilike('name', `%${sanitizeLikePattern(query)}%`)
      .limit(Math.min(limit, 10)) // Limit judge suggestions to 10
      .order('name')

    if (!error && judges && judges.length > 0) {
      const judgeSuggestions = judges.map((judge: any): SearchSuggestion => {
        const slug =
          judge.slug ||
          judge.name
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, '')
            .replace(/\s+/g, '-')
        return {
          text: judge.name,
          type: 'judge',
          count: judge.total_cases || 0,
          url: `/judges/${slug}`,
        }
      })
      suggestions.push(...judgeSuggestions)
    }

    // Add jurisdiction suggestions
    const jurisdictionMatches = PREDEFINED_JURISDICTIONS.filter((j) =>
      j.title.toLowerCase().includes(query.toLowerCase())
    )
      .slice(0, 3)
      .map(
        (j): SearchSuggestion => ({
          text: j.title,
          type: 'jurisdiction',
          count: 1,
          url: j.url,
        })
      )

    suggestions.push(...jurisdictionMatches)

    // Add some common search terms if they match
    const commonSearches = [
      {
        text: 'California Superior Court',
        type: 'court' as const,
        count: 150,
        url: '/search?q=California Superior Court&type=court',
      },
      {
        text: 'Federal Court',
        type: 'court' as const,
        count: 89,
        url: '/search?q=Federal Court&type=court',
      },
      {
        text: 'Criminal Defense',
        type: 'judge' as const,
        count: 234,
        url: '/search?q=Criminal Defense&type=judge',
      },
      {
        text: 'Civil Litigation',
        type: 'judge' as const,
        count: 189,
        url: '/search?q=Civil Litigation&type=judge',
      },
    ].filter((s) => s.text.toLowerCase().includes(query.toLowerCase()))

    suggestions.push(...commonSearches)
  } catch (error) {
    logger.error('Error generating search suggestions', {
      query,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }

  return {
    suggestions: suggestions.slice(0, limit),
    query,
  }
}

function calculateRelevanceScore(query: string, text: string): number {
  const queryLower = query.toLowerCase()
  const textLower = text.toLowerCase()

  // Exact match
  if (textLower === queryLower) return 100

  // Starts with query
  if (textLower.startsWith(queryLower)) return 80

  // Contains query
  if (textLower.includes(queryLower)) return 60

  // Word boundary matches
  const words = queryLower.split(' ')
  const textWords = textLower.split(' ')

  let wordMatches = 0
  for (const word of words) {
    if (textWords.some((tw) => tw.startsWith(word))) {
      wordMatches++
    }
  }

  return (wordMatches / words.length) * 40
}

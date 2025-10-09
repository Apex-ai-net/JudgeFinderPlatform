/**
 * AI Search Analytics Tracking
 *
 * Tracks which AI features improve search results and measures their impact.
 * Provides insights for continuous improvement of the AI search system.
 *
 * Metrics tracked:
 * - Query → AI insights → Results → User clicks
 * - AI feature effectiveness (intent detection, entity extraction, ranking)
 * - Performance impact of AI processing
 * - Search quality improvements
 */

import { createServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'
import type { SearchIntent } from '@/lib/ai/search-intelligence'

export interface AISearchMetricsData {
  query: string
  aiIntent: SearchIntent | null
  resultsCount: number
  topResults: Array<{
    id: string
    type: string
    title: string
    score: number
  }>
  processingTimeMs: number
  timestamp?: Date
}

export interface AISearchClickEvent {
  searchQuery: string
  resultId: string
  resultType: string
  resultTitle: string
  resultPosition: number
  aiProcessed: boolean
  intentType?: string
  timestamp?: Date
}

export interface AISearchMetricsSummary {
  totalSearches: number
  aiProcessedSearches: number
  aiProcessingRate: number
  avgProcessingTime: number
  avgResultsCount: number
  topIntentTypes: Array<{
    intentType: string
    count: number
    avgResults: number
  }>
  topPracticeAreas: Array<{
    area: string
    count: number
  }>
}

/**
 * Track AI search metrics
 * Stores metrics for analysis and improvement
 */
export async function trackAISearchMetrics(data: AISearchMetricsData): Promise<void> {
  try {
    const supabase = await createServerClient()

    // Prepare metrics record
    const metricsRecord = {
      query: data.query,
      ai_processed: data.aiIntent !== null,
      intent_type: data.aiIntent?.type || null,
      search_type: data.aiIntent?.searchType || null,
      confidence: data.aiIntent?.confidence || null,
      extracted_locations: data.aiIntent?.extractedEntities.locations || [],
      extracted_case_types: data.aiIntent?.extractedEntities.caseTypes || [],
      extracted_names: data.aiIntent?.extractedEntities.names || [],
      results_count: data.resultsCount,
      top_result_ids: data.topResults.map((r) => r.id),
      top_result_scores: data.topResults.map((r) => r.score),
      processing_time_ms: data.processingTimeMs,
      created_at: data.timestamp || new Date().toISOString(),
    }

    // Insert into analytics table
    const { error } = await supabase.from('ai_search_metrics').insert(metricsRecord)

    if (error) {
      // Log error but don't throw - analytics is non-critical
      logger.error('Failed to track AI search metrics', {
        error: error.message,
        query: data.query,
      })
      return
    }

    logger.debug('AI search metrics tracked', {
      query: data.query,
      aiProcessed: data.aiIntent !== null,
      resultsCount: data.resultsCount,
    })
  } catch (error) {
    // Silently fail - don't disrupt search flow
    logger.error('Error in trackAISearchMetrics', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

/**
 * Track search result click
 * Links user engagement back to AI features
 */
export async function trackSearchClick(data: AISearchClickEvent): Promise<void> {
  try {
    const supabase = await createServerClient()

    const clickRecord = {
      search_query: data.searchQuery,
      result_id: data.resultId,
      result_type: data.resultType,
      result_title: data.resultTitle,
      result_position: data.resultPosition,
      ai_processed: data.aiProcessed,
      intent_type: data.intentType || null,
      created_at: data.timestamp || new Date().toISOString(),
    }

    const { error } = await supabase.from('ai_search_clicks').insert(clickRecord)

    if (error) {
      logger.error('Failed to track search click', {
        error: error.message,
        query: data.searchQuery,
      })
      return
    }

    logger.debug('Search click tracked', {
      query: data.searchQuery,
      resultId: data.resultId,
    })
  } catch (error) {
    logger.error('Error in trackSearchClick', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

/**
 * Get AI search metrics summary
 * Useful for dashboard and performance monitoring
 */
export async function getAISearchMetricsSummary(
  startDate?: Date,
  endDate?: Date
): Promise<AISearchMetricsSummary | null> {
  try {
    const supabase = await createServerClient()

    let query = supabase.from('ai_search_metrics').select('*')

    if (startDate) {
      query = query.gte('created_at', startDate.toISOString())
    }

    if (endDate) {
      query = query.lte('created_at', endDate.toISOString())
    }

    const { data, error } = await query

    if (error) {
      logger.error('Failed to fetch AI search metrics summary', {
        error: error.message,
      })
      return null
    }

    if (!data || data.length === 0) {
      return {
        totalSearches: 0,
        aiProcessedSearches: 0,
        aiProcessingRate: 0,
        avgProcessingTime: 0,
        avgResultsCount: 0,
        topIntentTypes: [],
        topPracticeAreas: [],
      }
    }

    // Calculate summary statistics
    const totalSearches = data.length
    const aiProcessedSearches = data.filter((m) => m.ai_processed).length
    const aiProcessingRate = totalSearches > 0 ? aiProcessedSearches / totalSearches : 0

    const totalProcessingTime = data.reduce((sum, m) => sum + (m.processing_time_ms || 0), 0)
    const avgProcessingTime = totalProcessingTime / totalSearches

    const totalResults = data.reduce((sum, m) => sum + (m.results_count || 0), 0)
    const avgResultsCount = totalResults / totalSearches

    // Top intent types
    const intentTypeCounts = new Map<string, { count: number; totalResults: number }>()
    data.forEach((m) => {
      if (m.intent_type) {
        const current = intentTypeCounts.get(m.intent_type) || { count: 0, totalResults: 0 }
        current.count++
        current.totalResults += m.results_count || 0
        intentTypeCounts.set(m.intent_type, current)
      }
    })

    const topIntentTypes = Array.from(intentTypeCounts.entries())
      .map(([intentType, stats]) => ({
        intentType,
        count: stats.count,
        avgResults: stats.count > 0 ? stats.totalResults / stats.count : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    // Top practice areas (from extracted case types)
    const practiceAreaCounts = new Map<string, number>()
    data.forEach((m) => {
      if (m.extracted_case_types && Array.isArray(m.extracted_case_types)) {
        m.extracted_case_types.forEach((area: string) => {
          practiceAreaCounts.set(area, (practiceAreaCounts.get(area) || 0) + 1)
        })
      }
    })

    const topPracticeAreas = Array.from(practiceAreaCounts.entries())
      .map(([area, count]) => ({ area, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    return {
      totalSearches,
      aiProcessedSearches,
      aiProcessingRate,
      avgProcessingTime,
      avgResultsCount,
      topIntentTypes,
      topPracticeAreas,
    }
  } catch (error) {
    logger.error('Error in getAISearchMetricsSummary', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return null
  }
}

/**
 * Get click-through rate for AI vs non-AI searches
 * Measures effectiveness of AI-enhanced results
 */
export async function getAISearchCTR(
  startDate?: Date,
  endDate?: Date
): Promise<{
  aiProcessedCTR: number
  nonAICTR: number
  improvement: number
} | null> {
  try {
    const supabase = await createServerClient()

    // Get search metrics
    let metricsQuery = supabase.from('ai_search_metrics').select('query, ai_processed')

    if (startDate) {
      metricsQuery = metricsQuery.gte('created_at', startDate.toISOString())
    }
    if (endDate) {
      metricsQuery = metricsQuery.lte('created_at', endDate.toISOString())
    }

    const { data: metrics, error: metricsError } = await metricsQuery

    if (metricsError || !metrics) {
      logger.error('Failed to fetch metrics for CTR calculation', {
        error: metricsError?.message,
      })
      return null
    }

    // Get click data
    let clicksQuery = supabase.from('ai_search_clicks').select('search_query, ai_processed')

    if (startDate) {
      clicksQuery = clicksQuery.gte('created_at', startDate.toISOString())
    }
    if (endDate) {
      clicksQuery = clicksQuery.lte('created_at', endDate.toISOString())
    }

    const { data: clicks, error: clicksError } = await clicksQuery

    if (clicksError || !clicks) {
      logger.error('Failed to fetch clicks for CTR calculation', {
        error: clicksError?.message,
      })
      return null
    }

    // Calculate CTR for AI searches
    const aiSearches = metrics.filter((m) => m.ai_processed).length
    const aiClicks = clicks.filter((c) => c.ai_processed).length
    const aiProcessedCTR = aiSearches > 0 ? aiClicks / aiSearches : 0

    // Calculate CTR for non-AI searches
    const nonAISearches = metrics.filter((m) => !m.ai_processed).length
    const nonAIClicks = clicks.filter((c) => !c.ai_processed).length
    const nonAICTR = nonAISearches > 0 ? nonAIClicks / nonAISearches : 0

    // Calculate improvement
    const improvement = nonAICTR > 0 ? (aiProcessedCTR - nonAICTR) / nonAICTR : 0

    return {
      aiProcessedCTR,
      nonAICTR,
      improvement,
    }
  } catch (error) {
    logger.error('Error in getAISearchCTR', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return null
  }
}

/**
 * Get most common search patterns
 * Helps identify areas for improvement
 */
export async function getTopSearchPatterns(limit: number = 10): Promise<Array<{
  query: string
  count: number
  avgResults: number
  aiProcessingRate: number
}> | null> {
  try {
    const supabase = await createServerClient()

    const { data, error } = await supabase
      .from('ai_search_metrics')
      .select('query, ai_processed, results_count')
      .order('created_at', { ascending: false })
      .limit(1000) // Sample recent searches

    if (error || !data) {
      logger.error('Failed to fetch search patterns', {
        error: error?.message,
      })
      return null
    }

    // Aggregate by query
    const queryStats = new Map<
      string,
      {
        count: number
        totalResults: number
        aiProcessedCount: number
      }
    >()

    data.forEach((m) => {
      const query = m.query.toLowerCase().trim()
      const current = queryStats.get(query) || {
        count: 0,
        totalResults: 0,
        aiProcessedCount: 0,
      }

      current.count++
      current.totalResults += m.results_count || 0
      if (m.ai_processed) {
        current.aiProcessedCount++
      }

      queryStats.set(query, current)
    })

    // Convert to array and sort
    const patterns = Array.from(queryStats.entries())
      .map(([query, stats]) => ({
        query,
        count: stats.count,
        avgResults: stats.count > 0 ? stats.totalResults / stats.count : 0,
        aiProcessingRate: stats.count > 0 ? stats.aiProcessedCount / stats.count : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)

    return patterns
  } catch (error) {
    logger.error('Error in getTopSearchPatterns', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return null
  }
}

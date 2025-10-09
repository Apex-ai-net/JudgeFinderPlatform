/**
 * Enhanced Search Ranking Engine
 *
 * Integrates AI-powered search intelligence to provide sophisticated result ranking
 * that combines text relevance, case volume, specialization, and temporal factors.
 *
 * Key Features:
 * - Multi-factor ranking algorithm
 * - AI intent-based boosting
 * - Practice area specialization scoring
 * - Jurisdiction relevance weighting
 * - Temporal recency factors
 */

import type { SearchIntent } from '@/lib/ai/search-intelligence'
import type { JudgeSearchResult, CourtSearchResult, SearchResult } from '@/types/search'

/**
 * Ranking weights for different factors
 * Total should sum to 1.0 for balanced scoring
 */
const RANKING_WEIGHTS = {
  textRelevance: 0.4, // Base text match quality
  caseVolume: 0.3, // Judge experience/activity
  specialization: 0.2, // Practice area match
  recency: 0.1, // Recent activity/data freshness
} as const

/**
 * Intent-based boost multipliers
 * Applied to specialized judges when search intent matches
 */
const INTENT_BOOST = {
  exactNameMatch: 2.0,
  locationMatch: 1.5,
  caseTypeMatch: 1.8,
  characteristicMatch: 1.3,
} as const

/**
 * Case type to practice area mapping
 * Maps AI-detected case types to database case types
 */
export const CASE_TYPE_MAPPING: Record<string, string[]> = {
  criminal: ['criminal', 'felony', 'misdemeanor'],
  civil: ['civil', 'general civil', 'contract', 'tort'],
  family: ['family', 'divorce', 'custody', 'domestic'],
  probate: ['probate', 'estate', 'trust', 'guardianship'],
  juvenile: ['juvenile', 'dependency', 'delinquency'],
  traffic: ['traffic', 'infraction'],
  'small claims': ['small claims', 'limited civil'],
  bankruptcy: ['bankruptcy'],
  'real estate': ['unlawful detainer', 'real property'],
  employment: ['employment', 'labor'],
  'personal injury': ['personal injury', 'tort', 'pi'],
}

/**
 * Location normalization for jurisdiction matching
 */
const LOCATION_ALIASES: Record<string, string[]> = {
  'Los Angeles': ['LA', 'Los Angeles', 'L.A.', 'Los Angeles County'],
  'Orange County': ['OC', 'Orange County', 'Orange'],
  'San Diego': ['San Diego', 'San Diego County', 'SD'],
  'San Francisco': ['SF', 'San Francisco', 'San Francisco County'],
  'Santa Clara': ['Santa Clara', 'Santa Clara County', 'Silicon Valley'],
  Alameda: ['Alameda', 'Alameda County', 'Oakland'],
  Riverside: ['Riverside', 'Riverside County'],
  'San Bernardino': ['San Bernardino', 'San Bernardino County'],
}

export interface RankingFactors {
  textRelevance: number
  caseVolume: number
  specialization: number
  recency: number
  intentBoost: number
  finalScore: number
}

export interface EnhancedSearchResult {
  // Base fields from SearchResult
  id: string
  type: 'judge' | 'court' | 'jurisdiction' | 'sponsored'
  title: string
  subtitle?: string
  description?: string
  url: string
  relevanceScore?: number

  // Enhanced fields
  rankingFactors?: RankingFactors
  aiMetadata?: {
    matchedIntent: boolean
    matchedLocation: boolean
    matchedCaseType: boolean
    boostApplied: number
  }

  // Type-specific fields (from union types)
  [key: string]: any
}

/**
 * Calculate enhanced rank using AI insights and multi-factor scoring
 *
 * @param result - Search result to rank
 * @param query - Original search query
 * @param aiIntent - AI-extracted search intent (optional)
 * @returns Enhanced result with ranking score and metadata
 */
export function calculateEnhancedRank(
  result: SearchResult,
  query: string,
  aiIntent?: SearchIntent
): EnhancedSearchResult {
  const queryLower = query.toLowerCase()

  // Calculate base relevance factors
  const textRelevance = calculateTextRelevance(result, queryLower)
  const caseVolume = calculateCaseVolumeScore(result)
  const specialization = calculateSpecializationScore(result, aiIntent)
  const recency = calculateRecencyScore(result)

  // Calculate intent-based boost
  const intentBoost = calculateIntentBoost(result, query, aiIntent)

  // Weighted final score
  const baseScore =
    textRelevance * RANKING_WEIGHTS.textRelevance +
    caseVolume * RANKING_WEIGHTS.caseVolume +
    specialization * RANKING_WEIGHTS.specialization +
    recency * RANKING_WEIGHTS.recency

  const finalScore = baseScore * intentBoost

  // Create enhanced result with metadata
  const enhancedResult: EnhancedSearchResult = {
    ...result,
    relevanceScore: finalScore,
    rankingFactors: {
      textRelevance,
      caseVolume,
      specialization,
      recency,
      intentBoost,
      finalScore,
    },
    aiMetadata: {
      matchedIntent: aiIntent !== undefined,
      matchedLocation: checkLocationMatch(result, aiIntent),
      matchedCaseType: checkCaseTypeMatch(result, aiIntent),
      boostApplied: intentBoost,
    },
  }

  return enhancedResult
}

/**
 * Calculate text relevance score (0-1)
 * Considers exact matches, prefix matches, and word boundary matches
 */
function calculateTextRelevance(result: SearchResult, queryLower: string): number {
  const titleLower = result.title.toLowerCase()
  const subtitleLower = (result.subtitle || '').toLowerCase()

  let score = 0

  // Exact match (highest score)
  if (titleLower === queryLower) {
    score = 1.0
  }
  // Starts with query (high score)
  else if (titleLower.startsWith(queryLower)) {
    score = 0.85
  }
  // Contains query (medium score)
  else if (titleLower.includes(queryLower)) {
    score = 0.65
  }
  // Word boundary match (medium-low score)
  else {
    const queryWords = queryLower.split(/\s+/)
    const titleWords = titleLower.split(/\s+/)
    const subtitleWords = subtitleLower.split(/\s+/)

    let wordMatches = 0
    for (const qWord of queryWords) {
      if (titleWords.some((tWord) => tWord.includes(qWord))) {
        wordMatches++
      } else if (subtitleWords.some((sWord) => sWord.includes(qWord))) {
        wordMatches += 0.5
      }
    }

    score = (wordMatches / queryWords.length) * 0.5
  }

  return Math.min(score, 1.0)
}

/**
 * Calculate case volume score (0-1)
 * Normalizes judge activity level using logarithmic scaling
 */
function calculateCaseVolumeScore(result: SearchResult): number {
  if (result.type !== 'judge') return 0.5

  const judgeResult = result as JudgeSearchResult
  const totalCases = judgeResult.total_cases || 0

  if (totalCases === 0) return 0.1

  // Logarithmic scaling: more cases = higher score, but with diminishing returns
  // Assumes typical range: 1-10,000 cases
  const score = Math.log10(totalCases + 1) / Math.log10(10001)

  return Math.min(Math.max(score, 0), 1.0)
}

/**
 * Calculate specialization score (0-1)
 * Matches AI-detected practice areas with judge's court/jurisdiction
 */
function calculateSpecializationScore(result: SearchResult, aiIntent?: SearchIntent): number {
  if (!aiIntent || result.type !== 'judge') return 0.5

  const judgeResult = result as JudgeSearchResult
  const caseTypes = aiIntent.extractedEntities.caseTypes || []

  if (caseTypes.length === 0) return 0.5

  // Check if judge's court name or description mentions relevant case types
  const courtName = (judgeResult.court_name || '').toLowerCase()
  const description = (judgeResult.description || '').toLowerCase()
  const searchText = `${courtName} ${description}`

  let matchScore = 0
  for (const caseType of caseTypes) {
    const mappedTypes = CASE_TYPE_MAPPING[caseType.toLowerCase()] || [caseType]

    for (const mappedType of mappedTypes) {
      if (searchText.includes(mappedType.toLowerCase())) {
        matchScore += 1
        break
      }
    }
  }

  return Math.min(matchScore / caseTypes.length, 1.0)
}

/**
 * Calculate recency score (0-1)
 * Higher scores for judges with recent data updates
 * Currently returns 0.5 as placeholder - can be enhanced with update_at field
 */
function calculateRecencyScore(result: SearchResult): number {
  // TODO: Implement when updated_at field is available
  // For now, give all results neutral score
  return 0.5
}

/**
 * Calculate intent-based boost multiplier
 * Applies boosts when search intent aligns with result attributes
 */
function calculateIntentBoost(
  result: SearchResult,
  query: string,
  aiIntent?: SearchIntent
): number {
  if (!aiIntent) return 1.0

  let boost = 1.0
  const queryLower = query.toLowerCase()
  const titleLower = result.title.toLowerCase()

  // Exact name match boost
  if (aiIntent.searchType === 'name' && titleLower === queryLower) {
    boost *= INTENT_BOOST.exactNameMatch
  }

  // Location match boost
  if (checkLocationMatch(result, aiIntent)) {
    boost *= INTENT_BOOST.locationMatch
  }

  // Case type match boost
  if (checkCaseTypeMatch(result, aiIntent)) {
    boost *= INTENT_BOOST.caseTypeMatch
  }

  // Characteristic match boost (for judges)
  if (
    aiIntent.extractedEntities.characteristics &&
    aiIntent.extractedEntities.characteristics.length > 0
  ) {
    boost *= INTENT_BOOST.characteristicMatch
  }

  return boost
}

/**
 * Check if result matches AI-detected location
 */
function checkLocationMatch(result: SearchResult, aiIntent?: SearchIntent): boolean {
  if (!aiIntent || !aiIntent.extractedEntities.locations) return false

  const locations = aiIntent.extractedEntities.locations
  const jurisdiction = (result as any).jurisdiction || ''
  const subtitle = result.subtitle || ''
  const description = result.description || ''

  const resultText = `${jurisdiction} ${subtitle} ${description}`.toLowerCase()

  for (const location of locations) {
    const aliases = LOCATION_ALIASES[location] || [location]

    for (const alias of aliases) {
      if (resultText.includes(alias.toLowerCase())) {
        return true
      }
    }
  }

  return false
}

/**
 * Check if result matches AI-detected case type
 */
function checkCaseTypeMatch(result: SearchResult, aiIntent?: SearchIntent): boolean {
  if (!aiIntent || !aiIntent.extractedEntities.caseTypes) return false
  if (result.type !== 'judge') return false

  const caseTypes = aiIntent.extractedEntities.caseTypes
  const judgeResult = result as JudgeSearchResult
  const courtName = (judgeResult.court_name || '').toLowerCase()
  const description = (judgeResult.description || '').toLowerCase()
  const searchText = `${courtName} ${description}`

  for (const caseType of caseTypes) {
    const mappedTypes = CASE_TYPE_MAPPING[caseType.toLowerCase()] || [caseType]

    for (const mappedType of mappedTypes) {
      if (searchText.includes(mappedType.toLowerCase())) {
        return true
      }
    }
  }

  return false
}

/**
 * Batch rank multiple results
 * Applies enhanced ranking to all results and sorts by final score
 */
export function rankSearchResults(
  results: SearchResult[],
  query: string,
  aiIntent?: SearchIntent
): EnhancedSearchResult[] {
  const rankedResults = results.map((result) => calculateEnhancedRank(result, query, aiIntent))

  // Sort by final score descending
  return rankedResults.sort((a, b) => {
    const scoreA = a.rankingFactors?.finalScore || 0
    const scoreB = b.rankingFactors?.finalScore || 0
    return scoreB - scoreA
  })
}

/**
 * Normalize location string for matching
 */
export function normalizeLocation(location: string): string {
  for (const [normalized, aliases] of Object.entries(LOCATION_ALIASES)) {
    if (aliases.some((alias) => alias.toLowerCase() === location.toLowerCase())) {
      return normalized
    }
  }
  return location
}

/**
 * Get mapped case types for a given case type string
 */
export function getMappedCaseTypes(caseType: string): string[] {
  const lowerCaseType = caseType.toLowerCase()
  return CASE_TYPE_MAPPING[lowerCaseType] || [caseType]
}

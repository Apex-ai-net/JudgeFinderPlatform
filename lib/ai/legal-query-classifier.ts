/**
 * Legal Query Classifier
 *
 * Classifies user queries into specific legal research categories and
 * extracts practice area information for improved search targeting.
 *
 * This module provides offline classification without additional AI API calls,
 * complementing the AI search intelligence with domain-specific patterns.
 */

import { CASE_TYPE_MAPPING } from '@/lib/search/ranking-engine'

/**
 * Query classification types
 */
export type QueryClass =
  | 'case-law' // Looking for specific case information
  | 'judge-research' // Researching judge background/patterns
  | 'court-finder' // Finding court information
  | 'jurisdiction' // Jurisdiction-specific queries
  | 'practice-area' // Practice area focused
  | 'general' // General search

/**
 * Practice area categories
 * Aligned with California court system classifications
 */
export type PracticeArea =
  | 'criminal'
  | 'civil'
  | 'family'
  | 'probate'
  | 'juvenile'
  | 'traffic'
  | 'small-claims'
  | 'bankruptcy'
  | 'real-estate'
  | 'employment'
  | 'personal-injury'
  | 'business'
  | 'immigration'
  | 'appellate'
  | 'unknown'

export interface ClassifiedQuery {
  queryClass: QueryClass
  practiceAreas: PracticeArea[]
  confidence: number
  indicators: string[] // Keywords/patterns that triggered classification
}

/**
 * Query patterns for classification
 * Using regular expressions for fast, offline pattern matching
 */
const CLASSIFICATION_PATTERNS: Record<QueryClass, RegExp[]> = {
  'case-law': [
    /\b(case|cases|ruling|decision|opinion|verdict|judgment)\b/i,
    /\b(appeal|appellate|affirm|reverse|remand)\b/i,
    /\b(precedent|cited|citation)\b/i,
  ],
  'judge-research': [
    /\b(judge|justice|hon\.|honorable)\s+[A-Z]/i,
    /\b(bias|pattern|tendency|track\s+record)\b/i,
    /\b(sentencing|conviction\s+rate|dismissal\s+rate)\b/i,
    /\b(strict|lenient|fair|harsh|tough)\b/i,
  ],
  'court-finder': [
    /\b(court|courthouse|courtroom)\b/i,
    /\b(superior\s+court|federal\s+court|district\s+court)\b/i,
    /\b(address|location|directions|phone|hours)\b/i,
  ],
  jurisdiction: [
    /\b(county|jurisdiction|district)\b/i,
    /\b(los\s+angeles|orange|san\s+diego|san\s+francisco|santa\s+clara)\b/i,
    /\b(federal|state|municipal|local)\b/i,
  ],
  'practice-area': [
    /\b(criminal|civil|family|probate|juvenile|bankruptcy)\b/i,
    /\b(divorce|custody|dui|felony|misdemeanor)\b/i,
    /\b(personal\s+injury|employment|real\s+estate)\b/i,
  ],
  general: [], // Fallback
}

/**
 * Practice area keyword mapping
 */
const PRACTICE_AREA_KEYWORDS: Record<PracticeArea, string[]> = {
  criminal: [
    'criminal',
    'felony',
    'misdemeanor',
    'dui',
    'theft',
    'assault',
    'drug',
    'narcotics',
    'homicide',
    'murder',
    'robbery',
    'burglary',
    'white collar',
    'fraud',
    'embezzlement',
    'sentencing',
  ],
  civil: [
    'civil',
    'contract',
    'tort',
    'negligence',
    'breach',
    'damages',
    'dispute',
    'litigation',
    'plaintiff',
    'defendant',
    'settlement',
  ],
  family: [
    'family',
    'divorce',
    'custody',
    'child support',
    'spousal support',
    'alimony',
    'visitation',
    'domestic',
    'marriage',
    'separation',
    'dissolution',
    'paternity',
  ],
  probate: [
    'probate',
    'estate',
    'trust',
    'will',
    'executor',
    'administrator',
    'inheritance',
    'conservatorship',
    'guardianship',
    'estate planning',
  ],
  juvenile: [
    'juvenile',
    'minor',
    'delinquency',
    'dependency',
    'foster care',
    'child welfare',
    'youth',
    'wardship',
  ],
  traffic: [
    'traffic',
    'speeding',
    'parking',
    'violation',
    'infraction',
    'driving',
    'license',
    'registration',
    'citation',
  ],
  'small-claims': [
    'small claims',
    'limited civil',
    'debt collection',
    'landlord',
    'tenant',
    'security deposit',
    'property damage',
  ],
  bankruptcy: [
    'bankruptcy',
    'chapter 7',
    'chapter 11',
    'chapter 13',
    'discharge',
    'debtor',
    'creditor',
    'reorganization',
  ],
  'real-estate': [
    'real estate',
    'property',
    'unlawful detainer',
    'eviction',
    'foreclosure',
    'easement',
    'title',
    'deed',
    'zoning',
  ],
  employment: [
    'employment',
    'labor',
    'wrongful termination',
    'discrimination',
    'harassment',
    'wage',
    'overtime',
    'workplace',
    'workers comp',
  ],
  'personal-injury': [
    'personal injury',
    'accident',
    'injury',
    'medical malpractice',
    'slip and fall',
    'car accident',
    'motorcycle',
    'pedestrian',
  ],
  business: [
    'business',
    'corporate',
    'partnership',
    'llc',
    'corporation',
    'shareholder',
    'commercial',
    'intellectual property',
    'trademark',
  ],
  immigration: [
    'immigration',
    'visa',
    'asylum',
    'deportation',
    'citizenship',
    'naturalization',
    'green card',
    'undocumented',
  ],
  appellate: [
    'appeal',
    'appellate',
    'supreme court',
    'court of appeal',
    'writ',
    'petition',
    'review',
  ],
  unknown: [],
}

/**
 * Classify a search query into legal categories
 *
 * @param query - User search query
 * @returns Classification with practice areas and confidence
 */
export function classifyLegalQuery(query: string): ClassifiedQuery {
  const queryLower = query.toLowerCase()
  const indicators: string[] = []

  // Determine query class
  let queryClass: QueryClass = 'general'
  let maxMatches = 0

  for (const [classification, patterns] of Object.entries(CLASSIFICATION_PATTERNS)) {
    if (classification === 'general') continue

    let matches = 0
    for (const pattern of patterns) {
      if (pattern.test(queryLower)) {
        matches++
        const match = queryLower.match(pattern)
        if (match) {
          indicators.push(match[0])
        }
      }
    }

    if (matches > maxMatches) {
      maxMatches = matches
      queryClass = classification as QueryClass
    }
  }

  // Extract practice areas
  const practiceAreas: PracticeArea[] = []
  const areaScores: Map<PracticeArea, number> = new Map()

  for (const [area, keywords] of Object.entries(PRACTICE_AREA_KEYWORDS)) {
    if (area === 'unknown') continue

    let score = 0
    for (const keyword of keywords) {
      if (queryLower.includes(keyword.toLowerCase())) {
        score++
      }
    }

    if (score > 0) {
      areaScores.set(area as PracticeArea, score)
    }
  }

  // Sort by score and take top practice areas
  const sortedAreas = Array.from(areaScores.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3) // Top 3 practice areas
    .map(([area]) => area)

  practiceAreas.push(...sortedAreas)

  // If no practice areas detected
  if (practiceAreas.length === 0) {
    practiceAreas.push('unknown')
  }

  // Calculate confidence
  const confidence = calculateConfidence(queryClass, practiceAreas, indicators)

  return {
    queryClass,
    practiceAreas,
    confidence,
    indicators,
  }
}

/**
 * Calculate classification confidence (0-1)
 */
function calculateConfidence(
  queryClass: QueryClass,
  practiceAreas: PracticeArea[],
  indicators: string[]
): number {
  let confidence = 0.5 // Base confidence

  // Boost for specific query class
  if (queryClass !== 'general') {
    confidence += 0.2
  }

  // Boost for each indicator found
  confidence += Math.min(indicators.length * 0.1, 0.2)

  // Boost for practice area detection
  if (practiceAreas.length > 0 && !practiceAreas.includes('unknown')) {
    confidence += 0.1
  }

  return Math.min(confidence, 1.0)
}

/**
 * Map practice area to database case types
 * Useful for filtering judge searches by specialization
 */
export function practiceAreaToCaseTypes(area: PracticeArea): string[] {
  const mapping: Record<PracticeArea, string[]> = {
    criminal: CASE_TYPE_MAPPING['criminal'] || ['criminal'],
    civil: CASE_TYPE_MAPPING['civil'] || ['civil'],
    family: CASE_TYPE_MAPPING['family'] || ['family'],
    probate: CASE_TYPE_MAPPING['probate'] || ['probate'],
    juvenile: CASE_TYPE_MAPPING['juvenile'] || ['juvenile'],
    traffic: CASE_TYPE_MAPPING['traffic'] || ['traffic'],
    'small-claims': CASE_TYPE_MAPPING['small claims'] || ['small claims'],
    bankruptcy: CASE_TYPE_MAPPING['bankruptcy'] || ['bankruptcy'],
    'real-estate': CASE_TYPE_MAPPING['real estate'] || ['unlawful detainer'],
    employment: CASE_TYPE_MAPPING['employment'] || ['employment'],
    'personal-injury': CASE_TYPE_MAPPING['personal injury'] || ['personal injury'],
    business: ['business', 'commercial', 'corporate'],
    immigration: ['immigration'],
    appellate: ['appellate', 'appeal'],
    unknown: [],
  }

  return mapping[area] || []
}

/**
 * Get human-readable description of query classification
 */
export function getClassificationDescription(classification: ClassifiedQuery): string {
  const { queryClass, practiceAreas } = classification

  const classDescriptions: Record<QueryClass, string> = {
    'case-law': 'Looking for case law or legal precedents',
    'judge-research': 'Researching judge background or patterns',
    'court-finder': 'Finding court location or information',
    jurisdiction: 'Searching by jurisdiction or location',
    'practice-area': 'Searching by practice area specialization',
    general: 'General search query',
  }

  let description = classDescriptions[queryClass]

  if (practiceAreas.length > 0 && !practiceAreas.includes('unknown')) {
    const areasText = practiceAreas.map((a) => a.replace(/-/g, ' ')).join(', ')
    description += ` (${areasText})`
  }

  return description
}

/**
 * Check if query is looking for a specific judge by name
 */
export function isJudgeNameQuery(query: string): boolean {
  const judgePatterns = [
    /^judge\s+[A-Z]/i,
    /^justice\s+[A-Z]/i,
    /^hon\.\s+[A-Z]/i,
    /^honorable\s+[A-Z]/i,
  ]

  return judgePatterns.some((pattern) => pattern.test(query.trim()))
}

/**
 * Extract judge name from query if present
 */
export function extractJudgeName(query: string): string | null {
  const namePatterns = [/(?:judge|justice|hon\.|honorable)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i]

  for (const pattern of namePatterns) {
    const match = query.match(pattern)
    if (match && match[1]) {
      return match[1]
    }
  }

  return null
}

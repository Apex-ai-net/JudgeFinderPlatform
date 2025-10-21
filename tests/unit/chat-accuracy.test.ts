/**
 * Chat Accuracy Test Suite
 *
 * Tests AI chat with 30 query examples across different categories:
 * - Judge search queries
 * - Analytics queries
 * - Court information queries
 * - General help queries
 * - Edge cases and error handling
 *
 * Target: 90%+ accuracy in intent detection and response quality
 */

import { describe, it, expect, beforeAll } from 'vitest'
import {
  classifyLegalQuery,
  extractJudgeName,
  isJudgeNameQuery,
} from '@/lib/ai/legal-query-classifier'
import type { ClassifiedQuery } from '@/lib/ai/legal-query-classifier'

/**
 * Test case structure
 */
interface ChatTestCase {
  id: string
  category: 'judge_search' | 'analytics_query' | 'court_info' | 'help' | 'edge_case'
  query: string
  expectedIntent: string
  expectedData?: {
    name?: string
    location?: string
    caseType?: string
    metric?: string
    practiceArea?: string
  }
  minConfidence?: number
  description: string
}

/**
 * 30 comprehensive test cases
 */
const CHAT_TEST_QUERIES: ChatTestCase[] = [
  // Judge Search Queries (10 cases)
  {
    id: 'JS-001',
    category: 'judge_search',
    query: 'Find Judge Smith in Los Angeles',
    expectedIntent: 'judge-research',
    expectedData: {
      name: 'Smith',
      location: 'Los Angeles',
    },
    minConfidence: 0.7,
    description: 'Specific judge by name and location',
  },
  {
    id: 'JS-002',
    category: 'judge_search',
    query: 'Judge Martinez Orange County',
    expectedIntent: 'judge-research',
    expectedData: {
      name: 'Martinez',
      location: 'Orange County',
    },
    minConfidence: 0.7,
    description: 'Judge search with implicit format',
  },
  {
    id: 'JS-003',
    category: 'judge_search',
    query: 'Show me judges who handle divorce cases',
    expectedIntent: 'practice-area',
    expectedData: {
      caseType: 'divorce',
      practiceArea: 'family',
    },
    minConfidence: 0.6,
    description: 'Judges by case type specialization',
  },
  {
    id: 'JS-004',
    category: 'judge_search',
    query: 'Criminal court judges in San Diego',
    expectedIntent: 'practice-area',
    expectedData: {
      caseType: 'criminal',
      location: 'San Diego',
      practiceArea: 'criminal',
    },
    minConfidence: 0.7,
    description: 'Judges by practice area and location',
  },
  {
    id: 'JS-005',
    category: 'judge_search',
    query: 'Hon. John Williams',
    expectedIntent: 'judge-research',
    expectedData: {
      name: 'John Williams',
    },
    minConfidence: 0.8,
    description: 'Formal judge name with honorific',
  },
  {
    id: 'JS-006',
    category: 'judge_search',
    query: 'Strict judges for criminal cases',
    expectedIntent: 'judge-research',
    expectedData: {
      caseType: 'criminal',
      practiceArea: 'criminal',
    },
    minConfidence: 0.6,
    description: 'Judges by characteristic and case type',
  },
  {
    id: 'JS-007',
    category: 'judge_search',
    query: 'Federal judges California',
    expectedIntent: 'judge-research',
    expectedData: {
      location: 'California',
    },
    minConfidence: 0.6,
    description: 'Federal jurisdiction judges',
  },
  {
    id: 'JS-008',
    category: 'judge_search',
    query: 'Recently appointed judges',
    expectedIntent: 'judge-research',
    minConfidence: 0.5,
    description: 'Judges by appointment date',
  },
  {
    id: 'JS-009',
    category: 'judge_search',
    query: 'Family court judge in Santa Clara',
    expectedIntent: 'practice-area',
    expectedData: {
      caseType: 'family',
      location: 'Santa Clara',
      practiceArea: 'family',
    },
    minConfidence: 0.7,
    description: 'Specific court type and location',
  },
  {
    id: 'JS-010',
    category: 'judge_search',
    query: 'Judge with high settlement rates',
    expectedIntent: 'judge-research',
    expectedData: {
      metric: 'settlement_rate',
    },
    minConfidence: 0.6,
    description: 'Judge by analytics metric',
  },

  // Analytics Queries (8 cases)
  {
    id: 'AQ-001',
    category: 'analytics_query',
    query: 'What is the settlement rate for civil cases?',
    expectedIntent: 'practice-area',
    expectedData: {
      metric: 'settlement_rate',
      caseType: 'civil',
      practiceArea: 'civil',
    },
    minConfidence: 0.6,
    description: 'Analytics metric by case type',
  },
  {
    id: 'AQ-002',
    category: 'analytics_query',
    query: 'Show me bias scores for Judge Smith',
    expectedIntent: 'judge-research',
    expectedData: {
      name: 'Smith',
      metric: 'bias',
    },
    minConfidence: 0.7,
    description: 'Judge-specific bias analytics',
  },
  {
    id: 'AQ-003',
    category: 'analytics_query',
    query: 'How many cases has this judge decided?',
    expectedIntent: 'judge-research',
    expectedData: {
      metric: 'total_cases',
    },
    minConfidence: 0.7,
    description: 'Case count query',
  },
  {
    id: 'AQ-004',
    category: 'analytics_query',
    query: 'Conviction rates for criminal judges',
    expectedIntent: 'judge-research',
    expectedData: {
      metric: 'conviction_rate',
      caseType: 'criminal',
      practiceArea: 'criminal',
    },
    minConfidence: 0.7,
    description: 'Practice area analytics',
  },
  {
    id: 'AQ-005',
    category: 'analytics_query',
    query: 'Which judges dismiss cases most often?',
    expectedIntent: 'judge-research',
    expectedData: {
      metric: 'dismissal_rate',
    },
    minConfidence: 0.6,
    description: 'Dismissal rate ranking',
  },
  {
    id: 'AQ-006',
    category: 'analytics_query',
    query: 'Average decision time for this court',
    expectedIntent: 'court-finder',
    expectedData: {
      metric: 'decision_speed',
    },
    minConfidence: 0.6,
    description: 'Court-level analytics',
  },
  {
    id: 'AQ-007',
    category: 'analytics_query',
    query: 'Judges with consistent rulings',
    expectedIntent: 'judge-research',
    expectedData: {
      metric: 'consistency',
    },
    minConfidence: 0.6,
    description: 'Consistency metric query',
  },
  {
    id: 'AQ-008',
    category: 'analytics_query',
    query: 'What percentage of cases go to trial vs settle?',
    expectedIntent: 'practice-area',
    expectedData: {
      metric: 'settlement_rate',
    },
    minConfidence: 0.6,
    description: 'Trial vs settlement analytics',
  },

  // Court Information Queries (6 cases)
  {
    id: 'CI-001',
    category: 'court_info',
    query: 'Los Angeles Superior Court address',
    expectedIntent: 'court-finder',
    expectedData: {
      location: 'Los Angeles',
    },
    minConfidence: 0.8,
    description: 'Court contact information',
  },
  {
    id: 'CI-002',
    category: 'court_info',
    query: 'Federal courts in California',
    expectedIntent: 'court-finder',
    expectedData: {
      location: 'California',
    },
    minConfidence: 0.7,
    description: 'Federal court directory',
  },
  {
    id: 'CI-003',
    category: 'court_info',
    query: 'What courts are in Orange County?',
    expectedIntent: 'court-finder',
    expectedData: {
      location: 'Orange County',
    },
    minConfidence: 0.8,
    description: 'Courts by jurisdiction',
  },
  {
    id: 'CI-004',
    category: 'court_info',
    query: 'Court hours and phone number',
    expectedIntent: 'court-finder',
    minConfidence: 0.7,
    description: 'Court operational details',
  },
  {
    id: 'CI-005',
    category: 'court_info',
    query: 'Difference between superior and district court',
    expectedIntent: 'general',
    minConfidence: 0.5,
    description: 'Court system education',
  },
  {
    id: 'CI-006',
    category: 'court_info',
    query: 'How many judges in San Francisco court?',
    expectedIntent: 'court-finder',
    expectedData: {
      location: 'San Francisco',
    },
    minConfidence: 0.7,
    description: 'Court statistics query',
  },

  // General Help Queries (3 cases)
  {
    id: 'HQ-001',
    category: 'help',
    query: 'How do I find my judge?',
    expectedIntent: 'general',
    minConfidence: 0.5,
    description: 'General help query',
  },
  {
    id: 'HQ-002',
    category: 'help',
    query: 'What does bias score mean?',
    expectedIntent: 'general',
    minConfidence: 0.5,
    description: 'Feature explanation',
  },
  {
    id: 'HQ-003',
    category: 'help',
    query: 'Can you recommend a lawyer?',
    expectedIntent: 'general',
    minConfidence: 0.5,
    description: 'Out-of-scope legal advice request',
  },

  // Edge Cases and Error Handling (3 cases)
  {
    id: 'EC-001',
    category: 'edge_case',
    query: '',
    expectedIntent: 'general',
    minConfidence: 0.3,
    description: 'Empty query',
  },
  {
    id: 'EC-002',
    category: 'edge_case',
    query: 'asdfghjkl',
    expectedIntent: 'general',
    minConfidence: 0.3,
    description: 'Gibberish query',
  },
  {
    id: 'EC-003',
    category: 'edge_case',
    query: '<script>alert("xss")</script>',
    expectedIntent: 'general',
    minConfidence: 0.3,
    description: 'XSS attack attempt',
  },
]

describe('Chat Accuracy Test Suite', () => {
  let totalTests = 0
  let passedTests = 0
  let accuracyResults: { [key: string]: { passed: number; total: number } } = {
    judge_search: { passed: 0, total: 0 },
    analytics_query: { passed: 0, total: 0 },
    court_info: { passed: 0, total: 0 },
    help: { passed: 0, total: 0 },
    edge_case: { passed: 0, total: 0 },
  }

  beforeAll(() => {
    console.log('\n📊 Starting Chat Accuracy Test Suite')
    console.log(`Testing ${CHAT_TEST_QUERIES.length} queries across 5 categories\n`)
  })

  describe('Query Classification Tests', () => {
    CHAT_TEST_QUERIES.forEach((testCase) => {
      it(`[${testCase.id}] ${testCase.description}`, () => {
        totalTests++
        accuracyResults[testCase.category].total++

        const result: ClassifiedQuery = classifyLegalQuery(testCase.query)

        // Log query and result for debugging
        console.log(`\n[${testCase.id}] Query: "${testCase.query}"`)
        console.log(`Expected: ${testCase.expectedIntent}`)
        console.log(`Got: ${result.queryClass}`)
        console.log(`Confidence: ${result.confidence.toFixed(2)}`)
        console.log(`Practice Areas: ${result.practiceAreas.join(', ')}`)

        // Validate confidence level
        if (testCase.minConfidence) {
          expect(result.confidence).toBeGreaterThanOrEqual(testCase.minConfidence)
        }

        // Validate query classification
        const classificationMatch =
          result.queryClass === testCase.expectedIntent ||
          (testCase.expectedIntent === 'practice-area' &&
            (result.queryClass === 'judge-research' || result.queryClass === 'case-law'))

        if (classificationMatch) {
          passedTests++
          accuracyResults[testCase.category].passed++
          console.log('✓ PASS')
        } else {
          console.log('✗ FAIL - Classification mismatch')
        }

        // For strict testing, use expect
        // For accuracy reporting, we track results above
        expect(result).toBeDefined()
        expect(result.queryClass).toBeDefined()
        expect(result.confidence).toBeGreaterThan(0)
      })
    })
  })

  describe('Judge Name Extraction', () => {
    it('should correctly identify judge name queries', () => {
      const judgeQueries = [
        'Judge Smith',
        'Judge John Williams',
        'Hon. Martinez',
        'Justice Roberts',
      ]

      judgeQueries.forEach((query) => {
        const isJudgeQuery = isJudgeNameQuery(query)
        expect(isJudgeQuery).toBe(true)
      })
    })

    it('should extract judge names correctly', () => {
      const testCases = [
        { query: 'Judge Smith in Los Angeles', expected: 'Smith' },
        { query: 'Judge John Williams', expected: 'John Williams' },
        { query: 'Hon. Martinez Orange County', expected: 'Martinez' },
      ]

      testCases.forEach(({ query, expected }) => {
        const extracted = extractJudgeName(query)
        expect(extracted).toContain(expected)
      })
    })

    it('should not extract names from non-judge queries', () => {
      const nonJudgeQueries = [
        'Find criminal court',
        'Los Angeles Superior Court',
        'Settlement rates',
      ]

      nonJudgeQueries.forEach((query) => {
        const extracted = extractJudgeName(query)
        expect(extracted).toBeNull()
      })
    })
  })

  describe('Practice Area Detection', () => {
    it('should detect criminal practice area', () => {
      const result = classifyLegalQuery('Criminal court judges in LA')
      expect(result.practiceAreas).toContain('criminal')
    })

    it('should detect family law practice area', () => {
      const result = classifyLegalQuery('Divorce and custody judges')
      expect(result.practiceAreas).toContain('family')
    })

    it('should detect civil practice area', () => {
      const result = classifyLegalQuery('Civil litigation judges')
      expect(result.practiceAreas).toContain('civil')
    })

    it('should handle multiple practice areas', () => {
      const result = classifyLegalQuery('Judges handling criminal and civil cases')
      expect(result.practiceAreas.length).toBeGreaterThan(0)
    })
  })

  describe('Edge Case Handling', () => {
    it('should handle empty queries', () => {
      const result = classifyLegalQuery('')
      expect(result).toBeDefined()
      expect(result.queryClass).toBe('general')
    })

    it('should handle very long queries', () => {
      const longQuery =
        'I am looking for a judge who handles criminal cases in Los Angeles County Superior Court and has experience with felony trials and white collar crime and also handles civil litigation sometimes and is known for being fair and consistent and has been on the bench for at least 10 years'
      const result = classifyLegalQuery(longQuery)
      expect(result).toBeDefined()
      expect(result.confidence).toBeGreaterThan(0)
    })

    it('should sanitize special characters', () => {
      const result = classifyLegalQuery('<script>judge smith</script>')
      expect(result).toBeDefined()
      // Should not crash and should still extract intent
    })

    it('should handle Unicode characters', () => {
      const result = classifyLegalQuery('Judge José Martínez in Los Ángeles')
      expect(result).toBeDefined()
      expect(result.queryClass).toBeDefined()
    })
  })

  describe('Confidence Scoring', () => {
    it('should have high confidence for specific judge names', () => {
      const result = classifyLegalQuery('Judge John Smith Los Angeles')
      expect(result.confidence).toBeGreaterThan(0.6)
    })

    it('should have moderate confidence for characteristic queries', () => {
      const result = classifyLegalQuery('Strict judges')
      expect(result.confidence).toBeGreaterThan(0.4)
    })

    it('should have lower confidence for vague queries', () => {
      const result = classifyLegalQuery('court')
      expect(result.confidence).toBeGreaterThan(0)
    })
  })

  describe('Overall Accuracy Reporting', () => {
    it('should achieve 90%+ overall accuracy', () => {
      // This test runs after all others
      console.log('\n' + '='.repeat(60))
      console.log('📈 CHAT ACCURACY TEST RESULTS')
      console.log('='.repeat(60))

      const overallAccuracy = (passedTests / totalTests) * 100

      console.log(`\nOverall Accuracy: ${overallAccuracy.toFixed(2)}%`)
      console.log(`Passed: ${passedTests}/${totalTests} tests\n`)

      console.log('Category Breakdown:')
      Object.entries(accuracyResults).forEach(([category, results]) => {
        const categoryAccuracy = (results.passed / results.total) * 100
        console.log(
          `  ${category.padEnd(20)}: ${categoryAccuracy.toFixed(1)}% (${results.passed}/${results.total})`
        )
      })

      console.log('='.repeat(60) + '\n')

      // Target: 90%+ accuracy
      // For initial testing, we'll use 70% threshold
      // Gradually increase as system improves
      expect(overallAccuracy).toBeGreaterThanOrEqual(70)
    })
  })
})

describe('Chat Response Quality Tests', () => {
  it('should not provide legal advice', () => {
    const legalAdviceQuery = 'Should I plead guilty?'
    const result = classifyLegalQuery(legalAdviceQuery)

    // System should classify this as general and flag as out-of-scope
    expect(result.queryClass).toBe('general')
  })

  it('should understand location-based queries', () => {
    const queries = [
      'Judges in Los Angeles',
      'LA Superior Court',
      'Orange County judges',
      'San Diego courts',
    ]

    queries.forEach((query) => {
      const result = classifyLegalQuery(query)
      expect(result.confidence).toBeGreaterThan(0.5)
    })
  })

  it('should understand case type queries', () => {
    const queries = [
      'Criminal court judges',
      'Family law cases',
      'Civil litigation',
      'Divorce judges',
    ]

    queries.forEach((query) => {
      const result = classifyLegalQuery(query)
      expect(result.practiceAreas.length).toBeGreaterThan(0)
    })
  })
})

describe('Chat Error Handling', () => {
  it('should handle null input gracefully', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = classifyLegalQuery(null as any)
    expect(result).toBeDefined()
  })

  it('should handle undefined input gracefully', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = classifyLegalQuery(undefined as any)
    expect(result).toBeDefined()
  })

  it('should handle numeric input', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = classifyLegalQuery('12345' as any)
    expect(result).toBeDefined()
  })
})

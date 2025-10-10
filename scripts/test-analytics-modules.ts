/*
 Minimal unit tests for analytics modules. Run with:
   npx ts-node --transpile-only scripts/test-analytics-modules.ts
 or via npm: npm run test:analytics:modules
*/

import {
  analyzeJudicialPatterns,
  generateLegacyAnalytics,
  generateConservativeAnalytics,
} from '@/lib/analytics/statistical'
import type { AnalysisWindow } from '@/lib/analytics/types'
import type { Case } from '@/types'

function assert(condition: any, message: string) {
  if (!condition) throw new Error(message)
}

function within(value: number, min: number, max: number): boolean {
  return typeof value === 'number' && value >= min && value <= max
}

async function testStatisticalBasic() {
  const window: AnalysisWindow = { lookbackYears: 3, startYear: 2022, endYear: 2025 }
  const judge = {
    id: 'test-judge-1',
    name: 'Test Judge',
    jurisdiction: 'CA',
    court_id: null,
    court_name: null,
    appointed_date: null,
    education: null,
    bio: null,
    total_cases: 4,
    reversal_rate: 0,
    average_decision_time: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
  const now = new Date().toISOString()
  const cases: Case[] = [
    {
      id: 'case-1',
      case_number: 'TEST-001',
      case_name: 'Test v. Case',
      judge_id: 'test-judge-1',
      court_id: null,
      case_type: 'civil',
      filing_date: '2023-01-01',
      decision_date: '2023-06-01',
      status: 'decided' as const,
      outcome: 'plaintiff',
      summary: 'in favor of plaintiff',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'case-2',
      case_number: 'TEST-002',
      case_name: 'State v. Defendant',
      judge_id: 'test-judge-1',
      court_id: null,
      case_type: 'criminal',
      filing_date: '2023-02-01',
      decision_date: '2023-07-01',
      status: 'decided' as const,
      outcome: 'prison 2 years',
      summary: 'sentenced to prison',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'case-3',
      case_number: 'TEST-003',
      case_name: 'Smith v. Jones',
      judge_id: 'test-judge-1',
      court_id: null,
      case_type: 'family custody',
      filing_date: '2023-03-01',
      decision_date: '2023-08-01',
      status: 'decided' as const,
      outcome: 'custody to mother',
      summary: 'child custody',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'case-4',
      case_number: 'TEST-004',
      case_name: 'Acme v. Beta',
      judge_id: 'test-judge-1',
      court_id: null,
      case_type: 'contract',
      filing_date: '2023-04-01',
      decision_date: '2023-09-01',
      status: 'decided' as const,
      outcome: 'enforced',
      summary: 'contract upheld',
      created_at: now,
      updated_at: now,
    },
  ]
  const analytics = analyzeJudicialPatterns(judge, cases, window)
  assert(within(analytics.civil_plaintiff_favor, 0, 100), 'civil_plaintiff_favor in range')
  assert(within(analytics.overall_confidence, 0, 100), 'overall_confidence in range')
  assert(Array.isArray(analytics.notable_patterns), 'notable_patterns array')
}

async function testLegacyAndConservative() {
  const window: AnalysisWindow = { lookbackYears: 3, startYear: 2022, endYear: 2025 }
  const judge = {
    id: 'test-judge-2',
    name: 'Test Judge',
    jurisdiction: 'CA',
    court_id: null,
    court_name: null,
    appointed_date: null,
    education: null,
    bio: null,
    total_cases: 0,
    reversal_rate: 0,
    average_decision_time: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
  const legacy = await generateLegacyAnalytics(judge, window)
  const conservative = generateConservativeAnalytics(judge, 0, window)
  assert(within(legacy.civil_plaintiff_favor, 0, 100), 'legacy civil in range')
  assert(within(conservative.civil_plaintiff_favor, 0, 100), 'conservative civil in range')
}

async function main() {
  try {
    await testStatisticalBasic()
    await testLegacyAndConservative()
    console.log('✅ Analytics module tests passed')
  } catch (err) {
    console.error('❌ Analytics module tests failed', err)
    process.exit(1)
  }
}

main()

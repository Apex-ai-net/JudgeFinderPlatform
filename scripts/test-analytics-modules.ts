/*
 Minimal unit tests for analytics modules. Run with:
   npx ts-node --transpile-only scripts/test-analytics-modules.ts
 or via npm: npm run test:analytics:modules
*/

import { analyzeJudicialPatterns, generateLegacyAnalytics, generateConservativeAnalytics } from '@/lib/analytics/statistical'
import type { AnalysisWindow } from '@/lib/analytics/types'

function assert(condition: any, message: string) {
  if (!condition) throw new Error(message)
}

function within(value: number, min: number, max: number): boolean {
  return typeof value === 'number' && value >= min && value <= max
}

async function testStatisticalBasic() {
  const window: AnalysisWindow = { lookbackYears: 3, startYear: 2022, endYear: 2025 }
  const judge = { name: 'Test Judge', jurisdiction: 'CA' }
  const cases = [
    { case_type: 'civil', outcome: 'plaintiff', status: 'decided', summary: 'in favor of plaintiff' },
    { case_type: 'criminal', outcome: 'prison 2 years', status: 'decided', summary: 'sentenced to prison' },
    { case_type: 'family custody', outcome: 'custody to mother', status: 'decided', summary: 'child custody' },
    { case_type: 'contract', outcome: 'enforced', status: 'decided', summary: 'contract upheld' },
  ]
  const analytics = analyzeJudicialPatterns(judge, cases, window)
  assert(within(analytics.civil_plaintiff_favor, 0, 100), 'civil_plaintiff_favor in range')
  assert(within(analytics.overall_confidence, 0, 100), 'overall_confidence in range')
  assert(Array.isArray(analytics.notable_patterns), 'notable_patterns array')
}

async function testLegacyAndConservative() {
  const window: AnalysisWindow = { lookbackYears: 3, startYear: 2022, endYear: 2025 }
  const judge = { name: 'Test Judge', jurisdiction: 'CA' }
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





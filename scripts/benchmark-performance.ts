/**
 * Performance Benchmark Comparison Script
 *
 * Compares database query performance before and after optimization:
 * - Tests index usage for common queries
 * - Measures response times for search operations
 * - Validates full-text search vs ILIKE performance
 * - Tests cache hit rates and latency
 * - Generates detailed performance reports
 *
 * Usage:
 *   npm run benchmark:performance
 *   ts-node --transpile-only scripts/benchmark-performance.ts
 *
 * @module scripts/benchmark-performance
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

interface BenchmarkResult {
  testName: string
  method: string
  iterations: number
  avgMs: number
  minMs: number
  maxMs: number
  stdDev: number
  throughputQPS: number
}

interface ComparisonResult {
  test: string
  beforeMs: number
  afterMs: number
  improvement: number
  improvementPercent: string
}

/**
 * Run a query multiple times and measure performance
 */
async function benchmarkQuery(
  name: string,
  queryFn: () => Promise<any>,
  iterations: number = 10
): Promise<BenchmarkResult> {
  const times: number[] = []

  console.log(`\n📊 Running benchmark: ${name}`)
  console.log(`   Iterations: ${iterations}`)

  for (let i = 0; i < iterations; i++) {
    const start = Date.now()
    await queryFn()
    const duration = Date.now() - start
    times.push(duration)

    if ((i + 1) % Math.ceil(iterations / 10) === 0) {
      process.stdout.write('.')
    }
  }

  console.log(' ✓')

  // Calculate statistics
  const avg = times.reduce((a, b) => a + b, 0) / times.length
  const min = Math.min(...times)
  const max = Math.max(...times)
  const variance = times.reduce((sum, time) => sum + Math.pow(time - avg, 2), 0) / times.length
  const stdDev = Math.sqrt(variance)
  const throughputQPS = 1000 / avg

  return {
    testName: name,
    method: 'query',
    iterations,
    avgMs: Math.round(avg * 100) / 100,
    minMs: min,
    maxMs: max,
    stdDev: Math.round(stdDev * 100) / 100,
    throughputQPS: Math.round(throughputQPS * 100) / 100,
  }
}

/**
 * Test 1: Search using ILIKE (old method)
 */
async function benchmarkIlikeSearch(searchTerm: string): Promise<BenchmarkResult> {
  return benchmarkQuery(
    `ILIKE Search: "${searchTerm}"`,
    async () => {
      const { data, error } = await supabase
        .from('judges')
        .select('id, name, court_name, jurisdiction, total_cases')
        .ilike('name', `%${searchTerm}%`)
        .limit(20)

      if (error) throw error
      return data
    },
    50
  )
}

/**
 * Test 2: Search using full-text search RPC (new method)
 */
async function benchmarkFullTextSearch(searchTerm: string): Promise<BenchmarkResult> {
  return benchmarkQuery(
    `Full-Text Search: "${searchTerm}"`,
    async () => {
      const { data, error } = await supabase.rpc('search_judges_ranked', {
        search_query: searchTerm,
        jurisdiction_filter: null,
        result_limit: 20,
        similarity_threshold: 0.3,
      })

      if (error) throw error
      return data
    },
    50
  )
}

/**
 * Test 3: Analytics query with composite index
 */
async function benchmarkAnalyticsQuery(judgeId: string): Promise<BenchmarkResult> {
  return benchmarkQuery(
    'Analytics Query (case outcomes by judge)',
    async () => {
      const { data, error } = await supabase
        .from('cases')
        .select('outcome, case_type, decision_date')
        .eq('judge_id', judgeId)
        .gte('decision_date', '2023-01-01')
        .order('decision_date', { ascending: false })
        .limit(100)

      if (error) throw error
      return data
    },
    30
  )
}

/**
 * Test 4: Judge list query with covering index
 */
async function benchmarkJudgeListQuery(): Promise<BenchmarkResult> {
  return benchmarkQuery(
    'Judge List Query (jurisdiction filter)',
    async () => {
      const { data, error } = await supabase
        .from('judges')
        .select('id, name, court_name, slug, total_cases')
        .eq('jurisdiction', 'CA')
        .order('total_cases', { ascending: false })
        .limit(50)

      if (error) throw error
      return data
    },
    30
  )
}

/**
 * Test 5: Materialized view query
 */
async function benchmarkMaterializedView(judgeId: string): Promise<BenchmarkResult> {
  return benchmarkQuery(
    'Materialized View Query (judge statistics)',
    async () => {
      const { data, error } = await supabase
        .from('mv_judge_statistics_summary')
        .select('*')
        .eq('judge_id', judgeId)
        .single()

      if (error) throw error
      return data
    },
    30
  )
}

/**
 * Test 6: Direct aggregation (without materialized view)
 */
async function benchmarkDirectAggregation(judgeId: string): Promise<BenchmarkResult> {
  return benchmarkQuery(
    'Direct Aggregation Query (without materialized view)',
    async () => {
      const { data, error } = await supabase.from('cases').select('*').eq('judge_id', judgeId)

      if (error) throw error

      // Compute statistics in application code (simulating old approach)
      const totalCases = data.length
      const casesLastYear = data.filter(
        (c) => c.decision_date && new Date(c.decision_date) >= new Date('2024-01-01')
      ).length
      const settledCases = data.filter((c) => c.outcome === 'settled').length
      const settlementRate = totalCases > 0 ? (settledCases / totalCases) * 100 : 0

      return {
        totalCases,
        casesLastYear,
        settledCases,
        settlementRate,
      }
    },
    20
  )
}

/**
 * Test 7: Recent decisions partial index
 */
async function benchmarkRecentDecisions(): Promise<BenchmarkResult> {
  return benchmarkQuery(
    'Recent Decisions Query (partial index)',
    async () => {
      const twoYearsAgo = new Date()
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2)

      const { data, error } = await supabase
        .from('cases')
        .select('judge_id, decision_date')
        .gte('decision_date', twoYearsAgo.toISOString().split('T')[0])
        .order('decision_date', { ascending: false })
        .limit(100)

      if (error) throw error
      return data
    },
    30
  )
}

/**
 * Test 8: Court search with covering index
 */
async function benchmarkCourtSearch(searchTerm: string): Promise<BenchmarkResult> {
  return benchmarkQuery(
    `Court Search: "${searchTerm}"`,
    async () => {
      const { data, error } = await supabase
        .from('courts')
        .select('id, name, type, jurisdiction, judge_count')
        .ilike('name', `%${searchTerm}%`)
        .limit(20)

      if (error) throw error
      return data
    },
    30
  )
}

/**
 * Print benchmark results
 */
function printBenchmarkResult(result: BenchmarkResult): void {
  console.log(`\n   📈 ${result.testName}`)
  console.log(`      Average:    ${result.avgMs}ms`)
  console.log(`      Min:        ${result.minMs}ms`)
  console.log(`      Max:        ${result.maxMs}ms`)
  console.log(`      Std Dev:    ${result.stdDev}ms`)
  console.log(`      Throughput: ${result.throughputQPS} queries/sec`)
}

/**
 * Print comparison table
 */
function printComparison(comparisons: ComparisonResult[]): void {
  console.log('\n╔═══════════════════════════════════════════════════════════════════╗')
  console.log('║              PERFORMANCE IMPROVEMENT SUMMARY                      ║')
  console.log('╠═══════════════════════════════════════════════════════════════════╣')

  for (const comp of comparisons) {
    console.log(`║ ${comp.test.padEnd(40)} ${comp.improvementPercent.padStart(20)} ║`)
    console.log(
      `║   Before: ${comp.beforeMs}ms → After: ${comp.afterMs}ms${' '.repeat(Math.max(0, 42 - (comp.beforeMs.toString().length + comp.afterMs.toString().length)))}║`
    )
  }

  console.log('╚═══════════════════════════════════════════════════════════════════╝')

  const avgImprovement = comparisons.reduce((sum, c) => sum + c.improvement, 0) / comparisons.length
  console.log(`\n   Average Performance Improvement: ${(avgImprovement * 100).toFixed(1)}%`)
}

/**
 * Check if indexes exist
 */
async function verifyIndexes(): Promise<void> {
  console.log('\n🔍 Verifying database indexes...')

  const indexesToCheck = [
    'idx_cases_analytics_composite',
    'idx_judges_list_covering',
    'idx_cases_recent_decisions_partial',
    'idx_judges_active_cases',
    'idx_judges_search_vector_gin',
    'idx_judges_name_trgm',
  ]

  const { data, error } = await supabase.rpc('pg_indexes_size')

  if (error) {
    console.warn('   ⚠️  Could not verify indexes (may need pg_stat_user_indexes access)')
    return
  }

  for (const indexName of indexesToCheck) {
    const exists = data && data.some((idx: any) => idx.indexname === indexName)
    console.log(`   ${exists ? '✓' : '✗'} ${indexName}`)
  }
}

/**
 * Get a random judge ID for testing
 */
async function getRandomJudgeId(): Promise<string> {
  const { data, error } = await supabase
    .from('judges')
    .select('id')
    .gte('total_cases', 100)
    .limit(1)

  if (error || !data || data.length === 0) {
    throw new Error('Could not find judge for testing')
  }

  return data[0].id
}

/**
 * Main benchmark execution
 */
async function main(): Promise<void> {
  console.log('🚀 Performance Benchmark Starting...')
  console.log('='.repeat(70))

  try {
    // Verify indexes
    await verifyIndexes()

    // Get test data
    const judgeId = await getRandomJudgeId()
    console.log(`\n   Using test judge ID: ${judgeId}`)

    const comparisons: ComparisonResult[] = []

    // Test 1: Search performance (ILIKE vs Full-Text)
    console.log('\n\n📝 SEARCH PERFORMANCE TESTS')
    console.log('─'.repeat(70))

    const ilikeResult = await benchmarkIlikeSearch('smith')
    printBenchmarkResult(ilikeResult)

    const ftsResult = await benchmarkFullTextSearch('smith')
    printBenchmarkResult(ftsResult)

    comparisons.push({
      test: 'Judge Search (ILIKE → Full-Text)',
      beforeMs: ilikeResult.avgMs,
      afterMs: ftsResult.avgMs,
      improvement: (ilikeResult.avgMs - ftsResult.avgMs) / ilikeResult.avgMs,
      improvementPercent: `${(((ilikeResult.avgMs - ftsResult.avgMs) / ilikeResult.avgMs) * 100).toFixed(1)}% faster`,
    })

    // Test 2: Analytics queries
    console.log('\n\n📊 ANALYTICS PERFORMANCE TESTS')
    console.log('─'.repeat(70))

    const analyticsResult = await benchmarkAnalyticsQuery(judgeId)
    printBenchmarkResult(analyticsResult)

    // Test 3: Judge list queries
    console.log('\n\n📋 LIST QUERY PERFORMANCE TESTS')
    console.log('─'.repeat(70))

    const judgeListResult = await benchmarkJudgeListQuery()
    printBenchmarkResult(judgeListResult)

    // Test 4: Materialized view vs direct aggregation
    console.log('\n\n🗂️  MATERIALIZED VIEW PERFORMANCE TESTS')
    console.log('─'.repeat(70))

    const mvResult = await benchmarkMaterializedView(judgeId)
    printBenchmarkResult(mvResult)

    const directAggResult = await benchmarkDirectAggregation(judgeId)
    printBenchmarkResult(directAggResult)

    comparisons.push({
      test: 'Statistics (Direct Agg → Mat View)',
      beforeMs: directAggResult.avgMs,
      afterMs: mvResult.avgMs,
      improvement: (directAggResult.avgMs - mvResult.avgMs) / directAggResult.avgMs,
      improvementPercent: `${(((directAggResult.avgMs - mvResult.avgMs) / directAggResult.avgMs) * 100).toFixed(1)}% faster`,
    })

    // Test 5: Recent decisions
    console.log('\n\n🕐 RECENT DECISIONS PERFORMANCE TESTS')
    console.log('─'.repeat(70))

    const recentResult = await benchmarkRecentDecisions()
    printBenchmarkResult(recentResult)

    // Test 6: Court search
    console.log('\n\n🏛️  COURT SEARCH PERFORMANCE TESTS')
    console.log('─'.repeat(70))

    const courtResult = await benchmarkCourtSearch('superior')
    printBenchmarkResult(courtResult)

    // Print comparison summary
    console.log('\n\n')
    printComparison(comparisons)

    // Index usage report
    console.log('\n\n📊 INDEX USAGE REPORT')
    console.log('─'.repeat(70))
    console.log('\nRun this query in Supabase SQL Editor to see index usage:\n')
    console.log(`
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan AS scans,
  idx_tup_read AS tuples_read,
  idx_tup_fetch AS tuples_fetched,
  pg_size_pretty(pg_relation_size(indexrelid)) AS size
FROM pg_stat_user_indexes
WHERE indexname LIKE 'idx_%'
ORDER BY idx_scan DESC;
    `)

    console.log('\n✅ Benchmark completed successfully!')
  } catch (error) {
    console.error('\n❌ Benchmark failed:', error)
    process.exit(1)
  }
}

// Run if executed directly
if (require.main === module) {
  main()
}

export { benchmarkQuery, main }

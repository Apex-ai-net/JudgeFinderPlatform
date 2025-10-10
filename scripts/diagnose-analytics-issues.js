#!/usr/bin/env node

/**
 * Judge Analytics Diagnostic Tool
 *
 * Comprehensive diagnostic script for debugging judge analytics issues in production.
 *
 * Features:
 * - Environment variable validation
 * - Database connectivity and schema verification
 * - Judge-level case data analysis
 * - Analytics cache status inspection
 * - Redis connectivity testing
 * - Sample size validation per metric
 * - Actionable recommendations
 *
 * Usage:
 *   node scripts/diagnose-analytics-issues.js
 *   node scripts/diagnose-analytics-issues.js --judge-id <uuid>
 *   node scripts/diagnose-analytics-issues.js --sample-size 25
 *
 * @author JudgeFinder Platform
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

// ============================================
// Color Utilities for Console Output
// ============================================

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',

  // Foreground colors
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',

  // Background colors
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
}

function colorize(text, color) {
  return `${color}${text}${colors.reset}`
}

function success(text) {
  return colorize(`✓ ${text}`, colors.green)
}

function error(text) {
  return colorize(`✗ ${text}`, colors.red)
}

function warning(text) {
  return colorize(`⚠ ${text}`, colors.yellow)
}

function info(text) {
  return colorize(`ℹ ${text}`, colors.cyan)
}

function header(text) {
  return colorize(`\n${'='.repeat(80)}\n${text}\n${'='.repeat(80)}`, colors.bright + colors.blue)
}

function subheader(text) {
  return colorize(`\n${text}\n${'-'.repeat(text.length)}`, colors.cyan)
}

// ============================================
// Argument Parsing
// ============================================

function parseArgs() {
  const args = process.argv.slice(2)
  const config = {
    judgeId: null,
    sampleSize: 10,
    verbose: false,
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]

    if ((arg === '--judge-id' || arg === '-j') && args[i + 1]) {
      config.judgeId = args[i + 1]
      i++
    } else if ((arg === '--sample-size' || arg === '-s') && args[i + 1]) {
      const size = parseInt(args[i + 1], 10)
      if (!isNaN(size) && size > 0) {
        config.sampleSize = size
      }
      i++
    } else if (arg === '--verbose' || arg === '-v') {
      config.verbose = true
    } else if (arg === '--help' || arg === '-h') {
      printHelp()
      process.exit(0)
    }
  }

  return config
}

function printHelp() {
  console.log(`
${colorize('Judge Analytics Diagnostic Tool', colors.bright + colors.cyan)}

${colorize('USAGE:', colors.bright)}
  node scripts/diagnose-analytics-issues.js [OPTIONS]

${colorize('OPTIONS:', colors.bright)}
  --judge-id, -j <uuid>    Diagnose a specific judge by ID
  --sample-size, -s <n>    Number of judges to sample (default: 10)
  --verbose, -v            Show detailed debug information
  --help, -h               Show this help message

${colorize('EXAMPLES:', colors.bright)}
  # General diagnostics
  node scripts/diagnose-analytics-issues.js

  # Check specific judge
  node scripts/diagnose-analytics-issues.js --judge-id abc123-def456-ghi789

  # Sample more judges for better accuracy
  node scripts/diagnose-analytics-issues.js --sample-size 25

  # Verbose mode with detailed logs
  node scripts/diagnose-analytics-issues.js --verbose
`)
}

// ============================================
// Environment Validation
// ============================================

function checkEnvironmentVariables() {
  console.log(header('ENVIRONMENT VARIABLES CHECK'))

  const required = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_JWT_SECRET: process.env.SUPABASE_JWT_SECRET,
  }

  const optional = {
    GOOGLE_AI_API_KEY: process.env.GOOGLE_AI_API_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
  }

  let hasErrors = false

  console.log(subheader('Required Variables'))

  for (const [key, value] of Object.entries(required)) {
    if (value) {
      console.log(success(`${key}: ${maskSecret(value)}`))
    } else {
      console.log(error(`${key}: NOT SET`))
      hasErrors = true
    }
  }

  console.log(subheader('Optional Variables (AI & Caching)'))

  for (const [key, value] of Object.entries(optional)) {
    if (value) {
      console.log(success(`${key}: ${maskSecret(value)}`))
    } else {
      console.log(warning(`${key}: NOT SET (feature may be disabled)`))
    }
  }

  return !hasErrors
}

function maskSecret(value) {
  if (!value || value.length < 10) return '***'
  return `${value.substring(0, 8)}...${value.substring(value.length - 4)}`
}

// ============================================
// Database Connectivity
// ============================================

async function checkDatabaseConnection() {
  console.log(header('DATABASE CONNECTIVITY'))

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    console.log(error('Missing Supabase credentials'))
    return null
  }

  try {
    const supabase = createClient(url, key)

    // Test connection with a simple query
    const { data, error } = await supabase
      .from('judges')
      .select('id', { count: 'exact', head: true })
      .limit(1)

    if (error) {
      console.log(error(`Failed to connect: ${error.message}`))
      return null
    }

    console.log(success('Successfully connected to Supabase'))
    console.log(info(`Database URL: ${url}`))

    return supabase
  } catch (err) {
    console.log(error(`Connection error: ${err.message}`))
    return null
  }
}

async function checkSchemaIntegrity(supabase) {
  console.log(header('DATABASE SCHEMA VERIFICATION'))

  const requiredTables = ['judges', 'cases', 'courts', 'judge_analytics_cache']

  for (const table of requiredTables) {
    try {
      const { error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })
        .limit(0)

      if (error) {
        console.log(error(`Table '${table}': NOT ACCESSIBLE (${error.message})`))
      } else {
        console.log(success(`Table '${table}': EXISTS`))
      }
    } catch (err) {
      console.log(error(`Table '${table}': ERROR (${err.message})`))
    }
  }

  // Check judge_analytics_cache schema
  console.log(subheader('Judge Analytics Cache Schema'))

  try {
    const { data, error } = await supabase.from('judge_analytics_cache').select('*').limit(1)

    if (error) {
      console.log(warning(`Could not verify cache schema: ${error.message}`))
    } else if (data && data.length > 0) {
      const columns = Object.keys(data[0])
      console.log(info(`Columns: ${columns.join(', ')}`))
    } else {
      console.log(info('Table exists but is empty'))
    }
  } catch (err) {
    console.log(warning(`Schema check error: ${err.message}`))
  }
}

// ============================================
// Judge Analytics Data Analysis
// ============================================

async function analyzeJudgeData(supabase, judgeId = null) {
  console.log(header('JUDGE DATA ANALYSIS'))

  const lookbackYears = 5
  const lookbackDate = new Date()
  lookbackDate.setFullYear(lookbackDate.getFullYear() - lookbackYears)
  const lookbackDateStr = lookbackDate.toISOString().split('T')[0]

  if (judgeId) {
    // Analyze specific judge
    console.log(subheader(`Analyzing Judge: ${judgeId}`))
    const results = await analyzeSpecificJudge(supabase, judgeId, lookbackDateStr)
    return [results]
  } else {
    // Sample multiple judges
    const { data: judges, error } = await supabase
      .from('judges')
      .select('id, name, court_name, total_cases')
      .order('total_cases', { ascending: false, nullsFirst: false })
      .limit(10)

    if (error) {
      console.log(error(`Failed to fetch judges: ${error.message}`))
      return []
    }

    console.log(info(`Analyzing top ${judges.length} judges by case count...`))

    const results = []
    for (const judge of judges) {
      const result = await analyzeSpecificJudge(supabase, judge.id, lookbackDateStr)
      result.name = judge.name
      result.courtName = judge.court_name
      results.push(result)
    }

    return results
  }
}

async function analyzeSpecificJudge(supabase, judgeId, lookbackDateStr) {
  const analysis = {
    judgeId,
    name: null,
    courtName: null,
    totalCases: 0,
    casesWithDecisionDate: 0,
    casesInLookbackWindow: 0,
    casesWithOutcome: 0,
    casesWithSummary: 0,
    casesWithCaseType: 0,
    hasCachedAnalytics: false,
    cacheCreatedAt: null,
    cacheAnalyticsData: null,
    sampleSizes: {},
    issues: [],
  }

  // Get judge details
  const { data: judge } = await supabase
    .from('judges')
    .select('name, court_name, total_cases')
    .eq('id', judgeId)
    .single()

  if (judge) {
    analysis.name = judge.name
    analysis.courtName = judge.court_name
  }

  // Count total cases
  const { count: totalCases } = await supabase
    .from('cases')
    .select('*', { count: 'exact', head: true })
    .eq('judge_id', judgeId)

  analysis.totalCases = totalCases || 0

  // Count cases with decision_date
  const { count: decidedCases } = await supabase
    .from('cases')
    .select('*', { count: 'exact', head: true })
    .eq('judge_id', judgeId)
    .not('decision_date', 'is', null)

  analysis.casesWithDecisionDate = decidedCases || 0

  // Count cases within lookback window
  const { count: recentCases } = await supabase
    .from('cases')
    .select('*', { count: 'exact', head: true })
    .eq('judge_id', judgeId)
    .gte('decision_date', lookbackDateStr)

  analysis.casesInLookbackWindow = recentCases || 0

  // Count cases with required fields
  const { count: casesWithOutcome } = await supabase
    .from('cases')
    .select('*', { count: 'exact', head: true })
    .eq('judge_id', judgeId)
    .not('outcome', 'is', null)

  analysis.casesWithOutcome = casesWithOutcome || 0

  const { count: casesWithSummary } = await supabase
    .from('cases')
    .select('*', { count: 'exact', head: true })
    .eq('judge_id', judgeId)
    .not('summary', 'is', null)

  analysis.casesWithSummary = casesWithSummary || 0

  const { count: casesWithType } = await supabase
    .from('cases')
    .select('*', { count: 'exact', head: true })
    .eq('judge_id', judgeId)
    .not('case_type', 'is', null)

  analysis.casesWithCaseType = casesWithType || 0

  // Check cached analytics
  const { data: cacheEntry, error: cacheError } = await supabase
    .from('judge_analytics_cache')
    .select('created_at, updated_at, analytics')
    .eq('judge_id', judgeId)
    .single()

  if (cacheEntry && !cacheError) {
    analysis.hasCachedAnalytics = true
    analysis.cacheCreatedAt = cacheEntry.created_at
    analysis.cacheAnalyticsData = cacheEntry.analytics

    // Extract sample sizes from analytics
    if (cacheEntry.analytics) {
      analysis.sampleSizes = {
        civil: cacheEntry.analytics.sample_size_civil || 0,
        custody: cacheEntry.analytics.sample_size_custody || 0,
        alimony: cacheEntry.analytics.sample_size_alimony || 0,
        contracts: cacheEntry.analytics.sample_size_contracts || 0,
        sentencing: cacheEntry.analytics.sample_size_sentencing || 0,
        plea: cacheEntry.analytics.sample_size_plea || 0,
        total_analyzed: cacheEntry.analytics.total_cases_analyzed || 0,
      }
    }
  }

  // Identify issues
  if (analysis.totalCases === 0) {
    analysis.issues.push('No cases found')
  }

  if (analysis.casesWithDecisionDate < 15) {
    analysis.issues.push(
      `Only ${analysis.casesWithDecisionDate} cases with decision_date (need ≥15)`
    )
  }

  if (analysis.casesInLookbackWindow < 10) {
    analysis.issues.push(`Only ${analysis.casesInLookbackWindow} recent cases (5-year window)`)
  }

  if (analysis.casesWithOutcome < analysis.casesWithDecisionDate * 0.5) {
    analysis.issues.push('Many cases missing outcome field')
  }

  if (analysis.casesWithCaseType < analysis.casesWithDecisionDate * 0.5) {
    analysis.issues.push('Many cases missing case_type field')
  }

  if (analysis.totalCases >= 15 && !analysis.hasCachedAnalytics) {
    analysis.issues.push('Should have analytics but cache is missing')
  }

  return analysis
}

function printJudgeAnalysis(results) {
  console.log(header('JUDGE ANALYSIS RESULTS'))

  if (results.length === 0) {
    console.log(warning('No judges analyzed'))
    return
  }

  // Summary table
  console.log(subheader('Summary Table'))
  console.log(
    colorize(
      'Judge Name (ID)                    | Total | Decided | Recent | Cached | Issues',
      colors.bright
    )
  )
  console.log('-'.repeat(90))

  for (const result of results) {
    const name = (result.name || 'Unknown').substring(0, 25).padEnd(25)
    const idShort = result.judgeId.substring(0, 8)
    const total = result.totalCases.toString().padStart(5)
    const decided = result.casesWithDecisionDate.toString().padStart(7)
    const recent = result.casesInLookbackWindow.toString().padStart(6)
    const cached = result.hasCachedAnalytics ? '  Yes' : '   No'
    const issues = result.issues.length.toString().padStart(6)

    const line = `${name} (${idShort}) | ${total} | ${decided} | ${recent} | ${cached} | ${issues}`

    if (result.issues.length > 0) {
      console.log(colorize(line, colors.yellow))
    } else {
      console.log(line)
    }
  }

  // Detailed analysis for each judge with issues
  const judgesWithIssues = results.filter((r) => r.issues.length > 0)

  if (judgesWithIssues.length > 0) {
    console.log(subheader('Detailed Issues'))

    for (const result of judgesWithIssues) {
      console.log(`\n${colorize(result.name || result.judgeId, colors.bright)}`)
      console.log(`  Judge ID: ${result.judgeId}`)
      console.log(`  Court: ${result.courtName || 'Unknown'}`)
      console.log(`  Total Cases: ${result.totalCases}`)
      console.log(`  Cases with decision_date: ${result.casesWithDecisionDate}`)
      console.log(`  Cases in 5-year window: ${result.casesInLookbackWindow}`)
      console.log(`  Cases with outcome: ${result.casesWithOutcome}`)
      console.log(`  Cases with summary: ${result.casesWithSummary}`)
      console.log(`  Cases with case_type: ${result.casesWithCaseType}`)
      console.log(`  Has cached analytics: ${result.hasCachedAnalytics ? 'Yes' : 'No'}`)

      if (result.hasCachedAnalytics && result.sampleSizes.total_analyzed > 0) {
        console.log(`  Sample sizes per metric:`)
        console.log(`    - Civil: ${result.sampleSizes.civil}`)
        console.log(`    - Custody: ${result.sampleSizes.custody}`)
        console.log(`    - Alimony: ${result.sampleSizes.alimony}`)
        console.log(`    - Contracts: ${result.sampleSizes.contracts}`)
        console.log(`    - Sentencing: ${result.sampleSizes.sentencing}`)
        console.log(`    - Plea: ${result.sampleSizes.plea}`)
        console.log(`    - Total analyzed: ${result.sampleSizes.total_analyzed}`)
      }

      console.log(colorize('\n  Issues:', colors.red))
      for (const issue of result.issues) {
        console.log(`    ${error(issue)}`)
      }
    }
  }

  // Overall statistics
  console.log(subheader('Overall Statistics'))

  const totalJudges = results.length
  const judgesWithCache = results.filter((r) => r.hasCachedAnalytics).length
  const judgesWithSufficientData = results.filter((r) => r.casesWithDecisionDate >= 15).length
  const judgesMissingCache = results.filter(
    (r) => r.casesWithDecisionDate >= 15 && !r.hasCachedAnalytics
  ).length

  console.log(`Total judges analyzed: ${totalJudges}`)
  console.log(
    `Judges with cached analytics: ${judgesWithCache} (${((judgesWithCache / totalJudges) * 100).toFixed(1)}%)`
  )
  console.log(`Judges with sufficient data (≥15 decided cases): ${judgesWithSufficientData}`)
  console.log(
    `Judges missing cache (but should have): ${colorize(judgesMissingCache, judgesMissingCache > 0 ? colors.red : colors.green)}`
  )
}

// ============================================
// Redis Connectivity Test
// ============================================

async function testRedisConnection() {
  console.log(header('REDIS CONNECTIVITY TEST'))

  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN

  if (!url || !token) {
    console.log(warning('Redis credentials not configured'))
    console.log(info('Analytics will still work, but caching may be limited'))
    return false
  }

  try {
    // Use Upstash REST API for testing
    const Redis = require('@upstash/redis').Redis
    const redis = new Redis({ url, token })

    // Test write
    const testKey = 'diagnostic-test-key'
    const testValue = { timestamp: Date.now(), test: true }
    await redis.set(testKey, JSON.stringify(testValue), { ex: 10 })
    console.log(success('Redis write test: PASSED'))

    // Test read
    const retrieved = await redis.get(testKey)
    const parsed = JSON.parse(retrieved)

    if (parsed.test === true) {
      console.log(success('Redis read test: PASSED'))
    } else {
      console.log(error('Redis read test: FAILED (data mismatch)'))
      return false
    }

    // Clean up
    await redis.del(testKey)
    console.log(success('Redis delete test: PASSED'))

    console.log(info(`Redis URL: ${url}`))
    return true
  } catch (err) {
    console.log(error(`Redis connection failed: ${err.message}`))
    console.log(warning('Check UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN'))
    return false
  }
}

// ============================================
// Recommendations
// ============================================

function generateRecommendations(envOk, dbOk, judgeResults, redisOk) {
  console.log(header('RECOMMENDATIONS'))

  const recommendations = []
  const criticalIssues = []

  // Environment issues
  if (!envOk) {
    criticalIssues.push('Fix missing environment variables (see above)')
  }

  // Database issues
  if (!dbOk) {
    criticalIssues.push('Restore database connectivity')
  }

  // Judge data issues
  if (judgeResults && judgeResults.length > 0) {
    const judgesMissingCache = judgeResults.filter(
      (r) => r.casesWithDecisionDate >= 15 && !r.hasCachedAnalytics
    )

    if (judgesMissingCache.length > 0) {
      recommendations.push({
        priority: 'HIGH',
        issue: `${judgesMissingCache.length} judges missing analytics cache`,
        solution: 'Run: npm run analytics:generate -- --limit 50',
        details: 'Or use API: POST /api/judges/[id]/analytics?force=true for each judge',
      })
    }

    const judgesWithLowData = judgeResults.filter(
      (r) => r.casesWithDecisionDate > 0 && r.casesWithDecisionDate < 15
    )

    if (judgesWithLowData.length > 0) {
      recommendations.push({
        priority: 'MEDIUM',
        issue: `${judgesWithLowData.length} judges with insufficient decided cases`,
        solution: 'Ensure case sync jobs are populating decision_date field',
        details: 'Check: npm run sync:decisions or verify CourtListener API',
      })
    }

    const judgesWithMissingFields = judgeResults.filter(
      (r) => r.casesWithOutcome < r.casesWithDecisionDate * 0.5
    )

    if (judgesWithMissingFields.length > 0) {
      recommendations.push({
        priority: 'MEDIUM',
        issue: `${judgesWithMissingFields.length} judges with many cases missing outcome/case_type`,
        solution: 'Improve case data quality during sync',
        details: 'Review case import scripts and field mapping',
      })
    }
  }

  // Redis issues
  if (!redisOk) {
    recommendations.push({
      priority: 'LOW',
      issue: 'Redis caching unavailable',
      solution: 'Configure UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN',
      details:
        'Optional but improves performance. Get credentials from https://console.upstash.com/',
    })
  }

  // Print critical issues
  if (criticalIssues.length > 0) {
    console.log(colorize('\nCRITICAL ISSUES (Fix Immediately):', colors.bgRed + colors.bright))
    criticalIssues.forEach((issue, idx) => {
      console.log(`  ${idx + 1}. ${error(issue)}`)
    })
  }

  // Print recommendations
  if (recommendations.length > 0) {
    console.log(subheader('Action Items'))

    recommendations.forEach((rec, idx) => {
      const priorityColor =
        rec.priority === 'HIGH'
          ? colors.red
          : rec.priority === 'MEDIUM'
            ? colors.yellow
            : colors.cyan

      console.log(`\n${colorize(`${idx + 1}. [${rec.priority}]`, priorityColor)} ${rec.issue}`)
      console.log(`   ${colorize('Solution:', colors.green)} ${rec.solution}`)
      if (rec.details) {
        console.log(`   ${colorize('Details:', colors.dim)} ${rec.details}`)
      }
    })
  } else if (criticalIssues.length === 0) {
    console.log(success('\nNo issues detected! System appears healthy.'))
  }

  // General tips
  console.log(subheader('General Debugging Tips'))
  console.log(`
  1. Check application logs in Netlify dashboard for runtime errors
  2. Verify analytics API endpoints: GET /api/judges/[id]/analytics
  3. Test force regeneration: POST /api/judges/[id]/analytics?force=true
  4. Monitor AI cost tracker: Check lib/ai/cost-tracker.ts for budget limits
  5. Validate case data quality: Run 'npm run data:status' for overview
  6. Check browser console and network tab for client-side errors
  7. Review Supabase logs for database query performance
  `)
}

// ============================================
// Main Execution
// ============================================

async function main() {
  console.log(
    colorize(
      `
╔════════════════════════════════════════════════════════════════════════════╗
║                   JUDGE ANALYTICS DIAGNOSTIC TOOL                          ║
║                                                                            ║
║  Comprehensive diagnostics for judge analytics issues                     ║
╚════════════════════════════════════════════════════════════════════════════╝
`,
      colors.bright + colors.cyan
    )
  )

  const config = parseArgs()

  if (config.judgeId) {
    console.log(info(`Target Judge ID: ${config.judgeId}`))
  } else {
    console.log(info(`Sample Size: ${config.sampleSize} judges`))
  }

  if (config.verbose) {
    console.log(info('Verbose mode: ON'))
  }

  // Step 1: Check environment variables
  const envOk = checkEnvironmentVariables()

  if (!envOk) {
    console.log(error('\nCannot proceed without required environment variables'))
    console.log(info('Please configure .env.local or Netlify environment variables'))
    process.exit(1)
  }

  // Step 2: Test database connection
  const supabase = await checkDatabaseConnection()

  if (!supabase) {
    console.log(error('\nCannot proceed without database connection'))
    process.exit(1)
  }

  // Step 3: Verify schema
  await checkSchemaIntegrity(supabase)

  // Step 4: Analyze judge data
  const judgeResults = await analyzeJudgeData(supabase, config.judgeId)
  printJudgeAnalysis(judgeResults)

  // Step 5: Test Redis
  const redisOk = await testRedisConnection()

  // Step 6: Generate recommendations
  generateRecommendations(envOk, true, judgeResults, redisOk)

  console.log(colorize(`\n${'='.repeat(80)}`, colors.bright + colors.cyan))
  console.log(colorize('Diagnostic complete!', colors.green + colors.bright))
  console.log(colorize(`${'='.repeat(80)}\n`, colors.bright + colors.cyan))
}

// Run diagnostics
main().catch((err) => {
  console.error(error(`\nFatal error: ${err.message}`))
  if (err.stack) {
    console.error(colors.dim + err.stack + colors.reset)
  }
  process.exit(1)
})

/**
 * Data Validation and Analytics Readiness Report
 *
 * Generates comprehensive report on data completeness for California judges
 * Shows which judges have sufficient data for bias analytics (500+ cases)
 *
 * Usage:
 *   npm run validate:data
 *   or
 *   npx tsx scripts/validate-data-completeness.ts
 */

// Load environment variables from .env.local
import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local') })

import { createClient } from '@supabase/supabase-js'

interface ValidationReport {
  summary: {
    totalJudges: number
    analyticsReadyJudges: number
    incompleteJudges: number
    completionPercentage: number
  }
  dataBreakdown: {
    judgesWithPositions: number
    judgesWithEducation: number
    judgesWithAffiliations: number
    judgesWithOpinions: number
    judgesWithDockets: number
  }
  analyticsMetrics: {
    judgesWithMinCases: number
    averageCasesPerJudge: number
    medianCasesPerJudge: number
    maxCasesForJudge: number
    minCasesForJudge: number
  }
  topJudges: Array<{
    name: string
    totalCases: number
    opinions: number
    dockets: number
    hasCompleteData: boolean
  }>
  incompleteJudges: Array<{
    name: string
    missingData: string[]
    totalCases: number
  }>
}

class DataValidationReporter {
  private supabase

  constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error(
        'Supabase credentials missing: set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY'
      )
    }

    this.supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    })
  }

  /**
   * Generate comprehensive validation report
   */
  async generateReport(): Promise<ValidationReport> {
    console.log('Generating data validation report...\n')

    // Get sync progress summary
    const { data: summary } = await this.supabase.from('sync_progress_summary').select('*').single()

    if (!summary) {
      throw new Error('No sync progress data found')
    }

    // Get detailed progress data
    const { data: progressData } = await this.supabase
      .from('sync_progress')
      .select(
        `
        judge_id,
        has_positions,
        has_education,
        has_political_affiliations,
        opinions_count,
        dockets_count,
        total_cases_count,
        is_complete,
        is_analytics_ready,
        judges!inner (
          id,
          name
        )
      `
      )
      .order('total_cases_count', { ascending: false })

    const judges = progressData || []

    // Calculate analytics metrics
    const caseCounts = judges
      .map((j) => j.total_cases_count)
      .filter((c) => c > 0)
      .sort((a, b) => a - b)

    const analyticsMetrics = {
      judgesWithMinCases: judges.filter((j) => j.total_cases_count >= 500).length,
      averageCasesPerJudge:
        caseCounts.length > 0
          ? Math.round(caseCounts.reduce((a, b) => a + b, 0) / caseCounts.length)
          : 0,
      medianCasesPerJudge:
        caseCounts.length > 0 ? caseCounts[Math.floor(caseCounts.length / 2)] : 0,
      maxCasesForJudge: caseCounts.length > 0 ? caseCounts[caseCounts.length - 1] : 0,
      minCasesForJudge: caseCounts.length > 0 ? caseCounts[0] : 0,
    }

    // Top judges by case count
    const topJudges = judges.slice(0, 10).map((j) => ({
      name: (j.judges as any)?.name || 'Unknown',
      totalCases: j.total_cases_count,
      opinions: j.opinions_count,
      dockets: j.dockets_count,
      hasCompleteData: j.is_complete,
    }))

    // Incomplete judges (missing data)
    const incompleteJudges = judges
      .filter((j) => !j.is_complete)
      .slice(0, 20)
      .map((j) => {
        const missingData: string[] = []
        if (!j.has_positions) missingData.push('positions')
        if (!j.has_education) missingData.push('education')
        if (!j.has_political_affiliations) missingData.push('political affiliations')
        if (j.opinions_count === 0) missingData.push('opinions')
        if (j.dockets_count === 0) missingData.push('dockets')

        return {
          name: (j.judges as any)?.name || 'Unknown',
          missingData,
          totalCases: j.total_cases_count,
        }
      })

    return {
      summary: {
        totalJudges: summary.total_judges,
        analyticsReadyJudges: summary.analytics_ready_judges,
        incompleteJudges: summary.total_judges - summary.complete_judges,
        completionPercentage: parseFloat(
          ((summary.complete_judges / summary.total_judges) * 100).toFixed(2)
        ),
      },
      dataBreakdown: {
        judgesWithPositions: summary.judges_with_positions,
        judgesWithEducation: summary.judges_with_education,
        judgesWithAffiliations: summary.judges_with_affiliations,
        judgesWithOpinions: summary.judges_with_opinions,
        judgesWithDockets: summary.judges_with_dockets,
      },
      analyticsMetrics,
      topJudges,
      incompleteJudges,
    }
  }

  /**
   * Print formatted report
   */
  printReport(report: ValidationReport) {
    console.log('='.repeat(100))
    console.log('DATA VALIDATION & ANALYTICS READINESS REPORT')
    console.log('='.repeat(100))
    console.log()

    // Summary Section
    console.log('📊 SUMMARY')
    console.log('-'.repeat(100))
    console.log(`Total Judges:                ${report.summary.totalJudges}`)
    console.log(`Analytics-Ready Judges:      ${report.summary.analyticsReadyJudges} (500+ cases)`)
    console.log(`Incomplete Judges:           ${report.summary.incompleteJudges}`)
    console.log(`Completion Percentage:       ${report.summary.completionPercentage}%`)
    console.log()

    // Data Breakdown Section
    console.log('📋 DATA BREAKDOWN')
    console.log('-'.repeat(100))
    console.log(`Judges with Positions:       ${report.dataBreakdown.judgesWithPositions}`)
    console.log(`Judges with Education:       ${report.dataBreakdown.judgesWithEducation}`)
    console.log(`Judges with Affiliations:    ${report.dataBreakdown.judgesWithAffiliations}`)
    console.log(`Judges with Opinions:        ${report.dataBreakdown.judgesWithOpinions}`)
    console.log(`Judges with Dockets:         ${report.dataBreakdown.judgesWithDockets}`)
    console.log()

    // Analytics Metrics Section
    console.log('📈 ANALYTICS METRICS')
    console.log('-'.repeat(100))
    console.log(
      `Judges Meeting Min Threshold: ${report.analyticsMetrics.judgesWithMinCases} (500+ cases)`
    )
    console.log(`Average Cases Per Judge:      ${report.analyticsMetrics.averageCasesPerJudge}`)
    console.log(`Median Cases Per Judge:       ${report.analyticsMetrics.medianCasesPerJudge}`)
    console.log(`Max Cases (Single Judge):     ${report.analyticsMetrics.maxCasesForJudge}`)
    console.log(`Min Cases (Single Judge):     ${report.analyticsMetrics.minCasesForJudge}`)
    console.log()

    // Top Judges Section
    console.log('🏆 TOP 10 JUDGES BY CASE COUNT')
    console.log('-'.repeat(100))
    console.log(
      'Rank  Judge Name                                    Total Cases  Opinions  Dockets  Complete'
    )
    console.log('-'.repeat(100))
    report.topJudges.forEach((judge, idx) => {
      const rank = (idx + 1).toString().padStart(2, ' ')
      const name = judge.name.padEnd(45, ' ')
      const cases = judge.totalCases.toString().padStart(11, ' ')
      const opinions = judge.opinions.toString().padStart(9, ' ')
      const dockets = judge.dockets.toString().padStart(8, ' ')
      const complete = judge.hasCompleteData ? '   ✓' : '   ✗'

      console.log(`${rank}.   ${name} ${cases} ${opinions} ${dockets}${complete}`)
    })
    console.log()

    // Incomplete Judges Section
    console.log('⚠️  TOP 20 INCOMPLETE JUDGES')
    console.log('-'.repeat(100))
    console.log('Judge Name                                    Total Cases  Missing Data')
    console.log('-'.repeat(100))
    report.incompleteJudges.forEach((judge) => {
      const name = judge.name.padEnd(45, ' ')
      const cases = judge.totalCases.toString().padStart(11, ' ')
      const missing = judge.missingData.join(', ')

      console.log(`${name} ${cases}  ${missing}`)
    })
    console.log()

    // Recommendations Section
    console.log('💡 RECOMMENDATIONS')
    console.log('-'.repeat(100))

    const analyticsReadyPercent =
      (report.summary.analyticsReadyJudges / report.summary.totalJudges) * 100

    if (analyticsReadyPercent >= 80) {
      console.log('✅ Excellent: 80%+ of judges have sufficient data for analytics')
      console.log('   Continue incremental sync to maintain data freshness')
    } else if (analyticsReadyPercent >= 50) {
      console.log('⚠️  Good: 50-80% of judges have sufficient data for analytics')
      console.log('   Run additional decision sync to pull more cases for incomplete judges')
    } else {
      console.log('❌ Poor: <50% of judges have sufficient data for analytics')
      console.log('   Run bulk decision sync with higher maxDecisionsPerJudge')
      console.log('   Focus on judges with 0 or low case counts')
    }

    console.log()

    if (report.dataBreakdown.judgesWithPositions < report.summary.totalJudges * 0.9) {
      console.log('⚠️  Less than 90% of judges have position data')
      console.log('   Run judge details sync to complete position data')
    }

    if (report.dataBreakdown.judgesWithEducation < report.summary.totalJudges * 0.7) {
      console.log('⚠️  Less than 70% of judges have education data')
      console.log('   This may be normal as not all judges have public education records')
    }

    console.log()
    console.log('='.repeat(100))
  }

  /**
   * Export report to JSON
   */
  async exportToJSON(report: ValidationReport, filename: string = 'validation-report.json') {
    const fs = await import('fs/promises')
    const reportWithTimestamp = {
      generatedAt: new Date().toISOString(),
      ...report,
    }

    await fs.writeFile(filename, JSON.stringify(reportWithTimestamp, null, 2))
    console.log(`\n📁 Report exported to: ${filename}`)
  }
}

// Run the validation
async function main() {
  try {
    const reporter = new DataValidationReporter()
    const report = await reporter.generateReport()
    reporter.printReport(report)

    // Export to JSON if requested
    if (process.argv.includes('--export')) {
      await reporter.exportToJSON(report)
    }

    process.exit(0)
  } catch (error) {
    console.error('\n❌ Validation failed:', error)
    process.exit(1)
  }
}

main()

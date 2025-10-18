#!/usr/bin/env tsx

/**
 * Data Audit CLI Tool
 *
 * Run comprehensive data quality audits from the command line.
 * Generates validation reports, snapshots, and remediation plans.
 *
 * Usage:
 *   npx tsx scripts/run-data-audit.ts [options]
 *
 * Options:
 *   --full              Run full enhanced validation (default)
 *   --quick             Run quick validation (critical checks only)
 *   --snapshot          Generate data snapshot only
 *   --remediate         Execute auto-remediation (requires --confirm)
 *   --dry-run           Perform dry run of remediation (no changes)
 *   --confirm           Confirm remediation execution
 *   --save-snapshot     Save snapshot to database
 *   --output <file>     Save report to file (JSON)
 *   --format <format>   Output format: json, text (default: text)
 *   --help              Show help
 */

import { config } from 'dotenv'
import { writeFile } from 'fs/promises'
import { EnhancedDataQualityValidator } from '../lib/sync/enhanced-data-quality-validator'
import { SnapshotGenerator } from '../lib/admin/snapshot-generator'
import { RemediationPlanner } from '../lib/admin/remediation-planner'
import { AutoRemediationEngine } from '../lib/admin/auto-remediation'
import type { ValidationReport } from '../lib/sync/data-quality-validator'
import type { DataSnapshot } from '../lib/admin/snapshot-generator'
import type { RemediationPlan } from '../lib/admin/remediation-planner'

// Load environment variables
config({ path: '.env.local' })

interface CLIOptions {
  mode: 'full' | 'quick' | 'snapshot' | 'remediate'
  dryRun: boolean
  confirm: boolean
  saveSnapshot: boolean
  outputFile?: string
  format: 'json' | 'text'
}

/**
 * Parse command line arguments
 */
function parseArgs(): CLIOptions {
  const args = process.argv.slice(2)

  const options: CLIOptions = {
    mode: 'full',
    dryRun: false,
    confirm: false,
    saveSnapshot: false,
    format: 'text',
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]

    switch (arg) {
      case '--help':
      case '-h':
        showHelp()
        process.exit(0)

      case '--full':
        options.mode = 'full'
        break

      case '--quick':
        options.mode = 'quick'
        break

      case '--snapshot':
        options.mode = 'snapshot'
        break

      case '--remediate':
        options.mode = 'remediate'
        break

      case '--dry-run':
        options.dryRun = true
        break

      case '--confirm':
        options.confirm = true
        break

      case '--save-snapshot':
        options.saveSnapshot = true
        break

      case '--output':
        options.outputFile = args[++i]
        break

      case '--format':
        const format = args[++i]
        if (format !== 'json' && format !== 'text') {
          console.error(`Invalid format: ${format}. Use 'json' or 'text'`)
          process.exit(1)
        }
        options.format = format
        break

      default:
        console.error(`Unknown option: ${arg}`)
        console.log('Use --help for usage information')
        process.exit(1)
    }
  }

  return options
}

/**
 * Show help message
 */
function showHelp() {
  console.log(`
Data Audit CLI Tool

Run comprehensive data quality audits for the JudgeFinder platform.

Usage:
  npx tsx scripts/run-data-audit.ts [options]

Options:
  --full              Run full enhanced validation (default)
  --quick             Run quick validation (critical checks only)
  --snapshot          Generate data snapshot only
  --remediate         Execute auto-remediation
  --dry-run           Perform dry run of remediation (no changes)
  --confirm           Confirm remediation execution (required for actual changes)
  --save-snapshot     Save snapshot to database
  --output <file>     Save report to file
  --format <format>   Output format: json, text (default: text)
  --help, -h          Show this help message

Examples:
  # Run full audit and save report
  npx tsx scripts/run-data-audit.ts --full --output audit-report.json

  # Quick validation
  npx tsx scripts/run-data-audit.ts --quick

  # Generate snapshot
  npx tsx scripts/run-data-audit.ts --snapshot --save-snapshot

  # Dry run remediation
  npx tsx scripts/run-data-audit.ts --remediate --dry-run

  # Execute remediation (with confirmation)
  npx tsx scripts/run-data-audit.ts --remediate --confirm

Environment Variables:
  NEXT_PUBLIC_SUPABASE_URL      - Supabase project URL
  SUPABASE_SERVICE_ROLE_KEY     - Supabase service role key
`)
}

/**
 * Run full validation audit
 */
async function runFullAudit(options: CLIOptions): Promise<void> {
  console.log('🔍 Running full enhanced data quality validation...\n')

  const validator = new EnhancedDataQualityValidator()
  const report = await validator.runEnhancedValidation()

  console.log('✅ Validation complete\n')

  // Generate remediation plan
  console.log('📋 Generating remediation plan...\n')
  const planner = new RemediationPlanner()
  const plan = planner.generatePlan(report)

  // Output results
  await outputResults(report, plan, options)

  // Print summary
  printSummary(report, plan)
}

/**
 * Run quick validation
 */
async function runQuickValidation(options: CLIOptions): Promise<void> {
  console.log('⚡ Running quick validation (critical checks only)...\n')

  const validator = new EnhancedDataQualityValidator()

  // Run only critical validations
  await Promise.all([
    validator['validatePrimaryCourtRule'](),
    validator['validateTemporalOverlaps'](),
    validator['validateMinimumCaseThreshold'](),
  ])

  const report = await validator.generateReport()

  console.log('✅ Quick validation complete\n')

  // Generate remediation plan
  const planner = new RemediationPlanner()
  const plan = planner.generatePlan(report)

  // Output results
  await outputResults(report, plan, options)

  // Print summary
  printSummary(report, plan)
}

/**
 * Generate snapshot
 */
async function generateSnapshot(options: CLIOptions): Promise<void> {
  console.log('📸 Generating data snapshot...\n')

  const generator = new SnapshotGenerator()
  const snapshot = await generator.generateSnapshot()

  console.log('✅ Snapshot generated\n')

  // Save if requested
  if (options.saveSnapshot) {
    console.log('💾 Saving snapshot to database...')
    await generator.saveSnapshot(snapshot)
    console.log('✅ Snapshot saved\n')
  }

  // Output snapshot
  if (options.format === 'json') {
    console.log(JSON.stringify(snapshot, null, 2))
  } else {
    printSnapshotSummary(snapshot)
  }

  // Save to file if requested
  if (options.outputFile) {
    await writeFile(options.outputFile, JSON.stringify(snapshot, null, 2))
    console.log(`📄 Snapshot saved to: ${options.outputFile}`)
  }
}

/**
 * Execute remediation
 */
async function executeRemediation(options: CLIOptions): Promise<void> {
  // Safety check
  if (!options.dryRun && !options.confirm) {
    console.error('❌ ERROR: Remediation requires --confirm flag')
    console.log('Use --dry-run to test without making changes')
    process.exit(1)
  }

  console.log(
    options.dryRun
      ? '🔍 Running remediation dry run (no changes will be made)...\n'
      : '⚠️  Running remediation with ACTUAL CHANGES...\n'
  )

  // Run validation first
  const validator = new EnhancedDataQualityValidator()
  const report = await validator.runEnhancedValidation()

  console.log(`Found ${report.totalIssues} issues\n`)

  // Execute remediation
  const engine = new AutoRemediationEngine(undefined, { dryRun: options.dryRun })
  const summary = await engine.executeRemediation(report.issues)

  console.log('✅ Remediation complete\n')

  // Print results
  console.log('───────────────────────────────────────────────────────────────')
  console.log('REMEDIATION SUMMARY')
  console.log('───────────────────────────────────────────────────────────────')
  console.log(`Total Issues:    ${summary.total_issues}`)
  console.log(`Attempted:       ${summary.attempted}`)
  console.log(`Successful:      ${summary.successful}`)
  console.log(`Failed:          ${summary.failed}`)
  console.log(`Skipped:         ${summary.skipped}`)
  console.log(`Duration:        ${(summary.duration_ms / 1000).toFixed(2)}s`)
  console.log('')

  if (summary.failed > 0) {
    console.log('⚠️  Some remediation actions failed:')
    summary.results
      .filter((r) => !r.success)
      .forEach((r) => {
        console.log(`  • ${r.action_taken}: ${r.error}`)
      })
    console.log('')
  }

  // Save results
  if (options.outputFile) {
    await writeFile(options.outputFile, JSON.stringify(summary, null, 2))
    console.log(`📄 Results saved to: ${options.outputFile}`)
  }

  if (options.dryRun) {
    console.log('ℹ️  This was a dry run. Use --confirm to apply changes.')
  } else {
    console.log('✅ Changes have been applied to the database.')
  }
}

/**
 * Output validation results
 */
async function outputResults(
  report: ValidationReport,
  plan: RemediationPlan,
  options: CLIOptions
): Promise<void> {
  if (options.format === 'json') {
    const output = {
      validation_report: report,
      remediation_plan: plan,
    }

    if (options.outputFile) {
      await writeFile(options.outputFile, JSON.stringify(output, null, 2))
      console.log(`📄 Report saved to: ${options.outputFile}\n`)
    } else {
      console.log(JSON.stringify(output, null, 2))
    }
  } else {
    // Text format
    const validator = new EnhancedDataQualityValidator()
    const planner = new RemediationPlanner()

    const textReport = await validator.generateTextReport(report)
    const textPlan = planner.generateTextReport(plan)

    const fullText = `${textReport}\n\n${textPlan}`

    if (options.outputFile) {
      await writeFile(options.outputFile, fullText)
      console.log(`📄 Report saved to: ${options.outputFile}\n`)
    } else {
      console.log(fullText)
    }
  }
}

/**
 * Print summary to console
 */
function printSummary(report: ValidationReport, plan: RemediationPlan): void {
  console.log('\n═══════════════════════════════════════════════════════════════')
  console.log('QUICK SUMMARY')
  console.log('═══════════════════════════════════════════════════════════════')
  console.log(`Total Issues: ${report.totalIssues}`)
  console.log(`  Critical:   ${report.criticalIssues}`)
  console.log(`  High:       ${report.highPriorityIssues}`)
  console.log(`  Medium:     ${report.mediumPriorityIssues}`)
  console.log(`  Low:        ${report.lowPriorityIssues}`)
  console.log('')
  console.log(`Auto-fixable:    ${plan.summary.auto_fixable}`)
  console.log(`Requires Review: ${plan.summary.requires_review}`)
  console.log('')
  console.log(`Overall Risk: ${plan.risk_assessment.overall_risk.toUpperCase()}`)
  console.log(`Backup Recommended: ${plan.risk_assessment.recommended_backup ? 'YES' : 'No'}`)
  console.log('═══════════════════════════════════════════════════════════════')

  if (report.criticalIssues > 0) {
    console.log('\n🚨 CRITICAL ISSUES REQUIRE IMMEDIATE ATTENTION')
  }

  if (plan.risk_assessment.warnings.length > 0) {
    console.log('\n⚠️  WARNINGS:')
    plan.risk_assessment.warnings.forEach((w) => {
      console.log(`   ${w}`)
    })
  }

  console.log('\n💡 Next steps:')
  if (plan.summary.auto_fixable > 0) {
    console.log('   1. Review remediation plan carefully')
    console.log('   2. Run: npx tsx scripts/run-data-audit.ts --remediate --dry-run')
    console.log('   3. If satisfied, run with --confirm to apply changes')
  } else {
    console.log('   1. Review issues that require manual attention')
    console.log('   2. Address critical issues first')
    console.log('   3. Re-run audit after fixes')
  }
}

/**
 * Print snapshot summary
 */
function printSnapshotSummary(snapshot: DataSnapshot): void {
  console.log('═══════════════════════════════════════════════════════════════')
  console.log('DATA SNAPSHOT SUMMARY')
  console.log('═══════════════════════════════════════════════════════════════')
  console.log(`Snapshot ID: ${snapshot.snapshot_id}`)
  console.log(`Timestamp:   ${snapshot.timestamp}`)
  console.log(`Duration:    ${(snapshot.duration_ms / 1000).toFixed(2)}s`)
  console.log(`Health Score: ${snapshot.health_score}/100`)
  console.log('')
  console.log('Judges:')
  console.log(`  Total:              ${snapshot.judges.total}`)
  console.log(`  With Primary Court: ${snapshot.judges.with_primary_court}`)
  console.log(`  Below Threshold:    ${snapshot.judges.below_threshold}`)
  console.log(`  Active:             ${snapshot.judges.active}`)
  console.log(`  Retired:            ${snapshot.judges.retired}`)
  console.log('')
  console.log('Courts:')
  console.log(`  Total:          ${snapshot.courts.total}`)
  console.log(`  With Judges:    ${snapshot.courts.with_judges}`)
  console.log(`  Without Judges: ${snapshot.courts.without_judges}`)
  console.log('')
  console.log('Cases:')
  console.log(`  Total:        ${snapshot.cases.total}`)
  console.log(`  Linked:       ${snapshot.cases.linked_to_judge}`)
  console.log(`  Orphaned:     ${snapshot.cases.orphaned}`)
  console.log(`  Recent:       ${snapshot.cases.recent_cases}`)
  console.log('')
  console.log('Assignments:')
  console.log(`  Total:       ${snapshot.assignments.total}`)
  console.log(`  Active:      ${snapshot.assignments.active}`)
  console.log(`  Primary:     ${snapshot.assignments.primary}`)
  console.log(`  Visiting:    ${snapshot.assignments.visiting}`)
  console.log(`  Overlapping: ${snapshot.assignments.overlapping}`)
  console.log('')
  console.log('Quality Issues:')
  console.log(`  Orphaned Records:     ${snapshot.quality_metrics.orphaned_records}`)
  console.log(`  Duplicate IDs:        ${snapshot.quality_metrics.duplicate_identifiers}`)
  console.log(`  Missing Fields:       ${snapshot.quality_metrics.missing_required_fields}`)
  console.log(`  Temporal Overlaps:    ${snapshot.quality_metrics.temporal_overlaps}`)
  console.log(`  Jurisdiction Issues:  ${snapshot.quality_metrics.jurisdiction_mismatches}`)
  console.log('═══════════════════════════════════════════════════════════════')
}

/**
 * Main execution
 */
async function main() {
  console.log('🏛️  JudgeFinder Data Quality Audit Tool\n')

  // Parse arguments
  const options = parseArgs()

  try {
    // Execute based on mode
    switch (options.mode) {
      case 'full':
        await runFullAudit(options)
        break

      case 'quick':
        await runQuickValidation(options)
        break

      case 'snapshot':
        await generateSnapshot(options)
        break

      case 'remediate':
        await executeRemediation(options)
        break
    }
  } catch (error) {
    console.error('\n❌ ERROR:', error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
}

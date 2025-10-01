/**
 * Integration Example: Data Quality Validation
 * 
 * Shows how to integrate validation into sync scripts and cron jobs
 */

import { DataQualityValidator, runQuickValidation, autoFixIssues } from '@/lib/sync/data-quality-validator'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

// ============================================================================
// EXAMPLE 1: Run validation after sync completes
// ============================================================================

export async function runSyncWithValidation() {
  const supabase = await createServiceRoleClient()
  
  try {
    // Run your normal sync operation
    logger.info('Starting judge sync...')
    // await syncJudges()
    
    // Run validation after sync
    logger.info('Running data quality validation...')
    const validator = new DataQualityValidator(supabase)
    const report = await validator.runFullValidation()
    
    // Log results
    logger.info('Validation complete', {
      totalIssues: report.totalIssues,
      criticalIssues: report.criticalIssues,
      summary: report.summary
    })
    
    // Generate and print text report
    const textReport = await validator.generateTextReport(report)
    console.log(textReport)
    
    // Auto-fix fixable issues
    if (report.issues.filter(i => i.autoFixable).length > 0) {
      logger.info('Auto-fixing issues...')
      const fixResults = await autoFixIssues(report, supabase)
      const successCount = fixResults.filter(r => r.success).length
      logger.info(`Fixed ${successCount} of ${fixResults.length} auto-fixable issues`)
    }
    
    // Alert on critical issues
    if (report.criticalIssues > 0) {
      // Send alert to monitoring system
      logger.error('Critical data quality issues detected', {
        criticalCount: report.criticalIssues,
        recommendations: report.recommendations
      })
      // await sendSlackAlert(report)
      // await sendSentryAlert(report)
    }
    
  } catch (error) {
    logger.error('Sync with validation failed', { error })
    throw error
  }
}

// ============================================================================
// EXAMPLE 2: Quick validation check
// ============================================================================

export async function runQuickCheck() {
  const supabase = await createServiceRoleClient()
  
  // Run only critical checks (faster)
  const report = await runQuickValidation(supabase)
  
  if (report.criticalIssues > 0) {
    logger.error('Quick validation found critical issues', { report })
    return false
  }
  
  return true
}

// ============================================================================
// EXAMPLE 3: Daily validation cron job
// ============================================================================

export async function dailyValidationJob() {
  const supabase = await createServiceRoleClient()
  const validator = new DataQualityValidator(supabase)
  
  logger.info('Starting daily data quality validation')
  
  const report = await validator.runFullValidation()
  
  // Store report in database (automatically done by validator)
  
  // Generate dashboard metrics
  const stats = await validator.getValidationStats()
  logger.info('Database health score', { 
    healthScore: stats.healthScore,
    totalRecords: stats.totalRecords 
  })
  
  // Send daily report email
  const textReport = await validator.generateTextReport(report)
  // await sendEmail({
  //   to: 'admin@judgefinder.io',
  //   subject: `Daily Data Quality Report - ${stats.healthScore}/100`,
  //   body: textReport
  // })
  
  return report
}

// ============================================================================
// EXAMPLE 4: Fix specific issue types
// ============================================================================

export async function fixStaleRecords() {
  const supabase = await createServiceRoleClient()
  const validator = new DataQualityValidator(supabase)
  
  // Run validation
  const report = await validator.runFullValidation()
  
  // Filter for stale data issues only
  const staleIssues = report.issues.filter(i => i.type === 'stale_data' && i.autoFixable)
  
  logger.info(`Found ${staleIssues.length} stale records to fix`)
  
  // Fix each stale record
  for (const issue of staleIssues) {
    const result = await validator.fixIssue(issue)
    if (result.success) {
      logger.info('Fixed stale record', { 
        entity: issue.entity, 
        entityId: issue.entityId 
      })
    } else {
      logger.error('Failed to fix stale record', { 
        entity: issue.entity, 
        error: result.error 
      })
    }
  }
}

// ============================================================================
// EXAMPLE 5: Get validation statistics
// ============================================================================

export async function getDataQualityMetrics() {
  const supabase = await createServiceRoleClient()
  const validator = new DataQualityValidator(supabase)
  
  const stats = await validator.getValidationStats()
  
  return {
    healthScore: stats.healthScore,
    totalJudges: stats.totalRecords.judges,
    totalCourts: stats.totalRecords.courts,
    totalCases: stats.totalRecords.cases,
    lastValidation: stats.lastValidation,
  }
}

// ============================================================================
// EXAMPLE 6: Integration with sync completion
// ============================================================================

export async function onSyncComplete(syncType: 'judge' | 'court' | 'case') {
  const supabase = await createServiceRoleClient()
  
  logger.info('Sync completed, running validation', { syncType })
  
  // Run quick validation
  const validator = new DataQualityValidator(supabase)
  await validator.runFullValidation()
  
  // The report is automatically saved to sync_validation_results table
}

// ============================================================================
// Usage in existing sync scripts
// ============================================================================

/*
// In scripts/sync-judges-manual.js or similar:

import { DataQualityValidator } from '@/lib/sync/data-quality-validator'

async function main() {
  // ... existing sync logic ...
  
  // Add validation at the end
  const validator = new DataQualityValidator()
  const report = await validator.runFullValidation()
  
  console.log('\nValidation Results:')
  console.log('-------------------')
  console.log(`Total Issues: ${report.totalIssues}`)
  console.log(`Critical: ${report.criticalIssues}`)
  console.log(`High: ${report.highPriorityIssues}`)
  console.log(`Medium: ${report.mediumPriorityIssues}`)
  console.log(`Low: ${report.lowPriorityIssues}`)
  
  if (report.criticalIssues > 0) {
    console.error('\nCRITICAL ISSUES FOUND!')
    const textReport = await validator.generateTextReport(report)
    console.log(textReport)
  }
}
*/

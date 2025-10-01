#!/usr/bin/env tsx
/**
 * Test Script for Data Quality Validator
 * Run with: npx tsx scripts/test-data-quality.ts
 */

import { DataQualityValidator, runQuickValidation } from '@/lib/sync/data-quality-validator'
import { createServiceRoleClient } from '@/lib/supabase/server'

async function main() {
  console.log('Testing Data Quality Validator...')
  console.log('=================================\n')
  
  try {
    const supabase = await createServiceRoleClient()
    
    // Test 1: Create validator instance
    console.log('Test 1: Creating validator instance...')
    const validator = new DataQualityValidator(supabase)
    console.log('✓ Validator created successfully\n')
    
    // Test 2: Get statistics
    console.log('Test 2: Getting validation statistics...')
    const stats = await validator.getValidationStats()
    console.log(`✓ Statistics retrieved:`)
    console.log(`  - Health Score: ${stats.healthScore}/100`)
    console.log(`  - Total Judges: ${stats.totalRecords.judges}`)
    console.log(`  - Total Courts: ${stats.totalRecords.courts}`)
    console.log(`  - Total Cases: ${stats.totalRecords.cases}`)
    console.log(`  - Total Assignments: ${stats.totalRecords.assignments}`)
    console.log(`  - Total Opinions: ${stats.totalRecords.opinions}`)
    console.log(`  - Total Dockets: ${stats.totalRecords.dockets}`)
    console.log(`  - Last Validation: ${stats.lastValidation || 'Never'}\n`)
    
    // Test 3: Run quick validation
    console.log('Test 3: Running quick validation...')
    const quickReport = await runQuickValidation(supabase)
    console.log(`✓ Quick validation completed:`)
    console.log(`  - Total Issues: ${quickReport.totalIssues}`)
    console.log(`  - Critical: ${quickReport.criticalIssues}`)
    console.log(`  - High: ${quickReport.highPriorityIssues}`)
    console.log(`  - Duration: ${(quickReport.duration / 1000).toFixed(2)}s\n`)
    
    // Test 4: Run full validation
    console.log('Test 4: Running full validation...')
    const fullReport = await validator.runFullValidation()
    console.log(`✓ Full validation completed:`)
    console.log(`  - Total Issues: ${fullReport.totalIssues}`)
    console.log(`  - Critical: ${fullReport.criticalIssues}`)
    console.log(`  - High: ${fullReport.highPriorityIssues}`)
    console.log(`  - Medium: ${fullReport.mediumPriorityIssues}`)
    console.log(`  - Low: ${fullReport.lowPriorityIssues}`)
    console.log(`  - Duration: ${(fullReport.duration / 1000).toFixed(2)}s\n`)
    
    // Test 5: Generate text report
    console.log('Test 5: Generating text report...')
    const textReport = await validator.generateTextReport(fullReport)
    console.log('✓ Text report generated:\n')
    console.log(textReport)
    
    // Test 6: Show recommendations
    if (fullReport.recommendations.length > 0) {
      console.log('\n' + '='.repeat(60))
      console.log('RECOMMENDATIONS')
      console.log('='.repeat(60))
      fullReport.recommendations.forEach((rec, i) => {
        console.log(`${i + 1}. ${rec}`)
      })
    }
    
    // Test 7: Issues breakdown
    if (fullReport.totalIssues > 0) {
      console.log('\n' + '='.repeat(60))
      console.log('ISSUES BREAKDOWN')
      console.log('='.repeat(60))
      console.log('\nBy Type:')
      Object.entries(fullReport.issuesByType).forEach(([type, count]) => {
        if (count > 0) {
          console.log(`  - ${type}: ${count}`)
        }
      })
      console.log('\nBy Entity:')
      Object.entries(fullReport.issuesByEntity).forEach(([entity, count]) => {
        if (count > 0) {
          console.log(`  - ${entity}: ${count}`)
        }
      })
    }
    
    // Summary
    console.log('\n' + '='.repeat(60))
    console.log('TEST SUMMARY')
    console.log('='.repeat(60))
    console.log('All tests passed successfully!')
    console.log(`Database Health Score: ${stats.healthScore}/100`)
    
    if (stats.healthScore >= 90) {
      console.log('Status: EXCELLENT ✓')
    } else if (stats.healthScore >= 75) {
      console.log('Status: GOOD ✓')
    } else if (stats.healthScore >= 50) {
      console.log('Status: FAIR ⚠')
    } else {
      console.log('Status: NEEDS ATTENTION ⚠⚠⚠')
    }
    
  } catch (error) {
    console.error('\n❌ Test failed:', error)
    process.exit(1)
  }
}

main()

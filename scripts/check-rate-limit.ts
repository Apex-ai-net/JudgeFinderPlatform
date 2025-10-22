#!/usr/bin/env tsx
/**
 * Check Current CourtListener Rate Limit Status
 */

import { getGlobalRateLimiter } from '../lib/courtlistener/global-rate-limiter'

async function main() {
  console.log('\n📊 Checking CourtListener Rate Limit Status...\n')

  const limiter = getGlobalRateLimiter()
  const report = await limiter.getStatusReport()

  console.log(report)
  console.log()

  const stats = await limiter.getUsageStats()

  if (stats.utilizationPercent > 90) {
    console.log('⚠️  WARNING: Over 90% utilized - wait before syncing!')
  } else if (stats.utilizationPercent > 70) {
    console.log('⚠️  CAUTION: Over 70% utilized - sync carefully')
  } else {
    console.log('✅ Safe to sync (under 70% utilization)')
  }
  console.log()
}

main().catch(error => {
  console.error('Error checking rate limit:', error.message)
  process.exit(1)
})

#!/usr/bin/env npx tsx
/**
 * Clear Analytics Cache
 *
 * Clears old analytics cache entries that have the wrong data structure.
 * This allows analytics to regenerate with the correct sample_size_* fields
 * needed for proper threshold checking in the frontend.
 *
 * Run: npx tsx scripts/clear-analytics-cache.ts
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables')
  console.error('   Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

async function clearAnalyticsCache() {
  console.log('🔄 Starting analytics cache clear...\n')

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  try {
    // First, get count of cached entries
    const { count: beforeCount, error: countError } = await supabase
      .from('judge_analytics_cache')
      .select('*', { count: 'exact', head: true })

    if (countError) {
      throw new Error(`Failed to count cache entries: ${countError.message}`)
    }

    console.log(`📊 Found ${beforeCount} cached analytics entries`)

    // Check for old format (missing sample_size_civil field)
    const { data: sampleEntry, error: sampleError } = await supabase
      .from('judge_analytics_cache')
      .select('analytics')
      .limit(1)
      .single()

    if (!sampleError && sampleEntry) {
      const hasOldFormat = !sampleEntry.analytics?.sample_size_civil
      if (hasOldFormat) {
        console.log('⚠️  Detected old analytics format (missing sample_size_civil)')
      } else {
        console.log('✅ Analytics already have correct format')
        console.log(
          '\nConsider using POST /api/judges/[id]/analytics?force=true for specific judges instead'
        )
        return
      }
    }

    // Delete all cached analytics
    const { error: deleteError } = await supabase
      .from('judge_analytics_cache')
      .delete()
      .neq('judge_id', '00000000-0000-0000-0000-000000000000') // Delete all (impossible condition)

    if (deleteError) {
      throw new Error(`Failed to clear cache: ${deleteError.message}`)
    }

    // Verify deletion
    const { count: afterCount, error: afterCountError } = await supabase
      .from('judge_analytics_cache')
      .select('*', { count: 'exact', head: true })

    if (afterCountError) {
      throw new Error(`Failed to verify deletion: ${afterCountError.message}`)
    }

    console.log(
      `\n✅ Successfully cleared ${(beforeCount || 0) - (afterCount || 0)} analytics cache entries`
    )
    console.log(`📊 Remaining entries: ${afterCount}`)
    console.log('\n✨ Analytics will regenerate automatically when requested')
    console.log("   Each judge's analytics will be computed fresh with the correct structure")
    console.log('   including all sample_size_* fields needed for proper display thresholds')
  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : error)
    process.exit(1)
  }
}

clearAnalyticsCache()
  .then(() => {
    console.log('\n✅ Cache clear complete!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error)
    process.exit(1)
  })

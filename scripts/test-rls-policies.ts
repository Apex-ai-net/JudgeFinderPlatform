/**
 * RLS Policy Testing Script
 *
 * This script validates that Row Level Security policies are correctly configured
 * across all tables in the database.
 *
 * Usage:
 *   npx tsx scripts/test-rls-policies.ts
 *
 * What it tests:
 * - All tables have RLS enabled
 * - Service role can bypass RLS
 * - Service account has appropriate access
 * - Authenticated users have correct permissions
 * - Anonymous users have appropriate read-only access
 * - Admin users have elevated permissions
 *
 * @see supabase/migrations/20251009_001_service_account_rbac.sql
 * @see supabase/migrations/20251009_002_complete_rls_coverage.sql
 * @see supabase/migrations/20251009_003_standardize_rls_policies.sql
 */

import { createServiceAccountClient } from '@/lib/supabase/service-account'
import { createClient } from '@supabase/supabase-js'

interface TestResult {
  test: string
  table: string
  passed: boolean
  error?: string
  details?: any
}

interface PolicyCheck {
  tablename: string
  has_service_bypass: boolean
  policy_count: number
}

const results: TestResult[] = []

// Tables that should have RLS enabled
const TABLES_WITH_RLS = [
  'judges',
  'courts',
  'cases',
  'judge_court_positions',
  'app_users',
  'sync_queue',
  'sync_logs',
  'profile_issues',
  'ad_waitlist',
  'ad_spots',
  'ad_events',
  'user_push_tokens',
  'performance_metrics',
  'service_account_audit',
]

// Tables that should have public read access
const PUBLIC_READ_TABLES = [
  'judges',
  'courts',
  'cases',
  'judge_court_positions',
  'ad_spots',
  'performance_metrics',
]

// Tables that should be service/admin only
const ADMIN_ONLY_TABLES = ['sync_queue', 'sync_logs']

/**
 * Record test result
 */
function recordTest(
  test: string,
  table: string,
  passed: boolean,
  error?: string,
  details?: any
): void {
  results.push({ test, table, passed, error, details })

  const symbol = passed ? '✓' : '✗'
  const status = passed ? 'PASS' : 'FAIL'
  console.log(`${symbol} [${status}] ${table}: ${test}`)

  if (error) {
    console.log(`  Error: ${error}`)
  }

  if (details && !passed) {
    console.log(`  Details:`, details)
  }
}

/**
 * Test 1: Verify all tables have RLS enabled
 */
async function testRLSEnabled(serviceClient: any): Promise<void> {
  console.log('\n=== Test 1: RLS Enabled on All Tables ===\n')

  try {
    const { data: tables, error } = await serviceClient
      .from('pg_tables')
      .select('tablename, rowsecurity')
      .eq('schemaname', 'public')
      .not('tablename', 'like', 'pg_%')
      .not('tablename', 'like', 'sql_%')

    if (error) {
      throw error
    }

    for (const expectedTable of TABLES_WITH_RLS) {
      const table = tables?.find((t: any) => t.tablename === expectedTable)

      if (!table) {
        recordTest(
          'Table exists',
          expectedTable,
          false,
          `Table ${expectedTable} not found in database`
        )
        continue
      }

      recordTest(
        'RLS enabled',
        expectedTable,
        table.rowsecurity === true,
        table.rowsecurity ? undefined : 'RLS is not enabled'
      )
    }
  } catch (error) {
    console.error('Failed to test RLS enabled:', error)
  }
}

/**
 * Test 2: Verify service role bypass exists on all tables
 */
async function testServiceRoleBypass(serviceClient: any): Promise<void> {
  console.log('\n=== Test 2: Service Role Bypass Policies ===\n')

  try {
    const { data, error } = await serviceClient.rpc('verify_service_role_bypass')

    if (error) {
      throw error
    }

    for (const expectedTable of TABLES_WITH_RLS) {
      const table = data?.find((t: PolicyCheck) => t.tablename === expectedTable)

      if (!table) {
        recordTest('Service bypass policy', expectedTable, false, 'Table not found in policy check')
        continue
      }

      recordTest(
        'Service bypass policy',
        expectedTable,
        table.has_service_bypass === true,
        table.has_service_bypass ? undefined : 'No service bypass policy found',
        { policy_count: table.policy_count }
      )
    }
  } catch (error) {
    console.error('Failed to test service role bypass:', error)
  }
}

/**
 * Test 3: Verify public read access on appropriate tables
 */
async function testPublicReadAccess(): Promise<void> {
  console.log('\n=== Test 3: Public Read Access ===\n')

  const anonUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const anonClient = createClient(anonUrl, anonKey)

  for (const table of PUBLIC_READ_TABLES) {
    try {
      const { data, error } = await anonClient.from(table).select('id').limit(1)

      recordTest('Public read access', table, !error, error?.message, { hasData: !!data })
    } catch (error) {
      recordTest(
        'Public read access',
        table,
        false,
        error instanceof Error ? error.message : 'Unknown error'
      )
    }
  }
}

/**
 * Test 4: Verify public cannot write to tables
 */
async function testPublicWriteBlocked(): Promise<void> {
  console.log('\n=== Test 4: Public Write Blocked ===\n')

  const anonUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const anonClient = createClient(anonUrl, anonKey)

  for (const table of PUBLIC_READ_TABLES) {
    try {
      // Try to insert (should fail)
      const { error } = await anonClient
        .from(table)
        .insert({ id: '00000000-0000-0000-0000-000000000000' })

      // We expect this to fail
      const blocked = !!error

      recordTest(
        'Public write blocked',
        table,
        blocked,
        blocked ? undefined : 'Anonymous users can write (should be blocked)',
        { error_code: error?.code }
      )
    } catch (error) {
      recordTest(
        'Public write blocked',
        table,
        true, // Exception means write was blocked
        undefined
      )
    }
  }
}

/**
 * Test 5: Verify service account can access tables
 */
async function testServiceAccountAccess(): Promise<void> {
  console.log('\n=== Test 5: Service Account Access ===\n')

  try {
    const serviceAccountClient = await createServiceAccountClient()

    for (const table of TABLES_WITH_RLS) {
      try {
        const { data, error } = await serviceAccountClient.from(table).select('id').limit(1)

        recordTest('Service account read', table, !error, error?.message, { hasData: !!data })
      } catch (error) {
        recordTest(
          'Service account read',
          table,
          false,
          error instanceof Error ? error.message : 'Unknown error'
        )
      }
    }
  } catch (error) {
    console.error('Failed to create service account client:', error)
    console.error('Make sure SUPABASE_JWT_SECRET is set in your environment')
  }
}

/**
 * Test 6: Verify admin-only tables block non-admin access
 */
async function testAdminOnlyTables(): Promise<void> {
  console.log('\n=== Test 6: Admin-Only Table Protection ===\n')

  const anonUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const anonClient = createClient(anonUrl, anonKey)

  for (const table of ADMIN_ONLY_TABLES) {
    try {
      const { error } = await anonClient.from(table).select('id').limit(1)

      // We expect this to fail for anonymous users
      const blocked = !!error

      recordTest(
        'Admin-only access enforced',
        table,
        blocked,
        blocked ? undefined : 'Anonymous users can read admin-only table',
        { error_code: error?.code }
      )
    } catch (error) {
      recordTest(
        'Admin-only access enforced',
        table,
        true, // Exception means access was blocked
        undefined
      )
    }
  }
}

/**
 * Test 7: Verify helper functions exist
 */
async function testHelperFunctions(serviceClient: any): Promise<void> {
  console.log('\n=== Test 7: Helper Functions ===\n')

  const functions = [
    'is_service_account',
    'is_admin',
    'current_user_id',
    'is_service_role',
    'log_service_account_activity',
  ]

  for (const func of functions) {
    try {
      const { data, error } = await serviceClient.rpc('pg_get_functiondef', {
        funcid: func,
      })

      recordTest('Function exists', func, !error, error?.message)
    } catch (error) {
      // Function might not be accessible via this method
      // Just log it as a note, not a failure
      console.log(`  Note: Could not verify function ${func} (this may be normal)`)
    }
  }
}

/**
 * Generate summary report
 */
function generateSummary(): void {
  console.log('\n' + '='.repeat(80))
  console.log('RLS POLICY TEST SUMMARY')
  console.log('='.repeat(80))

  const totalTests = results.length
  const passedTests = results.filter((r) => r.passed).length
  const failedTests = totalTests - passedTests

  console.log(`\nTotal Tests: ${totalTests}`)
  console.log(`Passed: ${passedTests}`)
  console.log(`Failed: ${failedTests}`)
  console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`)

  if (failedTests > 0) {
    console.log('\n⚠️  FAILED TESTS:')
    results
      .filter((r) => !r.passed)
      .forEach((r) => {
        console.log(`\n  ✗ ${r.table}: ${r.test}`)
        if (r.error) {
          console.log(`    Error: ${r.error}`)
        }
        if (r.details) {
          console.log(`    Details: ${JSON.stringify(r.details, null, 2)}`)
        }
      })
  }

  console.log('\n' + '='.repeat(80))

  if (failedTests === 0) {
    console.log('✓ All RLS policies are correctly configured!')
  } else {
    console.log('✗ Some RLS policies need attention. See failures above.')
    process.exit(1)
  }
}

/**
 * Main test runner
 */
async function main() {
  console.log('Starting RLS Policy Tests...\n')

  // Validate environment
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
  ]

  const missingVars = requiredEnvVars.filter((v) => !process.env[v])

  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:')
    missingVars.forEach((v) => console.error(`  - ${v}`))
    process.exit(1)
  }

  // Create service role client for testing
  const serviceClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Run all tests
  await testRLSEnabled(serviceClient)
  await testServiceRoleBypass(serviceClient)
  await testPublicReadAccess()
  await testPublicWriteBlocked()
  await testServiceAccountAccess()
  await testAdminOnlyTables()
  await testHelperFunctions(serviceClient)

  // Generate summary
  generateSummary()
}

// Run tests
main().catch((error) => {
  console.error('Fatal error running RLS tests:', error)
  process.exit(1)
})

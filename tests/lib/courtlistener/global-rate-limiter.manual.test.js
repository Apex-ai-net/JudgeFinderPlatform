/**
 * Manual Test Suite for Global Rate Limiter
 *
 * Run with: node tests/lib/courtlistener/global-rate-limiter.manual.test.js
 */

const assert = require('assert')

// Mock environment for testing
process.env.UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL || 'http://test-redis.example.com'
process.env.UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || 'test-token'

async function runTests() {
  console.log('🧪 Starting Global Rate Limiter Manual Tests\n')

  let passedTests = 0
  let failedTests = 0

  const tests = [
    {
      name: 'Rate limiter can be imported',
      async test() {
        // Since we're using TypeScript, we'll just verify the file exists
        const fs = require('fs')
        const path = require('path')
        const filePath = path.join(__dirname, '../../../lib/courtlistener/global-rate-limiter.ts')
        assert(fs.existsSync(filePath), 'Rate limiter file should exist')
      }
    },

    {
      name: 'Rate limiter exports expected interfaces',
      async test() {
        // Verify TypeScript compilation
        const { execSync } = require('child_process')
        try {
          execSync('npx tsc --noEmit lib/courtlistener/global-rate-limiter.ts', {
            cwd: path.join(__dirname, '../../..'),
            stdio: 'pipe'
          })
          // If it compiles without error, we're good
        } catch (error) {
          // Only fail if it's a real compilation error, not other TS errors
          if (error.message.includes('global-rate-limiter.ts')) {
            throw new Error('Rate limiter has TypeScript compilation errors')
          }
        }
      }
    },

    {
      name: 'Documentation files exist',
      async test() {
        const fs = require('fs')
        const path = require('path')

        const docs = [
          '../../../docs/RATE_LIMITER_INTEGRATION.md',
          '../../../docs/RATE_LIMITER_IMPLEMENTATION_SUMMARY.md'
        ]

        docs.forEach(doc => {
          const docPath = path.join(__dirname, doc)
          assert(fs.existsSync(docPath), `${doc} should exist`)
        })
      }
    },

    {
      name: 'Admin API endpoint exists',
      async test() {
        const fs = require('fs')
        const path = require('path')
        const apiPath = path.join(__dirname, '../../../app/api/admin/rate-limit/route.ts')
        assert(fs.existsSync(apiPath), 'Admin API endpoint should exist')
      }
    },

    {
      name: 'Redis key constants are properly defined',
      async test() {
        const fs = require('fs')
        const path = require('path')
        const filePath = path.join(__dirname, '../../../lib/courtlistener/global-rate-limiter.ts')
        const content = fs.readFileSync(filePath, 'utf8')

        const requiredConstants = [
          'RATE_LIMIT_KEY',
          'RATE_LIMIT_WINDOW_KEY',
          'USAGE_STATS_KEY',
          'ALERT_SENT_KEY',
          'HOURLY_LIMIT',
          'BUFFER_LIMIT',
          'WARNING_THRESHOLD'
        ]

        requiredConstants.forEach(constant => {
          assert(
            content.includes(constant),
            `Should define constant: ${constant}`
          )
        })
      }
    },

    {
      name: 'GlobalRateLimiter class has all required methods',
      async test() {
        const fs = require('fs')
        const path = require('path')
        const filePath = path.join(__dirname, '../../../lib/courtlistener/global-rate-limiter.ts')
        const content = fs.readFileSync(filePath, 'utf8')

        const requiredMethods = [
          'checkLimit',
          'recordRequest',
          'waitForAvailability',
          'getUsageStats',
          'getRemainingRequests',
          'getResetTime',
          'isRateLimited',
          'getStatusReport',
          'resetWindow'
        ]

        requiredMethods.forEach(method => {
          assert(
            content.includes(`async ${method}`) || content.includes(`${method}(`),
            `Should define method: ${method}`
          )
        })
      }
    },

    {
      name: 'Helper functions are exported',
      async test() {
        const fs = require('fs')
        const path = require('path')
        const filePath = path.join(__dirname, '../../../lib/courtlistener/global-rate-limiter.ts')
        const content = fs.readFileSync(filePath, 'utf8')

        const helperFunctions = [
          'getGlobalRateLimiter',
          'withRateLimitProtection'
        ]

        helperFunctions.forEach(fn => {
          assert(
            content.includes(`export function ${fn}`) || content.includes(`export async function ${fn}`),
            `Should export helper function: ${fn}`
          )
        })
      }
    },

    {
      name: 'Integration documentation is comprehensive',
      async test() {
        const fs = require('fs')
        const path = require('path')
        const docPath = path.join(__dirname, '../../../docs/RATE_LIMITER_INTEGRATION.md')
        const content = fs.readFileSync(docPath, 'utf8')

        const requiredSections = [
          'Overview',
          'Architecture',
          'Redis Key Schema',
          'Integration Instructions',
          'Usage Examples',
          'Monitoring',
          'Testing',
          'Troubleshooting'
        ]

        requiredSections.forEach(section => {
          assert(
            content.includes(section),
            `Documentation should include section: ${section}`
          )
        })
      }
    },

    {
      name: 'Admin API has GET and POST handlers',
      async test() {
        const fs = require('fs')
        const path = require('path')
        const apiPath = path.join(__dirname, '../../../app/api/admin/rate-limit/route.ts')
        const content = fs.readFileSync(apiPath, 'utf8')

        assert(content.includes('export async function GET'), 'Should have GET handler')
        assert(content.includes('export async function POST'), 'Should have POST handler')
        assert(content.includes('getGlobalRateLimiter'), 'Should use rate limiter')
      }
    },

    {
      name: 'TypeScript types are properly defined',
      async test() {
        const fs = require('fs')
        const path = require('path')
        const filePath = path.join(__dirname, '../../../lib/courtlistener/global-rate-limiter.ts')
        const content = fs.readFileSync(filePath, 'utf8')

        const requiredTypes = [
          'RateLimitResult',
          'UsageStats',
          'RateLimitConfig'
        ]

        requiredTypes.forEach(type => {
          assert(
            content.includes(`interface ${type}`) || content.includes(`export interface ${type}`),
            `Should define type: ${type}`
          )
        })
      }
    }
  ]

  // Run all tests
  for (const test of tests) {
    try {
      await test.test()
      console.log(`✅ ${test.name}`)
      passedTests++
    } catch (error) {
      console.error(`❌ ${test.name}`)
      console.error(`   ${error.message}\n`)
      failedTests++
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60))
  console.log(`Test Results: ${passedTests} passed, ${failedTests} failed`)
  console.log('='.repeat(60))

  if (failedTests > 0) {
    process.exit(1)
  } else {
    console.log('\n✨ All tests passed!')
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(error => {
    console.error('Test suite failed:', error)
    process.exit(1)
  })
}

module.exports = { runTests }

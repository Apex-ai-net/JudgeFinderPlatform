#!/usr/bin/env node

/**
 * Environment Variable Validation Script
 *
 * Validates that all required environment variables are set for the current environment.
 * Can be run as part of dev/build scripts or git hooks to catch missing configuration early.
 *
 * Usage:
 *   node scripts/validate-env.js [--env production|development]
 *   npm run validate:env
 */

const fs = require('fs')
const path = require('path')

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
}

// Required environment variables by category
const REQUIRED_VARS = {
  // Always required
  core: [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
    'CLERK_SECRET_KEY',
  ],

  // Required for development
  development: ['SUPABASE_SERVICE_ROLE_KEY'],

  // Required for production
  production: ['SUPABASE_SERVICE_ROLE_KEY', 'NODE_ENV', 'NEXT_PUBLIC_APP_URL'],

  // Optional but recommended for all environments
  recommended: ['OPENAI_API_KEY', 'UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN'],

  // Optional - production monitoring
  monitoring: ['SENTRY_DSN', 'SENTRY_AUTH_TOKEN'],

  // Optional - payment processing
  payments: ['STRIPE_SECRET_KEY', 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY'],

  // Optional - external APIs
  apis: ['COURTLISTENER_API_KEY', 'GOOGLE_AI_API_KEY'],
}

// Parse command line arguments
const args = process.argv.slice(2)
const envArg = args.find((arg) => arg.startsWith('--env='))
const targetEnv = envArg ? envArg.split('=')[1] : process.env.NODE_ENV || 'development'

// Load environment variables from .env.local if it exists
const envLocalPath = path.join(process.cwd(), '.env.local')
if (fs.existsSync(envLocalPath)) {
  const envContent = fs.readFileSync(envLocalPath, 'utf-8')
  envContent.split('\n').forEach((line) => {
    const [key, ...valueParts] = line.split('=')
    if (key && !key.startsWith('#')) {
      const value = valueParts.join('=').trim()
      if (value && !process.env[key]) {
        process.env[key] = value.replace(/^["']|["']$/g, '')
      }
    }
  })
}

/**
 * Check if a variable is set and has a value
 */
function isVariableSet(varName) {
  const value = process.env[varName]
  return value !== undefined && value !== '' && value !== 'undefined'
}

/**
 * Validate a category of environment variables
 */
function validateCategory(categoryName, variables, required = true) {
  const results = {
    category: categoryName,
    required,
    missing: [],
    present: [],
    total: variables.length,
  }

  variables.forEach((varName) => {
    if (isVariableSet(varName)) {
      results.present.push(varName)
    } else {
      results.missing.push(varName)
    }
  })

  return results
}

/**
 * Print validation results
 */
function printResults(results, showPresent = false) {
  const { category, required, missing, present, total } = results

  const statusColor = missing.length === 0 ? colors.green : required ? colors.red : colors.yellow
  const statusSymbol = missing.length === 0 ? '✓' : required ? '✗' : '⚠'

  console.log(
    `\n${statusColor}${colors.bright}${statusSymbol} ${category.toUpperCase()}${colors.reset}`
  )
  console.log(`${colors.cyan}  ${present.length}/${total} variables set${colors.reset}`)

  if (missing.length > 0) {
    console.log(`\n  ${required ? 'Missing required' : 'Missing optional'} variables:`)
    missing.forEach((varName) => {
      console.log(`    ${statusColor}• ${varName}${colors.reset}`)
    })
  }

  if (showPresent && present.length > 0) {
    console.log(`\n  Present variables:`)
    present.forEach((varName) => {
      // Never show actual values - just indicate that the variable is set
      console.log(`    ${colors.green}✓ ${varName}${colors.reset} = [SET]`)
    })
  }
}

/**
 * Main validation function
 */
function validateEnvironment() {
  console.log(`${colors.bright}${colors.blue}
╔═══════════════════════════════════════════════╗
║   Environment Variable Validation             ║
╚═══════════════════════════════════════════════╝${colors.reset}
`)

  console.log(`${colors.cyan}Target Environment: ${colors.bright}${targetEnv}${colors.reset}`)
  console.log(`${colors.cyan}Working Directory: ${colors.reset}${process.cwd()}`)

  let hasErrors = false
  const allResults = []

  // Validate core variables (always required)
  const coreResults = validateCategory('Core', REQUIRED_VARS.core, true)
  printResults(coreResults)
  allResults.push(coreResults)
  if (coreResults.missing.length > 0) hasErrors = true

  // Validate environment-specific variables
  if (targetEnv === 'production') {
    const prodResults = validateCategory('Production', REQUIRED_VARS.production, true)
    printResults(prodResults)
    allResults.push(prodResults)
    if (prodResults.missing.length > 0) hasErrors = true
  } else {
    const devResults = validateCategory('Development', REQUIRED_VARS.development, true)
    printResults(devResults)
    allResults.push(devResults)
    if (devResults.missing.length > 0) hasErrors = true
  }

  // Validate recommended variables
  const recommendedResults = validateCategory('Recommended', REQUIRED_VARS.recommended, false)
  printResults(recommendedResults)
  allResults.push(recommendedResults)

  // Validate optional categories
  const monitoringResults = validateCategory('Monitoring', REQUIRED_VARS.monitoring, false)
  printResults(monitoringResults)
  allResults.push(monitoringResults)

  const paymentsResults = validateCategory('Payments', REQUIRED_VARS.payments, false)
  printResults(paymentsResults)
  allResults.push(paymentsResults)

  // Conditional requirements: universal purchase requires price IDs
  const universalEnabledRaw = process.env.UNIVERSAL_PURCHASE_ENABLED || process.env.NEXT_PUBLIC_UNIVERSAL_PURCHASE_ENABLED
  const universalEnabled = /^(1|true|yes)$/i.test(String(universalEnabledRaw || 'false'))
  if (universalEnabled) {
    const universalRequired = ['STRIPE_PRICE_MONTHLY', 'STRIPE_PRICE_YEARLY']
    const universalResults = validateCategory('Universal Purchase (Conditional)', universalRequired, true)
    printResults(universalResults)
    allResults.push(universalResults)
    if (universalResults.missing.length > 0) hasErrors = true
  }

  const apisResults = validateCategory('External APIs', REQUIRED_VARS.apis, false)
  printResults(apisResults)
  allResults.push(apisResults)

  // Print summary
  console.log(
    `\n${colors.bright}${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`
  )

  const totalRequired = allResults.filter((r) => r.required).reduce((sum, r) => sum + r.total, 0)
  const totalRequiredSet = allResults
    .filter((r) => r.required)
    .reduce((sum, r) => sum + r.present.length, 0)

  const totalOptional = allResults.filter((r) => !r.required).reduce((sum, r) => sum + r.total, 0)
  const totalOptionalSet = allResults
    .filter((r) => !r.required)
    .reduce((sum, r) => sum + r.present.length, 0)

  console.log(`${colors.bright}Summary:${colors.reset}`)
  console.log(
    `  Required: ${totalRequiredSet}/${totalRequired} ${hasErrors ? colors.red + '✗' : colors.green + '✓'}${colors.reset}`
  )
  console.log(`  Optional: ${totalOptionalSet}/${totalOptional} ${colors.cyan}ⓘ${colors.reset}`)

  if (hasErrors) {
    console.log(`\n${colors.red}${colors.bright}✗ Validation failed!${colors.reset}`)
    console.log(`\n${colors.yellow}To fix:${colors.reset}`)
    console.log(
      `  1. Copy ${colors.cyan}.env.example${colors.reset} to ${colors.cyan}.env.local${colors.reset} (if not exists)`
    )
    console.log(`  2. Fill in the missing required variables`)
    console.log(`  3. Run this script again to verify\n`)
    process.exit(1)
  } else {
    console.log(
      `\n${colors.green}${colors.bright}✓ All required variables are set!${colors.reset}\n`
    )

    if (totalOptionalSet < totalOptional) {
      console.log(`${colors.yellow}Note: Some optional variables are not set.${colors.reset}`)
      console.log(
        `${colors.yellow}The application will work, but some features may be limited.${colors.reset}\n`
      )
    }

    process.exit(0)
  }
}

// Run validation
validateEnvironment()

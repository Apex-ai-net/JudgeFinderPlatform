#!/usr/bin/env node

/**
 * Verify Mega Menu Routes
 * Ensures all links in mega menu configuration point to valid pages
 */

const fs = require('fs')
const path = require('path')

// Color output helpers
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

// Routes to verify from mega menu config
const routesToVerify = [
  // Judges Menu
  { path: '/judges', description: 'All Judges' },
  { path: '/compare', description: 'Compare Judges' },
  { path: '/judges/advanced-search', description: 'Advanced Search' },
  { path: '/judges/veteran', description: 'Veteran Judges' },
  { path: '/judges/recently-appointed', description: 'Recently Appointed' },
  { path: '/judges/by-court-type/superior', description: 'Superior Court Judges' },
  { path: '/judges/by-court-type/appellate', description: 'Appellate Court Judges' },
  { path: '/judges/by-court-type/supreme', description: 'Supreme Court Judges' },
  { path: '/jurisdictions/los-angeles-county', description: 'Los Angeles County' },
  { path: '/jurisdictions/orange-county', description: 'Orange County' },
  { path: '/jurisdictions/san-diego-county', description: 'San Diego County' },
  { path: '/jurisdictions/san-francisco-county', description: 'San Francisco County' },
  { path: '/jurisdictions', description: 'All Counties' },

  // Courts Menu
  { path: '/courts', description: 'All Courts' },
  { path: '/courts/type/superior', description: 'Superior Courts' },
  { path: '/courts/type/appellate', description: 'Appellate Courts' },
  { path: '/courts/type/supreme', description: 'Supreme Court' },

  // Resources Menu
  { path: '/legal-research-tools', description: 'Legal Research Tools' },
  { path: '/judicial-analytics', description: 'Judicial Analytics' },
  { path: '/analytics', description: 'Case Analytics' },
  { path: '/for-attorneys', description: 'Attorney Directory' },
  { path: '/help-center', description: 'Help Center' },
  { path: '/docs', description: 'Documentation' },
]

// Convert route path to file system path
function routeToFilePath(route) {
  const appDir = path.join(process.cwd(), 'app')

  // Handle dynamic routes
  if (route.includes('[')) {
    return null // Skip dynamic routes for now
  }

  // Remove leading slash
  const routePath = route.replace(/^\//, '')

  // Try different possible file locations
  const possiblePaths = [
    path.join(appDir, routePath, 'page.tsx'),
    path.join(appDir, routePath, 'page.js'),
    path.join(appDir, `${routePath}.tsx`),
    path.join(appDir, `${routePath}.js`),
  ]

  return possiblePaths
}

// Check if route exists
function routeExists(route) {
  const possiblePaths = routeToFilePath(route)

  if (!possiblePaths) {
    return { exists: true, reason: 'dynamic route (skipped)' }
  }

  for (const filePath of possiblePaths) {
    if (fs.existsSync(filePath)) {
      return { exists: true, path: filePath }
    }
  }

  return { exists: false, paths: possiblePaths }
}

// Main verification
async function verifyRoutes() {
  log('\n🔍 Verifying Mega Menu Routes\n', 'cyan')

  let totalRoutes = 0
  let validRoutes = 0
  let invalidRoutes = 0
  let skippedRoutes = 0

  const results = {
    valid: [],
    invalid: [],
    skipped: [],
  }

  for (const route of routesToVerify) {
    totalRoutes++
    const result = routeExists(route.path)

    if (result.exists && result.reason === 'dynamic route (skipped)') {
      skippedRoutes++
      results.skipped.push(route)
      log(`⏭️  ${route.path.padEnd(40)} - ${route.description} (skipped)`, 'yellow')
    } else if (result.exists) {
      validRoutes++
      results.valid.push(route)
      log(`✅ ${route.path.padEnd(40)} - ${route.description}`, 'green')
    } else {
      invalidRoutes++
      results.invalid.push({ ...route, paths: result.paths })
      log(`❌ ${route.path.padEnd(40)} - ${route.description}`, 'red')
    }
  }

  // Print summary
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'blue')
  log(`\n📊 Summary:`, 'cyan')
  log(`   Total Routes:   ${totalRoutes}`)
  log(`   Valid Routes:   ${validRoutes}`, 'green')
  log(`   Invalid Routes: ${invalidRoutes}`, invalidRoutes > 0 ? 'red' : 'green')
  log(`   Skipped Routes: ${skippedRoutes}`, 'yellow')

  if (invalidRoutes > 0) {
    log('\n❌ Missing Pages:', 'red')
    results.invalid.forEach((route) => {
      log(`\n   Route: ${route.path}`, 'red')
      log(`   Description: ${route.description}`)
      log(`   Expected one of:`)
      route.paths.forEach((p) => log(`     - ${p}`, 'yellow'))
    })
  }

  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', 'blue')

  // Exit with error if any routes are invalid
  if (invalidRoutes > 0) {
    log('⚠️  Some routes are invalid. Please create the missing pages.', 'red')
    process.exit(1)
  } else {
    log('✨ All routes are valid!', 'green')
    process.exit(0)
  }
}

// Run verification
verifyRoutes().catch((error) => {
  log(`\n❌ Error: ${error.message}`, 'red')
  process.exit(1)
})

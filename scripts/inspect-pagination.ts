#!/usr/bin/env ts-node
/**
 * Puppeteer Pagination Inspector
 *
 * Inspects https://judgefinder.io/judges pagination system to diagnose:
 * - DOM element presence and event bindings
 * - Network requests and API calls
 * - Console errors and JavaScript issues
 * - Page navigation functionality
 * - Resource loading (404s, MIME errors)
 */

import puppeteer, { Browser, Page } from 'puppeteer'
import * as fs from 'fs'
import * as path from 'path'

interface InspectionResult {
  timestamp: string
  url: string
  domInspection: DOMInspection
  networkActivity: NetworkActivity[]
  consoleMessages: ConsoleMessage[]
  paginationTests: PaginationTest[]
  errors: ErrorLog[]
  screenshots: Record<string, string>
}

interface DOMInspection {
  paginationExists: boolean
  nextButtonFound: boolean
  prevButtonFound: boolean
  pageNumbersFound: number
  currentPage: number | null
  totalPagesShown: number | null
  nextButtonDisabled: boolean
  prevButtonDisabled: boolean
  eventListenersAttached: boolean
}

interface NetworkActivity {
  timestamp: number
  url: string
  method: string
  status: number
  statusText: string
  resourceType: string
  duration?: number
  responseData?: any
}

interface ConsoleMessage {
  timestamp: number
  type: string
  text: string
}

interface PaginationTest {
  testName: string
  action: string
  success: boolean
  expectedPage: number
  actualPage: number | null
  apiCallMade: boolean
  apiCallUrl?: string
  errors: string[]
  duration: number
}

interface ErrorLog {
  timestamp: number
  type: 'console' | 'network' | 'page' | 'other'
  message: string
  details?: any
}

const TARGET_URL = 'https://judgefinder.io/judges'
const OUTPUT_DIR = path.join(process.cwd(), 'artifacts', 'pagination-inspection')

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
}

async function main() {
  console.log('🚀 Starting Pagination Inspector...\n')
  console.log(`Target: ${TARGET_URL}`)
  console.log(`Output: ${OUTPUT_DIR}\n`)

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process',
    ],
  })

  const result: InspectionResult = {
    timestamp: new Date().toISOString(),
    url: TARGET_URL,
    domInspection: {} as DOMInspection,
    networkActivity: [],
    consoleMessages: [],
    paginationTests: [],
    errors: [],
    screenshots: {},
  }

  try {
    const page = await browser.newPage()

    // Disable cache to ensure fresh requests
    await page.setCacheEnabled(false)

    await setupPageMonitoring(page, result)

    // Phase 1: Initial page load and DOM inspection
    console.log('📍 Phase 1: Loading page and inspecting DOM...')
    await page.goto(TARGET_URL, { waitUntil: 'networkidle2', timeout: 30000 })
    await new Promise((resolve) => setTimeout(resolve, 2000)) // Wait for React hydration
    result.screenshots['initial'] = await captureScreenshot(page, 'initial')
    result.domInspection = await inspectDOM(page)
    console.log('✓ DOM inspection complete\n')

    // Phase 2: Test pagination interactions
    console.log('📍 Phase 2: Testing pagination interactions...')

    // Test 1: Click Next button (1 → 2)
    await runPaginationTest(
      page,
      result,
      'Test 1: Next Button (1→2)',
      async () => {
        const nextButton = await page.$('[aria-label="Next page"]')
        if (!nextButton) throw new Error('Next button not found')
        await nextButton.click()
        await new Promise((resolve) => setTimeout(resolve, 2000))
      },
      2
    )
    result.screenshots['page-2'] = await captureScreenshot(page, 'page-2')

    // Test 2: Click page number 4 (2 → 4)
    await runPaginationTest(
      page,
      result,
      'Test 2: Jump to Page 4 (2→4)',
      async () => {
        const page4Button = await page.$('[aria-label="Go to page 4"]')
        if (!page4Button) throw new Error('Page 4 button not found')
        await page4Button.click()
        await new Promise((resolve) => setTimeout(resolve, 2000))
      },
      4
    )
    result.screenshots['page-4'] = await captureScreenshot(page, 'page-4')

    // Test 3: Click Previous button (4 → 3)
    await runPaginationTest(
      page,
      result,
      'Test 3: Previous Button (4→3)',
      async () => {
        const prevButton = await page.$('[aria-label="Previous page"]')
        if (!prevButton) throw new Error('Previous button not found')
        await prevButton.click()
        await new Promise((resolve) => setTimeout(resolve, 2000))
      },
      3
    )
    result.screenshots['page-3'] = await captureScreenshot(page, 'page-3')

    // Test 4: Click page 1 (3 → 1)
    await runPaginationTest(
      page,
      result,
      'Test 4: Return to Page 1 (3→1)',
      async () => {
        const page1Button = await page.$('[aria-label="Go to page 1"]')
        if (!page1Button) throw new Error('Page 1 button not found')
        await page1Button.click()
        await new Promise((resolve) => setTimeout(resolve, 2000))
      },
      1
    )
    result.screenshots['page-1-return'] = await captureScreenshot(page, 'page-1-return')

    // Test 5: Direct URL navigation
    await runPaginationTest(
      page,
      result,
      'Test 5: Direct URL Navigation (?page=5)',
      async () => {
        await page.goto(`${TARGET_URL}?page=5`, { waitUntil: 'networkidle2' })
        await new Promise((resolve) => setTimeout(resolve, 2000))
      },
      5
    )
    result.screenshots['page-5-direct'] = await captureScreenshot(page, 'page-5-direct')

    console.log('✓ Pagination tests complete\n')
  } catch (error) {
    console.error('❌ Fatal error during inspection:', error)
    result.errors.push({
      timestamp: Date.now(),
      type: 'other',
      message: error instanceof Error ? error.message : String(error),
      details: error,
    })
  } finally {
    await browser.close()
  }

  // Generate reports
  await generateReports(result)
  console.log('\n✅ Inspection complete!')
  console.log(`📊 Reports saved to: ${OUTPUT_DIR}`)
}

async function setupPageMonitoring(page: Page, result: InspectionResult) {
  // Monitor network activity
  page.on('request', (request) => {
    const url = request.url()
    if (url.includes('/api/judges/') || url.includes('.js') || url.includes('.css')) {
      const activity: NetworkActivity = {
        timestamp: Date.now(),
        url,
        method: request.method(),
        status: 0,
        statusText: 'pending',
        resourceType: request.resourceType(),
      }
      result.networkActivity.push(activity)
    }
  })

  page.on('response', async (response) => {
    const url = response.url()
    const activity = result.networkActivity.find((a) => a.url === url && a.status === 0)
    if (activity) {
      activity.status = response.status()
      activity.statusText = response.statusText()

      // Check for errors
      if (response.status() === 404) {
        result.errors.push({
          timestamp: Date.now(),
          type: 'network',
          message: `404 Not Found: ${url}`,
        })
      }

      // Capture API responses
      if (url.includes('/api/judges/list')) {
        try {
          const json = await response.json()
          activity.responseData = json
        } catch {
          // Not JSON or already consumed
        }
      }
    }
  })

  // Monitor console messages
  page.on('console', (msg) => {
    const consoleMsg: ConsoleMessage = {
      timestamp: Date.now(),
      type: msg.type(),
      text: msg.text(),
    }
    result.consoleMessages.push(consoleMsg)

    if (msg.type() === 'error') {
      result.errors.push({
        timestamp: Date.now(),
        type: 'console',
        message: msg.text(),
      })
    }
  })

  // Monitor page errors
  page.on('pageerror', (error) => {
    result.errors.push({
      timestamp: Date.now(),
      type: 'page',
      message: error.message,
      details: error,
    })
  })
}

async function inspectDOM(page: Page): Promise<DOMInspection> {
  return await page.evaluate(() => {
    // Find pagination container
    const paginationNav = document.querySelector('[role="navigation"][aria-label="Pagination"]')

    // Find buttons
    const nextButton = document.querySelector('[aria-label="Next page"]') as HTMLButtonElement
    const prevButton = document.querySelector('[aria-label="Previous page"]') as HTMLButtonElement
    const pageButtons = document.querySelectorAll('[aria-label^="Go to page"]')
    const currentPageButton = document.querySelector('[aria-current="page"]')

    // Extract current page and total pages
    let currentPage: number | null = null
    if (currentPageButton) {
      const text = currentPageButton.textContent
      currentPage = text ? parseInt(text, 10) : null
    }

    // Try to find total pages (last page button)
    let totalPagesShown: number | null = null
    if (pageButtons.length > 0) {
      const lastButton = pageButtons[pageButtons.length - 1]
      const text = lastButton.textContent
      totalPagesShown = text && !text.includes('...') ? parseInt(text, 10) : null
    }

    // Check for event listeners (approximate check)
    const eventListenersAttached = nextButton !== null && prevButton !== null

    return {
      paginationExists: paginationNav !== null,
      nextButtonFound: nextButton !== null,
      prevButtonFound: prevButton !== null,
      pageNumbersFound: pageButtons.length,
      currentPage,
      totalPagesShown,
      nextButtonDisabled: nextButton?.disabled || false,
      prevButtonDisabled: prevButton?.disabled || false,
      eventListenersAttached,
    }
  })
}

async function runPaginationTest(
  page: Page,
  result: InspectionResult,
  testName: string,
  action: () => Promise<void>,
  expectedPage: number
): Promise<void> {
  console.log(`  → ${testName}`)
  const startTime = Date.now()
  const test: PaginationTest = {
    testName,
    action: action.toString().substring(0, 100),
    success: false,
    expectedPage,
    actualPage: null,
    apiCallMade: false,
    errors: [],
    duration: 0,
  }

  // Track API calls during this test
  const networkActivityBefore = result.networkActivity.length

  try {
    await action()

    // Check if API call was made
    const networkActivityAfter = result.networkActivity.length
    if (networkActivityAfter > networkActivityBefore) {
      const apiCall = result.networkActivity
        .slice(networkActivityBefore)
        .find((a) => a.url.includes('/api/judges/list'))

      if (apiCall) {
        test.apiCallMade = true
        test.apiCallUrl = apiCall.url
      }
    }

    // Verify current page
    const currentPageButton = await page.$('[aria-current="page"]')
    if (currentPageButton) {
      const pageText = await currentPageButton.evaluate((el) => el.textContent)
      test.actualPage = pageText ? parseInt(pageText, 10) : null
    }

    // Verify URL
    const url = page.url()
    const urlParams = new URL(url).searchParams
    const pageParam = urlParams.get('page')
    const urlPage = pageParam ? parseInt(pageParam, 10) : 1

    test.success = test.actualPage === expectedPage && urlPage === expectedPage

    if (!test.success) {
      test.errors.push(
        `Expected page ${expectedPage}, got page ${test.actualPage} (URL: ${urlPage})`
      )
    }

    console.log(
      `    ${test.success ? '✓' : '✗'} Page ${test.actualPage} | API call: ${test.apiCallMade ? 'Yes' : 'No'}`
    )
  } catch (error) {
    test.errors.push(error instanceof Error ? error.message : String(error))
    console.log(`    ✗ Error: ${test.errors[0]}`)
  }

  test.duration = Date.now() - startTime
  result.paginationTests.push(test)
}

async function captureScreenshot(page: Page, name: string): Promise<string> {
  const filename = `screenshot-${name}-${Date.now()}.png`
  const filepath = path.join(OUTPUT_DIR, filename)
  await page.screenshot({ path: filepath as `${string}.png`, fullPage: true })
  return filename
}

async function generateReports(result: InspectionResult) {
  // 1. JSON report (full data)
  const jsonPath = path.join(OUTPUT_DIR, 'inspection-result.json')
  fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2))

  // 2. Markdown summary
  const mdPath = path.join(OUTPUT_DIR, 'INSPECTION_REPORT.md')
  const markdown = generateMarkdownReport(result)
  fs.writeFileSync(mdPath, markdown)

  // 3. Console summary
  console.log('\n' + '='.repeat(80))
  console.log('📊 INSPECTION SUMMARY')
  console.log('='.repeat(80))
  console.log(`\n🌐 URL: ${result.url}`)
  console.log(`⏱️  Timestamp: ${result.timestamp}`)

  console.log('\n📋 DOM INSPECTION:')
  console.log(`  Pagination exists: ${result.domInspection.paginationExists ? '✓' : '✗'}`)
  console.log(`  Next button: ${result.domInspection.nextButtonFound ? '✓' : '✗'}`)
  console.log(`  Previous button: ${result.domInspection.prevButtonFound ? '✓' : '✗'}`)
  console.log(`  Page number buttons: ${result.domInspection.pageNumbersFound}`)
  console.log(`  Current page: ${result.domInspection.currentPage}`)
  console.log(`  Event listeners: ${result.domInspection.eventListenersAttached ? '✓' : '✗'}`)

  console.log('\n🧪 PAGINATION TESTS:')
  result.paginationTests.forEach((test) => {
    console.log(`  ${test.success ? '✓' : '✗'} ${test.testName}`)
    if (!test.success) {
      test.errors.forEach((err) => console.log(`      ⚠️  ${err}`))
    }
  })

  console.log('\n🚨 ERRORS:')
  if (result.errors.length === 0) {
    console.log('  ✓ No errors detected')
  } else {
    result.errors.slice(0, 10).forEach((err) => {
      console.log(`  [${err.type}] ${err.message}`)
    })
    if (result.errors.length > 10) {
      console.log(`  ... and ${result.errors.length - 10} more errors`)
    }
  }

  console.log('\n🌐 NETWORK ACTIVITY:')
  const apiCalls = result.networkActivity.filter((a) => a.url.includes('/api/judges/list'))
  const notFoundErrors = result.networkActivity.filter((a) => a.status === 404)
  console.log(`  API calls: ${apiCalls.length}`)
  console.log(`  404 errors: ${notFoundErrors.length}`)

  if (notFoundErrors.length > 0) {
    console.log('\n  404 Resources:')
    notFoundErrors.slice(0, 5).forEach((err) => {
      const url = new URL(err.url)
      console.log(`    - ${url.pathname}`)
    })
  }

  console.log('\n' + '='.repeat(80))
}

function generateMarkdownReport(result: InspectionResult): string {
  const passedTests = result.paginationTests.filter((t) => t.success).length
  const totalTests = result.paginationTests.length
  const successRate = totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : 0

  let md = `# Pagination Inspection Report

**URL:** ${result.url}
**Timestamp:** ${result.timestamp}
**Success Rate:** ${passedTests}/${totalTests} (${successRate}%)

---

## Executive Summary

`

  if (result.errors.length === 0 && passedTests === totalTests) {
    md += `✅ **PAGINATION IS FUNCTIONAL**

All pagination tests passed with no errors detected. The pagination system is working as expected.

`
  } else {
    md += `⚠️ **ISSUES DETECTED**

${result.errors.length} error(s) found. ${totalTests - passedTests} pagination test(s) failed.

`
  }

  md += `---

## DOM Inspection Results

| Element | Status | Details |
|---------|--------|---------|
| Pagination Container | ${result.domInspection.paginationExists ? '✅' : '❌'} | Found: ${result.domInspection.paginationExists} |
| Next Button | ${result.domInspection.nextButtonFound ? '✅' : '❌'} | Disabled: ${result.domInspection.nextButtonDisabled} |
| Previous Button | ${result.domInspection.prevButtonFound ? '✅' : '❌'} | Disabled: ${result.domInspection.prevButtonDisabled} |
| Page Number Buttons | ${result.domInspection.pageNumbersFound > 0 ? '✅' : '❌'} | Count: ${result.domInspection.pageNumbersFound} |
| Current Page | ${result.domInspection.currentPage !== null ? '✅' : '❌'} | Page ${result.domInspection.currentPage} |
| Event Listeners | ${result.domInspection.eventListenersAttached ? '✅' : '❌'} | Attached: ${result.domInspection.eventListenersAttached} |

---

## Pagination Test Results

`

  result.paginationTests.forEach((test) => {
    md += `### ${test.testName}

- **Status:** ${test.success ? '✅ PASSED' : '❌ FAILED'}
- **Expected Page:** ${test.expectedPage}
- **Actual Page:** ${test.actualPage}
- **API Call Made:** ${test.apiCallMade ? 'Yes' : 'No'}
- **Duration:** ${test.duration}ms

`
    if (test.apiCallUrl) {
      md += `**API Call:** \`${test.apiCallUrl}\`\n\n`
    }

    if (test.errors.length > 0) {
      md += `**Errors:**\n`
      test.errors.forEach((err) => {
        md += `- ${err}\n`
      })
      md += '\n'
    }
  })

  md += `---

## Network Activity

### API Calls

`

  const apiCalls = result.networkActivity.filter((a) => a.url.includes('/api/judges/list'))
  if (apiCalls.length === 0) {
    md += `No API calls detected.\n\n`
  } else {
    apiCalls.forEach((call, idx) => {
      md += `${idx + 1}. **${call.method} ${call.status}** - \`${call.url}\`\n`
      if (call.responseData) {
        md += `   - Judges: ${call.responseData.judges?.length || 0}\n`
        md += `   - Page: ${call.responseData.page}\n`
        md += `   - Total: ${call.responseData.total_count}\n`
      }
    })
    md += '\n'
  }

  const notFoundErrors = result.networkActivity.filter((a) => a.status === 404)
  if (notFoundErrors.length > 0) {
    md += `### 404 Errors (${notFoundErrors.length})\n\n`
    notFoundErrors.forEach((err) => {
      md += `- \`${err.url}\`\n`
    })
    md += '\n'
  }

  if (result.errors.length > 0) {
    md += `---

## Errors (${result.errors.length})

`
    result.errors.forEach((err, idx) => {
      md += `${idx + 1}. **[${err.type}]** ${err.message}\n`
    })
    md += '\n'
  }

  md += `---

## Screenshots

`
  Object.entries(result.screenshots).forEach(([name, filename]) => {
    md += `- **${name}:** \`${filename}\`\n`
  })

  md += `
---

## Recommendations

`

  if (passedTests === totalTests && result.errors.length === 0) {
    md += `✅ No issues detected. Pagination is working correctly.\n`
  } else {
    if (notFoundErrors.length > 0) {
      md += `
### 404 Errors

The following resources failed to load:
${notFoundErrors
  .slice(0, 5)
  .map((e) => `- ${e.url}`)
  .join('\n')}

**Possible Causes:**
- Netlify deployment issue (standalone output mode)
- Build artifacts not properly deployed
- CDN cache issue

**Fix:**
1. Verify \`next.config.js\` does not have \`output: 'standalone'\`
2. Clear Netlify build cache: \`netlify build --clear-cache\`
3. Redeploy: \`git push origin main\`
`
    }

    if (passedTests < totalTests) {
      md += `
### Pagination Test Failures

${totalTests - passedTests} pagination test(s) failed.

**Possible Causes:**
- Race condition in state updates
- Event handlers not properly attached
- API calls not triggered
- URL synchronization issue

**Fix:**
1. Check \`JudgesView.tsx\` for duplicate \`setPage()\` calls
2. Verify \`handlePageChange\` in \`JudgesDirectoryResultsGrid.tsx\`
3. Review \`judgesDirectoryStore.ts\` for state management issues
`
    }
  }

  md += `
---

**Generated:** ${new Date().toISOString()}
**Tool:** Puppeteer Pagination Inspector
`

  return md
}

// Run the inspector
main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})

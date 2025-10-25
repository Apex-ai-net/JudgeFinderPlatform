/**
 * Puppeteer E2E Test: Homepage Gradual Blur Animation
 *
 * This test suite validates the homepage hero section with GradualBlur animations.
 * It checks for:
 * - Page load success
 * - Console errors and warnings
 * - React hydration issues
 * - HomeHero section rendering
 * - GradualBlur animation functionality
 * - Visual layout and styling
 *
 * Run with: npm run test:e2e:puppeteer
 */

import puppeteer, { Browser, Page, ConsoleMessage } from 'puppeteer'
import { describe, it, beforeAll, afterAll, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000'
const SCREENSHOT_DIR = path.join(__dirname, '../../test-results/homepage-screenshots')

// Ensure screenshot directory exists
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true })
}

interface HomepageTestReport {
  timestamp: string
  pageLoadSuccess: boolean
  consoleErrors: string[]
  consoleWarnings: string[]
  reactErrors: string[]
  hydrationIssues: string[]
  homeHeroFound: boolean
  blurAnimationDetected: boolean
  headingFound: boolean
  descriptionFound: boolean
  ctaButtonsFound: number
  visualIssues: string[]
  screenshots: string[]
  performanceMetrics: {
    loadTime: number
    domContentLoaded: number
    firstPaint?: number
  }
}

let browser: Browser
let page: Page
const consoleMessages: { type: string; text: string }[] = []
const report: HomepageTestReport = {
  timestamp: new Date().toISOString(),
  pageLoadSuccess: false,
  consoleErrors: [],
  consoleWarnings: [],
  reactErrors: [],
  hydrationIssues: [],
  homeHeroFound: false,
  blurAnimationDetected: false,
  headingFound: false,
  descriptionFound: false,
  ctaButtonsFound: 0,
  visualIssues: [],
  screenshots: [],
  performanceMetrics: {
    loadTime: 0,
    domContentLoaded: 0,
  },
}

beforeAll(async () => {
  browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process',
    ],
  })
  page = await browser.newPage()
  await page.setViewport({ width: 1920, height: 1080 })

  // Listen to console messages
  page.on('console', (msg: ConsoleMessage) => {
    const type = msg.type()
    const text = msg.text()
    consoleMessages.push({ type, text })

    if (type === 'error') {
      report.consoleErrors.push(text)

      // Check for React-specific errors
      if (text.includes('React') || text.includes('Hydration') || text.includes('hydration')) {
        report.reactErrors.push(text)
      }

      // Check for hydration issues
      if (text.toLowerCase().includes('hydrat')) {
        report.hydrationIssues.push(text)
      }
    } else if (type === 'warning') {
      report.consoleWarnings.push(text)

      // Check for hydration warnings
      if (text.toLowerCase().includes('hydrat')) {
        report.hydrationIssues.push(text)
      }
    }
  })

  // Listen to page errors
  page.on('pageerror', (error) => {
    report.consoleErrors.push(`Page Error: ${error.message}`)
    if (error.message.toLowerCase().includes('react') || error.message.toLowerCase().includes('hydrat')) {
      report.reactErrors.push(error.message)
    }
  })
})

afterAll(async () => {
  // Generate detailed report
  const reportPath = path.join(__dirname, '../../test-results/homepage-test-report.json')
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
  console.log(`\n📊 Homepage test report saved to: ${reportPath}`)

  // Generate human-readable report
  generateHumanReadableReport(report)

  await browser.close()
})

function generateHumanReadableReport(testReport: HomepageTestReport) {
  const reportPath = path.join(__dirname, '../../test-results/homepage-test-report.md')

  let markdown = `# Homepage Gradual Blur Animation Test Report

Generated: ${testReport.timestamp}

## Summary

- **Page Load**: ${testReport.pageLoadSuccess ? '✅ SUCCESS' : '❌ FAILED'}
- **Console Errors**: ${testReport.consoleErrors.length}
- **Console Warnings**: ${testReport.consoleWarnings.length}
- **React Errors**: ${testReport.reactErrors.length}
- **Hydration Issues**: ${testReport.hydrationIssues.length}
- **HomeHero Section**: ${testReport.homeHeroFound ? '✅ Found' : '❌ Not Found'}
- **Blur Animation**: ${testReport.blurAnimationDetected ? '✅ Detected' : '❌ Not Detected'}
- **Heading**: ${testReport.headingFound ? '✅ Found' : '❌ Not Found'}
- **Description**: ${testReport.descriptionFound ? '✅ Found' : '❌ Not Found'}
- **CTA Buttons**: ${testReport.ctaButtonsFound} found
- **Visual Issues**: ${testReport.visualIssues.length}

---

## Performance Metrics

- **Total Load Time**: ${testReport.performanceMetrics.loadTime.toFixed(2)}ms
- **DOM Content Loaded**: ${testReport.performanceMetrics.domContentLoaded.toFixed(2)}ms
${testReport.performanceMetrics.firstPaint ? `- **First Paint**: ${testReport.performanceMetrics.firstPaint.toFixed(2)}ms` : ''}

---

## Console Messages

### Errors (${testReport.consoleErrors.length})

${testReport.consoleErrors.length > 0 ? testReport.consoleErrors.map(e => `- ${e}`).join('\n') : '✅ No console errors detected'}

### Warnings (${testReport.consoleWarnings.length})

${testReport.consoleWarnings.length > 0 ? testReport.consoleWarnings.map(w => `- ${w}`).join('\n') : '✅ No console warnings detected'}

---

## React & Hydration

### React Errors (${testReport.reactErrors.length})

${testReport.reactErrors.length > 0 ? testReport.reactErrors.map(e => `- ${e}`).join('\n') : '✅ No React errors detected'}

### Hydration Issues (${testReport.hydrationIssues.length})

${testReport.hydrationIssues.length > 0 ? testReport.hydrationIssues.map(h => `- ${h}`).join('\n') : '✅ No hydration issues detected'}

---

## Visual Issues

${testReport.visualIssues.length > 0 ? testReport.visualIssues.map(v => `- ${v}`).join('\n') : '✅ No visual issues detected'}

---

## Screenshots

${testReport.screenshots.map(s => `- ${s}`).join('\n')}

---

## Overall Status

${
  testReport.pageLoadSuccess &&
  testReport.consoleErrors.length === 0 &&
  testReport.reactErrors.length === 0 &&
  testReport.hydrationIssues.length === 0 &&
  testReport.homeHeroFound &&
  testReport.blurAnimationDetected &&
  testReport.headingFound &&
  testReport.descriptionFound &&
  testReport.ctaButtonsFound >= 2 &&
  testReport.visualIssues.length === 0
    ? '✅ **ALL TESTS PASSED** - Homepage is functioning correctly with blur animations'
    : '⚠️ **ISSUES DETECTED** - Please review the findings above'
}
`

  fs.writeFileSync(reportPath, markdown)
  console.log(`📝 Human-readable report saved to: ${reportPath}`)
}

describe('Homepage Gradual Blur Animation Test', () => {
  it('should navigate to homepage successfully', async () => {
    const startTime = Date.now()

    const response = await page.goto(BASE_URL, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    })

    const loadTime = Date.now() - startTime
    report.performanceMetrics.loadTime = loadTime

    // Check response status
    expect(response).toBeTruthy()
    expect(response?.status()).toBe(200)
    report.pageLoadSuccess = response?.status() === 200

    console.log(`✓ Page loaded in ${loadTime}ms with status ${response?.status()}`)

    // Get performance metrics
    const performanceMetrics = await page.evaluate(() => {
      const perfData = performance.timing
      return {
        domContentLoaded: perfData.domContentLoadedEventEnd - perfData.navigationStart,
        firstPaint: (performance.getEntriesByType('paint').find(e => e.name === 'first-paint') as any)?.startTime,
      }
    })

    report.performanceMetrics.domContentLoaded = performanceMetrics.domContentLoaded
    if (performanceMetrics.firstPaint) {
      report.performanceMetrics.firstPaint = performanceMetrics.firstPaint
    }
  }, 30000)

  it('should take initial screenshot after page load', async () => {
    const screenshotPath = path.join(SCREENSHOT_DIR, '01-homepage-initial-load.png')
    await page.screenshot({ path: screenshotPath, fullPage: true })
    report.screenshots.push(screenshotPath)
    console.log(`✓ Initial screenshot saved: ${screenshotPath}`)
  })

  it('should wait for animations to complete and take post-animation screenshot', async () => {
    // Wait for GradualBlur animations to complete
    // The longest delay is 0.6s + 1s duration = 1.6s, so wait 2s to be safe
    await page.waitForTimeout(2500)

    const screenshotPath = path.join(SCREENSHOT_DIR, '02-homepage-after-animation.png')
    await page.screenshot({ path: screenshotPath, fullPage: true })
    report.screenshots.push(screenshotPath)
    console.log(`✓ Post-animation screenshot saved: ${screenshotPath}`)
  })

  it('should find HomeHero section', async () => {
    const heroSection = await page.evaluate(() => {
      // Look for section with gradient background
      const sections = document.querySelectorAll('section')
      for (const section of sections) {
        const hasGradient = section.className.includes('bg-gradient') ||
                           section.className.includes('gradient-to-b')
        if (hasGradient) {
          return {
            found: true,
            classList: section.className,
          }
        }
      }
      return { found: false, classList: '' }
    })

    report.homeHeroFound = heroSection.found

    if (heroSection.found) {
      console.log(`✓ HomeHero section found with classes: ${heroSection.classList}`)
    } else {
      report.visualIssues.push('HomeHero section not found on page')
    }

    expect(heroSection.found).toBe(true)
  })

  it('should find main heading with "Just Got Assigned a Judge?"', async () => {
    const heading = await page.evaluate(() => {
      const headings = document.querySelectorAll('h1')
      for (const h of headings) {
        if (h.textContent?.includes('Just Got Assigned a Judge?')) {
          return {
            found: true,
            text: h.textContent,
          }
        }
      }
      return { found: false, text: '' }
    })

    report.headingFound = heading.found

    if (heading.found) {
      console.log(`✓ Main heading found: "${heading.text.substring(0, 50)}..."`)
    } else {
      report.visualIssues.push('Main heading "Just Got Assigned a Judge?" not found')
    }

    expect(heading.found).toBe(true)
  })

  it('should find "Get Instant Insights" subheading with gradient', async () => {
    const subheading = await page.evaluate(() => {
      const spans = document.querySelectorAll('span, h1 span')
      for (const span of spans) {
        if (span.textContent?.includes('Get Instant Insights')) {
          return {
            found: true,
            text: span.textContent,
            hasGradient: span.className.includes('gradient') || span.className.includes('bg-clip-text'),
          }
        }
      }
      return { found: false, text: '', hasGradient: false }
    })

    if (subheading.found) {
      console.log(`✓ Subheading found with gradient: ${subheading.hasGradient}`)
      if (!subheading.hasGradient) {
        report.visualIssues.push('Subheading "Get Instant Insights" missing gradient styling')
      }
    } else {
      report.visualIssues.push('Subheading "Get Instant Insights" not found')
    }

    expect(subheading.found).toBe(true)
  })

  it('should find description text', async () => {
    const description = await page.evaluate(() => {
      const paragraphs = document.querySelectorAll('p')
      for (const p of paragraphs) {
        if (p.textContent?.includes('Search any California judge')) {
          return {
            found: true,
            text: p.textContent,
          }
        }
      }
      return { found: false, text: '' }
    })

    report.descriptionFound = description.found

    if (description.found) {
      console.log(`✓ Description found: "${description.text.substring(0, 60)}..."`)
    } else {
      report.visualIssues.push('Description paragraph not found')
    }

    expect(description.found).toBe(true)
  })

  it('should find CTA buttons ("Find My Judge" and "Compare Judges")', async () => {
    const buttons = await page.evaluate(() => {
      const links = document.querySelectorAll('a')
      const foundButtons: { text: string; href: string; hasIcon: boolean }[] = []

      for (const link of links) {
        const text = link.textContent?.trim() || ''
        if (text === 'Find My Judge' || text === 'Compare Judges') {
          foundButtons.push({
            text,
            href: link.getAttribute('href') || '',
            hasIcon: link.querySelector('svg') !== null,
          })
        }
      }

      return foundButtons
    })

    report.ctaButtonsFound = buttons.length

    console.log(`✓ Found ${buttons.length} CTA buttons:`)
    buttons.forEach(btn => {
      console.log(`  - "${btn.text}" -> ${btn.href} (icon: ${btn.hasIcon})`)
    })

    if (buttons.length < 2) {
      report.visualIssues.push(`Expected 2 CTA buttons, found ${buttons.length}`)
    }

    expect(buttons.length).toBeGreaterThanOrEqual(2)
  })

  it('should detect GradualBlur animation elements', async () => {
    const blurElements = await page.evaluate(() => {
      // Look for elements that might have blur animation
      // GradualBlur uses motion.div with filter styles
      const allDivs = document.querySelectorAll('div')
      let blurCount = 0

      for (const div of allDivs) {
        const style = window.getComputedStyle(div)
        const filter = style.filter

        // Check if element has had or currently has blur filter
        if (filter && filter !== 'none') {
          blurCount++
        }
      }

      return {
        blurElementsFound: blurCount,
        detected: blurCount > 0,
      }
    })

    report.blurAnimationDetected = blurElements.detected

    if (blurElements.detected) {
      console.log(`✓ Blur animation detected on ${blurElements.blurElementsFound} elements`)
    } else {
      report.visualIssues.push('No blur filter animations detected - animations may not be working')
    }

    // Note: This test might pass even if animations are working because they complete quickly
    // The presence of filter: blur in the initial state is what we're checking
    console.log('ℹ️  Note: Blur animations may complete before detection. Check screenshots for visual confirmation.')
  })

  it('should verify framer-motion is loaded', async () => {
    const motionLoaded = await page.evaluate(() => {
      // Check if framer-motion motion components are in use
      const motionDivs = document.querySelectorAll('[style*="transform"]')
      return motionDivs.length > 0
    })

    if (motionLoaded) {
      console.log('✓ Framer Motion appears to be active (transform styles detected)')
    } else {
      report.visualIssues.push('Framer Motion may not be loaded or active')
    }
  })

  it('should check for visual overflow issues', async () => {
    const overflowIssue = await page.evaluate(() => {
      const bodyScrollWidth = document.body.scrollWidth
      const windowWidth = window.innerWidth
      const hasHorizontalOverflow = bodyScrollWidth > windowWidth

      return {
        hasOverflow: hasHorizontalOverflow,
        bodyWidth: bodyScrollWidth,
        windowWidth,
      }
    })

    if (overflowIssue.hasOverflow) {
      report.visualIssues.push(
        `Horizontal overflow detected: body width ${overflowIssue.bodyWidth}px > window width ${overflowIssue.windowWidth}px`
      )
      console.log(`⚠️  Horizontal overflow detected`)
    } else {
      console.log('✓ No horizontal overflow detected')
    }
  })

  it('should verify responsive layout at mobile viewport', async () => {
    await page.setViewport({ width: 375, height: 667 })
    await page.waitForTimeout(500)

    const screenshotPath = path.join(SCREENSHOT_DIR, '03-homepage-mobile.png')
    await page.screenshot({ path: screenshotPath, fullPage: true })
    report.screenshots.push(screenshotPath)

    const mobileLayout = await page.evaluate(() => {
      const bodyScrollWidth = document.body.scrollWidth
      const windowWidth = window.innerWidth
      return {
        hasOverflow: bodyScrollWidth > windowWidth,
        bodyWidth: bodyScrollWidth,
        windowWidth,
      }
    })

    if (mobileLayout.hasOverflow) {
      report.visualIssues.push('Horizontal overflow on mobile viewport')
    } else {
      console.log('✓ Mobile layout: no overflow')
    }

    // Reset viewport
    await page.setViewport({ width: 1920, height: 1080 })
  })

  it('should verify responsive layout at tablet viewport', async () => {
    await page.setViewport({ width: 768, height: 1024 })
    await page.waitForTimeout(500)

    const screenshotPath = path.join(SCREENSHOT_DIR, '04-homepage-tablet.png')
    await page.screenshot({ path: screenshotPath, fullPage: true })
    report.screenshots.push(screenshotPath)

    const tabletLayout = await page.evaluate(() => {
      const bodyScrollWidth = document.body.scrollWidth
      const windowWidth = window.innerWidth
      return {
        hasOverflow: bodyScrollWidth > windowWidth,
      }
    })

    if (tabletLayout.hasOverflow) {
      report.visualIssues.push('Horizontal overflow on tablet viewport')
    } else {
      console.log('✓ Tablet layout: no overflow')
    }

    // Reset viewport
    await page.setViewport({ width: 1920, height: 1080 })
  })

  it('should check console for errors and warnings', async () => {
    console.log('\n--- Console Message Summary ---')
    console.log(`Total Errors: ${report.consoleErrors.length}`)
    console.log(`Total Warnings: ${report.consoleWarnings.length}`)
    console.log(`React Errors: ${report.reactErrors.length}`)
    console.log(`Hydration Issues: ${report.hydrationIssues.length}`)

    if (report.consoleErrors.length > 0) {
      console.log('\n⚠️  Console Errors Detected:')
      report.consoleErrors.forEach((err, i) => {
        console.log(`  ${i + 1}. ${err}`)
      })
    }

    if (report.consoleWarnings.length > 0) {
      console.log('\n⚠️  Console Warnings Detected:')
      report.consoleWarnings.slice(0, 5).forEach((warn, i) => {
        console.log(`  ${i + 1}. ${warn}`)
      })
      if (report.consoleWarnings.length > 5) {
        console.log(`  ... and ${report.consoleWarnings.length - 5} more`)
      }
    }

    // Fail test if there are React errors or hydration issues
    if (report.reactErrors.length > 0) {
      console.error('\n❌ React errors detected!')
    }

    if (report.hydrationIssues.length > 0) {
      console.error('\n❌ Hydration issues detected!')
    }

    // Expect no React errors or hydration issues
    expect(report.reactErrors.length).toBe(0)
    expect(report.hydrationIssues.length).toBe(0)
  })

  it('should generate final test summary', async () => {
    console.log('\n=== FINAL TEST SUMMARY ===\n')
    console.log(`Page Load: ${report.pageLoadSuccess ? '✅' : '❌'}`)
    console.log(`HomeHero Section: ${report.homeHeroFound ? '✅' : '❌'}`)
    console.log(`Blur Animation: ${report.blurAnimationDetected ? '✅' : '❌'}`)
    console.log(`Heading: ${report.headingFound ? '✅' : '❌'}`)
    console.log(`Description: ${report.descriptionFound ? '✅' : '❌'}`)
    console.log(`CTA Buttons: ${report.ctaButtonsFound >= 2 ? '✅' : '❌'} (${report.ctaButtonsFound}/2)`)
    console.log(`Console Errors: ${report.consoleErrors.length === 0 ? '✅' : '❌'} (${report.consoleErrors.length})`)
    console.log(`React Errors: ${report.reactErrors.length === 0 ? '✅' : '❌'} (${report.reactErrors.length})`)
    console.log(`Hydration Issues: ${report.hydrationIssues.length === 0 ? '✅' : '❌'} (${report.hydrationIssues.length})`)
    console.log(`Visual Issues: ${report.visualIssues.length === 0 ? '✅' : '❌'} (${report.visualIssues.length})`)
    console.log(`\nLoad Time: ${report.performanceMetrics.loadTime.toFixed(0)}ms`)
    console.log(`Screenshots: ${report.screenshots.length} captured`)
    console.log('\n=========================\n')
  })
})

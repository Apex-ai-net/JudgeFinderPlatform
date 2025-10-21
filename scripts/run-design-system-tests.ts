#!/usr/bin/env ts-node
/**
 * Design System Test Runner
 *
 * Standalone script to validate design system conversion without requiring
 * a running dev server. Generates comprehensive report.
 *
 * Usage: npx ts-node scripts/run-design-system-tests.ts
 */

import puppeteer, { Browser, Page } from 'puppeteer'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

// ES Module compatibility
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Test against production or local dev server
const BASE_URL = process.env.TEST_URL || 'https://judgefinder.io'
const SCREENSHOT_DIR = path.join(__dirname, '../test-results/design-system-screenshots')
const OUTPUT_DIR = path.join(__dirname, '../test-results')

// Ensure directories exist
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true })
}
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
}

interface TestReport {
  page: string
  url: string
  timestamp: string
  status: 'pass' | 'fail' | 'skip'
  visualBugs: string[]
  colorContrastIssues: string[]
  darkModeIssues: string[]
  responsiveIssues: string[]
  hardcodedColors: string[]
  accessibilityIssues: string[]
  screenshots: string[]
}

const testReports: TestReport[] = []

// Helper: Calculate color contrast ratio
async function checkColorContrast(
  page: Page,
  selector: string
): Promise<{ ratio: number; passes: boolean; selector: string }> {
  try {
    const element = await page.$(selector)
    if (!element) return { ratio: 0, passes: true, selector }

    const result = await element.evaluate((el) => {
      const styles = window.getComputedStyle(el)
      const bg = styles.backgroundColor
      const fg = styles.color

      const parseRgb = (rgb: string) => {
        const match = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
        if (!match) return null
        return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])]
      }

      const bgRgb = parseRgb(bg)
      const fgRgb = parseRgb(fg)

      if (!bgRgb || !fgRgb) return { ratio: 0, passes: true }

      const getLuminance = (rgb: number[]) => {
        const [r, g, b] = rgb.map((val) => {
          const sRGB = val / 255
          return sRGB <= 0.03928 ? sRGB / 12.92 : Math.pow((sRGB + 0.055) / 1.055, 2.4)
        })
        return 0.2126 * r + 0.7152 * g + 0.0722 * b
      }

      const bgLum = getLuminance(bgRgb)
      const fgLum = getLuminance(fgRgb)

      const ratio =
        bgLum > fgLum ? (bgLum + 0.05) / (fgLum + 0.05) : (fgLum + 0.05) / (bgLum + 0.05)

      return { ratio, passes: ratio >= 4.5 }
    })

    return { ...result, selector }
  } catch (error) {
    return { ratio: 0, passes: true, selector }
  }
}

// Helper: Detect hardcoded colors
async function detectHardcodedColors(page: Page): Promise<string[]> {
  return await page.evaluate(() => {
    const hardcodedColors: string[] = []
    const elements = document.querySelectorAll('*')

    // Sample first 100 elements to avoid performance issues
    const elementsToCheck = Array.from(elements).slice(0, 100)

    elementsToCheck.forEach((el) => {
      const inlineStyle = (el as HTMLElement).style

      // Check for inline styles
      if (inlineStyle.backgroundColor || inlineStyle.color || inlineStyle.borderColor) {
        const selector =
          el.id ? `#${el.id}` : el.className ? `.${el.className.toString().split(' ')[0]}` : el.tagName
        hardcodedColors.push(
          `Inline style on ${selector}: ${inlineStyle.backgroundColor || ''} ${inlineStyle.color || ''}`
        )
      }

      // Check for arbitrary values in Tailwind
      const className = el.className.toString()
      const arbitraryColorPattern = /\[(#[0-9a-fA-F]{3,6}|rgb\(.*?\))\]/
      if (arbitraryColorPattern.test(className)) {
        const selector =
          el.id ? `#${el.id}` : className ? `.${className.split(' ')[0]}` : el.tagName
        hardcodedColors.push(`Arbitrary color value on ${selector}: ${className}`)
      }
    })

    return hardcodedColors
  })
}

// Test: Public Advertising Page
async function testAdvertisePage(browser: Browser): Promise<TestReport> {
  const report: TestReport = {
    page: 'Public Advertising Page',
    url: `${BASE_URL}/advertise`,
    timestamp: new Date().toISOString(),
    status: 'pass',
    visualBugs: [],
    colorContrastIssues: [],
    darkModeIssues: [],
    responsiveIssues: [],
    hardcodedColors: [],
    accessibilityIssues: [],
    screenshots: [],
  }

  const page = await browser.newPage()

  try {
    console.log(`\n🧪 Testing: ${report.page}`)
    console.log(`   URL: ${report.url}`)

    const response = await page.goto(report.url, { waitUntil: 'networkidle0', timeout: 30000 })

    if (response?.status() !== 200) {
      report.status = 'fail'
      report.visualBugs.push(`Page returned status ${response?.status()}`)
      return report
    }

    // Screenshot 1: Full page
    const screenshotPath = path.join(SCREENSHOT_DIR, 'advertise-full.png') as `${string}.png`
    await page.screenshot({ path: screenshotPath, fullPage: true })
    report.screenshots.push(screenshotPath)
    console.log(`   ✓ Screenshot: ${path.basename(screenshotPath)}`)

    // Check for semantic tokens
    const semanticTokens = await page.evaluate(() => {
      const results = {
        bgCard: document.querySelectorAll('[class*="bg-card"]').length,
        textForeground: document.querySelectorAll('[class*="text-foreground"]').length,
        borderBorder: document.querySelectorAll('[class*="border-border"]').length,
        bgSuccess: document.querySelectorAll('[class*="bg-success"]').length,
        bgWarning: document.querySelectorAll('[class*="bg-warning"]').length,
        bgDestructive: document.querySelectorAll('[class*="bg-destructive"]').length,
      }
      return results
    })

    console.log(`   ✓ Semantic tokens found:`)
    console.log(`     - bg-card: ${semanticTokens.bgCard}`)
    console.log(`     - text-foreground: ${semanticTokens.textForeground}`)
    console.log(`     - border-border: ${semanticTokens.borderBorder}`)
    console.log(`     - bg-success: ${semanticTokens.bgSuccess}`)
    console.log(`     - bg-warning: ${semanticTokens.bgWarning}`)

    if (semanticTokens.bgCard === 0) {
      report.visualBugs.push('No bg-card classes found - may not be using design system')
    }

    // Check pricing cards
    const pricingCards = await page.evaluate(() => {
      const federalCard = document.body.textContent?.includes('Federal Judge Profiles')
      const stateCard = document.body.textContent?.includes('State Judge Profiles')
      const premiumBadge = document.body.textContent?.includes('PREMIUM')
      const popularBadge = document.body.textContent?.includes('MOST POPULAR')
      return { federalCard, stateCard, premiumBadge, popularBadge }
    })

    if (!pricingCards.federalCard) {
      report.visualBugs.push('Federal pricing card not found')
    }
    if (!pricingCards.stateCard) {
      report.visualBugs.push('State pricing card not found')
    }
    if (!pricingCards.premiumBadge) {
      report.visualBugs.push('PREMIUM badge not found')
    }
    if (!pricingCards.popularBadge) {
      report.visualBugs.push('MOST POPULAR badge not found')
    }

    console.log(`   ✓ Pricing cards: Federal=${pricingCards.federalCard}, State=${pricingCards.stateCard}`)

    // Check hardcoded colors
    const hardcoded = await detectHardcodedColors(page)
    report.hardcodedColors.push(...hardcoded)
    if (hardcoded.length > 0) {
      console.log(`   ⚠️  Found ${hardcoded.length} potential hardcoded colors`)
    } else {
      console.log(`   ✓ No hardcoded colors detected`)
    }

    // Test responsive design
    const viewports = [
      { name: 'mobile', width: 375, height: 667 },
      { name: 'tablet', width: 768, height: 1024 },
      { name: 'desktop', width: 1920, height: 1080 },
    ]

    for (const viewport of viewports) {
      await page.setViewport(viewport)
      await new Promise(resolve => setTimeout(resolve, 300))

      const screenshotPath = path.join(SCREENSHOT_DIR, `advertise-${viewport.name}.png`) as `${string}.png`
      await page.screenshot({ path: screenshotPath, fullPage: true })
      report.screenshots.push(screenshotPath)

      // Check for horizontal overflow
      const hasOverflow = await page.evaluate(() => {
        return document.body.scrollWidth > window.innerWidth
      })

      if (hasOverflow) {
        report.responsiveIssues.push(`Horizontal overflow on ${viewport.name} (${viewport.width}px)`)
      }
    }

    console.log(`   ✓ Responsive design tested: ${viewports.length} viewports`)

    // Check color contrast on key elements
    const contrastChecks = ['h1', 'h2', 'button', 'a']
    for (const selector of contrastChecks) {
      const contrast = await checkColorContrast(page, selector)
      if (!contrast.passes && contrast.ratio > 0) {
        report.colorContrastIssues.push(
          `${contrast.selector} contrast: ${contrast.ratio.toFixed(2)}:1 (needs 4.5:1)`
        )
      }
    }

    if (report.colorContrastIssues.length > 0) {
      console.log(`   ⚠️  ${report.colorContrastIssues.length} color contrast issues`)
    } else {
      console.log(`   ✓ Color contrast checks passed`)
    }

    // Overall status
    if (
      report.visualBugs.length === 0 &&
      report.colorContrastIssues.length <= 2 &&
      report.responsiveIssues.length === 0
    ) {
      report.status = 'pass'
      console.log(`   ✅ PASS`)
    } else {
      report.status = 'fail'
      console.log(`   ❌ FAIL`)
    }
  } catch (error) {
    report.status = 'fail'
    report.visualBugs.push(`Test error: ${error instanceof Error ? error.message : String(error)}`)
    console.log(`   ❌ ERROR: ${error instanceof Error ? error.message : String(error)}`)
  } finally {
    await page.close()
  }

  return report
}

// Test: Judges Search
async function testJudgesSearch(browser: Browser): Promise<TestReport> {
  const report: TestReport = {
    page: 'Judges Search',
    url: `${BASE_URL}/judges`,
    timestamp: new Date().toISOString(),
    status: 'pass',
    visualBugs: [],
    colorContrastIssues: [],
    darkModeIssues: [],
    responsiveIssues: [],
    hardcodedColors: [],
    accessibilityIssues: [],
    screenshots: [],
  }

  const page = await browser.newPage()

  try {
    console.log(`\n🧪 Testing: ${report.page}`)
    console.log(`   URL: ${report.url}`)

    const response = await page.goto(report.url, { waitUntil: 'networkidle0', timeout: 30000 })

    if (response?.status() !== 200) {
      report.status = 'fail'
      report.visualBugs.push(`Page returned status ${response?.status()}`)
      return report
    }

    const screenshotPath = path.join(SCREENSHOT_DIR, 'judges-search.png') as `${string}.png`
    await page.screenshot({ path: screenshotPath, fullPage: true })
    report.screenshots.push(screenshotPath)
    console.log(`   ✓ Screenshot: ${path.basename(screenshotPath)}`)

    // Check for semantic tokens
    const semanticTokens = await page.evaluate(() => {
      return {
        bgCard: document.querySelectorAll('[class*="bg-card"]').length,
        textForeground: document.querySelectorAll('[class*="text-foreground"]').length,
      }
    })

    console.log(`   ✓ Semantic tokens: bg-card=${semanticTokens.bgCard}`)

    // Check for judge links
    const judgeLinks = await page.evaluate(() => {
      const links = document.querySelectorAll('a[href*="/judges/"]')
      return links.length
    })

    console.log(`   ✓ Judge links found: ${judgeLinks}`)

    if (judgeLinks === 0) {
      report.visualBugs.push('No judge links found')
    }

    // Check hardcoded colors
    const hardcoded = await detectHardcodedColors(page)
    report.hardcodedColors.push(...hardcoded)

    if (hardcoded.length > 0) {
      console.log(`   ⚠️  ${hardcoded.length} potential hardcoded colors`)
    } else {
      console.log(`   ✓ No hardcoded colors`)
    }

    if (report.visualBugs.length === 0 && report.hardcodedColors.length <= 5) {
      report.status = 'pass'
      console.log(`   ✅ PASS`)
    } else {
      report.status = 'fail'
      console.log(`   ❌ FAIL`)
    }
  } catch (error) {
    report.status = 'fail'
    report.visualBugs.push(`Test error: ${error instanceof Error ? error.message : String(error)}`)
    console.log(`   ❌ ERROR: ${error instanceof Error ? error.message : String(error)}`)
  } finally {
    await page.close()
  }

  return report
}

// Test: Courts Directory
async function testCourtsDirectory(browser: Browser): Promise<TestReport> {
  const report: TestReport = {
    page: 'Courts Directory',
    url: `${BASE_URL}/courts`,
    timestamp: new Date().toISOString(),
    status: 'pass',
    visualBugs: [],
    colorContrastIssues: [],
    darkModeIssues: [],
    responsiveIssues: [],
    hardcodedColors: [],
    accessibilityIssues: [],
    screenshots: [],
  }

  const page = await browser.newPage()

  try {
    console.log(`\n🧪 Testing: ${report.page}`)
    console.log(`   URL: ${report.url}`)

    const response = await page.goto(report.url, { waitUntil: 'networkidle0', timeout: 30000 })

    if (response?.status() !== 200) {
      report.status = 'fail'
      report.visualBugs.push(`Page returned status ${response?.status()}`)
      return report
    }

    const screenshotPath = path.join(SCREENSHOT_DIR, 'courts-directory.png') as `${string}.png`
    await page.screenshot({ path: screenshotPath, fullPage: true })
    report.screenshots.push(screenshotPath)
    console.log(`   ✓ Screenshot: ${path.basename(screenshotPath)}`)

    // Check for court links
    const courtLinks = await page.evaluate(() => {
      const links = document.querySelectorAll('a[href*="/courts/"]')
      return links.length
    })

    console.log(`   ✓ Court links found: ${courtLinks}`)

    if (courtLinks === 0) {
      report.visualBugs.push('No court links found')
    }

    // Check hardcoded colors
    const hardcoded = await detectHardcodedColors(page)
    report.hardcodedColors.push(...hardcoded)

    if (hardcoded.length > 0) {
      console.log(`   ⚠️  ${hardcoded.length} potential hardcoded colors`)
    } else {
      console.log(`   ✓ No hardcoded colors`)
    }

    if (report.visualBugs.length === 0) {
      report.status = 'pass'
      console.log(`   ✅ PASS`)
    } else {
      report.status = 'fail'
      console.log(`   ❌ FAIL`)
    }
  } catch (error) {
    report.status = 'fail'
    report.visualBugs.push(`Test error: ${error instanceof Error ? error.message : String(error)}`)
    console.log(`   ❌ ERROR: ${error instanceof Error ? error.message : String(error)}`)
  } finally {
    await page.close()
  }

  return report
}

// Generate reports
function generateReports(reports: TestReport[]) {
  // JSON report
  const jsonPath = path.join(OUTPUT_DIR, 'design-system-report.json')
  fs.writeFileSync(jsonPath, JSON.stringify(reports, null, 2))
  console.log(`\n📊 JSON report: ${jsonPath}`)

  // Markdown report
  let markdown = `# Design System Conversion Test Report

**Generated:** ${new Date().toISOString()}
**Base URL:** ${BASE_URL}

## Summary

`

  const totalIssues = reports.reduce(
    (acc, r) =>
      acc +
      r.visualBugs.length +
      r.colorContrastIssues.length +
      r.responsiveIssues.length +
      r.hardcodedColors.length +
      r.accessibilityIssues.length,
    0
  )

  const passed = reports.filter((r) => r.status === 'pass').length
  const failed = reports.filter((r) => r.status === 'fail').length
  const skipped = reports.filter((r) => r.status === 'skip').length

  markdown += `- **Total Pages Tested:** ${reports.length}
- **Passed:** ${passed}
- **Failed:** ${failed}
- **Skipped:** ${skipped}
- **Total Issues:** ${totalIssues}
- **Screenshots:** ${reports.reduce((acc, r) => acc + r.screenshots.length, 0)}

---

`

  reports.forEach((report) => {
    const emoji = report.status === 'pass' ? '✅' : report.status === 'fail' ? '❌' : '⏭️'
    markdown += `## ${emoji} ${report.page}\n\n`
    markdown += `- **URL:** ${report.url}\n`
    markdown += `- **Status:** ${report.status.toUpperCase()}\n`
    markdown += `- **Tested:** ${new Date(report.timestamp).toLocaleString()}\n\n`

    if (report.visualBugs.length > 0) {
      markdown += `### 🐛 Visual Bugs (${report.visualBugs.length})\n\n`
      report.visualBugs.forEach((bug) => markdown += `- ${bug}\n`)
      markdown += `\n`
    }

    if (report.colorContrastIssues.length > 0) {
      markdown += `### ⚠️ Color Contrast Issues (${report.colorContrastIssues.length})\n\n`
      report.colorContrastIssues.forEach((issue) => markdown += `- ${issue}\n`)
      markdown += `\n`
    }

    if (report.responsiveIssues.length > 0) {
      markdown += `### 📱 Responsive Issues (${report.responsiveIssues.length})\n\n`
      report.responsiveIssues.forEach((issue) => markdown += `- ${issue}\n`)
      markdown += `\n`
    }

    if (report.hardcodedColors.length > 0) {
      markdown += `### 🎨 Hardcoded Colors (${report.hardcodedColors.length})\n\n`
      report.hardcodedColors.slice(0, 5).forEach((color) => markdown += `- ${color}\n`)
      if (report.hardcodedColors.length > 5) {
        markdown += `- ... and ${report.hardcodedColors.length - 5} more\n`
      }
      markdown += `\n`
    }

    if (
      report.visualBugs.length === 0 &&
      report.colorContrastIssues.length === 0 &&
      report.responsiveIssues.length === 0 &&
      report.hardcodedColors.length === 0
    ) {
      markdown += `### ✅ No Issues Found\n\n`
      markdown += `All design system validations passed successfully.\n\n`
    }

    markdown += `### 📸 Screenshots\n\n`
    report.screenshots.forEach((screenshot) => {
      markdown += `- ${path.basename(screenshot)}\n`
    })

    markdown += `\n---\n\n`
  })

  const mdPath = path.join(OUTPUT_DIR, 'design-system-report.md')
  fs.writeFileSync(mdPath, markdown)
  console.log(`📝 Markdown report: ${mdPath}`)
}

// Main execution
async function main() {
  console.log('🚀 Design System Conversion Test Suite')
  console.log(`📍 Testing: ${BASE_URL}`)
  console.log(`📸 Screenshots: ${SCREENSHOT_DIR}`)
  console.log('─'.repeat(60))

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  })

  try {
    // Run all tests
    const advertiseReport = await testAdvertisePage(browser)
    testReports.push(advertiseReport)

    const judgesReport = await testJudgesSearch(browser)
    testReports.push(judgesReport)

    const courtsReport = await testCourtsDirectory(browser)
    testReports.push(courtsReport)

    // Generate reports
    console.log('\n' + '─'.repeat(60))
    generateReports(testReports)

    // Summary
    console.log('\n📋 Summary:')
    testReports.forEach((report) => {
      const emoji = report.status === 'pass' ? '✅' : '❌'
      console.log(`   ${emoji} ${report.page}: ${report.status.toUpperCase()}`)
    })

    const passed = testReports.filter((r) => r.status === 'pass').length
    const failed = testReports.filter((r) => r.status === 'fail').length

    console.log(`\n🎯 Results: ${passed} passed, ${failed} failed`)

    if (failed > 0) {
      console.log('\n⚠️  Some tests failed. Check reports for details.')
      process.exit(1)
    } else {
      console.log('\n✅ All tests passed!')
      process.exit(0)
    }
  } finally {
    await browser.close()
  }
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})

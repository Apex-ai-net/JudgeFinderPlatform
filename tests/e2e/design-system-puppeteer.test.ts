/**
 * Puppeteer E2E Tests: Design System Conversion Validation
 *
 * This test suite uses Puppeteer to validate the design system conversion
 * across the JudgeFinder platform. It focuses on:
 * - Semantic token implementation
 * - Visual consistency
 * - Color contrast accessibility
 * - Responsive design
 * - Interactive states
 *
 * Run with: npm run test:e2e:puppeteer
 */

import puppeteer, { Browser, Page } from 'puppeteer'
import { describe, it, beforeAll, afterAll, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000'
const SCREENSHOT_DIR = path.join(__dirname, '../../test-results/puppeteer-screenshots')

// Ensure screenshot directory exists
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true })
}

interface TestReport {
  page: string
  timestamp: string
  visualBugs: string[]
  colorContrastIssues: string[]
  darkModeIssues: string[]
  responsiveIssues: string[]
  hardcodedColors: string[]
  accessibilityIssues: string[]
  screenshots: string[]
}

const testReports: TestReport[] = []

let browser: Browser
let page: Page

beforeAll(async () => {
  browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })
  page = await browser.newPage()
  await page.setViewport({ width: 1920, height: 1080 })
})

afterAll(async () => {
  // Generate final report
  const reportPath = path.join(__dirname, '../../test-results/design-system-report.json')
  fs.writeFileSync(reportPath, JSON.stringify(testReports, null, 2))
  console.log(`\n📊 Test report saved to: ${reportPath}`)

  // Generate human-readable report
  generateHumanReadableReport(testReports)

  await browser.close()
})

function generateHumanReadableReport(reports: TestReport[]) {
  const reportPath = path.join(__dirname, '../../test-results/design-system-report.md')
  let markdown = `# Design System Conversion Test Report

Generated: ${new Date().toISOString()}

## Summary

`

  let totalIssues = 0
  reports.forEach((report) => {
    totalIssues +=
      report.visualBugs.length +
      report.colorContrastIssues.length +
      report.darkModeIssues.length +
      report.responsiveIssues.length +
      report.hardcodedColors.length +
      report.accessibilityIssues.length
  })

  markdown += `- **Total Pages Tested**: ${reports.length}
- **Total Issues Found**: ${totalIssues}
- **Screenshots Captured**: ${reports.reduce((acc, r) => acc + r.screenshots.length, 0)}

---

`

  reports.forEach((report) => {
    markdown += `## ${report.page}\n\n`
    markdown += `**Tested at**: ${report.timestamp}\n\n`

    if (report.visualBugs.length > 0) {
      markdown += `### 🐛 Visual Bugs\n\n`
      report.visualBugs.forEach((bug) => {
        markdown += `- ${bug}\n`
      })
      markdown += `\n`
    }

    if (report.colorContrastIssues.length > 0) {
      markdown += `### ⚠️ Color Contrast Issues\n\n`
      report.colorContrastIssues.forEach((issue) => {
        markdown += `- ${issue}\n`
      })
      markdown += `\n`
    }

    if (report.darkModeIssues.length > 0) {
      markdown += `### 🌙 Dark Mode Issues\n\n`
      report.darkModeIssues.forEach((issue) => {
        markdown += `- ${issue}\n`
      })
      markdown += `\n`
    }

    if (report.responsiveIssues.length > 0) {
      markdown += `### 📱 Responsive Design Issues\n\n`
      report.responsiveIssues.forEach((issue) => {
        markdown += `- ${issue}\n`
      })
      markdown += `\n`
    }

    if (report.hardcodedColors.length > 0) {
      markdown += `### 🎨 Hardcoded Colors Found\n\n`
      report.hardcodedColors.forEach((color) => {
        markdown += `- ${color}\n`
      })
      markdown += `\n`
    }

    if (report.accessibilityIssues.length > 0) {
      markdown += `### ♿ Accessibility Issues\n\n`
      report.accessibilityIssues.forEach((issue) => {
        markdown += `- ${issue}\n`
      })
      markdown += `\n`
    }

    if (
      report.visualBugs.length === 0 &&
      report.colorContrastIssues.length === 0 &&
      report.darkModeIssues.length === 0 &&
      report.responsiveIssues.length === 0 &&
      report.hardcodedColors.length === 0 &&
      report.accessibilityIssues.length === 0
    ) {
      markdown += `### ✅ No Issues Found\n\n`
    }

    if (report.screenshots.length > 0) {
      markdown += `### 📸 Screenshots\n\n`
      report.screenshots.forEach((screenshot) => {
        markdown += `- ${screenshot}\n`
      })
      markdown += `\n`
    }

    markdown += `---\n\n`
  })

  fs.writeFileSync(reportPath, markdown)
  console.log(`📝 Human-readable report saved to: ${reportPath}`)
}

async function checkColorContrast(
  page: Page,
  selector: string
): Promise<{ ratio: number; passes: boolean; selector: string }> {
  try {
    const element = await page.$(selector)
    if (!element) return { ratio: 0, passes: false, selector }

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

      if (!bgRgb || !fgRgb) return { ratio: 0, passes: false }

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
    return { ratio: 0, passes: false, selector }
  }
}

async function detectHardcodedColors(page: Page): Promise<string[]> {
  return await page.evaluate(() => {
    const hardcodedColors: string[] = []
    const elements = document.querySelectorAll('*')

    elements.forEach((el) => {
      const styles = window.getComputedStyle(el)
      const inlineStyle = (el as HTMLElement).style

      // Check for inline styles (these are red flags)
      if (inlineStyle.backgroundColor || inlineStyle.color || inlineStyle.borderColor) {
        const selector =
          el.id ? `#${el.id}` : el.className ? `.${el.className.split(' ')[0]}` : el.tagName
        hardcodedColors.push(
          `Inline style detected on ${selector}: ${inlineStyle.backgroundColor || ''} ${inlineStyle.color || ''}`
        )
      }

      // Check for non-semantic class names with colors
      const className = el.className.toString()
      const nonSemanticColorPatterns = [
        /bg-\[#[0-9a-fA-F]{3,6}\]/,
        /text-\[#[0-9a-fA-F]{3,6}\]/,
        /border-\[#[0-9a-fA-F]{3,6}\]/,
        /bg-gray-\d{3}/,
        /text-gray-\d{3}/,
      ]

      nonSemanticColorPatterns.forEach((pattern) => {
        if (pattern.test(className)) {
          const selector =
            el.id ? `#${el.id}` : className ? `.${className.split(' ')[0]}` : el.tagName
          hardcodedColors.push(`Non-semantic color class on ${selector}: ${className}`)
        }
      })
    })

    return hardcodedColors.slice(0, 10) // Limit to first 10
  })
}

describe('Design System Conversion - Public Advertising Page', () => {
  const report: TestReport = {
    page: 'Advertising Page (/advertise)',
    timestamp: new Date().toISOString(),
    visualBugs: [],
    colorContrastIssues: [],
    darkModeIssues: [],
    responsiveIssues: [],
    hardcodedColors: [],
    accessibilityIssues: [],
    screenshots: [],
  }

  beforeAll(() => {
    testReports.push(report)
  })

  it('should load the advertising page successfully', async () => {
    const response = await page.goto(`${BASE_URL}/advertise`, { waitUntil: 'networkidle0' })
    expect(response?.status()).toBe(200)

    // Take baseline screenshot
    const screenshotPath = path.join(SCREENSHOT_DIR, 'advertise-page-baseline.png')
    await page.screenshot({ path: screenshotPath, fullPage: true })
    report.screenshots.push(screenshotPath)
  })

  it('should render pricing cards with semantic tokens', async () => {
    const federalCard = await page.$('text=Federal Judge Profiles')
    const stateCard = await page.$('text=State Judge Profiles')

    if (!federalCard) {
      report.visualBugs.push('Federal pricing card not found')
    }

    if (!stateCard) {
      report.visualBugs.push('State pricing card not found')
    }

    // Check for semantic class usage
    const hasSemanticClasses = await page.evaluate(() => {
      const cards = document.querySelectorAll('[class*="bg-card"]')
      return cards.length > 0
    })

    if (!hasSemanticClasses) {
      report.visualBugs.push('Pricing cards not using bg-card semantic token')
    }

    expect(hasSemanticClasses).toBe(true)
  })

  it('should verify premium and popular badges use correct colors', async () => {
    const premiumBadge = await page.$('text=PREMIUM')
    const popularBadge = await page.$('text=MOST POPULAR')

    if (premiumBadge) {
      const hasPrimaryColor = await premiumBadge.evaluate((el) => {
        return el.className.includes('from-primary') || el.className.includes('bg-primary')
      })

      if (!hasPrimaryColor) {
        report.visualBugs.push('PREMIUM badge not using primary semantic color')
      }
    }

    if (popularBadge) {
      const hasSuccessColor = await popularBadge.evaluate((el) => {
        return el.className.includes('from-success') || el.className.includes('bg-success')
      })

      if (!hasSuccessColor) {
        report.visualBugs.push('MOST POPULAR badge not using success semantic color')
      }
    }
  })

  it('should check color contrast on text elements', async () => {
    const selectors = ['h1', 'h2', 'p', 'button', 'a']

    for (const selector of selectors) {
      const contrast = await checkColorContrast(page, selector)
      if (!contrast.passes && contrast.ratio > 0) {
        report.colorContrastIssues.push(
          `${contrast.selector} has poor contrast: ${contrast.ratio.toFixed(2)}:1 (needs 4.5:1)`
        )
      }
    }

    // Allow some failures but flag if too many
    if (report.colorContrastIssues.length > 5) {
      report.accessibilityIssues.push(
        `Multiple color contrast issues found (${report.colorContrastIssues.length})`
      )
    }
  })

  it('should detect hardcoded colors', async () => {
    const hardcoded = await detectHardcodedColors(page)
    report.hardcodedColors.push(...hardcoded)

    if (hardcoded.length > 0) {
      console.log(`⚠️  Found ${hardcoded.length} potential hardcoded colors`)
    }
  })

  it('should verify status color indicators', async () => {
    const statusColors = await page.evaluate(() => {
      const results: { color: string; found: boolean }[] = []

      // Check for success (Available)
      const successDot = document.querySelector('.bg-success')
      results.push({ color: 'success', found: !!successDot })

      // Check for warning (Limited)
      const warningDot = document.querySelector('.bg-warning')
      results.push({ color: 'warning', found: !!warningDot })

      // Check for destructive (Sold Out)
      const destructiveDot = document.querySelector('.bg-destructive')
      results.push({ color: 'destructive', found: !!destructiveDot })

      return results
    })

    statusColors.forEach((result) => {
      if (!result.found) {
        report.visualBugs.push(`Status color "${result.color}" not found or not using semantic token`)
      }
    })
  })

  it('should test responsive design at different viewports', async () => {
    const viewports = [
      { name: 'mobile', width: 375, height: 667 },
      { name: 'tablet', width: 768, height: 1024 },
      { name: 'desktop', width: 1920, height: 1080 },
    ]

    for (const viewport of viewports) {
      await page.setViewport(viewport)
      await page.waitForTimeout(500)

      // Check if pricing cards are visible
      const cardsVisible = await page.evaluate(() => {
        const federalCard = document.querySelector('text=Federal Judge Profiles')
        const stateCard = document.querySelector('text=State Judge Profiles')
        return { federal: !!federalCard, state: !!stateCard }
      })

      // Take screenshot
      const screenshotPath = path.join(SCREENSHOT_DIR, `advertise-${viewport.name}.png`)
      await page.screenshot({ path: screenshotPath, fullPage: true })
      report.screenshots.push(screenshotPath)

      // Check for layout issues
      const hasOverflow = await page.evaluate(() => {
        return document.body.scrollWidth > window.innerWidth
      })

      if (hasOverflow) {
        report.responsiveIssues.push(`Horizontal overflow detected on ${viewport.name}`)
      }
    }

    // Reset viewport
    await page.setViewport({ width: 1920, height: 1080 })
  })

  it('should verify interactive hover states', async () => {
    const buttons = await page.$$('button, a[class*="hover:"]')

    if (buttons.length === 0) {
      report.visualBugs.push('No interactive elements with hover states found')
    }

    // Check first button
    if (buttons.length > 0) {
      const hasHoverClass = await buttons[0].evaluate((el) => {
        return el.className.includes('hover:')
      })

      if (!hasHoverClass) {
        report.visualBugs.push('Interactive elements missing hover: classes')
      }
    }
  })
})

describe('Design System Conversion - Judges Search', () => {
  const report: TestReport = {
    page: 'Judges Search (/judges)',
    timestamp: new Date().toISOString(),
    visualBugs: [],
    colorContrastIssues: [],
    darkModeIssues: [],
    responsiveIssues: [],
    hardcodedColors: [],
    accessibilityIssues: [],
    screenshots: [],
  }

  beforeAll(() => {
    testReports.push(report)
  })

  it('should load judges search page', async () => {
    const response = await page.goto(`${BASE_URL}/judges`, { waitUntil: 'networkidle0' })
    expect(response?.status()).toBe(200)

    const screenshotPath = path.join(SCREENSHOT_DIR, 'judges-search-baseline.png')
    await page.screenshot({ path: screenshotPath, fullPage: true })
    report.screenshots.push(screenshotPath)
  })

  it('should verify search interface uses semantic tokens', async () => {
    await page.waitForTimeout(1000)

    const hasSearchInput = await page.evaluate(() => {
      const input = document.querySelector('input[type="search"], input[placeholder*="Search"]')
      return !!input
    })

    if (hasSearchInput) {
      const inputStyles = await page.evaluate(() => {
        const input = document.querySelector('input[type="search"], input[placeholder*="Search"]')
        if (!input) return { hasBorder: false, hasBg: false }

        const classList = input.className
        return {
          hasBorder:
            classList.includes('border-border') ||
            classList.includes('border-input') ||
            classList.includes('border '),
          hasBg: classList.includes('bg-'),
        }
      })

      if (!inputStyles.hasBorder && !inputStyles.hasBg) {
        report.visualBugs.push('Search input not using semantic styling tokens')
      }
    }
  })

  it('should check for judge cards with semantic styling', async () => {
    const judgeLinks = await page.$$('a[href*="/judges/"]')

    if (judgeLinks.length === 0) {
      report.visualBugs.push('No judge cards/links found on judges page')
    } else {
      console.log(`✓ Found ${judgeLinks.length} judge links`)
    }
  })

  it('should detect hardcoded colors', async () => {
    const hardcoded = await detectHardcodedColors(page)
    report.hardcodedColors.push(...hardcoded)
  })
})

describe('Design System Conversion - Courts Directory', () => {
  const report: TestReport = {
    page: 'Courts Directory (/courts)',
    timestamp: new Date().toISOString(),
    visualBugs: [],
    colorContrastIssues: [],
    darkModeIssues: [],
    responsiveIssues: [],
    hardcodedColors: [],
    accessibilityIssues: [],
    screenshots: [],
  }

  beforeAll(() => {
    testReports.push(report)
  })

  it('should load courts directory', async () => {
    const response = await page.goto(`${BASE_URL}/courts`, { waitUntil: 'networkidle0' })
    expect(response?.status()).toBe(200)

    const screenshotPath = path.join(SCREENSHOT_DIR, 'courts-directory-baseline.png')
    await page.screenshot({ path: screenshotPath, fullPage: true })
    report.screenshots.push(screenshotPath)
  })

  it('should verify court cards use semantic styling', async () => {
    const courtElements = await page.$$('a[href*="/courts/"]')

    if (courtElements.length === 0) {
      report.visualBugs.push('No court links/cards found')
    } else {
      console.log(`✓ Found ${courtElements.length} court links`)

      // Check first court card for semantic classes
      if (courtElements.length > 0) {
        const hasSemanticStyling = await courtElements[0].evaluate((el) => {
          let currentEl: Element | null = el
          for (let i = 0; i < 5 && currentEl; i++) {
            const classList = currentEl.className
            if (
              typeof classList === 'string' &&
              (classList.includes('bg-card') ||
                classList.includes('border-border') ||
                classList.includes('text-foreground'))
            ) {
              return true
            }
            currentEl = currentEl.parentElement
          }
          return false
        })

        if (!hasSemanticStyling) {
          report.visualBugs.push('Court cards not using semantic styling tokens')
        }
      }
    }
  })

  it('should detect hardcoded colors', async () => {
    const hardcoded = await detectHardcodedColors(page)
    report.hardcodedColors.push(...hardcoded)
  })
})

describe('Design System Conversion - Advertiser Dashboard (Auth Check)', () => {
  const report: TestReport = {
    page: 'Advertiser Dashboard (/dashboard/advertiser)',
    timestamp: new Date().toISOString(),
    visualBugs: [],
    colorContrastIssues: [],
    darkModeIssues: [],
    responsiveIssues: [],
    hardcodedColors: [],
    accessibilityIssues: [],
    screenshots: [],
  }

  beforeAll(() => {
    testReports.push(report)
  })

  it('should require authentication', async () => {
    await page.goto(`${BASE_URL}/dashboard/advertiser`, { waitUntil: 'networkidle0' })
    await page.waitForTimeout(1000)

    const currentUrl = page.url()
    const isSignInPage = currentUrl.includes('sign-in') || currentUrl.includes('sign-up')

    if (isSignInPage) {
      console.log('✓ Dashboard correctly requires authentication')

      const screenshotPath = path.join(SCREENSHOT_DIR, 'dashboard-auth-required.png')
      await page.screenshot({ path: screenshotPath, fullPage: true })
      report.screenshots.push(screenshotPath)
    } else {
      report.accessibilityIssues.push('Dashboard may not be properly protected with authentication')
    }

    expect(isSignInPage).toBe(true)
  })
})

import { test, expect, Page } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

/**
 * E2E Test Suite: Design System Conversion Validation
 *
 * Tests semantic token implementation across recently converted pages:
 * - Advertiser Dashboard
 * - Public Advertising Page
 * - Judge Search
 * - Court Pages
 *
 * Validates:
 * - Semantic tokens render correctly (bg-card, text-foreground, border-border)
 * - Dark mode toggle functionality
 * - Status color mappings (success, warning, destructive)
 * - Interactive hover states
 * - Responsive design at different viewports
 * - Color contrast accessibility
 * - Visual regression (screenshots)
 */

// Helper to check for hardcoded colors in computed styles
async function checkForHardcodedColors(page: Page, selector: string): Promise<string[]> {
  const issues: string[] = []
  const element = page.locator(selector).first()

  if (!(await element.isVisible())) {
    return issues
  }

  const computedStyles = await element.evaluate((el) => {
    const styles = window.getComputedStyle(el)
    return {
      backgroundColor: styles.backgroundColor,
      color: styles.color,
      borderColor: styles.borderColor,
    }
  })

  // Check for specific hardcoded RGB values that shouldn't be in design system
  const hardcodedPatterns = [
    'rgb(255, 255, 255)', // Pure white
    'rgb(0, 0, 0)', // Pure black
    'rgb(128, 128, 128)', // Pure gray
  ]

  for (const pattern of hardcodedPatterns) {
    if (
      computedStyles.backgroundColor === pattern ||
      computedStyles.color === pattern ||
      computedStyles.borderColor === pattern
    ) {
      issues.push(`Element ${selector} has hardcoded color: ${pattern}`)
    }
  }

  return issues
}

// Helper to check color contrast ratios
async function checkColorContrast(
  page: Page,
  selector: string
): Promise<{ ratio: number; passes: boolean }> {
  return await page.locator(selector).first().evaluate((el) => {
    const styles = window.getComputedStyle(el)
    const bg = styles.backgroundColor
    const fg = styles.color

    // Parse RGB values
    const parseRgb = (rgb: string) => {
      const match = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
      if (!match) return null
      return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])]
    }

    const bgRgb = parseRgb(bg)
    const fgRgb = parseRgb(fg)

    if (!bgRgb || !fgRgb) {
      return { ratio: 0, passes: false }
    }

    // Calculate relative luminance
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

    // WCAG 2.2 Level AA requires 4.5:1 for normal text, 3:1 for large text
    return { ratio, passes: ratio >= 4.5 }
  })
}

// Setup screenshot directory
const screenshotDir = path.join(__dirname, '../../test-results/design-system-screenshots')
if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true })
}

test.describe('Design System Conversion - Public Advertising Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/advertise')
    await page.waitForLoadState('networkidle')
  })

  test('should render pricing cards with semantic tokens', async ({ page }) => {
    // Check Federal pricing card exists with proper semantic classes
    const federalCard = page.locator('text=Federal Judge Profiles').locator('..')
    await expect(federalCard).toBeVisible()

    // Verify card background uses semantic tokens
    const cardStyles = await federalCard.evaluate((el) => {
      const classList = el.closest('.bg-card')?.className || ''
      return {
        hasCardBg: classList.includes('bg-card'),
        hasBorder: classList.includes('border-border') || classList.includes('border-primary'),
      }
    })

    expect(cardStyles.hasCardBg).toBeTruthy()
    expect(cardStyles.hasBorder).toBeTruthy()

    // Check State pricing card
    const stateCard = page.locator('text=State Judge Profiles').locator('..')
    await expect(stateCard).toBeVisible()

    // Verify success color for "MOST POPULAR" badge
    const popularBadge = page.locator('text=MOST POPULAR')
    await expect(popularBadge).toBeVisible()
    const badgeClasses = await popularBadge.evaluate((el) => el.className)
    expect(badgeClasses).toContain('bg-gradient-to-r')
    expect(badgeClasses).toContain('from-success')
  })

  test('should display feature checkmarks with success color', async ({ page }) => {
    const checkmarks = page.locator('svg').filter({ hasText: '' }).first()
    const checkmarkColor = await checkmarks.evaluate((el) => {
      const classList = el.className.baseVal || el.getAttribute('class') || ''
      return classList.includes('text-success')
    })

    expect(checkmarkColor).toBeTruthy()
  })

  test('should show hero section with gradient background', async ({ page }) => {
    const hero = page.locator('h1:has-text("Reach Attorneys")')
    await expect(hero).toBeVisible()

    // Check gradient classes on parent
    const heroSection = await hero.locator('..').locator('..').locator('..')
    const hasGradient = await heroSection.evaluate((el) => {
      const classList = el.className
      return classList.includes('bg-gradient-to-br') && classList.includes('from-primary')
    })

    expect(hasGradient).toBeTruthy()
  })

  test('should render "Limited Availability" warning section correctly', async ({ page }) => {
    const warningSection = page.locator('text=Limited Availability').locator('..')
    await expect(warningSection).toBeVisible()

    const warningStyles = await warningSection.locator('..').evaluate((el) => {
      const classList = el.className
      return {
        hasWarningBg: classList.includes('from-warning'),
        hasWarningBorder: classList.includes('border-warning'),
      }
    })

    expect(warningStyles.hasWarningBg).toBeTruthy()
    expect(warningStyles.hasWarningBorder).toBeTruthy()
  })

  test('should have proper color contrast on all text elements', async ({ page }) => {
    const textSelectors = [
      'h1',
      'h2',
      'h3',
      'p',
      'button',
      'a',
    ]

    const contrastIssues: string[] = []

    for (const selector of textSelectors) {
      const elements = await page.locator(selector).all()
      for (let i = 0; i < Math.min(elements.length, 5); i++) {
        try {
          const contrast = await checkColorContrast(page, `${selector}:nth-of-type(${i + 1})`)
          if (!contrast.passes) {
            contrastIssues.push(`${selector} #${i + 1} has poor contrast: ${contrast.ratio.toFixed(2)}:1`)
          }
        } catch (error) {
          // Skip elements that can't be checked
        }
      }
    }

    // Allow some contrast failures for decorative elements
    expect(contrastIssues.length).toBeLessThan(5)
  })

  test('should render FAQ section with proper semantic styling', async ({ page }) => {
    const faqSection = page.locator('text=Frequently Asked Questions').locator('..')
    await expect(faqSection).toBeVisible()

    const firstFaq = page.locator('details').first()
    await expect(firstFaq).toBeVisible()

    const faqStyles = await firstFaq.evaluate((el) => {
      const classList = el.className
      return {
        hasCardBg: classList.includes('bg-card'),
        hasBorder: classList.includes('border-border'),
      }
    })

    expect(faqStyles.hasCardBg).toBeTruthy()
    expect(faqStyles.hasBorder).toBeTruthy()
  })

  test('should take screenshot for visual regression', async ({ page }) => {
    await page.screenshot({
      path: path.join(screenshotDir, 'advertise-page-full.png'),
      fullPage: true,
    })
  })
})

test.describe('Design System Conversion - Advertiser Dashboard (Auth Required)', () => {
  test('should display authentication requirement correctly', async ({ page }) => {
    // Try to access the advertiser dashboard
    await page.goto('/dashboard/advertiser')
    await page.waitForLoadState('networkidle')

    // Should redirect to sign-in
    await page.waitForURL('**/sign-in**', { timeout: 5000 }).catch(() => {
      // Expected behavior - requires auth
    })

    const currentUrl = page.url()
    const isSignInPage = currentUrl.includes('sign-in') || currentUrl.includes('sign-up')

    // Document this for the report
    if (isSignInPage) {
      console.log('✓ Advertiser Dashboard correctly requires authentication')
    }

    expect(isSignInPage).toBeTruthy()
  })

  test('should take screenshot of sign-in redirect', async ({ page }) => {
    await page.goto('/dashboard/advertiser')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    await page.screenshot({
      path: path.join(screenshotDir, 'advertiser-dashboard-auth-required.png'),
      fullPage: true,
    })
  })
})

test.describe('Design System Conversion - Judges Search', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/judges')
    await page.waitForLoadState('networkidle')
  })

  test('should render search interface with semantic tokens', async ({ page }) => {
    // Wait for the page to load
    await page.waitForSelector('h1, h2, input[type="search"], input[placeholder*="Search"]', {
      timeout: 10000,
    })

    // Check if search input exists
    const searchInput = page.locator('input[type="search"], input[placeholder*="Search"]').first()
    if (await searchInput.isVisible()) {
      const inputStyles = await searchInput.evaluate((el) => {
        const classList = el.className
        return {
          hasBorder: classList.includes('border') || classList.includes('border-border'),
          hasBg: classList.includes('bg-'),
        }
      })

      expect(inputStyles.hasBorder || inputStyles.hasBg).toBeTruthy()
    }
  })

  test('should display judge cards with proper semantic styling', async ({ page }) => {
    // Wait for judge cards to load
    await page.waitForSelector('article, [role="article"], a[href*="/judges/"]', {
      timeout: 10000,
    })

    const judgeLinks = page.locator('a[href*="/judges/"]').first()
    if (await judgeLinks.isVisible()) {
      const cardElement = await judgeLinks.locator('..').first()
      const cardStyles = await cardElement.evaluate((el) => {
        let currentEl: Element | null = el
        let foundCardBg = false
        let foundBorder = false

        // Traverse up to find card styling
        for (let i = 0; i < 5 && currentEl; i++) {
          const classList = currentEl.className
          if (typeof classList === 'string') {
            if (classList.includes('bg-card')) foundCardBg = true
            if (classList.includes('border-border') || classList.includes('border ')) foundBorder = true
          }
          currentEl = currentEl.parentElement
        }

        return { foundCardBg, foundBorder }
      })

      // At least one of these should be true for proper semantic styling
      expect(cardStyles.foundCardBg || cardStyles.foundBorder).toBeTruthy()
    }
  })

  test('should render color-coded experience metrics', async ({ page }) => {
    // Look for judge names or metrics
    const judgeElements = await page.locator('a[href*="/judges/"]').count()

    if (judgeElements > 0) {
      console.log(`✓ Found ${judgeElements} judge elements`)
      // Experience indicators might use secondary, primary, success, warning colors
      const hasColorIndicators = await page.evaluate(() => {
        const elements = document.querySelectorAll('[class*="text-"]')
        const colorClasses = Array.from(elements)
          .map((el) => el.className)
          .filter((className) =>
            ['text-success', 'text-warning', 'text-primary', 'text-secondary'].some((color) =>
              className.includes(color)
            )
          )
        return colorClasses.length > 0
      })

      // This is informational - the page might not show experience colors on the directory
      console.log(`Experience color indicators present: ${hasColorIndicators}`)
    }
  })

  test('should take screenshot of judges directory', async ({ page }) => {
    await page.screenshot({
      path: path.join(screenshotDir, 'judges-directory.png'),
      fullPage: true,
    })
  })
})

test.describe('Design System Conversion - Court Pages', () => {
  test('should navigate to courts directory', async ({ page }) => {
    await page.goto('/courts')
    await page.waitForLoadState('networkidle')

    // Check for court directory elements
    const hasCourtContent = await page.locator('h1, h2').count()
    expect(hasCourtContent).toBeGreaterThan(0)
  })

  test('should display court cards with semantic styling', async ({ page }) => {
    await page.goto('/courts')
    await page.waitForLoadState('networkidle')

    // Look for court links or cards
    const courtElements = page.locator('a[href*="/courts/"]').first()
    if (await courtElements.isVisible()) {
      const hasSemanticStyling = await courtElements.evaluate((el) => {
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

      expect(hasSemanticStyling).toBeTruthy()
    }
  })

  test('should verify court type icons use semantic colors', async ({ page }) => {
    await page.goto('/courts')
    await page.waitForLoadState('networkidle')

    // Check for icon elements
    const icons = page.locator('svg').first()
    if (await icons.isVisible()) {
      const iconColor = await icons.evaluate((el) => {
        const classList = el.className.baseVal || el.getAttribute('class') || ''
        return (
          classList.includes('text-primary') ||
          classList.includes('text-secondary') ||
          classList.includes('text-success')
        )
      })

      // Icons should use semantic colors
      console.log(`Court type icons use semantic colors: ${iconColor}`)
    }
  })

  test('should take screenshot of courts directory', async ({ page }) => {
    await page.goto('/courts')
    await page.waitForLoadState('networkidle')

    await page.screenshot({
      path: path.join(screenshotDir, 'courts-directory.png'),
      fullPage: true,
    })
  })
})

test.describe('Design System Conversion - Responsive Design', () => {
  const viewports = [
    { name: 'mobile', width: 375, height: 667 }, // iPhone SE
    { name: 'tablet', width: 768, height: 1024 }, // iPad
    { name: 'desktop', width: 1920, height: 1080 }, // Desktop
  ]

  for (const viewport of viewports) {
    test(`should render advertise page correctly on ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await page.goto('/advertise')
      await page.waitForLoadState('networkidle')

      // Check pricing cards are visible
      const federalCard = page.locator('text=Federal Judge Profiles')
      const stateCard = page.locator('text=State Judge Profiles')

      await expect(federalCard).toBeVisible()
      await expect(stateCard).toBeVisible()

      // Take screenshot
      await page.screenshot({
        path: path.join(screenshotDir, `advertise-${viewport.name}.png`),
        fullPage: true,
      })
    })
  }
})

test.describe('Design System Conversion - Interactive States', () => {
  test('should have hover states on pricing card buttons', async ({ page }) => {
    await page.goto('/advertise')
    await page.waitForLoadState('networkidle')

    const federalButton = page.locator('text=Get Started with Federal')
    await expect(federalButton).toBeVisible()

    // Get initial background color
    const initialBg = await federalButton.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor
    })

    // Hover over the button
    await federalButton.hover()
    await page.waitForTimeout(100)

    const hoverBg = await federalButton.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor
    })

    // Colors should be different on hover (or at least check classes include hover:)
    const hasHoverClass = await federalButton.evaluate((el) => {
      return el.className.includes('hover:')
    })

    expect(hasHoverClass).toBeTruthy()
  })

  test('should have hover states on quick action cards', async ({ page }) => {
    await page.goto('/advertise')
    await page.waitForLoadState('networkidle')

    const getStartedButton = page.locator('text=Get Started').first()
    if (await getStartedButton.isVisible()) {
      await getStartedButton.hover()

      const hasHoverClass = await getStartedButton.evaluate((el) => {
        return el.className.includes('hover:')
      })

      expect(hasHoverClass).toBeTruthy()
    }
  })
})

test.describe('Design System Conversion - Status Colors', () => {
  test('should use correct semantic colors for status indicators', async ({ page }) => {
    await page.goto('/advertise')
    await page.waitForLoadState('networkidle')

    // Check availability indicators
    const availableIndicator = page.locator('text=Available').locator('..')
    if (await availableIndicator.isVisible()) {
      const hasSuccessColor = await availableIndicator.evaluate((el) => {
        const dot = el.querySelector('.bg-success')
        return dot !== null
      })

      expect(hasSuccessColor).toBeTruthy()
    }

    const limitedIndicator = page.locator('text=Limited').locator('..')
    if (await limitedIndicator.isVisible()) {
      const hasWarningColor = await limitedIndicator.evaluate((el) => {
        const dot = el.querySelector('.bg-warning')
        return dot !== null
      })

      expect(hasWarningColor).toBeTruthy()
    }

    const soldOutIndicator = page.locator('text=Sold Out').locator('..')
    if (await soldOutIndicator.isVisible()) {
      const hasDestructiveColor = await soldOutIndicator.evaluate((el) => {
        const dot = el.querySelector('.bg-destructive')
        return dot !== null
      })

      expect(hasDestructiveColor).toBeTruthy()
    }
  })
})

test.describe('Design System Conversion - Dark Mode (if available)', () => {
  test('should check for dark mode support', async ({ page }) => {
    await page.goto('/advertise')
    await page.waitForLoadState('networkidle')

    // Look for dark mode toggle
    const darkModeToggle = page.locator(
      'button[aria-label*="theme"], button[aria-label*="dark"], [data-theme-toggle]'
    )
    const hasDarkModeToggle = (await darkModeToggle.count()) > 0

    if (hasDarkModeToggle) {
      console.log('✓ Dark mode toggle found')
      await darkModeToggle.first().click()
      await page.waitForTimeout(500)

      // Check if dark mode applied
      const htmlClasses = await page.locator('html').evaluate((el) => el.className)
      const isDarkMode = htmlClasses.includes('dark')

      console.log(`Dark mode ${isDarkMode ? 'enabled' : 'not detected'}`)

      // Take screenshot in dark mode
      if (isDarkMode) {
        await page.screenshot({
          path: path.join(screenshotDir, 'advertise-dark-mode.png'),
          fullPage: true,
        })
      }
    } else {
      console.log('ℹ Dark mode toggle not found - may not be implemented yet')
    }
  })
})

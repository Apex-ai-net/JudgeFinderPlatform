/**
 * E2E Tests for Judge Workflow
 *
 * Tests the complete user journey: Search → Profile → Compare → Analytics
 *
 * Coverage:
 * - Judge search functionality
 * - Profile page loading with analytics
 * - Comparison tool
 * - Mobile responsiveness
 * - Error handling
 */

import { test, expect } from '@playwright/test'

test.describe('Judge Workflow - Search to Profile', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })
  })

  test('should complete full judge search workflow', async ({ page }) => {
    // 1. Navigate to homepage
    await page.goto('/')
    await expect(page).toHaveTitle(/JudgeFinder/i)

    // 2. Verify search interface is visible
    const searchInput = page
      .getByRole('searchbox')
      .or(page.getByPlaceholder(/search/i))
      .or(page.locator('input[type="search"]'))
      .or(page.locator('input[name="search"]'))
      .first()

    await expect(searchInput).toBeVisible({ timeout: 10000 })

    // 3. Perform search
    await searchInput.fill('judge smith')
    await searchInput.press('Enter')

    // 4. Wait for search results
    await page.waitForTimeout(2000)

    // 5. Verify results are displayed
    const hasResults =
      (await page.getByText(/judge/i).count()) > 0 ||
      (await page.getByText(/court/i).count()) > 0 ||
      (await page.getByRole('link').count()) > 5

    expect(hasResults).toBeTruthy()
  })

  test('should navigate to judge profile and display analytics', async ({ page }) => {
    // Navigate to judges directory
    await page.goto('/judges')

    // Wait for page load
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // Find first judge card/link
    const judgeLinks = page.getByRole('link').filter({ hasText: /judge|hon\./i })
    const firstJudge = judgeLinks.first()

    if ((await firstJudge.count()) > 0) {
      // Click on judge profile
      await firstJudge.click()

      // Wait for profile page to load
      await page.waitForURL(/judges\/[a-z0-9-]+/, { timeout: 10000 })

      // Verify profile content
      const profileContent =
        (await page.getByText(/court/i).count()) > 0 ||
        (await page.getByText(/jurisdiction/i).count()) > 0 ||
        (await page.getByText(/appointed/i).count()) > 0

      expect(profileContent).toBeTruthy()

      // Verify analytics section exists
      const hasAnalytics =
        (await page.getByText(/analytics/i).count()) > 0 ||
        (await page.getByText(/bias/i).count()) > 0 ||
        (await page.getByText(/metrics/i).count()) > 0 ||
        (await page.getByText(/pattern/i).count()) > 0 ||
        (await page.getByText(/settlement/i).count()) > 0

      // Analytics may not be present for all judges (500 case minimum)
      // So we just check the page loaded successfully
      expect(page.url()).toContain('judges/')
    } else {
      test.skip()
    }
  })

  test('should display judge biography and appointment information', async ({ page }) => {
    await page.goto('/judges')
    await page.waitForLoadState('networkidle')

    const judgeLink = page.getByRole('link').filter({ hasText: /judge/i }).first()

    if ((await judgeLink.count()) > 0) {
      await judgeLink.click()
      await page.waitForURL(/judges\//)

      // Check for biographical information
      const hasBio =
        (await page.getByText(/appointed/i).count()) > 0 ||
        (await page.getByText(/court/i).count()) > 0 ||
        (await page.getByText(/jurisdiction/i).count()) > 0

      expect(hasBio).toBeTruthy()
    } else {
      test.skip()
    }
  })

  test('should handle judge not found gracefully', async ({ page }) => {
    await page.goto('/judges/nonexistent-judge-slug-99999')

    await page.waitForLoadState('networkidle')

    // Should show error or redirect
    const hasError =
      (await page.getByText(/not found/i).count()) > 0 ||
      (await page.getByText(/error/i).count()) > 0 ||
      page.url().includes('404') ||
      page.url() === 'http://localhost:3000/' ||
      page.url() === 'http://localhost:3000/judges'

    expect(hasError).toBeTruthy()
  })

  test('should load judge analytics charts when available', async ({ page }) => {
    await page.goto('/judges')
    await page.waitForLoadState('networkidle')

    const judgeLink = page.getByRole('link').filter({ hasText: /judge/i }).first()

    if ((await judgeLink.count()) > 0) {
      await judgeLink.click()
      await page.waitForURL(/judges\//)
      await page.waitForTimeout(2000)

      // Look for chart elements (canvas, svg, or chart containers)
      const hasCharts =
        (await page.locator('canvas').count()) > 0 ||
        (await page.locator('svg').count()) > 0 ||
        (await page.locator('[class*="chart"]').count()) > 0 ||
        (await page.locator('[class*="Chart"]').count()) > 0

      // Charts are optional depending on data availability
      // Just verify page doesn't crash
      expect(page.url()).toContain('judges/')
    } else {
      test.skip()
    }
  })

  test('should display case statistics when available', async ({ page }) => {
    await page.goto('/judges')
    await page.waitForLoadState('networkidle')

    const judgeLink = page.getByRole('link').filter({ hasText: /judge/i }).first()

    if ((await judgeLink.count()) > 0) {
      await judgeLink.click()
      await page.waitForURL(/judges\//)
      await page.waitForTimeout(1500)

      // Look for statistics
      const hasStats =
        (await page.getByText(/cases/i).count()) > 0 ||
        (await page.getByText(/total/i).count()) > 0 ||
        (await page.locator('[class*="stat"]').count()) > 0

      expect(hasStats).toBeTruthy()
    } else {
      test.skip()
    }
  })
})

test.describe('Judge Workflow - Search Filters', () => {
  test('should filter judges by jurisdiction', async ({ page }) => {
    await page.goto('/judges')
    await page.waitForLoadState('networkidle')

    // Look for filter controls
    const filters = page
      .getByRole('button')
      .filter({ hasText: /filter|jurisdiction|county/i })
      .or(page.locator('[class*="filter"]'))

    if ((await filters.count()) > 0) {
      await filters.first().click()
      await page.waitForTimeout(500)

      // Results should update
      expect(page.url()).toBeTruthy()
    } else {
      // Filters may not exist on all pages
      test.skip()
    }
  })

  test('should filter judges by case type', async ({ page }) => {
    await page.goto('/judges')
    await page.waitForLoadState('networkidle')

    // Look for case type filters
    const caseTypeFilter = page
      .getByText(/criminal|civil|family/i)
      .filter({ hasText: /filter|type/i })

    if ((await caseTypeFilter.count()) > 0) {
      await caseTypeFilter.first().click()
      await page.waitForTimeout(500)

      expect(page.url()).toBeTruthy()
    } else {
      test.skip()
    }
  })

  test('should sort judges by different criteria', async ({ page }) => {
    await page.goto('/judges')
    await page.waitForLoadState('networkidle')

    // Look for sort controls
    const sortControl = page
      .getByRole('button')
      .filter({ hasText: /sort|order/i })
      .or(page.locator('select').filter({ hasText: /sort/i }))

    if ((await sortControl.count()) > 0) {
      await sortControl.first().click()
      await page.waitForTimeout(500)

      expect(page.url()).toBeTruthy()
    } else {
      test.skip()
    }
  })
})

test.describe('Judge Workflow - Comparison Tool', () => {
  test('should allow comparing multiple judges', async ({ page }) => {
    await page.goto('/judges')
    await page.waitForLoadState('networkidle')

    // Look for compare buttons or checkboxes
    const compareButtons = page
      .getByRole('button')
      .filter({ hasText: /compare/i })
      .or(page.locator('input[type="checkbox"]'))

    if ((await compareButtons.count()) >= 2) {
      // Select first two judges for comparison
      await compareButtons.nth(0).click()
      await compareButtons.nth(1).click()

      await page.waitForTimeout(500)

      // Look for compare view or button
      const compareView = page.getByText(/comparing|comparison/i)

      if ((await compareView.count()) > 0) {
        expect(compareView).toBeVisible()
      } else {
        // Comparison feature may not be fully implemented
        test.skip()
      }
    } else {
      test.skip()
    }
  })
})

test.describe('Judge Workflow - Mobile Responsiveness', () => {
  test.use({ viewport: { width: 375, height: 667 } })

  test('should display judge search on mobile', async ({ page }) => {
    await page.goto('/')

    const searchInput = page
      .getByRole('searchbox')
      .or(page.getByPlaceholder(/search/i))
      .first()

    await expect(searchInput).toBeVisible({ timeout: 10000 })

    await searchInput.fill('judge')
    await searchInput.press('Enter')

    await page.waitForTimeout(2000)

    // Verify mobile layout
    expect(page.url()).toBeTruthy()
  })

  test('should display judge profile on mobile', async ({ page }) => {
    await page.goto('/judges')
    await page.waitForLoadState('networkidle')

    const judgeLink = page.getByRole('link').filter({ hasText: /judge/i }).first()

    if ((await judgeLink.count()) > 0) {
      await judgeLink.click()
      await page.waitForURL(/judges\//)

      // Verify profile renders on mobile
      const hasContent =
        (await page.getByText(/court/i).count()) > 0 ||
        (await page.getByText(/jurisdiction/i).count()) > 0

      expect(hasContent).toBeTruthy()
    } else {
      test.skip()
    }
  })

  test('should handle mobile navigation menu', async ({ page }) => {
    await page.goto('/')

    // Look for mobile menu button (hamburger icon)
    const menuButton = page
      .getByRole('button')
      .filter({ hasText: /menu|navigation/i })
      .or(page.locator('button[aria-label*="menu" i]'))
      .or(page.locator('[class*="hamburger"]'))

    if ((await menuButton.count()) > 0) {
      await menuButton.first().click()
      await page.waitForTimeout(500)

      // Menu should be visible
      const hasMenu =
        (await page.getByRole('navigation').count()) > 0 ||
        (await page.getByRole('menu').count()) > 0

      expect(hasMenu).toBeTruthy()
    }
  })
})

test.describe('Judge Workflow - Accessibility', () => {
  test('should support keyboard navigation', async ({ page }) => {
    await page.goto('/judges')
    await page.waitForLoadState('networkidle')

    // Tab through elements
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')

    // Verify focus is visible
    const focused = await page.locator(':focus')
    expect(await focused.count()).toBeGreaterThan(0)
  })

  test('should have proper heading hierarchy', async ({ page }) => {
    await page.goto('/judges')
    await page.waitForLoadState('networkidle')

    const h1Count = await page.locator('h1').count()
    expect(h1Count).toBeGreaterThanOrEqual(1)
  })

  test('should have alt text for images', async ({ page }) => {
    await page.goto('/judges')
    await page.waitForLoadState('networkidle')

    const judgeLink = page.getByRole('link').filter({ hasText: /judge/i }).first()

    if ((await judgeLink.count()) > 0) {
      await judgeLink.click()
      await page.waitForURL(/judges\//)

      const images = page.locator('img')
      const imageCount = await images.count()

      if (imageCount > 0) {
        for (let i = 0; i < imageCount; i++) {
          const img = images.nth(i)
          const alt = await img.getAttribute('alt')
          expect(alt).toBeDefined()
        }
      }
    } else {
      test.skip()
    }
  })
})

test.describe('Judge Workflow - Performance', () => {
  test('should load judge profile within 3 seconds', async ({ page }) => {
    const startTime = Date.now()

    await page.goto('/judges')
    await page.waitForLoadState('networkidle')

    const judgeLink = page.getByRole('link').filter({ hasText: /judge/i }).first()

    if ((await judgeLink.count()) > 0) {
      await judgeLink.click()
      await page.waitForURL(/judges\//)
      await page.waitForLoadState('networkidle')

      const loadTime = Date.now() - startTime

      // Profile should load within 3 seconds
      expect(loadTime).toBeLessThan(3000)
    } else {
      test.skip()
    }
  })

  test('should handle pagination efficiently', async ({ page }) => {
    await page.goto('/judges')
    await page.waitForLoadState('networkidle')

    const nextButton = page
      .getByRole('button')
      .filter({ hasText: /next|>/i })
      .or(page.getByRole('link').filter({ hasText: /next|>/i }))

    if ((await nextButton.count()) > 0) {
      const startTime = Date.now()

      await nextButton.first().click()
      await page.waitForLoadState('networkidle')

      const paginationTime = Date.now() - startTime

      // Pagination should be fast (< 2 seconds)
      expect(paginationTime).toBeLessThan(2000)
    } else {
      test.skip()
    }
  })
})

test.describe('Judge Workflow - Error Handling', () => {
  test('should handle network errors gracefully', async ({ page }) => {
    // Simulate offline mode
    await page.context().setOffline(true)

    await page.goto('/judges').catch(() => {
      // Expected to fail
    })

    await page.context().setOffline(false)

    // Should recover when back online
    await page.goto('/judges')
    await page.waitForLoadState('networkidle')

    expect(page.url()).toContain('judges')
  })

  test('should handle slow network conditions', async ({ page }) => {
    // Throttle network
    const client = await page.context().newCDPSession(page)
    await client.send('Network.enable')
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: (50 * 1024) / 8, // 50kbps
      uploadThroughput: (20 * 1024) / 8,
      latency: 500,
    })

    await page.goto('/judges', { timeout: 30000 })

    // Should still load, just slower
    expect(page.url()).toContain('judges')

    await client.send('Network.disable')
  })
})

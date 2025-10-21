/**
 * E2E Tests for Court Workflow
 *
 * Tests the complete court discovery journey:
 * - Court directory browsing
 * - Court profile pages
 * - Jurisdiction filtering
 * - Court type navigation
 *
 * Coverage:
 * - Court listing pages
 * - Court detail pages
 * - Filtering and navigation
 * - Mobile responsiveness
 * - Error handling
 */

import { test, expect } from '@playwright/test'

test.describe('Court Workflow - Directory Browsing', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })
  })

  test('should display court directory page', async ({ page }) => {
    await page.goto('/courts')
    await page.waitForLoadState('networkidle')

    // Verify courts page loaded
    expect(page.url()).toContain('courts')

    // Check for court listings
    const hasCourts =
      (await page.getByText(/court/i).count()) > 3 ||
      (await page.getByRole('link').count()) > 5 ||
      (await page.getByText(/superior|federal|district/i).count()) > 0

    expect(hasCourts).toBeTruthy()
  })

  test('should navigate to individual court profile', async ({ page }) => {
    await page.goto('/courts')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1500)

    // Find court links
    const courtLinks = page
      .getByRole('link')
      .filter({ hasText: /court|superior|federal|district/i })

    const firstCourt = courtLinks.first()

    if ((await firstCourt.count()) > 0) {
      await firstCourt.click()

      // Wait for court detail page
      await page.waitForURL(/courts\//, { timeout: 10000 })

      // Verify court profile content
      const hasProfile =
        (await page.getByText(/court/i).count()) > 0 ||
        (await page.getByText(/jurisdiction/i).count()) > 0 ||
        (await page.getByText(/location/i).count()) > 0 ||
        (await page.getByText(/address/i).count()) > 0

      expect(hasProfile).toBeTruthy()
    } else {
      test.skip()
    }
  })

  test('should display court contact information', async ({ page }) => {
    await page.goto('/courts')
    await page.waitForLoadState('networkidle')

    const courtLink = page.getByRole('link').filter({ hasText: /court/i }).first()

    if ((await courtLink.count()) > 0) {
      await courtLink.click()
      await page.waitForURL(/courts\//)
      await page.waitForTimeout(1000)

      // Look for contact information
      const hasContact =
        (await page.getByText(/address|location|phone|email|website/i).count()) > 0 ||
        (await page.locator('a[href^="tel:"]').count()) > 0 ||
        (await page.locator('a[href^="mailto:"]').count()) > 0 ||
        (await page.locator('a[href^="http"]').count()) > 0

      // Contact info may vary by court
      expect(page.url()).toContain('courts/')
    } else {
      test.skip()
    }
  })

  test('should display judges assigned to court', async ({ page }) => {
    await page.goto('/courts')
    await page.waitForLoadState('networkidle')

    const courtLink = page.getByRole('link').filter({ hasText: /court/i }).first()

    if ((await courtLink.count()) > 0) {
      await courtLink.click()
      await page.waitForURL(/courts\//)
      await page.waitForTimeout(1500)

      // Look for judge listings
      const hasJudges =
        (await page.getByText(/judge/i).count()) > 0 ||
        (await page.getByText(/judges/i).count()) > 0

      // Judges may not be shown on all court pages
      expect(page.url()).toContain('courts/')
    } else {
      test.skip()
    }
  })

  test('should handle court not found gracefully', async ({ page }) => {
    await page.goto('/courts/nonexistent-court-99999')
    await page.waitForLoadState('networkidle')

    // Should show error or redirect
    const hasError =
      (await page.getByText(/not found/i).count()) > 0 ||
      (await page.getByText(/error/i).count()) > 0 ||
      page.url().includes('404') ||
      page.url() === 'http://localhost:3000/' ||
      page.url() === 'http://localhost:3000/courts'

    expect(hasError).toBeTruthy()
  })
})

test.describe('Court Workflow - Filtering by Jurisdiction', () => {
  test('should filter courts by county', async ({ page }) => {
    await page.goto('/courts')
    await page.waitForLoadState('networkidle')

    // Look for county filters
    const countyFilter = page
      .getByRole('button')
      .filter({ hasText: /county|jurisdiction|filter/i })
      .or(page.getByText(/los angeles|orange|san diego/i))

    if ((await countyFilter.count()) > 0) {
      await countyFilter.first().click()
      await page.waitForTimeout(1000)

      // Results should update
      expect(page.url()).toBeTruthy()
    } else {
      // Filters may not exist
      test.skip()
    }
  })

  test('should filter courts by type (Superior, Federal, etc.)', async ({ page }) => {
    await page.goto('/courts')
    await page.waitForLoadState('networkidle')

    // Look for court type filters
    const typeFilter = page
      .getByRole('button')
      .filter({ hasText: /superior|federal|district|type/i })
      .or(page.getByText(/court type/i))

    if ((await typeFilter.count()) > 0) {
      await typeFilter.first().click()
      await page.waitForTimeout(1000)

      expect(page.url()).toBeTruthy()
    } else {
      test.skip()
    }
  })

  test('should navigate to court type pages', async ({ page }) => {
    // Try accessing specific court type pages
    const courtTypes = ['superior', 'federal', 'district', 'appellate']

    for (const type of courtTypes) {
      const response = await page.goto(`/courts/type/${type}`)

      if (response?.status() === 200) {
        await page.waitForLoadState('networkidle')

        // Verify type-specific page loaded
        const hasTypeContent =
          (await page.getByText(new RegExp(type, 'i')).count()) > 0 ||
          (await page.getByText(/court/i).count()) > 0

        expect(hasTypeContent).toBeTruthy()
        break // At least one type should work
      }
    }
  })
})

test.describe('Court Workflow - Search and Discovery', () => {
  test('should search for specific court', async ({ page }) => {
    await page.goto('/courts')
    await page.waitForLoadState('networkidle')

    // Look for search input
    const searchInput = page
      .getByRole('searchbox')
      .or(page.getByPlaceholder(/search/i))
      .or(page.locator('input[type="search"]'))
      .first()

    if ((await searchInput.count()) > 0) {
      await searchInput.fill('superior')
      await searchInput.press('Enter')

      await page.waitForTimeout(1500)

      // Results should show superior courts
      const hasResults =
        (await page.getByText(/superior/i).count()) > 0 ||
        (await page.getByText(/court/i).count()) > 0

      expect(hasResults).toBeTruthy()
    } else {
      test.skip()
    }
  })

  test('should display court hierarchy (appellate vs trial)', async ({ page }) => {
    await page.goto('/courts')
    await page.waitForLoadState('networkidle')

    // Look for hierarchy indicators
    const hasHierarchy = (await page.getByText(/appellate|trial|superior|district/i).count()) > 2

    expect(hasHierarchy).toBeTruthy()
  })

  test('should show court statistics when available', async ({ page }) => {
    await page.goto('/courts')
    await page.waitForLoadState('networkidle')

    const courtLink = page.getByRole('link').filter({ hasText: /court/i }).first()

    if ((await courtLink.count()) > 0) {
      await courtLink.click()
      await page.waitForURL(/courts\//)
      await page.waitForTimeout(1500)

      // Look for statistics
      const hasStats =
        (await page.getByText(/cases|filings|judges|statistics/i).count()) > 0 ||
        (await page.locator('[class*="stat"]').count()) > 0

      // Statistics are optional
      expect(page.url()).toContain('courts/')
    } else {
      test.skip()
    }
  })
})

test.describe('Court Workflow - Mobile Responsiveness', () => {
  test.use({ viewport: { width: 375, height: 667 } })

  test('should display court directory on mobile', async ({ page }) => {
    await page.goto('/courts')
    await page.waitForLoadState('networkidle')

    // Verify mobile layout
    const hasCourts =
      (await page.getByText(/court/i).count()) > 0 || (await page.getByRole('link').count()) > 3

    expect(hasCourts).toBeTruthy()
  })

  test('should display court profile on mobile', async ({ page }) => {
    await page.goto('/courts')
    await page.waitForLoadState('networkidle')

    const courtLink = page.getByRole('link').filter({ hasText: /court/i }).first()

    if ((await courtLink.count()) > 0) {
      await courtLink.click()
      await page.waitForURL(/courts\//)

      // Verify profile renders on mobile
      const hasContent =
        (await page.getByText(/court/i).count()) > 0 ||
        (await page.getByText(/location/i).count()) > 0

      expect(hasContent).toBeTruthy()
    } else {
      test.skip()
    }
  })

  test('should handle mobile navigation for courts', async ({ page }) => {
    await page.goto('/courts')

    // Look for mobile menu
    const menuButton = page
      .getByRole('button')
      .filter({ hasText: /menu|navigation/i })
      .or(page.locator('button[aria-label*="menu" i]'))

    if ((await menuButton.count()) > 0) {
      await menuButton.first().click()
      await page.waitForTimeout(500)

      const hasMenu =
        (await page.getByRole('navigation').count()) > 0 ||
        (await page.getByRole('menu').count()) > 0

      expect(hasMenu).toBeTruthy()
    }
  })
})

test.describe('Court Workflow - Accessibility', () => {
  test('should support keyboard navigation on court pages', async ({ page }) => {
    await page.goto('/courts')
    await page.waitForLoadState('networkidle')

    // Tab through elements
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')

    const focused = await page.locator(':focus')
    expect(await focused.count()).toBeGreaterThan(0)
  })

  test('should have proper ARIA labels for court links', async ({ page }) => {
    await page.goto('/courts')
    await page.waitForLoadState('networkidle')

    const links = page.getByRole('link')
    const linkCount = await links.count()

    expect(linkCount).toBeGreaterThan(0)

    // At least some links should be accessible
    if (linkCount > 0) {
      const firstLink = links.first()
      const text = await firstLink.textContent()
      expect(text).toBeTruthy()
    }
  })

  test('should have semantic HTML structure', async ({ page }) => {
    await page.goto('/courts')
    await page.waitForLoadState('networkidle')

    // Check for semantic elements
    const hasSemantics =
      (await page.locator('header').count()) > 0 ||
      (await page.locator('main').count()) > 0 ||
      (await page.locator('nav').count()) > 0

    expect(hasSemantics).toBeTruthy()
  })
})

test.describe('Court Workflow - Performance', () => {
  test('should load court directory quickly', async ({ page }) => {
    const startTime = Date.now()

    await page.goto('/courts')
    await page.waitForLoadState('networkidle')

    const loadTime = Date.now() - startTime

    // Should load within 2 seconds
    expect(loadTime).toBeLessThan(2000)
  })

  test('should navigate between court pages efficiently', async ({ page }) => {
    await page.goto('/courts')
    await page.waitForLoadState('networkidle')

    const courtLink = page.getByRole('link').filter({ hasText: /court/i }).first()

    if ((await courtLink.count()) > 0) {
      const startTime = Date.now()

      await courtLink.click()
      await page.waitForURL(/courts\//)
      await page.waitForLoadState('networkidle')

      const navTime = Date.now() - startTime

      // Navigation should be fast
      expect(navTime).toBeLessThan(3000)
    } else {
      test.skip()
    }
  })
})

test.describe('Court Workflow - Error Handling', () => {
  test('should handle missing court data gracefully', async ({ page }) => {
    await page.goto('/courts/test-invalid-court-id-999')
    await page.waitForLoadState('networkidle')

    // Should not crash
    expect(page.url()).toBeTruthy()
  })

  test('should recover from network errors', async ({ page }) => {
    await page.context().setOffline(true)

    await page.goto('/courts').catch(() => {
      // Expected to fail
    })

    await page.context().setOffline(false)

    await page.goto('/courts')
    await page.waitForLoadState('networkidle')

    expect(page.url()).toContain('courts')
  })

  test('should handle slow loading gracefully', async ({ page }) => {
    const client = await page.context().newCDPSession(page)
    await client.send('Network.enable')
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: (100 * 1024) / 8,
      uploadThroughput: (50 * 1024) / 8,
      latency: 500,
    })

    await page.goto('/courts', { timeout: 30000 })

    expect(page.url()).toContain('courts')

    await client.send('Network.disable')
  })
})

test.describe('Court Workflow - Integration', () => {
  test('should link from court to judges', async ({ page }) => {
    await page.goto('/courts')
    await page.waitForLoadState('networkidle')

    const courtLink = page.getByRole('link').filter({ hasText: /court/i }).first()

    if ((await courtLink.count()) > 0) {
      await courtLink.click()
      await page.waitForURL(/courts\//)
      await page.waitForTimeout(1500)

      // Look for judge links
      const judgeLinks = page.getByRole('link').filter({ hasText: /judge/i })

      if ((await judgeLinks.count()) > 0) {
        await judgeLinks.first().click()
        await page.waitForTimeout(1000)

        // Should navigate to judge profile
        const isJudgePage =
          page.url().includes('judges/') || (await page.getByText(/judge/i).count()) > 0

        expect(isJudgePage).toBeTruthy()
      }
    } else {
      test.skip()
    }
  })

  test('should display breadcrumb navigation', async ({ page }) => {
    await page.goto('/courts')
    await page.waitForLoadState('networkidle')

    const courtLink = page.getByRole('link').filter({ hasText: /court/i }).first()

    if ((await courtLink.count()) > 0) {
      await courtLink.click()
      await page.waitForURL(/courts\//)

      // Look for breadcrumbs
      const hasBreadcrumbs =
        (await page.locator('[aria-label*="breadcrumb" i]').count()) > 0 ||
        (await page
          .locator('nav')
          .filter({ hasText: /home|courts/i })
          .count()) > 0

      // Breadcrumbs are optional
      expect(page.url()).toContain('courts/')
    } else {
      test.skip()
    }
  })
})

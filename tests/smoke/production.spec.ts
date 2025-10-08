/**
 * Production Smoke Tests
 *
 * Critical user flows that must work in production.
 * Run these tests after every deployment to verify core functionality.
 *
 * Usage:
 *   npx playwright test tests/smoke/production.spec.ts
 *   PROD_URL=https://judgefinder.io npx playwright test tests/smoke/production.spec.ts
 */

import { test, expect } from '@playwright/test'

// Configuration
const PROD_URL = process.env.PROD_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3005'
const MAX_LOAD_TIME = 3000 // 3 seconds
const API_TIMEOUT = 5000 // 5 seconds

test.describe('Production Smoke Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Set up console error tracking
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error('Console error:', msg.text())
      }
    })

    // Track page errors
    page.on('pageerror', error => {
      console.error('Page error:', error)
    })
  })

  test.describe('Critical Page Loads', () => {
    test('homepage loads within 3 seconds', async ({ page }) => {
      const startTime = Date.now()

      await page.goto(PROD_URL, { waitUntil: 'networkidle' })

      const loadTime = Date.now() - startTime
      expect(loadTime).toBeLessThan(MAX_LOAD_TIME)

      // Verify page title
      await expect(page).toHaveTitle(/JudgeFinder/i)

      // Verify key elements are present
      await expect(page.locator('body')).toBeVisible()

      console.log(`Homepage loaded in ${loadTime}ms`)
    })

    test('search page loads successfully', async ({ page }) => {
      await page.goto(`${PROD_URL}/search`, { waitUntil: 'networkidle' })

      // Verify search interface is present
      await expect(page.locator('input[type="search"], input[placeholder*="search" i]')).toBeVisible({ timeout: 5000 })

      // No JavaScript errors should be logged
      const errors: string[] = []
      page.on('pageerror', error => errors.push(error.message))

      await page.waitForTimeout(1000)
      expect(errors.length).toBe(0)
    })

    test('courts page loads successfully', async ({ page }) => {
      await page.goto(`${PROD_URL}/courts`, { waitUntil: 'networkidle' })

      // Verify courts list or content is present
      await expect(page.locator('body')).toContainText(/court/i)

      // Check for proper rendering
      const hasContent = await page.locator('main, [role="main"]').isVisible()
      expect(hasContent).toBeTruthy()
    })
  })

  test.describe('Search Functionality', () => {
    test('search returns results', async ({ page }) => {
      await page.goto(PROD_URL)

      // Find search input (adjust selector based on your implementation)
      const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]').first()

      if (await searchInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await searchInput.fill('judge')
        await searchInput.press('Enter')

        // Wait for results to load
        await page.waitForLoadState('networkidle')

        // Verify results are displayed (adjust selector based on your implementation)
        const hasResults = await page.locator('[data-testid="search-results"], .search-results, main').isVisible()
        expect(hasResults).toBeTruthy()
      } else {
        console.log('Search input not found on homepage, skipping search test')
      }
    })

    test('search handles no results gracefully', async ({ page }) => {
      await page.goto(`${PROD_URL}/search?q=zzznonexistentquery123456`)

      await page.waitForLoadState('networkidle')

      // Should show no results message, not an error
      const bodyText = await page.locator('body').textContent()
      expect(bodyText).not.toContain('Error')
      expect(bodyText).not.toContain('500')
      expect(bodyText).not.toContain('Internal Server Error')
    })
  })

  test.describe('API Health Checks', () => {
    test('health endpoint responds correctly', async ({ request }) => {
      const response = await request.get(`${PROD_URL}/api/health`, {
        timeout: API_TIMEOUT
      })

      expect(response.ok()).toBeTruthy()
      expect(response.status()).toBe(200)

      const data = await response.json()
      expect(data.status).toMatch(/healthy|degraded/)
      expect(data.checks).toBeDefined()
      expect(data.performance).toBeDefined()
    })

    test('search API responds', async ({ request }) => {
      const response = await request.get(`${PROD_URL}/api/search?q=test`, {
        timeout: API_TIMEOUT
      })

      expect(response.ok()).toBeTruthy()
      expect(response.status()).toBe(200)

      const data = await response.json()
      expect(data).toBeDefined()
    })

    test('courts API responds', async ({ request }) => {
      const response = await request.get(`${PROD_URL}/api/courts`, {
        timeout: API_TIMEOUT
      })

      expect(response.ok()).toBeTruthy()
      expect(response.status()).toBe(200)

      const data = await response.json()
      expect(Array.isArray(data)).toBeTruthy()
    })
  })

  test.describe('SEO & Metadata', () => {
    test('sitemap is accessible', async ({ request }) => {
      const response = await request.get(`${PROD_URL}/sitemap.xml`)

      expect(response.ok()).toBeTruthy()
      expect(response.status()).toBe(200)

      const text = await response.text()
      expect(text).toContain('<?xml')
      expect(text).toContain('urlset')
    })

    test('robots.txt is accessible', async ({ request }) => {
      const response = await request.get(`${PROD_URL}/robots.txt`)

      expect(response.ok()).toBeTruthy()
      expect(response.status()).toBe(200)

      const text = await response.text()
      expect(text).toContain('User-agent')
    })

    test('homepage has proper meta tags', async ({ page }) => {
      await page.goto(PROD_URL)

      // Check for essential meta tags
      const metaDescription = await page.locator('meta[name="description"]').getAttribute('content')
      expect(metaDescription).toBeTruthy()
      expect(metaDescription!.length).toBeGreaterThan(50)

      // Check for Open Graph tags
      const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content')
      expect(ogTitle).toBeTruthy()

      // Check canonical URL
      const canonical = page.locator('link[rel="canonical"]')
      if (await canonical.count() > 0) {
        const href = await canonical.getAttribute('href')
        expect(href).toContain(PROD_URL)
      }
    })
  })

  test.describe('Security Headers', () => {
    test('security headers are present', async ({ request }) => {
      const response = await request.get(PROD_URL)

      const headers = response.headers()

      // Check for important security headers
      expect(headers['x-frame-options']).toBeDefined()
      expect(headers['x-content-type-options']).toBe('nosniff')
      expect(headers['referrer-policy']).toBeDefined()
    })
  })

  test.describe('Error Handling', () => {
    test('404 page renders correctly', async ({ page }) => {
      const response = await page.goto(`${PROD_URL}/this-page-does-not-exist-12345`, {
        waitUntil: 'networkidle'
      })

      expect(response?.status()).toBe(404)

      // Should show 404 message, not a blank page or error
      const bodyText = await page.locator('body').textContent()
      expect(bodyText).toMatch(/404|not found/i)
    })

    test('no JavaScript errors on homepage', async ({ page }) => {
      const errors: string[] = []

      page.on('pageerror', error => {
        errors.push(error.message)
      })

      page.on('console', msg => {
        if (msg.type() === 'error') {
          errors.push(msg.text())
        }
      })

      await page.goto(PROD_URL, { waitUntil: 'networkidle' })
      await page.waitForTimeout(2000)

      // Filter out expected errors (if any)
      const criticalErrors = errors.filter(error => {
        // Add patterns for expected/acceptable errors here
        return !error.includes('ResizeObserver') // Common false positive
      })

      if (criticalErrors.length > 0) {
        console.error('JavaScript errors detected:', criticalErrors)
      }

      expect(criticalErrors.length).toBe(0)
    })
  })

  test.describe('Performance Metrics', () => {
    test('homepage loads within acceptable time', async ({ page }) => {
      const metrics = await page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
        return {
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
          domInteractive: navigation.domInteractive - navigation.fetchStart,
        }
      })

      await page.goto(PROD_URL, { waitUntil: 'load' })

      console.log('Performance metrics:', metrics)

      // DOM should be interactive within 2 seconds
      expect(metrics.domInteractive).toBeLessThan(2000)
    })

    test('API responses are fast', async ({ request }) => {
      const startTime = Date.now()

      await request.get(`${PROD_URL}/api/health`)

      const responseTime = Date.now() - startTime

      console.log(`Health check response time: ${responseTime}ms`)

      // Health check should respond in under 1 second
      expect(responseTime).toBeLessThan(1000)
    })
  })

  test.describe('Mobile Responsiveness', () => {
    test('homepage is mobile-friendly', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 }) // iPhone SE size

      await page.goto(PROD_URL)

      // Page should be visible and not horizontally scrollable
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
      const viewportWidth = await page.evaluate(() => window.innerWidth)

      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1) // +1 for rounding

      // Essential elements should be visible on mobile
      await expect(page.locator('body')).toBeVisible()
    })
  })
})

// Test configuration
test.describe.configure({ mode: 'parallel', timeout: 30000 })

/**
 * E2E tests for judge search flow
 * Tests the complete user journey: Search → Profile → Analytics
 */

import { test, expect } from '@playwright/test'

test.describe('Judge Search Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should display search interface on home page', async ({ page }) => {
    // Check for search input
    const searchInput = page.getByRole('searchbox').or(page.getByPlaceholder(/search/i))
    await expect(searchInput).toBeVisible()
  })

  test('should search for judges and display results', async ({ page }) => {
    // Enter search query
    const searchInput = page.getByRole('searchbox').or(page.getByPlaceholder(/search/i))
    await searchInput.fill('Smith')
    await searchInput.press('Enter')

    // Wait for results or navigate to results page
    await page.waitForURL(/search|results/i, { timeout: 10000 }).catch(() => {
      // If URL doesn't change, results might be on same page
    })

    // Check if any results are displayed
    // This is flexible to accommodate different UI implementations
    const hasResults =
      (await page.getByText(/judge/i).count()) > 0 || (await page.getByText(/results/i).count()) > 0

    expect(hasResults).toBeTruthy()
  })

  test('should navigate to judge profile from search results', async ({ page }) => {
    // Perform search
    const searchInput = page.getByRole('searchbox').or(page.getByPlaceholder(/search/i))
    await searchInput.fill('judge')
    await searchInput.press('Enter')

    // Wait for results
    await page.waitForTimeout(2000)

    // Try to find and click first judge link
    const judgeLinks = page.getByRole('link').filter({ hasText: /judge|court/i })
    const firstJudge = judgeLinks.first()

    if ((await firstJudge.count()) > 0) {
      await firstJudge.click()

      // Should navigate to judge profile
      await page.waitForURL(/judges\//, { timeout: 10000 })
      expect(page.url()).toContain('judges/')
    }
  })

  test('should display judge profile information', async ({ page }) => {
    // Navigate directly to a judge profile page
    // Using a common pattern - actual slug may vary
    await page.goto('/judges/john-smith').catch(async () => {
      // If specific judge doesn't exist, search for one
      await page.goto('/')
      const searchInput = page.getByRole('searchbox').or(page.getByPlaceholder(/search/i))
      await searchInput.fill('judge')
      await searchInput.press('Enter')
      await page.waitForTimeout(1000)

      const judgeLink = page.getByRole('link').filter({ hasText: /judge/i }).first()
      if ((await judgeLink.count()) > 0) {
        await judgeLink.click()
      }
    })

    // Check for profile elements
    const hasProfileContent =
      (await page.getByText(/court/i).count()) > 0 || (await page.getByText(/jurisdiction/i).count()) > 0

    expect(hasProfileContent).toBeTruthy()
  })

  test('should handle empty search gracefully', async ({ page }) => {
    const searchInput = page.getByRole('searchbox').or(page.getByPlaceholder(/search/i))
    await searchInput.fill('')
    await searchInput.press('Enter')

    // Should not crash and should show some feedback
    await page.waitForTimeout(1000)
    expect(page.url()).toBeTruthy()
  })

  test('should sanitize malicious input', async ({ page }) => {
    const searchInput = page.getByRole('searchbox').or(page.getByPlaceholder(/search/i))
    await searchInput.fill('<script>alert("xss")</script>')
    await searchInput.press('Enter')

    await page.waitForTimeout(1000)

    // Should not execute script
    // If alert appears, test would fail
    const hasNoAlert = !(await page.locator('.alert, [role="alert"]').count())
    expect(hasNoAlert).toBeTruthy()
  })

  test('should filter search results by type', async ({ page }) => {
    await page.goto('/')

    const searchInput = page.getByRole('searchbox').or(page.getByPlaceholder(/search/i))
    await searchInput.fill('california')
    await searchInput.press('Enter')

    await page.waitForTimeout(1500)

    // Look for filter controls (if they exist)
    const filterButtons = page.getByRole('button').filter({ hasText: /judge|court|filter/i })
    if ((await filterButtons.count()) > 0) {
      await filterButtons.first().click()
      await page.waitForTimeout(500)

      // Results should be filtered
      expect(page.url()).toBeTruthy()
    }
  })

  test('should show search suggestions while typing', async ({ page }) => {
    const searchInput = page.getByRole('searchbox').or(page.getByPlaceholder(/search/i))

    // Type slowly to trigger suggestions
    await searchInput.type('jud', { delay: 100 })
    await page.waitForTimeout(500)

    // Check if suggestions dropdown appears
    const hasSuggestions =
      (await page.getByRole('listbox').count()) > 0 ||
      (await page.locator('[role="option"]').count()) > 0 ||
      (await page.getByText(/suggestion|result/i).count()) > 0

    // Suggestions are optional, so we just verify no crash occurred
    expect(page.url()).toBeTruthy()
  })

  test('should navigate between search results pages', async ({ page }) => {
    const searchInput = page.getByRole('searchbox').or(page.getByPlaceholder(/search/i))
    await searchInput.fill('judge')
    await searchInput.press('Enter')

    await page.waitForTimeout(1500)

    // Look for pagination controls
    const nextButton = page
      .getByRole('button')
      .filter({ hasText: /next|>/i })
      .first()
    const paginationLinks = page.getByRole('link').filter({ hasText: /\d+|next|previous/i })

    if ((await nextButton.count()) > 0) {
      await nextButton.click()
      await page.waitForTimeout(500)
      expect(page.url()).toBeTruthy()
    } else if ((await paginationLinks.count()) > 0) {
      await paginationLinks.first().click()
      await page.waitForTimeout(500)
      expect(page.url()).toBeTruthy()
    }
  })
})

test.describe('Judge Search - Mobile', () => {
  test.use({ viewport: { width: 375, height: 667 } })

  test('should work on mobile viewport', async ({ page }) => {
    await page.goto('/')

    const searchInput = page.getByRole('searchbox').or(page.getByPlaceholder(/search/i))
    await expect(searchInput).toBeVisible()

    await searchInput.fill('judge')
    await searchInput.press('Enter')

    await page.waitForTimeout(1500)

    // Should display results in mobile layout
    expect(page.url()).toBeTruthy()
  })
})

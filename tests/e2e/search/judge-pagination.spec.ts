import { test, expect } from '@playwright/test'

test.describe('Judges directory pagination', () => {
  test('navigates to next and previous pages and updates URL', async ({ page }) => {
    await page.goto('/judges')

    // Wait for initial grid to render
    await expect(page.locator('nav[aria-label="Pagination"]')).toBeVisible()

    // Get first judge name on page 1 (should be "A. Lee Harris")
    const page1FirstJudge = await page.locator('h3').first().textContent()
    expect(page1FirstJudge).toBeTruthy()

    // Click next
    await page.getByRole('button', { name: 'Next page' }).click()
    await expect(page).toHaveURL(/\/judges\?page=2(?!\d)/)

    // Pagination should reflect current page 2
    await expect(page.getByRole('button', { name: 'Go to page 2' })).toHaveAttribute(
      'aria-current',
      'page'
    )

    // CRITICAL: Verify different judges loaded on page 2
    await page.waitForTimeout(500) // Wait for data to load
    const page2FirstJudge = await page.locator('h3').first().textContent()
    expect(page2FirstJudge).toBeTruthy()
    expect(page2FirstJudge).not.toBe(page1FirstJudge) // Different judges!

    // Click previous
    await page.getByRole('button', { name: 'Previous page' }).click()
    await expect(page).toHaveURL(
      (url) => url.pathname === '/judges' && !url.searchParams.has('page')
    )
    await expect(page.getByRole('button', { name: 'Go to page 1' })).toHaveAttribute(
      'aria-current',
      'page'
    )

    // Verify we're back to page 1 judges
    await page.waitForTimeout(500)
    const backToPage1FirstJudge = await page.locator('h3').first().textContent()
    expect(backToPage1FirstJudge).toBe(page1FirstJudge) // Same as original page 1!
  })

  test('direct navigation to page 3 loads and highlights active page', async ({ page }) => {
    await page.goto('/judges?page=3')
    await expect(page.locator('nav[aria-label="Pagination"]')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Go to page 3' })).toHaveAttribute(
      'aria-current',
      'page'
    )
  })

  test('direct URL navigation loads correct page data', async ({ page }) => {
    // Navigate directly to page 2
    await page.goto('/judges?page=2')
    await expect(page.locator('nav[aria-label="Pagination"]')).toBeVisible()

    // Get first judge on page 2
    const page2FirstJudge = await page.locator('h3').first().textContent()
    expect(page2FirstJudge).toBeTruthy()

    // Navigate to page 1
    await page.goto('/judges')
    await expect(page.locator('nav[aria-label="Pagination"]')).toBeVisible()

    // Get first judge on page 1
    const page1FirstJudge = await page.locator('h3').first().textContent()
    expect(page1FirstJudge).toBeTruthy()

    // CRITICAL: Page 1 and page 2 must have different judges
    expect(page1FirstJudge).not.toBe(page2FirstJudge)
  })

  test('all pagination buttons load different data', async ({ page }) => {
    await page.goto('/judges')
    await expect(page.locator('nav[aria-label="Pagination"]')).toBeVisible()

    const page1FirstJudge = await page.locator('h3').first().textContent()

    // Click page 4 button directly
    await page.getByRole('button', { name: 'Go to page 4' }).click()
    await page.waitForTimeout(500)
    await expect(page).toHaveURL(/page=4/)

    const page4FirstJudge = await page.locator('h3').first().textContent()
    expect(page4FirstJudge).not.toBe(page1FirstJudge) // Different data!

    // Click page 1 button to go back
    await page.getByRole('button', { name: 'Go to page 1' }).click()
    await page.waitForTimeout(500)

    const backToPage1 = await page.locator('h3').first().textContent()
    expect(backToPage1).toBe(page1FirstJudge) // Same as original!
  })
})

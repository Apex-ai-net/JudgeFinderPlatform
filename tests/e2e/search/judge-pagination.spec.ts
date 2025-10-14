import { test, expect } from '@playwright/test'

test.describe('Judges directory pagination', () => {
  test('navigates to next and previous pages and updates URL', async ({ page }) => {
    await page.goto('/judges')

    // Wait for initial grid to render
    await expect(page.locator('nav[aria-label="Pagination"]')).toBeVisible()

    // Click next
    await page.getByRole('button', { name: 'Next page' }).click()
    await expect(page).toHaveURL(/\/judges\?page=2(?!\d)/)

    // Pagination should reflect current page 2
    await expect(page.getByRole('button', { name: 'Go to page 2' })).toHaveAttribute(
      'aria-current',
      'page'
    )

    // Click previous
    await page.getByRole('button', { name: 'Previous page' }).click()
    await expect(page).toHaveURL(
      (url) => url.pathname === '/judges' && !url.searchParams.has('page')
    )
    await expect(page.getByRole('button', { name: 'Go to page 1' })).toHaveAttribute(
      'aria-current',
      'page'
    )
  })

  test('direct navigation to page 3 loads and highlights active page', async ({ page }) => {
    await page.goto('/judges?page=3')
    await expect(page.locator('nav[aria-label="Pagination"]')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Go to page 3' })).toHaveAttribute(
      'aria-current',
      'page'
    )
  })
})

/**
 * E2E tests for advertiser onboarding flow
 * Tests the complete journey from /advertise to verified advertiser
 */

import { test, expect } from '@playwright/test'

test.describe('Advertiser Onboarding Flow', () => {
  test('should navigate from advertise page to onboarding', async ({ page }) => {
    // Visit the advertising landing page
    await page.goto('/advertise')

    // Should see "Get Started" or "Start Advertising" button
    const getStartedButton = page.getByRole('button', { name: /get started|start advertising/i })
    await expect(getStartedButton).toBeVisible()

    // Click to start onboarding
    await getStartedButton.click()

    // Should redirect to onboarding page
    await expect(page).toHaveURL(/\/advertise\/onboarding/)
  })

  test('should show authentication requirement for onboarding', async ({ page }) => {
    // Try to access onboarding directly without auth
    await page.goto('/advertise/onboarding')

    // Should redirect to sign-in or show auth requirement
    const currentUrl = page.url()
    const isSignInPage = currentUrl.includes('/sign-in')
    const hasAuthMessage = await page.getByText(/sign in|authentication required/i).isVisible()

    expect(isSignInPage || hasAuthMessage).toBe(true)
  })

  test('authenticated user can access onboarding form', async ({ page }) => {
    test.skip(
      process.env.CLERK_TEST_MODE !== 'true',
      'Requires Clerk test mode to be enabled'
    )

    // Sign in first
    await page.goto('/sign-in')
    await page.fill('input[name="identifier"]', process.env.TEST_USER_EMAIL || 'test@example.com')
    await page.fill('input[name="password"]', process.env.TEST_USER_PASSWORD || 'TestPassword123!')
    await page.click('button[type="submit"]')
    await page.waitForURL(/^(?!.*sign-in)/, { timeout: 10000 })

    // Navigate to onboarding
    await page.goto('/advertise/onboarding')

    // Should see bar number form
    await expect(page.getByLabel(/bar number/i)).toBeVisible()
    await expect(page.getByLabel(/state|jurisdiction/i)).toBeVisible()
  })

  test('should display Turnstile widget on form', async ({ page }) => {
    test.skip(
      process.env.CLERK_TEST_MODE !== 'true',
      'Requires authentication'
    )

    // Sign in
    await page.goto('/sign-in')
    await page.fill('input[name="identifier"]', process.env.TEST_USER_EMAIL || 'test@example.com')
    await page.fill('input[name="password"]', process.env.TEST_USER_PASSWORD || 'TestPassword123!')
    await page.click('button[type="submit"]')
    await page.waitForURL(/^(?!.*sign-in)/, { timeout: 10000 })

    await page.goto('/advertise/onboarding')

    // Turnstile iframe should be visible
    const turnstileIframe = page.locator('iframe[title*="turnstile"], iframe[src*="cloudflare"]')
    await expect(turnstileIframe).toBeVisible({ timeout: 5000 })
  })

  test('should validate bar number format', async ({ page }) => {
    test.skip(
      process.env.CLERK_TEST_MODE !== 'true',
      'Requires authentication'
    )

    // Sign in
    await page.goto('/sign-in')
    await page.fill('input[name="identifier"]', process.env.TEST_USER_EMAIL || 'test@example.com')
    await page.fill('input[name="password"]', process.env.TEST_USER_PASSWORD || 'TestPassword123!')
    await page.click('button[type="submit"]')
    await page.waitForURL(/^(?!.*sign-in)/, { timeout: 10000 })

    await page.goto('/advertise/onboarding')

    // Try to submit invalid bar number
    const barNumberInput = page.getByLabel(/bar number/i)
    await barNumberInput.fill('INVALID!@#')

    const submitButton = page.getByRole('button', { name: /submit|verify|continue/i })
    await submitButton.click()

    // Should see validation error
    await expect(page.getByText(/invalid.*bar number/i)).toBeVisible({ timeout: 3000 })
  })

  test('should require all fields', async ({ page }) => {
    test.skip(
      process.env.CLERK_TEST_MODE !== 'true',
      'Requires authentication'
    )

    // Sign in
    await page.goto('/sign-in')
    await page.fill('input[name="identifier"]', process.env.TEST_USER_EMAIL || 'test@example.com')
    await page.fill('input[name="password"]', process.env.TEST_USER_PASSWORD || 'TestPassword123!')
    await page.click('button[type="submit"]')
    await page.waitForURL(/^(?!.*sign-in)/, { timeout: 10000 })

    await page.goto('/advertise/onboarding')

    // Try to submit without filling fields
    const submitButton = page.getByRole('button', { name: /submit|verify|continue/i })
    await submitButton.click()

    // Should see required field errors
    const errorMessages = page.locator('[role="alert"], .error, [aria-invalid="true"]')
    await expect(errorMessages).toHaveCount(1, { timeout: 3000 })
  })

  test('complete onboarding flow with valid bar number', async ({ page }) => {
    test.skip(
      process.env.CLERK_TEST_MODE !== 'true' || process.env.TURNSTILE_TEST_MODE !== 'true',
      'Requires Clerk and Turnstile test modes'
    )

    // Sign in
    await page.goto('/sign-in')
    await page.fill('input[name="identifier"]', process.env.TEST_USER_EMAIL || 'test@example.com')
    await page.fill('input[name="password"]', process.env.TEST_USER_PASSWORD || 'TestPassword123!')
    await page.click('button[type="submit"]')
    await page.waitForURL(/^(?!.*sign-in)/, { timeout: 10000 })

    await page.goto('/advertise/onboarding')

    // Fill in bar number
    const barNumberInput = page.getByLabel(/bar number/i)
    await barNumberInput.fill('CA123456')

    // Select state
    const stateSelect = page.getByLabel(/state|jurisdiction/i)
    await stateSelect.selectOption('CA')

    // Wait for Turnstile to complete (auto-completes in test mode)
    await page.waitForTimeout(2000)

    // Submit form
    const submitButton = page.getByRole('button', { name: /submit|verify|continue/i })
    await submitButton.click()

    // Should redirect to advertiser dashboard or show success
    await expect(async () => {
      const url = page.url()
      const hasSuccessMessage = await page.getByText(/success|verified|advertiser/i).isVisible()
      expect(url.includes('/advertiser') || hasSuccessMessage).toBe(true)
    }).toPass({ timeout: 10000 })
  })

  test('should show error for duplicate bar number', async ({ page }) => {
    test.skip(
      process.env.CLERK_TEST_MODE !== 'true' || process.env.TURNSTILE_TEST_MODE !== 'true',
      'Requires test modes and database setup with duplicate bar number'
    )

    // This test requires a bar number that's already in the database
    // You would need to set this up in your test database

    // Sign in
    await page.goto('/sign-in')
    await page.fill('input[name="identifier"]', process.env.TEST_USER_EMAIL || 'test@example.com')
    await page.fill('input[name="password"]', process.env.TEST_USER_PASSWORD || 'TestPassword123!')
    await page.click('button[type="submit"]')
    await page.waitForURL(/^(?!.*sign-in)/, { timeout: 10000 })

    await page.goto('/advertise/onboarding')

    // Fill in bar number that's already registered
    const barNumberInput = page.getByLabel(/bar number/i)
    await barNumberInput.fill('CA999999') // Use a known duplicate in test DB

    const stateSelect = page.getByLabel(/state|jurisdiction/i)
    await stateSelect.selectOption('CA')

    await page.waitForTimeout(2000)

    const submitButton = page.getByRole('button', { name: /submit|verify|continue/i })
    await submitButton.click()

    // Should see error about duplicate
    await expect(page.getByText(/already registered/i)).toBeVisible({ timeout: 5000 })
  })

  test('should handle Turnstile verification failure', async ({ page }) => {
    test.skip(
      process.env.CLERK_TEST_MODE !== 'true',
      'Requires authentication'
    )

    // Sign in
    await page.goto('/sign-in')
    await page.fill('input[name="identifier"]', process.env.TEST_USER_EMAIL || 'test@example.com')
    await page.fill('input[name="password"]', process.env.TEST_USER_PASSWORD || 'TestPassword123!')
    await page.click('button[type="submit"]')
    await page.waitForURL(/^(?!.*sign-in)/, { timeout: 10000 })

    await page.goto('/advertise/onboarding')

    const barNumberInput = page.getByLabel(/bar number/i)
    await barNumberInput.fill('CA123456')

    const stateSelect = page.getByLabel(/state|jurisdiction/i)
    await stateSelect.selectOption('CA')

    // Try to submit without completing Turnstile
    // (In production, this would be blocked by the widget)
    const submitButton = page.getByRole('button', { name: /submit|verify|continue/i })

    // Submit button should be disabled until Turnstile completes
    const isDisabled = await submitButton.isDisabled()
    expect(isDisabled).toBe(true)
  })
})

test.describe('Advertiser Onboarding UI/UX', () => {
  test('should display proper form labels and placeholders', async ({ page }) => {
    test.skip(
      process.env.CLERK_TEST_MODE !== 'true',
      'Requires authentication'
    )

    // Sign in
    await page.goto('/sign-in')
    await page.fill('input[name="identifier"]', process.env.TEST_USER_EMAIL || 'test@example.com')
    await page.fill('input[name="password"]', process.env.TEST_USER_PASSWORD || 'TestPassword123!')
    await page.click('button[type="submit"]')
    await page.waitForURL(/^(?!.*sign-in)/, { timeout: 10000 })

    await page.goto('/advertise/onboarding')

    // Check for proper labels
    await expect(page.getByLabel(/bar number/i)).toBeVisible()
    await expect(page.getByLabel(/state|jurisdiction/i)).toBeVisible()

    // Check for helpful placeholder text
    const barNumberInput = page.getByLabel(/bar number/i)
    const placeholder = await barNumberInput.getAttribute('placeholder')
    expect(placeholder).toBeTruthy()
  })

  test('should show loading state during submission', async ({ page }) => {
    test.skip(
      process.env.CLERK_TEST_MODE !== 'true' || process.env.TURNSTILE_TEST_MODE !== 'true',
      'Requires test modes'
    )

    // Sign in
    await page.goto('/sign-in')
    await page.fill('input[name="identifier"]', process.env.TEST_USER_EMAIL || 'test@example.com')
    await page.fill('input[name="password"]', process.env.TEST_USER_PASSWORD || 'TestPassword123!')
    await page.click('button[type="submit"]')
    await page.waitForURL(/^(?!.*sign-in)/, { timeout: 10000 })

    await page.goto('/advertise/onboarding')

    const barNumberInput = page.getByLabel(/bar number/i)
    await barNumberInput.fill('CA123456')

    const stateSelect = page.getByLabel(/state|jurisdiction/i)
    await stateSelect.selectOption('CA')

    await page.waitForTimeout(2000)

    const submitButton = page.getByRole('button', { name: /submit|verify|continue/i })
    await submitButton.click()

    // Should show loading state
    await expect(
      page.locator('[data-testid="loading"], .spinner, .loading')
    ).toBeVisible({ timeout: 2000 })
  })

  test('form should be responsive on mobile', async ({ page }) => {
    test.skip(
      process.env.CLERK_TEST_MODE !== 'true',
      'Requires authentication'
    )

    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })

    // Sign in
    await page.goto('/sign-in')
    await page.fill('input[name="identifier"]', process.env.TEST_USER_EMAIL || 'test@example.com')
    await page.fill('input[name="password"]', process.env.TEST_USER_PASSWORD || 'TestPassword123!')
    await page.click('button[type="submit"]')
    await page.waitForURL(/^(?!.*sign-in)/, { timeout: 10000 })

    await page.goto('/advertise/onboarding')

    // Form should be visible and usable
    const barNumberInput = page.getByLabel(/bar number/i)
    await expect(barNumberInput).toBeVisible()

    // Input should be tappable
    await barNumberInput.tap()
    await barNumberInput.fill('CA123456')

    // Turnstile should adapt to mobile
    const turnstileIframe = page.locator('iframe[title*="turnstile"]')
    await expect(turnstileIframe).toBeVisible()
  })
})

test.describe('Accessibility', () => {
  test('onboarding form should be keyboard navigable', async ({ page }) => {
    test.skip(
      process.env.CLERK_TEST_MODE !== 'true',
      'Requires authentication'
    )

    // Sign in
    await page.goto('/sign-in')
    await page.fill('input[name="identifier"]', process.env.TEST_USER_EMAIL || 'test@example.com')
    await page.fill('input[name="password"]', process.env.TEST_USER_PASSWORD || 'TestPassword123!')
    await page.click('button[type="submit"]')
    await page.waitForURL(/^(?!.*sign-in)/, { timeout: 10000 })

    await page.goto('/advertise/onboarding')

    // Tab through form
    await page.keyboard.press('Tab')
    const barNumberInput = page.getByLabel(/bar number/i)
    await expect(barNumberInput).toBeFocused()

    await page.keyboard.press('Tab')
    const stateSelect = page.getByLabel(/state|jurisdiction/i)
    await expect(stateSelect).toBeFocused()
  })

  test('should have proper ARIA labels and roles', async ({ page }) => {
    test.skip(
      process.env.CLERK_TEST_MODE !== 'true',
      'Requires authentication'
    )

    // Sign in
    await page.goto('/sign-in')
    await page.fill('input[name="identifier"]', process.env.TEST_USER_EMAIL || 'test@example.com')
    await page.fill('input[name="password"]', process.env.TEST_USER_PASSWORD || 'TestPassword123!')
    await page.click('button[type="submit"]')
    await page.waitForURL(/^(?!.*sign-in)/, { timeout: 10000 })

    await page.goto('/advertise/onboarding')

    // Check for proper form role
    const form = page.locator('form')
    await expect(form).toHaveAttribute('role', 'form')

    // Check for aria-required on required fields
    const barNumberInput = page.getByLabel(/bar number/i)
    await expect(barNumberInput).toHaveAttribute('aria-required', 'true')
  })

  test('error messages should be announced to screen readers', async ({ page }) => {
    test.skip(
      process.env.CLERK_TEST_MODE !== 'true',
      'Requires authentication'
    )

    // Sign in
    await page.goto('/sign-in')
    await page.fill('input[name="identifier"]', process.env.TEST_USER_EMAIL || 'test@example.com')
    await page.fill('input[name="password"]', process.env.TEST_USER_PASSWORD || 'TestPassword123!')
    await page.click('button[type="submit"]')
    await page.waitForURL(/^(?!.*sign-in)/, { timeout: 10000 })

    await page.goto('/advertise/onboarding')

    // Try to submit with invalid data
    const barNumberInput = page.getByLabel(/bar number/i)
    await barNumberInput.fill('INVALID')

    const submitButton = page.getByRole('button', { name: /submit|verify|continue/i })
    await submitButton.click()

    // Error should have role="alert" for screen readers
    const errorAlert = page.locator('[role="alert"]')
    await expect(errorAlert).toBeVisible({ timeout: 3000 })
  })
})

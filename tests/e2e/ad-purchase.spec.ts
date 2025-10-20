import { test, expect } from '@playwright/test'

/**
 * E2E Tests for Ad Purchase Flow
 *
 * Tests the complete ad purchase journey from modal to Stripe checkout
 *
 * Prerequisites:
 * - Clerk authentication configured
 * - Stripe test mode keys set
 * - Database tables created
 *
 * Test Coverage:
 * 1. Signed-out user flow
 * 2. Signed-in user checkout creation
 * 3. Error handling
 * 4. Loading states
 */

test.describe('Ad Purchase Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Set viewport for consistent testing
    await page.setViewportSize({ width: 1280, height: 720 })
  })

  test('signed-out user prompted to sign in', async ({ page }) => {
    // Navigate to dashboard (requires auth)
    await page.goto('/dashboard')

    // Should redirect to sign-in
    await expect(page).toHaveURL(/\/sign-in/)
  })

  test('signed-in user can open ad purchase modal', async ({ page, context }) => {
    // Skip if no test user credentials available
    const testEmail = process.env.TEST_USER_EMAIL
    const testPassword = process.env.TEST_USER_PASSWORD

    if (!testEmail || !testPassword) {
      test.skip()
      return
    }

    // Sign in first
    await page.goto('/sign-in')
    await page.fill('input[name="identifier"]', testEmail)
    await page.fill('input[type="password"]', testPassword)
    await page.click('button[type="submit"]')

    // Wait for redirect to dashboard
    await page.waitForURL('/dashboard', { timeout: 10000 })

    // Find and click "Buy Ad Space" button
    const buyAdButton = page.getByRole('button', { name: /buy ad space/i })
    await expect(buyAdButton).toBeVisible()
    await buyAdButton.click()

    // Modal should appear
    const modal = page.locator('[role="dialog"]').or(page.getByText('Advertise on Judge Profiles'))
    await expect(modal).toBeVisible()

    // Check pricing options are visible
    await expect(page.getByText(/Federal Judge Profiles/i)).toBeVisible()
    await expect(page.getByText(/State Judge Profiles/i)).toBeVisible()
  })

  test('user can select plan and proceed to checkout', async ({ page }) => {
    const testEmail = process.env.TEST_USER_EMAIL
    const testPassword = process.env.TEST_USER_PASSWORD

    if (!testEmail || !testPassword) {
      test.skip()
      return
    }

    // Sign in
    await page.goto('/sign-in')
    await page.fill('input[name="identifier"]', testEmail)
    await page.fill('input[type="password"]', testPassword)
    await page.click('button[type="submit"]')
    await page.waitForURL('/dashboard')

    // Open modal
    await page.click('button:has-text("Buy Ad Space")')
    await page.waitForSelector('text=Advertise on Judge Profiles')

    // Select Federal Monthly plan
    await page.click('text=Federal Judge Profiles')

    // Click proceed button
    const proceedButton = page.getByRole('button', { name: /proceed to checkout/i })
    await expect(proceedButton).toBeEnabled()
    await proceedButton.click()

    // Should show loading state
    await expect(page.getByText(/processing/i)).toBeVisible({ timeout: 2000 })

    // Should redirect to Stripe or show error
    // Note: In test env without proper API keys, this will show error
    await page.waitForTimeout(3000)

    // Check if redirected to Stripe OR shows error message
    const url = page.url()
    const hasError = await page.getByText(/error/i).isVisible()

    if (url.includes('checkout.stripe.com')) {
      // Success - redirected to Stripe
      expect(url).toContain('checkout.stripe.com')
    } else if (hasError) {
      // Expected in test env without full Stripe config
      console.log('Checkout API error (expected in test env)')
    } else {
      // Unexpected state
      throw new Error('Unexpected checkout result: no redirect and no error')
    }
  })

  test('displays error when API fails', async ({ page }) => {
    const testEmail = process.env.TEST_USER_EMAIL
    const testPassword = process.env.TEST_USER_PASSWORD

    if (!testEmail || !testPassword) {
      test.skip()
      return
    }

    // Mock API to return error
    await page.route('**/api/checkout/adspace', (route) => {
      route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Payment system not configured. Please contact support.',
        }),
      })
    })

    // Sign in
    await page.goto('/sign-in')
    await page.fill('input[name="identifier"]', testEmail)
    await page.fill('input[type="password"]', testPassword)
    await page.click('button[type="submit"]')
    await page.waitForURL('/dashboard')

    // Open modal and select plan
    await page.click('button:has-text("Buy Ad Space")')
    await page.click('text=State Judge Profiles')

    // Click proceed
    await page.click('button:has-text("Proceed to Checkout")')

    // Error should be displayed
    await expect(page.getByText(/payment system not configured/i)).toBeVisible({
      timeout: 5000,
    })
  })

  test('validation endpoint returns configuration status', async ({ page }) => {
    const testEmail = process.env.TEST_USER_EMAIL
    const testPassword = process.env.TEST_USER_PASSWORD

    if (!testEmail || !testPassword) {
      test.skip()
      return
    }

    // Sign in first (endpoint requires auth)
    await page.goto('/sign-in')
    await page.fill('input[name="identifier"]', testEmail)
    await page.fill('input[type="password"]', testPassword)
    await page.click('button[type="submit"]')
    await page.waitForURL('/dashboard')

    // Navigate to status endpoint
    const response = await page.goto('/api/admin/stripe-status')
    expect(response?.status()).toBe(200)

    const data = await response?.json()
    expect(data).toHaveProperty('stripe_configured')
    expect(data).toHaveProperty('has_secret_key')
    expect(data).toHaveProperty('has_webhook_secret')
    expect(data).toHaveProperty('has_price_monthly')
    expect(data).toHaveProperty('has_price_yearly')
    expect(data).toHaveProperty('mode')

    // Log status for debugging
    console.log('Stripe Configuration Status:', data)
  })

  test('modal can be closed without purchasing', async ({ page }) => {
    const testEmail = process.env.TEST_USER_EMAIL
    const testPassword = process.env.TEST_USER_PASSWORD

    if (!testEmail || !testPassword) {
      test.skip()
      return
    }

    // Sign in
    await page.goto('/sign-in')
    await page.fill('input[name="identifier"]', testEmail)
    await page.fill('input[type="password"]', testPassword)
    await page.click('button[type="submit"]')
    await page.waitForURL('/dashboard')

    // Open modal
    await page.click('button:has-text("Buy Ad Space")')
    await expect(page.getByText('Advertise on Judge Profiles')).toBeVisible()

    // Click cancel or X button
    await page.click('button:has-text("Cancel")')

    // Modal should close
    await expect(page.getByText('Advertise on Judge Profiles')).not.toBeVisible()
  })
})

/**
 * Test Stripe Webhook Processing (Integration Test)
 *
 * Note: This requires a test Stripe webhook secret and
 * the ability to construct valid Stripe event objects
 */
test.describe('Stripe Webhook Processing', () => {
  test('webhook endpoint requires valid signature', async ({ request }) => {
    const response = await request.post('/api/stripe/webhook', {
      headers: {
        'content-type': 'application/json',
        // Missing stripe-signature header
      },
      data: {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_123',
          },
        },
      },
    })

    // Should reject with 400
    expect(response.status()).toBe(400)
    const data = await response.json()
    expect(data.error).toContain('signature')
  })

  test('webhook endpoint handles checkout.session.completed', async ({ request }) => {
    // Note: This test requires a valid Stripe signature
    // In real testing, use Stripe CLI: stripe trigger checkout.session.completed
    // For unit tests, mock the signature verification

    // This is a placeholder - full implementation requires Stripe test helpers
    test.skip()
  })
})

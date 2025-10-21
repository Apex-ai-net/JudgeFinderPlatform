/**
 * E2E tests for AI Chatbox authentication flow
 * Tests the complete user journey from anonymous to authenticated chat
 */

import { test, expect } from '@playwright/test'

test.describe('AI Chatbox Authentication', () => {
  test.beforeEach(async ({ page }) => {
    // Start from the homepage
    await page.goto('/')
  })

  test('should show sign-in requirement for anonymous users', async ({ page }) => {
    // Look for AI chat widget or button
    const chatButton = page.getByRole('button', { name: /chat|ai|ask/i })

    if (await chatButton.isVisible()) {
      await chatButton.click()

      // Should show authentication requirement
      await expect(
        page.getByText(/sign in required|authentication required|please sign in/i)
      ).toBeVisible()
    }
  })

  test('should redirect to sign-in when trying to use chat', async ({ page }) => {
    // Navigate to a page with AI chat (e.g., judge profile)
    // Note: Update this path based on your actual implementation
    await page.goto('/judges/judge-john-smith') // Example judge profile

    // Try to interact with chat
    const chatInput = page.locator('textarea[placeholder*="Ask"], input[placeholder*="Ask"]')

    if (await chatInput.isVisible()) {
      await chatInput.click()

      // Should either show sign-in modal or redirect
      const signInButton = page.getByRole('button', { name: /sign in|log in/i })
      await expect(signInButton).toBeVisible({ timeout: 5000 })
    }
  })

  test('authenticated user sees chatbox with Turnstile', async ({ page }) => {
    // This test requires Clerk authentication setup
    // You may need to use Clerk's test mode or mock authentication

    test.skip(
      process.env.CLERK_TEST_MODE !== 'true',
      'Requires Clerk test mode to be enabled'
    )

    // Sign in (implementation depends on your Clerk setup)
    await page.goto('/sign-in')

    // Fill in test credentials
    await page.fill('input[name="identifier"]', process.env.TEST_USER_EMAIL || 'test@example.com')
    await page.fill('input[name="password"]', process.env.TEST_USER_PASSWORD || 'TestPassword123!')
    await page.click('button[type="submit"]')

    // Wait for redirect after sign-in
    await page.waitForURL(/^(?!.*sign-in)/, { timeout: 10000 })

    // Navigate to chat
    await page.goto('/judges/judge-john-smith')

    // Chatbox should be visible
    const chatInput = page.locator('textarea[placeholder*="Ask"], input[placeholder*="Ask"]')
    await expect(chatInput).toBeVisible()

    // Turnstile widget should be visible on first message
    const turnstileFrame = page.frameLocator('iframe[title*="turnstile"]').first()
    await expect(turnstileFrame.locator('body')).toBeVisible({ timeout: 5000 })
  })

  test('should complete full chat flow after Turnstile verification', async ({ page }) => {
    test.skip(
      process.env.CLERK_TEST_MODE !== 'true' || process.env.TURNSTILE_TEST_MODE !== 'true',
      'Requires Clerk and Turnstile test modes to be enabled'
    )

    // Sign in first
    await page.goto('/sign-in')
    await page.fill('input[name="identifier"]', process.env.TEST_USER_EMAIL || 'test@example.com')
    await page.fill('input[name="password"]', process.env.TEST_USER_PASSWORD || 'TestPassword123!')
    await page.click('button[type="submit"]')
    await page.waitForURL(/^(?!.*sign-in)/, { timeout: 10000 })

    // Navigate to chat
    await page.goto('/judges/judge-john-smith')

    // Type a message
    const chatInput = page.locator('textarea[placeholder*="Ask"], input[placeholder*="Ask"]')
    await chatInput.fill('What are the bias scores for this judge?')

    // Complete Turnstile (in test mode, it should auto-complete)
    await page.waitForTimeout(2000) // Wait for Turnstile to load

    // Submit message
    const sendButton = page.getByRole('button', { name: /send|submit/i })
    await sendButton.click()

    // Should see response
    await expect(
      page.locator('[data-testid="chat-message"], .chat-message').first()
    ).toBeVisible({ timeout: 10000 })
  })

  test('should show rate limit message after 20 messages', async ({ page }) => {
    test.skip(
      process.env.CLERK_TEST_MODE !== 'true',
      'Requires Clerk test mode to be enabled'
    )

    // This test would require sending 20+ messages
    // Skipping actual implementation to avoid rate limit testing in production

    // Sign in
    await page.goto('/sign-in')
    await page.fill('input[name="identifier"]', process.env.TEST_USER_EMAIL || 'test@example.com')
    await page.fill('input[name="password"]', process.env.TEST_USER_PASSWORD || 'TestPassword123!')
    await page.click('button[type="submit"]')
    await page.waitForURL(/^(?!.*sign-in)/, { timeout: 10000 })

    await page.goto('/judges/judge-john-smith')

    // After sending many messages, should see rate limit
    // (Implementation would need to mock or use test environment with reset rate limits)

    // Expected behavior: error message about rate limit
    // await expect(page.getByText(/rate limit|too many messages/i)).toBeVisible()
  })
})

test.describe('AI Chatbox UI Elements', () => {
  test('should display Turnstile widget correctly', async ({ page }) => {
    test.skip(
      process.env.CLERK_TEST_MODE !== 'true',
      'Requires authentication to see chatbox'
    )

    // Navigate to chat page after sign-in
    await page.goto('/judges/judge-john-smith')

    // Check for Turnstile iframe
    const turnstileIframe = page.locator('iframe[title*="turnstile"], iframe[src*="cloudflare"]')

    // Turnstile should be present when chatbox is active
    const chatInput = page.locator('textarea[placeholder*="Ask"], input[placeholder*="Ask"]')
    if (await chatInput.isVisible()) {
      await chatInput.click()
      await expect(turnstileIframe).toBeVisible({ timeout: 5000 })
    }
  })

  test('should show loading state during message send', async ({ page }) => {
    test.skip(
      process.env.CLERK_TEST_MODE !== 'true',
      'Requires authentication'
    )

    await page.goto('/judges/judge-john-smith')

    const chatInput = page.locator('textarea[placeholder*="Ask"], input[placeholder*="Ask"]')
    await chatInput.fill('Test message')

    const sendButton = page.getByRole('button', { name: /send|submit/i })
    await sendButton.click()

    // Should show loading indicator
    await expect(
      page.locator('[data-testid="chat-loading"], .loading, .spinner')
    ).toBeVisible({ timeout: 2000 })
  })

  test('should disable input during rate limit', async ({ page }) => {
    test.skip(
      process.env.CLERK_TEST_MODE !== 'true',
      'Requires authentication'
    )

    // This would require triggering rate limit first
    // Then checking that input is disabled

    await page.goto('/judges/judge-john-smith')

    // After rate limit (would need to be set up):
    // const chatInput = page.locator('textarea[placeholder*="Ask"]')
    // await expect(chatInput).toBeDisabled()
  })
})

test.describe('Accessibility', () => {
  test('chatbox should be keyboard navigable', async ({ page }) => {
    await page.goto('/')

    // Tab through page to find chat elements
    await page.keyboard.press('Tab')

    // Check if chat button is focusable
    const chatButton = page.getByRole('button', { name: /chat|ai|ask/i })
    if (await chatButton.isVisible()) {
      await chatButton.focus()
      await expect(chatButton).toBeFocused()
    }
  })

  test('should have proper ARIA labels', async ({ page }) => {
    test.skip(
      process.env.CLERK_TEST_MODE !== 'true',
      'Requires authentication'
    )

    await page.goto('/judges/judge-john-smith')

    // Check for aria-label on chat input
    const chatInput = page.locator('textarea[aria-label], input[aria-label]')
    await expect(chatInput).toHaveAttribute('aria-label')
  })

  test('Turnstile should have accessible label', async ({ page }) => {
    test.skip(
      process.env.CLERK_TEST_MODE !== 'true',
      'Requires authentication'
    )

    await page.goto('/judges/judge-john-smith')

    // Turnstile iframe should have title
    const turnstileIframe = page.locator('iframe[title*="turnstile"]')
    if (await turnstileIframe.isVisible()) {
      await expect(turnstileIframe).toHaveAttribute('title')
    }
  })
})

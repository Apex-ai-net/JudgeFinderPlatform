# E2E Testing Guide for Authentication & Bot Protection

This directory contains end-to-end tests for the authentication and bot protection features of JudgeFinder.

## Test Coverage

### AI Chatbox Authentication (`ai-chatbox-auth.spec.ts`)
- Anonymous user sign-in requirement
- Authenticated user access to chatbox
- Turnstile CAPTCHA verification flow
- Rate limiting (20 messages/hour)
- UI/UX elements and loading states
- Accessibility (keyboard navigation, ARIA labels)

### Advertiser Onboarding (`advertiser-onboarding.spec.ts`)
- Navigation from /advertise to /advertise/onboarding
- Authentication requirement enforcement
- Bar number validation and format checking
- Turnstile CAPTCHA verification
- Duplicate bar number detection
- Role assignment to 'advertiser'
- Form UI/UX and error handling
- Mobile responsiveness
- Accessibility compliance

## Running Tests

### All E2E Tests
```bash
npm run test:e2e
```

### Specific Test File
```bash
npx playwright test tests/e2e/auth/ai-chatbox-auth.spec.ts
```

### Headed Mode (See Browser)
```bash
npm run test:e2e:headed
```

### UI Mode (Interactive)
```bash
npm run test:e2e:ui
```

### Debug Mode
```bash
npx playwright test --debug
```

## Environment Setup

### Required Environment Variables

Create a `.env.test` file with:

```env
# Clerk Authentication (Test Mode)
CLERK_TEST_MODE=true
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=TestPassword123!

# Turnstile (Test Mode)
TURNSTILE_TEST_MODE=true
NEXT_PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA
TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA

# Database (Test)
NEXT_PUBLIC_SUPABASE_URL=https://test.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=test-anon-key
SUPABASE_SERVICE_ROLE_KEY=test-service-key

# Rate Limiting (Optional - uses mock if not set)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

### Test User Setup

1. **Clerk Test Users**: Create test users in your Clerk dashboard with test mode enabled
2. **Database Seeding**: Seed your test database with sample judges and courts
3. **Turnstile Test Keys**: Use Cloudflare's official test keys (auto-pass)

## Test Strategy

### Unit Tests (`tests/unit/`)
- Individual function testing
- Turnstile verification logic
- Bar number validation regex
- No external dependencies

### Integration Tests (`tests/integration/`)
- API route testing
- Mocked external services (Clerk, Supabase, Turnstile)
- Rate limiting scenarios
- Error handling

### E2E Tests (`tests/e2e/`)
- Full user journeys
- Real browser interactions
- Authentication flows
- UI/UX validation
- Accessibility checks

## Conditional Tests

Some tests are skipped unless specific conditions are met:

```typescript
test.skip(
  process.env.CLERK_TEST_MODE !== 'true',
  'Requires Clerk test mode to be enabled'
)
```

This prevents tests from running against production or when test infrastructure isn't available.

## Debugging Failed Tests

### View Test Report
```bash
npx playwright show-report
```

### Trace Viewer (After Failure)
```bash
npx playwright show-trace test-results/[test-name]/trace.zip
```

### Screenshots
Failed tests automatically capture screenshots in `test-results/`

### Videos
Failed tests record videos (if configured in playwright.config.ts)

## CI/CD Integration

Tests run automatically on:
- Pull requests
- Pushes to main branch
- Scheduled runs (nightly)

GitHub Actions workflow: `.github/workflows/e2e-tests.yml`

## Best Practices

1. **Use Test IDs**: Add `data-testid` attributes for reliable element selection
2. **Wait for Elements**: Use `await expect(...).toBeVisible()` instead of fixed timeouts
3. **Clean Up**: Reset test data after each test
4. **Isolate Tests**: Each test should be independent
5. **Mock External Services**: Don't hit real APIs in tests
6. **Accessibility**: Include a11y checks in every test suite

## Troubleshooting

### Test Timeout
Increase timeout in playwright.config.ts:
```typescript
timeout: 60 * 1000, // 60 seconds
```

### Flaky Tests
- Add explicit waits: `await page.waitForLoadState('networkidle')`
- Use retry logic: `retries: process.env.CI ? 2 : 0`

### Authentication Issues
- Verify Clerk test mode is enabled
- Check test user credentials
- Clear browser storage between tests

### Turnstile Issues
- Use test keys (auto-pass): `1x00000000000000000000AA`
- Increase wait time for iframe loading
- Check for Content Security Policy blocks

## Writing New Tests

Template for new E2E test:

```typescript
import { test, expect } from '@playwright/test'

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    // Setup before each test
    await page.goto('/')
  })

  test('should do something', async ({ page }) => {
    // Arrange
    await page.goto('/path')

    // Act
    await page.click('button')

    // Assert
    await expect(page.locator('.result')).toBeVisible()
  })
})
```

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Testing Library Best Practices](https://testing-library.com/docs/queries/about)
- [Clerk Testing Guide](https://clerk.com/docs/testing)
- [Turnstile Testing](https://developers.cloudflare.com/turnstile/test-keys/)

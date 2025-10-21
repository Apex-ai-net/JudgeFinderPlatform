# JudgeFinder Authentication & Bot Protection Tests

Comprehensive test suite for authentication, bot protection, and rate limiting features.

## Overview

This test suite covers:
- Turnstile CAPTCHA verification
- AI chatbox authentication and rate limiting
- Search rate limiting (tiered: anonymous vs authenticated)
- Advertiser onboarding and bar number verification
- Security and error handling

## Test Structure

```
tests/
├── unit/                    # Unit tests (isolated functions)
│   └── auth/
│       ├── turnstile.test.ts
│       └── bar-number-validation.test.ts
├── integration/             # Integration tests (API routes)
│   └── api/
│       ├── chat-route.test.ts
│       ├── search-route.test.ts
│       └── verify-bar-route.test.ts
├── e2e/                     # End-to-end tests (full flows)
│   └── auth/
│       ├── ai-chatbox-auth.spec.ts
│       └── advertiser-onboarding.spec.ts
├── fixtures/                # Test data and mocks
│   ├── auth.ts
│   ├── users.ts
│   ├── judges.ts
│   └── cases.ts
├── helpers/                 # Test utilities
│   ├── auth-helpers.ts
│   └── test-utils.ts
└── setup/                   # Test configuration
    └── test-setup.ts
```

## Quick Start

### Run All Tests
```bash
npm test
```

### Run by Category
```bash
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests only
npm run test:e2e          # E2E tests only
npm run test:a11y         # Accessibility tests only
```

### Watch Mode
```bash
npm run test:watch
```

### Coverage Report
```bash
npm run test:coverage
```

## Test Coverage

### 1. Turnstile CAPTCHA (`lib/auth/turnstile.ts`)

**Unit Tests** (`tests/unit/auth/turnstile.test.ts`):
- ✓ Verifies valid tokens successfully
- ✓ Includes IP address in verification
- ✓ Rejects invalid tokens
- ✓ Rejects empty/whitespace tokens
- ✓ Handles missing secret key (dev vs prod)
- ✓ Handles API errors gracefully
- ✓ Handles network errors
- ✓ Tests all Turnstile error codes
- ✓ Checks configuration validation
- ✓ Tests site key retrieval

**Integration Coverage**:
- Used in chat route tests
- Used in verify-bar route tests
- Mock API responses for all scenarios

### 2. AI Chatbox (`/api/chat`)

**Integration Tests** (`tests/integration/api/chat-route.test.ts`):
- ✓ Rejects unauthenticated requests (401)
- ✓ Accepts authenticated requests
- ✓ Enforces 20 messages/hour rate limit
- ✓ Includes rate limit headers
- ✓ Verifies Turnstile token when provided
- ✓ Rejects invalid Turnstile tokens
- ✓ Validates message array requirement
- ✓ Handles missing OpenAI API key
- ✓ Accepts judge_id and judge_slug parameters
- ✓ Supports streaming and non-streaming modes

**E2E Tests** (`tests/e2e/auth/ai-chatbox-auth.spec.ts`):
- ✓ Shows sign-in requirement for anonymous users
- ✓ Redirects to sign-in when needed
- ✓ Displays chatbox with Turnstile after auth
- ✓ Completes full chat flow with verification
- ✓ Shows rate limit message after 20 messages
- ✓ Displays Turnstile widget correctly
- ✓ Shows loading state during send
- ✓ Keyboard navigation support
- ✓ Proper ARIA labels for accessibility

### 3. Search Rate Limiting (`/api/judges/search`)

**Integration Tests** (`tests/integration/api/search-route.test.ts`):

**Anonymous Users**:
- ✓ Enforces 10 searches/24 hours
- ✓ Includes rate limit headers (10 limit)
- ✓ Allows searches within limit
- ✓ Uses client IP as rate limit key
- ✓ Shows auth requirement in error

**Authenticated Users**:
- ✓ Enforces 100 searches/hour
- ✓ Includes rate limit headers (100 limit)
- ✓ Allows searches within limit
- ✓ Uses user ID as rate limit key
- ✓ Higher limits than anonymous

**Search Functionality**:
- ✓ Returns results for valid queries
- ✓ Handles empty queries
- ✓ Supports pagination
- ✓ Enforces max limit of 500
- ✓ Supports jurisdiction filter
- ✓ Supports court_type filter
- ✓ Sets cache headers
- ✓ Includes remaining count
- ✓ Handles database errors

### 4. Bar Number Verification (`/api/advertising/verify-bar`)

**Unit Tests** (`tests/unit/auth/bar-number-validation.test.ts`):
- ✓ Accepts valid bar number formats
- ✓ Normalizes to uppercase
- ✓ Trims whitespace
- ✓ Rejects invalid characters
- ✓ Rejects too short/long numbers
- ✓ Prevents SQL injection
- ✓ Prevents XSS attacks
- ✓ Handles edge cases (null, undefined)
- ✓ Tests state-specific formats

**Integration Tests** (`tests/integration/api/verify-bar-route.test.ts`):
- ✓ Rejects unauthenticated requests
- ✓ Accepts authenticated requests
- ✓ Verifies Turnstile token
- ✓ Rejects invalid Turnstile
- ✓ Validates bar number format
- ✓ Normalizes and trims input
- ✓ Detects duplicate bar numbers
- ✓ Allows updating own bar number
- ✓ Sets verification_status to 'verified'
- ✓ Assigns 'advertiser' role
- ✓ Handles database errors

**E2E Tests** (`tests/e2e/auth/advertiser-onboarding.spec.ts`):
- ✓ Navigates from /advertise to onboarding
- ✓ Shows auth requirement
- ✓ Displays onboarding form when authenticated
- ✓ Shows Turnstile widget
- ✓ Validates bar number format
- ✓ Requires all fields
- ✓ Completes full onboarding flow
- ✓ Shows error for duplicate bar number
- ✓ Handles Turnstile failure
- ✓ Proper labels and placeholders
- ✓ Loading states
- ✓ Mobile responsive
- ✓ Keyboard navigation
- ✓ ARIA labels and roles

## Test Data & Fixtures

### Mock Users (`tests/fixtures/users.ts`)
- Regular user
- Verified lawyer
- Admin user
- Advertiser user

### Mock Auth Data (`tests/fixtures/auth.ts`)
- Turnstile test tokens (valid, invalid, expired)
- Turnstile API responses
- Rate limit scenarios
- Valid/invalid bar numbers
- Chat messages
- Search queries
- Client IP addresses

### Helper Functions (`tests/helpers/auth-helpers.ts`)
- Mock authenticated/unauthenticated sessions
- Mock Turnstile API responses
- Mock rate limiters
- Create mock NextRequest objects
- Extract JSON/headers from responses
- Verify rate limit headers

## Configuration

### Vitest (Unit & Integration)
Config: `vitest.config.ts`

```typescript
{
  environment: 'happy-dom',
  globals: true,
  setupFiles: ['./tests/setup/test-setup.ts'],
  coverage: {
    thresholds: {
      lines: 60,
      functions: 60,
      branches: 50,
      statements: 60,
    }
  }
}
```

### Playwright (E2E)
Config: `playwright.config.ts`

```typescript
{
  testDir: './tests/e2e',
  timeout: 30000,
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  projects: ['chromium', 'firefox', 'webkit', 'Mobile Chrome', 'Mobile Safari']
}
```

## Environment Variables for Testing

```env
# Required for all tests
NODE_ENV=test
NEXT_PUBLIC_SUPABASE_URL=https://test.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=test-anon-key

# Required for E2E tests
CLERK_TEST_MODE=true
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=TestPassword123!

# Turnstile (use test keys)
NEXT_PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA
TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA

# Optional (for rate limiting tests)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

## CI/CD Integration

### GitHub Actions Workflow

```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:ci
      - run: npm run test:e2e
```

### Pre-commit Hooks

Tests run automatically before commits:
```bash
npm run precommit
```

## Writing New Tests

### Unit Test Template

```typescript
import { describe, it, expect } from 'vitest'

describe('Feature Name', () => {
  it('should do something', () => {
    // Arrange
    const input = 'test'

    // Act
    const result = functionUnderTest(input)

    // Assert
    expect(result).toBe('expected')
  })
})
```

### Integration Test Template

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { POST } from '@/app/api/route'
import { createMockRequest, extractJSON } from '../helpers/auth-helpers'

describe('POST /api/route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should handle request', async () => {
    const request = createMockRequest('http://localhost:3000/api/route', {
      method: 'POST',
      body: { data: 'test' },
    })

    const response = await POST(request)
    const json = await extractJSON(response)

    expect(response.status).toBe(200)
    expect(json).toMatchObject({ success: true })
  })
})
```

### E2E Test Template

```typescript
import { test, expect } from '@playwright/test'

test.describe('Feature', () => {
  test('should complete flow', async ({ page }) => {
    await page.goto('/path')
    await page.click('button')
    await expect(page.locator('.result')).toBeVisible()
  })
})
```

## Best Practices

1. **AAA Pattern**: Arrange, Act, Assert
2. **One Assertion Per Test**: Focus on single behavior
3. **Descriptive Names**: Test names should describe what's being tested
4. **Independent Tests**: Each test should run in isolation
5. **Mock External Services**: Don't hit real APIs
6. **Clean Up**: Reset state after each test
7. **Accessibility**: Include a11y checks
8. **Error Scenarios**: Test both success and failure paths

## Troubleshooting

### Tests Timing Out
- Increase timeout in config
- Add explicit waits: `await page.waitForSelector()`
- Check for network issues

### Flaky Tests
- Add retries: `retries: 2`
- Use `waitForLoadState('networkidle')`
- Avoid fixed timeouts

### Mock Issues
- Clear mocks in `beforeEach()`
- Use `vi.restoreAllMocks()` in `afterEach()`
- Check mock implementation

### Authentication Issues
- Verify Clerk test mode is enabled
- Check test user credentials exist
- Clear cookies between tests

## Coverage Goals

| Category | Target | Current |
|----------|--------|---------|
| Unit Tests | 80% | - |
| Integration Tests | 70% | - |
| E2E Tests | Critical Paths | - |
| Overall | 60% | - |

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Library](https://testing-library.com/)
- [Jest DOM Matchers](https://github.com/testing-library/jest-dom)

## Support

For test-related questions or issues:
1. Check test logs and error messages
2. Review test documentation
3. Check CI/CD pipeline results
4. Contact the development team

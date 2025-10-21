# Authentication & Bot Protection Tests - Quick Start

Get up and running with testing in 5 minutes.

## Prerequisites

```bash
npm install
```

## Run Tests

### Option 1: NPM Scripts (Recommended)

```bash
# Run all tests
npm test

# Run specific test types
npm run test:unit          # Fast: ~500ms
npm run test:integration   # Medium: ~2s
npm run test:e2e          # Slow: ~30s

# Watch mode (auto-rerun on file changes)
npm run test:watch

# Coverage report
npm run test:coverage
```

### Option 2: Quick Script

```bash
# Run all auth tests
./scripts/test-auth.sh all

# Run specific category
./scripts/test-auth.sh unit
./scripts/test-auth.sh integration
./scripts/test-auth.sh e2e
```

### Option 3: Direct Commands

```bash
# Unit tests only
npx vitest run tests/unit/auth/

# Integration tests only
npx vitest run tests/integration/api/chat-route.test.ts

# E2E tests only
npx playwright test tests/e2e/auth/
```

## What Gets Tested

### Unit Tests (60 tests, ~400ms)
- ✓ Turnstile CAPTCHA verification logic
- ✓ Bar number validation and format checking

### Integration Tests (92 tests, ~2s)
- ✓ `/api/chat` - Authentication + rate limiting + Turnstile
- ✓ `/api/judges/search` - Tiered rate limiting (anon vs auth)
- ✓ `/api/advertising/verify-bar` - Bar verification + role assignment

### E2E Tests (23 tests, ~30s)
- ✓ AI chatbox authentication flow
- ✓ Advertiser onboarding flow
- ✓ Accessibility checks

## Expected Output

```
✓ tests/unit/auth/turnstile.test.ts (26 tests)
✓ tests/unit/auth/bar-number-validation.test.ts (34 tests)

Test Files  3 passed (3)
     Tests  69 passed (69)
```

## Common Issues

### Issue: Tests timeout
**Solution**: Increase timeout in config or check for infinite loops

### Issue: Clerk auth errors
**Solution**: Verify `CLERK_SECRET_KEY` is set in environment

### Issue: E2E tests skip
**Solution**: Set `CLERK_TEST_MODE=true` in `.env.test`

### Issue: Turnstile verification fails
**Solution**: Use test keys: `1x00000000000000000000AA`

## Environment Setup

Create `.env.test`:

```env
NODE_ENV=test
CLERK_TEST_MODE=true
TURNSTILE_TEST_MODE=true
NEXT_PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA
TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA
```

## Debug a Failing Test

### Unit/Integration Tests

```bash
# Run single test file
npx vitest run tests/unit/auth/turnstile.test.ts

# Run with verbose output
npx vitest run --reporter=verbose

# Run in watch mode for debugging
npx vitest tests/unit/auth/turnstile.test.ts
```

### E2E Tests

```bash
# Run with browser visible
npm run test:e2e:headed

# Run with interactive UI
npm run test:e2e:ui

# Debug mode
npx playwright test --debug tests/e2e/auth/ai-chatbox-auth.spec.ts

# View test report
npx playwright show-report
```

## Test Structure

```
tests/
├── fixtures/auth.ts          # Mock data (Turnstile tokens, users, etc.)
├── helpers/auth-helpers.ts   # Helper functions for testing
├── unit/auth/                # Unit tests (isolated functions)
├── integration/api/          # API route tests
└── e2e/auth/                 # Full user flow tests
```

## Writing Your First Test

### Unit Test Template

```typescript
import { describe, it, expect } from 'vitest'

describe('My Feature', () => {
  it('should do something', () => {
    const result = myFunction('input')
    expect(result).toBe('expected')
  })
})
```

### Integration Test Template

```typescript
import { describe, it, expect } from 'vitest'
import { POST } from '@/app/api/my-route/route'
import { createMockRequest } from '../../helpers/auth-helpers'

describe('POST /api/my-route', () => {
  it('should handle request', async () => {
    const request = createMockRequest('http://localhost:3000/api/my-route', {
      method: 'POST',
      body: { data: 'test' },
    })

    const response = await POST(request)

    expect(response.status).toBe(200)
  })
})
```

### E2E Test Template

```typescript
import { test, expect } from '@playwright/test'

test('should complete user flow', async ({ page }) => {
  await page.goto('/my-page')
  await page.click('button')
  await expect(page.locator('.result')).toBeVisible()
})
```

## Next Steps

1. Read full documentation: `/tests/README.md`
2. Explore test fixtures: `/tests/fixtures/auth.ts`
3. Check helper functions: `/tests/helpers/auth-helpers.ts`
4. Review E2E guide: `/tests/e2e/README.md`

## Test Coverage Goals

- Unit Tests: 80%
- Integration Tests: 70%
- E2E Tests: Critical user paths
- Overall: 60% (current threshold)

## Quick Reference

### Mock Authentication
```typescript
import { mockAuthenticatedSession } from '../../helpers/auth-helpers'
mockAuthenticatedSession('user-123')
```

### Mock Turnstile
```typescript
import { mockTurnstileAPI } from '../../helpers/auth-helpers'
mockTurnstileAPI(true) // success
mockTurnstileAPI(false) // failure
```

### Mock Rate Limiter
```typescript
import { mockRateLimiterAllow } from '../../helpers/auth-helpers'
const limiter = mockRateLimiterAllow(15) // 15 remaining
```

### Create Mock Request
```typescript
import { createMockRequest } from '../../helpers/auth-helpers'
const request = createMockRequest('http://localhost:3000/api/chat', {
  method: 'POST',
  body: { messages: [] },
})
```

## CI/CD

Tests run automatically on:
- Every pull request
- Every push to main
- Pre-commit hooks (unit + integration only)

## Support

- Documentation: `/tests/README.md`
- E2E Guide: `/tests/e2e/README.md`
- Test Summary: `/docs/TESTING_SUMMARY.md`

---

Happy Testing! 🧪

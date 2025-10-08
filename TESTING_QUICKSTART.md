# Testing Quick Start Guide

Get up and running with JudgeFinder.io tests in 5 minutes.

## Installation

```bash
# Install dependencies
npm install

# Install Playwright browsers (for E2E tests)
npx playwright install --with-deps
```

## Run Tests

```bash
# Run all unit and integration tests
npm test

# Run in watch mode (great for TDD)
npm run test:watch

# Run E2E tests
npm run test:e2e

# Generate coverage report
npm run test:coverage
```

## Writing Your First Test

### 1. Unit Test Example

Create `tests/unit/my-feature/my-function.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { myFunction } from '@/lib/my-feature/my-function'

describe('myFunction', () => {
  it('should return expected result', () => {
    const result = myFunction('input')
    expect(result).toBe('expected output')
  })
})
```

Run it:
```bash
npm run test:unit tests/unit/my-feature/my-function.test.ts
```

### 2. Integration Test Example

Create `tests/integration/api/my-endpoint.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/my-endpoint/route'

// Mock Supabase
vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(async () => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({ data: [], error: null })),
    })),
  })),
}))

describe('GET /api/my-endpoint', () => {
  it('should return 200', async () => {
    const request = new NextRequest('http://localhost:3000/api/my-endpoint')
    const response = await GET(request)

    expect(response.status).toBe(200)
  })
})
```

### 3. E2E Test Example

Create `tests/e2e/my-feature/my-flow.spec.ts`:

```typescript
import { test, expect } from '@playwright/test'

test('user can complete the flow', async ({ page }) => {
  await page.goto('/')

  // Interact with page
  await page.getByRole('button', { name: 'Click Me' }).click()

  // Verify result
  await expect(page.getByText('Success')).toBeVisible()
})
```

Run it:
```bash
npm run test:e2e tests/e2e/my-feature/my-flow.spec.ts
```

## Common Commands

```bash
# Unit tests
npm run test:unit                    # Run all
npm run test:unit -- my-test.test.ts # Run specific file
npm run test:watch                   # Watch mode

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e                     # Headless
npm run test:e2e:ui                  # Interactive UI
npm run test:e2e:headed              # See browser
npm run test:e2e -- --project=chromium  # Specific browser

# Coverage
npm run test:coverage                # Generate report
open coverage/index.html             # View report (macOS)
```

## Using Test Fixtures

Import pre-built mock data:

```typescript
import { mockJudges } from '@/tests/fixtures/judges'
import { generateMockCases } from '@/tests/fixtures/cases'
import { mockUsers } from '@/tests/fixtures/users'

const judge = mockJudges.activeJudge
const cases = generateMockCases(50, 'judge-001')
const user = mockUsers.admin
```

## Debugging Tests

### Vitest (Unit/Integration)
```bash
# Use console.log in tests
console.log('Debug value:', myVariable)

# Run single test in watch mode
npm run test:watch -- my-test.test.ts
```

### Playwright (E2E)
```bash
# UI mode - best for debugging
npm run test:e2e:ui

# Headed mode - see browser
npm run test:e2e:headed

# Use page.pause() in test
await page.pause()  // Opens inspector
```

## Coverage Requirements

Tests must maintain minimum coverage:
- Lines: 60%
- Functions: 60%
- Branches: 50%

Check coverage:
```bash
npm run test:coverage
```

## CI/CD

Tests run automatically on:
- Pull requests
- Pushes to main/develop

View results in GitHub Actions.

## Need Help?

1. Check [docs/TESTING.md](docs/TESTING.md) for detailed guide
2. Look at existing tests for examples:
   - Unit: `tests/unit/analytics/bias-calculations.test.ts`
   - Integration: `tests/integration/api/search.test.ts`
   - E2E: `tests/e2e/search/judge-search.spec.ts`
3. Check troubleshooting section in TESTING.md

## Best Practices

1. **Write tests first** (TDD) when possible
2. **Keep tests isolated** - no dependencies between tests
3. **Mock external dependencies** - databases, APIs, AI services
4. **Use descriptive names** - `should return 404 when judge not found`
5. **Test edge cases** - null, empty, invalid inputs
6. **One assertion per test** when practical
7. **Clean up after tests** - use `beforeEach/afterEach`

## Quick Reference

| Task | Command |
|------|---------|
| Run all tests | `npm test` |
| Watch mode | `npm run test:watch` |
| E2E with UI | `npm run test:e2e:ui` |
| Coverage | `npm run test:coverage` |
| Specific test | `npm test -- path/to/test.ts` |

Happy Testing! 🎉

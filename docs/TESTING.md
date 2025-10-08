# Testing Guide for JudgeFinder.io

This guide covers the comprehensive testing infrastructure for the JudgeFinder platform.

## Table of Contents

- [Overview](#overview)
- [Test Structure](#test-structure)
- [Running Tests](#running-tests)
- [Writing Tests](#writing-tests)
- [Test Coverage](#test-coverage)
- [CI/CD Integration](#cicd-integration)
- [Troubleshooting](#troubleshooting)

## Overview

The JudgeFinder testing infrastructure consists of three main types of tests:

1. **Unit Tests**: Test individual functions and business logic in isolation
2. **Integration Tests**: Test API endpoints and database interactions
3. **E2E Tests**: Test complete user flows through the browser

### Technology Stack

- **Vitest**: Fast unit and integration testing framework
- **Playwright**: Browser automation for E2E testing
- **Testing Library**: React component testing utilities
- **Happy DOM**: Lightweight DOM implementation for unit tests

## Test Structure

```
tests/
├── setup/
│   └── test-setup.ts           # Global test configuration
├── fixtures/
│   ├── judges.ts               # Mock judge data
│   ├── cases.ts                # Mock case data
│   └── users.ts                # Mock user data
├── unit/
│   ├── auth/
│   │   └── is-admin.test.ts    # Admin authorization tests
│   ├── analytics/
│   │   └── bias-calculations.test.ts
│   ├── search/
│   │   └── search-intelligence.test.ts
│   └── validation/
│       └── input-validation.test.ts
├── integration/
│   └── api/
│       ├── search.test.ts      # Search API tests
│       └── judges-analytics.test.ts
└── e2e/
    ├── auth/
    │   └── sign-up-flow.spec.ts
    └── search/
        └── judge-search.spec.ts
```

## Running Tests

### All Tests

```bash
# Run all unit and integration tests
npm test

# Run all tests including E2E
npm run test:all
```

### Unit Tests

```bash
# Run unit tests once
npm run test:unit

# Run in watch mode during development
npm run test:watch

# Run specific test file
npm run test:unit tests/unit/auth/is-admin.test.ts
```

### Integration Tests

```bash
# Run all integration tests
npm run test:integration

# Run specific integration test
npm run test:integration tests/integration/api/search.test.ts
```

### E2E Tests

```bash
# Run E2E tests (headless)
npm run test:e2e

# Run with UI mode for debugging
npm run test:e2e:ui

# Run in headed mode (see browser)
npm run test:e2e:headed

# Run specific browser
npm run test:e2e -- --project=chromium
```

### Coverage

```bash
# Generate coverage report
npm run test:coverage

# Coverage report will be in coverage/index.html
```

## Writing Tests

### Unit Tests

Unit tests should test individual functions in isolation with mocked dependencies.

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { myFunction } from '@/lib/my-module'

// Mock dependencies
vi.mock('@/lib/dependency', () => ({
  dependencyFunction: vi.fn(() => 'mocked value'),
}))

describe('MyFunction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return expected result', () => {
    const result = myFunction('input')
    expect(result).toBe('expected output')
  })

  it('should handle edge cases', () => {
    expect(myFunction('')).toBe('')
    expect(myFunction(null)).toBe(null)
  })
})
```

### Integration Tests

Integration tests verify API endpoints and database interactions work together correctly.

```typescript
import { describe, it, expect, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/my-endpoint/route'

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(async () => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          data: mockData,
          error: null,
        })),
      })),
    })),
  })),
}))

describe('API /api/my-endpoint', () => {
  it('should return data successfully', async () => {
    const request = new NextRequest('http://localhost:3000/api/my-endpoint')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toBeDefined()
  })
})
```

### E2E Tests

E2E tests verify complete user journeys through the browser.

```typescript
import { test, expect } from '@playwright/test'

test.describe('User Flow', () => {
  test('should complete user journey', async ({ page }) => {
    await page.goto('/')

    // Interact with the page
    await page.getByRole('button', { name: 'Search' }).click()

    // Verify results
    await expect(page.getByText('Results')).toBeVisible()
  })
})
```

### Using Test Fixtures

Test fixtures provide consistent mock data across tests:

```typescript
import { mockJudges, mockJudgesList } from '@/tests/fixtures/judges'
import { mockCases, generateMockCases } from '@/tests/fixtures/cases'
import { mockUsers } from '@/tests/fixtures/users'

// Use in tests
const testJudge = mockJudges.activeJudge
const multipleCases = generateMockCases(50, 'judge-001')
```

## Test Coverage

### Coverage Requirements

The project enforces the following minimum coverage thresholds:

- **Lines**: 60%
- **Functions**: 60%
- **Branches**: 50%
- **Statements**: 60%

### Viewing Coverage

```bash
# Generate and view coverage report
npm run test:coverage
open coverage/index.html  # macOS
start coverage/index.html # Windows
```

### Coverage Exclusions

The following are excluded from coverage:

- `node_modules/`
- `.next/`
- `tests/`
- `**/*.d.ts`
- `**/*.config.*`
- `scripts/`
- `ios/`

## CI/CD Integration

Tests run automatically on GitHub Actions for:

- Pull requests to `main` or `develop`
- Pushes to `main` or `develop`

### CI Test Pipeline

1. **Linting**: Code style and quality checks
2. **Type Checking**: TypeScript compilation
3. **Unit Tests**: Fast isolated tests
4. **Integration Tests**: API and database tests
5. **E2E Tests**: Browser-based user flows (Chromium, Firefox, WebKit)
6. **Coverage**: Generate and upload coverage reports

### CI Commands

```bash
# Run all CI checks locally
npm run test:ci
```

## Best Practices

### 1. Test Naming

Use descriptive test names that explain the behavior:

```typescript
// Good
it('should return 404 when judge does not exist')

// Bad
it('test judge endpoint')
```

### 2. Arrange-Act-Assert Pattern

Structure tests clearly:

```typescript
it('should calculate settlement rate correctly', () => {
  // Arrange
  const cases = [
    { outcome: 'Settled' },
    { outcome: 'Dismissed' },
  ]

  // Act
  const result = analyzeOutcomes(cases)

  // Assert
  expect(result.overall_settlement_rate).toBe(0.5)
})
```

### 3. Mock External Dependencies

Always mock external services (databases, APIs, AI services):

```typescript
vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn(() => ({
    getGenerativeModel: vi.fn(() => ({
      generateContent: vi.fn(),
    })),
  })),
}))
```

### 4. Test Edge Cases

Include tests for:

- Empty inputs
- Null/undefined values
- Error conditions
- Rate limits
- Invalid data

### 5. Keep Tests Isolated

Each test should be independent and not rely on other tests:

```typescript
beforeEach(() => {
  vi.clearAllMocks()
  // Reset any shared state
})
```

## Troubleshooting

### Tests Fail Locally But Pass in CI

- Ensure you're using the correct Node version (20.x)
- Run `npm ci` instead of `npm install`
- Check for environment-specific configurations

### Playwright Browser Issues

```bash
# Reinstall browsers
npx playwright install --with-deps

# Clear Playwright cache
npx playwright clean
```

### Vitest Watch Mode Not Working

```bash
# Try clearing Vitest cache
npx vitest --clearCache
```

### Mock Not Working

Ensure mocks are defined before imports:

```typescript
// Mock must come before import
vi.mock('@/lib/module')

import { functionToTest } from '@/lib/module'
```

### Coverage Not Generated

```bash
# Install coverage provider
npm install --save-dev @vitest/coverage-v8

# Run with coverage
npm run test:coverage
```

## Additional Resources

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Library](https://testing-library.com/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

## Contributing Tests

When adding new features:

1. Write unit tests for business logic
2. Add integration tests for API endpoints
3. Create E2E tests for user-facing features
4. Ensure coverage meets thresholds
5. Update this documentation if needed

## Support

For testing questions or issues:

1. Check this documentation
2. Review existing test examples
3. Consult the troubleshooting section
4. Open an issue on GitHub

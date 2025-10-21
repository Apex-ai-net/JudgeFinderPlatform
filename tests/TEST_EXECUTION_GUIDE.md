# Test Execution Guide

This guide provides comprehensive instructions for running tests in the JudgeFinder.io platform.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Test Suite Overview](#test-suite-overview)
3. [Running Tests](#running-tests)
4. [Environment Setup](#environment-setup)
5. [CI/CD Integration](#cicd-integration)
6. [Test Coverage Reports](#test-coverage-reports)
7. [Troubleshooting](#troubleshooting)

## Quick Start

```bash
# Install dependencies
npm install

# Run all unit tests
npm run test:unit

# Run E2E tests
npm run test:e2e

# Run chat accuracy tests
npm run test -- tests/unit/chat-accuracy.test.ts

# Run all tests
npm run test:all
```

## Test Suite Overview

### New Test Files Created

#### 1. **E2E Tests - Judge Workflow** (`tests/e2e/judge-workflow.spec.ts`)

Complete user journey testing for judge discovery:

- Search functionality
- Profile page loading with analytics
- Filter and sort operations
- Comparison tool
- Mobile responsiveness
- Performance benchmarks
- Error handling

**Test Count**: 25+ test cases

#### 2. **E2E Tests - Court Workflow** (`tests/e2e/court-workflow.spec.ts`)

Court directory and detail page testing:

- Court listing pages
- Court profile pages
- Jurisdiction filtering
- Court type navigation
- Mobile responsiveness
- Integration with judge profiles

**Test Count**: 20+ test cases

#### 3. **Unit Tests - Chat Accuracy** (`tests/unit/chat-accuracy.test.ts`)

AI chat query understanding and intent detection:

- 30 comprehensive query examples
- Judge search queries (10 cases)
- Analytics queries (8 cases)
- Court information queries (6 cases)
- General help queries (3 cases)
- Edge cases and error handling (3 cases)
- 90%+ accuracy target

**Test Count**: 30+ test cases across 5 categories

#### 4. **E2E Tests - Ad Purchase** (`tests/e2e/ad-purchase.spec.ts` - Enhanced)

Complete advertiser onboarding flow:

- Navigate to /advertise
- Form validation (bar number, firm name)
- Judge/court selection
- Pricing tier selection ($500/month, $5000/year)
- Stripe checkout integration
- Success confirmation
- Error handling

**Test Count**: 20+ test cases

## Running Tests

### Unit Tests

```bash
# Run all unit tests
npm run test:unit

# Run specific unit test file
npm run test -- tests/unit/chat-accuracy.test.ts

# Run unit tests with coverage
npm run test:coverage -- tests/unit/

# Watch mode for development
npm run test:watch
```

### Integration Tests

```bash
# Run all integration tests
npm run test:integration

# Run specific integration test
npm run test -- tests/integration/api/chat-route.test.ts
```

### E2E Tests (Playwright)

```bash
# Run all E2E tests
npm run test:e2e

# Run specific E2E test file
npx playwright test tests/e2e/judge-workflow.spec.ts

# Run with UI mode (interactive)
npm run test:e2e:ui

# Run in headed mode (see browser)
npm run test:e2e:headed

# Run on specific browser
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit

# Run on mobile viewports
npx playwright test --project="Mobile Chrome"
npx playwright test --project="Mobile Safari"
```

### Chat Accuracy Tests

```bash
# Run chat accuracy test suite
npm run test -- tests/unit/chat-accuracy.test.ts

# Run with detailed output
npm run test -- tests/unit/chat-accuracy.test.ts --reporter=verbose

# Watch mode for development
npm run test:watch tests/unit/chat-accuracy.test.ts
```

### Run All Tests

```bash
# Run complete test suite
npm run test:all

# This executes:
# 1. Unit tests
# 2. Integration tests
# 3. Accessibility tests
# 4. E2E tests
```

## Environment Setup

### Required Environment Variables

Create a `.env.local` file for local testing:

```bash
# Clerk Authentication (required for E2E tests)
CLERK_SECRET_KEY=your_clerk_secret_key
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key

# Test User Credentials (for E2E tests)
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=your_test_password

# OpenAI (required for chat tests)
OPENAI_API_KEY=your_openai_api_key

# Google AI (for search intelligence tests)
GOOGLE_AI_API_KEY=your_google_ai_api_key

# Supabase (required for integration tests)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Stripe (for payment flow tests)
STRIPE_SECRET_KEY=sk_test_your_stripe_test_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_test_key

# Upstash Redis (for rate limiting tests)
UPSTASH_REDIS_REST_URL=your_redis_url
UPSTASH_REDIS_REST_TOKEN=your_redis_token

# Turnstile (for CAPTCHA tests)
TURNSTILE_SECRET_KEY=0xTEST_SECRET_KEY
NEXT_PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA
```

### Test Database Setup

For integration tests that require database access:

```bash
# Run database migrations
npx supabase db push

# Seed test data (if needed)
node scripts/seed-test-data.js
```

### Playwright Browser Setup

```bash
# Install Playwright browsers (first time only)
npx playwright install

# Install system dependencies
npx playwright install-deps
```

## CI/CD Integration

### GitHub Actions Configuration

Create `.github/workflows/test.yml`:

```yaml
name: Test Suite

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm run test:unit

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json

  integration-tests:
    runs-on: ubuntu-latest
    env:
      OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
      GOOGLE_AI_API_KEY: ${{ secrets.GOOGLE_AI_API_KEY }}
      NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
      NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
      SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run integration tests
        run: npm run test:integration

  chat-accuracy-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run chat accuracy tests
        run: npm run test -- tests/unit/chat-accuracy.test.ts --reporter=json --outputFile=chat-accuracy-results.json

      - name: Upload chat accuracy results
        uses: actions/upload-artifact@v3
        with:
          name: chat-accuracy-results
          path: chat-accuracy-results.json

  e2e-tests:
    runs-on: ubuntu-latest
    env:
      CLERK_SECRET_KEY: ${{ secrets.CLERK_SECRET_KEY }}
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: ${{ secrets.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY }}
      TEST_USER_EMAIL: ${{ secrets.TEST_USER_EMAIL }}
      TEST_USER_PASSWORD: ${{ secrets.TEST_USER_PASSWORD }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps

      - name: Build application
        run: npm run build

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Upload Playwright report
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30

  accessibility-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run accessibility tests
        run: npm run test:a11y
```

### Netlify Build Configuration

Update `netlify.toml`:

```toml
[build]
  command = "npm run build && npm run test:ci"
  publish = ".next"

[build.environment]
  NODE_VERSION = "20"
  NPM_FLAGS = "--legacy-peer-deps"

[[plugins]]
  package = "@netlify/plugin-nextjs"

# Run tests before deployment
[context.production.build]
  command = "npm run lint && npm run type-check && npm run test:coverage && npm run build"

[context.deploy-preview.build]
  command = "npm run lint && npm run test:unit && npm run build"
```

### Pre-commit Hooks

Tests are automatically run on commit using Husky:

```bash
# Install Husky (if not already installed)
npm run prepare

# Pre-commit hook runs:
# - ESLint
# - TypeScript type checking
# - Unit tests (fast tests only)
```

## Test Coverage Reports

### Generate Coverage Report

```bash
# Generate HTML coverage report
npm run test:coverage

# Open coverage report in browser
open coverage/index.html
```

### Coverage Thresholds

Current coverage targets:

- **Statements**: 70%
- **Branches**: 65%
- **Functions**: 70%
- **Lines**: 70%

### Chat Accuracy Target

- **Overall Accuracy**: 90%+
- **Judge Search**: 85%+
- **Analytics Queries**: 90%+
- **Court Info**: 85%+
- **Help Queries**: 80%+

## Troubleshooting

### Common Issues

#### 1. Playwright Tests Failing

```bash
# Clear Playwright cache
npx playwright install --force

# Check if dev server is running
npm run dev

# Run with debugging
DEBUG=pw:api npx playwright test
```

#### 2. Chat Tests Failing

```bash
# Verify OpenAI API key
echo $OPENAI_API_KEY

# Check API quota
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"

# Run with verbose output
npm run test -- tests/unit/chat-accuracy.test.ts --reporter=verbose
```

#### 3. Integration Tests Timeout

```bash
# Increase timeout in test file
test('long running test', async () => {
  // ...
}, { timeout: 30000 }) // 30 seconds

# Or globally in vitest.config.ts
export default defineConfig({
  test: {
    testTimeout: 30000
  }
})
```

#### 4. Authentication Errors in E2E

```bash
# Verify Clerk credentials
echo $CLERK_SECRET_KEY
echo $NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

# Create test user in Clerk dashboard
# Update TEST_USER_EMAIL and TEST_USER_PASSWORD
```

#### 5. Flaky E2E Tests

```bash
# Run with retries
npx playwright test --retries=3

# Run single test to debug
npx playwright test tests/e2e/judge-workflow.spec.ts --debug

# Increase timeouts
npx playwright test --timeout=60000
```

### Debug Mode

```bash
# Run Playwright in debug mode
npx playwright test --debug

# Run with trace
npx playwright test --trace on

# View trace
npx playwright show-trace trace.zip
```

### Verbose Logging

```bash
# Enable verbose logging for Vitest
npm run test -- --reporter=verbose

# Enable verbose logging for Playwright
DEBUG=pw:api npm run test:e2e
```

## Best Practices

### Writing New Tests

1. **Follow naming conventions**:
   - E2E tests: `*.spec.ts`
   - Unit tests: `*.test.ts`
   - Integration tests: `*.test.ts` in `tests/integration/`

2. **Use descriptive test names**:

   ```typescript
   test('should display judge profile with analytics when user clicks on search result', async ({
     page,
   }) => {
     // ...
   })
   ```

3. **Organize tests by feature**:

   ```
   tests/
     e2e/
       judge-workflow.spec.ts
       court-workflow.spec.ts
       ad-purchase.spec.ts
     unit/
       chat-accuracy.test.ts
       analytics/
       domain/
   ```

4. **Use test fixtures**:

   ```typescript
   import { MOCK_CHAT_MESSAGES } from '../../fixtures/auth'
   ```

5. **Mock external dependencies**:
   ```typescript
   vi.mock('@/lib/supabase/server')
   ```

### Performance Optimization

1. **Run tests in parallel**:

   ```typescript
   test.describe.configure({ mode: 'parallel' })
   ```

2. **Use selective test runs during development**:

   ```bash
   npm run test:watch tests/unit/chat-accuracy.test.ts
   ```

3. **Skip slow tests in development**:
   ```typescript
   test.skip('slow integration test', async () => {
     // ...
   })
   ```

## Additional Resources

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Library Documentation](https://testing-library.com/)
- [JudgeFinder Testing Guide](./README.md)

## Support

For questions or issues with tests:

1. Check this guide first
2. Review test examples in `tests/` directory
3. Check CI/CD logs for detailed error messages
4. Contact the development team

---

**Last Updated**: 2025-10-21
**Version**: 1.0.0

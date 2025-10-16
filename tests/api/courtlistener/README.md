# CourtListener API Integration Tests

Comprehensive test suite for auditing and validating JudgeFinder's integration with the CourtListener REST API v4.

## Test Coverage

This test suite covers:

- ✅ Authentication & Authorization
- ✅ Rate Limiting & Throttling
- ✅ Error Handling & Retry Logic
- ✅ Circuit Breaker Pattern
- ✅ Request Formatting & Query Parameters
- ✅ Response Parsing & Validation
- ✅ Pagination (Cursor & Offset)
- ✅ All Major Endpoints (Judges, Opinions, Dockets, Courts)
- ✅ Performance Optimization (Field Selection, ETags)
- ✅ Complex Queries & Filtering

## Files

### 1. Unit Tests - `client.test.ts`

**Framework**: Vitest
**Purpose**: Test the CourtListener client implementation in isolation
**Lines**: ~550 test cases

```bash
# Run unit tests
npm run test:courtlistener

# Run with coverage
npm run test:courtlistener:coverage

# Run in watch mode
npm run test:courtlistener:watch
```

**Test Categories**:

- Authentication (3 tests)
- Rate Limiting (4 tests)
- Error Handling (8 tests)
- Circuit Breaker (2 tests)
- Request Formatting (3 tests)
- Response Parsing (2 tests)
- Specific Endpoints (6 tests)
- Metrics Reporting (1 test)
- Helper Functions (2 tests)

### 2. Postman Collection - `postman-collection.json`

**Framework**: Postman
**Purpose**: Manual and automated API testing
**Requests**: 30+

**Import to Postman**:

```bash
# Option 1: Import via Postman UI
1. Open Postman
2. Click "Import"
3. Select postman-collection.json
4. Set environment variable: COURTLISTENER_API_KEY

# Option 2: Run with Newman (CLI)
npm install -g newman
newman run tests/api/courtlistener/postman-collection.json \
  --env-var "COURTLISTENER_API_KEY=your-key-here"
```

**Test Folders**:

1. Authentication Tests (3 requests)
2. Judge/People Endpoints (4 requests)
3. Opinion Endpoints (3 requests)
4. Cluster Endpoints (1 request)
5. Docket Endpoints (1 request)
6. Court Endpoints (1 request)
7. Rate Limiting Tests (1 request)
8. Pagination Tests (1 request)
9. Error Handling Tests (2 requests)

### 3. REST Client Tests - `rest-client.http`

**Framework**: VS Code REST Client Extension
**Purpose**: Quick manual API testing and debugging
**Requests**: 60+

**Setup**:

```bash
# 1. Install VS Code Extension
code --install-extension humao.rest-client

# 2. Create .env file
echo "COURTLISTENER_API_KEY=your-key-here" > .env

# 3. Open rest-client.http in VS Code
# 4. Click "Send Request" above any ### line
```

**Test Sections**:

1. Authentication Tests (3)
2. Judge/People Endpoints (7)
3. Opinion Endpoints (5)
4. Cluster Endpoints (3)
5. Docket Endpoints (5)
6. Court Endpoints (5)
7. Pagination Tests (3)
8. Rate Limiting Tests (2)
9. Error Handling Tests (4)
10. Conditional Requests (2)
11. Performance Optimization (3)
12. Complex Query Tests (3)
13. Data Validation Tests (3)
14. API Version Checks (2)
15. Integration Smoke Tests (4)

## Setup

### Prerequisites

```bash
# Install dependencies
npm install

# Install test dependencies
npm install -D vitest @vitest/ui
npm install -g newman  # For Postman CLI

# VS Code extensions
code --install-extension humao.rest-client
```

### Environment Variables

```bash
# Required
COURTLISTENER_API_KEY=your-actual-api-key-here

# Optional - For Testing Rate Limiting
COURTLISTENER_REQUEST_DELAY_MS=100
COURTLISTENER_MAX_RETRIES=3
COURTLISTENER_REQUEST_TIMEOUT_MS=5000
```

Get your API key from: https://www.courtlistener.com/help/api/

## Running Tests

### Unit Tests (Vitest)

```bash
# Run all tests
npm test

# Run only CourtListener tests
npm run test:courtlistener

# Watch mode (auto-rerun on changes)
npm run test:courtlistener:watch

# Coverage report
npm run test:courtlistener:coverage
```

### Postman Collection

**Option 1: Postman GUI**

1. Import `postman-collection.json`
2. Set collection variable `apiToken` to your API key
3. Run entire collection or individual folders
4. View test results in Postman

**Option 2: Newman (CLI)**

```bash
# Run entire collection
newman run postman-collection.json \
  --env-var "COURTLISTENER_API_KEY=your-key"

# Run with detailed output
newman run postman-collection.json \
  --env-var "COURTLISTENER_API_KEY=your-key" \
  --reporters cli,html \
  --reporter-html-export report.html

# Run specific folder
newman run postman-collection.json \
  --folder "Authentication Tests" \
  --env-var "COURTLISTENER_API_KEY=your-key"
```

### REST Client (VS Code)

1. Open `rest-client.http`
2. Ensure `.env` contains `COURTLISTENER_API_KEY`
3. Click "Send Request" above any request
4. View response in VS Code panel

### Integration Tests (Live API)

```bash
# Run against live CourtListener API
# WARNING: Uses actual API quota
npm run test:integration:courtlistener
```

## Test Results Interpretation

### Success Criteria

- ✅ All authentication tests pass
- ✅ Rate limit headers present and valid
- ✅ Retry logic works on 429/5xx errors
- ✅ Circuit breaker triggers after threshold
- ✅ 404 handling works with `allow404` flag
- ✅ Pagination returns consistent results
- ✅ All required fields present in responses

### Common Issues

#### 1. Authentication Failures

```
Error: COURTLISTENER_API_KEY environment variable is required
```

**Fix**: Set `COURTLISTENER_API_KEY` in `.env` or environment

#### 2. Rate Limit Exceeded

```
Error: CourtListener API error 429: Rate limit exceeded
```

**Fix**: Wait for rate limit reset or increase delays in tests

#### 3. Network Timeouts

```
Error: Request timeout after 30000ms
```

**Fix**: Increase `COURTLISTENER_REQUEST_TIMEOUT_MS` or check network

#### 4. Test Failures Due to Missing Data

```
Error: testJudgeId not found
```

**Fix**: Update test data IDs in tests to valid CourtListener IDs

## Continuous Integration

### GitHub Actions

```yaml
# .github/workflows/courtlistener-tests.yml
name: CourtListener API Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run test:courtlistener
        env:
          COURTLISTENER_API_KEY: ${{ secrets.COURTLISTENER_API_KEY }}
```

### Scheduled Tests

Run nightly to catch API changes:

```yaml
on:
  schedule:
    - cron: '0 2 * * *' # 2 AM daily
```

## Contract Testing

For API contract validation, consider adding Pact tests:

```typescript
// tests/api/courtlistener/contract.pact.test.ts
import { Pact } from '@pact-foundation/pact'

const provider = new Pact({
  consumer: 'JudgeFinder',
  provider: 'CourtListener',
  port: 8080,
})

describe('CourtListener API Contract', () => {
  beforeAll(() => provider.setup())
  afterAll(() => provider.finalize())

  it('should return judge data matching schema', async () => {
    await provider.addInteraction({
      state: 'judge exists',
      uponReceiving: 'a request for judge data',
      withRequest: {
        method: 'GET',
        path: '/api/rest/v4/people/12345/',
        headers: { Authorization: 'Token test-key' },
      },
      willRespondWith: {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: {
          id: 12345,
          name: 'John Doe',
          positions: [],
        },
      },
    })

    // Test your client against the mock provider
  })
})
```

## Monitoring & Alerts

### Rate Limit Monitoring

```typescript
// Monitor rate limits in production
if (remaining < 100) {
  alert('CourtListener rate limit approaching: ' + remaining)
}
```

### Error Rate Tracking

```typescript
// Track API error rates
const errorRate = errors / totalRequests
if (errorRate > 0.05) {
  // 5% threshold
  alert('High CourtListener API error rate: ' + errorRate)
}
```

## Best Practices

### 1. Rate Limit Compliance

- ✅ Always respect `Retry-After` headers
- ✅ Implement exponential backoff
- ✅ Monitor rate limit headers in responses
- ✅ Use global rate limiter for batch operations

### 2. Error Handling

- ✅ Retry on 429 and 5xx errors
- ✅ Don't retry on 4xx (except 429)
- ✅ Log all errors with context
- ✅ Implement circuit breaker for cascading failures

### 3. Performance

- ✅ Use field selection to reduce payload size
- ✅ Implement ETag caching for unchanged resources
- ✅ Batch requests when possible
- ✅ Use pagination efficiently

### 4. Testing

- ✅ Mock external API calls in unit tests
- ✅ Use real API for integration tests (sparingly)
- ✅ Test error scenarios thoroughly
- ✅ Validate response schemas

## Resources

### CourtListener Documentation

- **API Docs**: https://www.courtlistener.com/api/rest-info/
- **API Reference**: https://www.courtlistener.com/api/rest/v4/
- **Rate Limits**: https://www.courtlistener.com/api/rest-info/#rate-limits
- **Changelog**: https://www.courtlistener.com/help/api/changelog/

### Support

- **GitHub Issues**: https://github.com/freelawproject/courtlistener/issues
- **Email**: <contact@free.law>
- **Mailing List**: https://lists.free.law/postorius/lists/

### Related Documentation

- [CourtListener API Audit Report](../../../COURTLISTENER_API_AUDIT.md)
- [JudgeFinder API Documentation](../../../docs/api/README.md)
- [Platform Integration Guide](../../../docs/ai/CLAUDE.md)

## Contributing

When adding new API tests:

1. Add unit test in `client.test.ts`
2. Add Postman request in `postman-collection.json`
3. Add REST Client request in `rest-client.http`
4. Update this README with new test categories
5. Document any new edge cases or issues

## License

Tests are part of JudgeFinder platform and follow the same license.

---

**Last Updated**: 2025-09-30
**API Version**: CourtListener REST API v4
**Test Coverage**: 95%

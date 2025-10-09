# API Middleware Quick Reference

## Import Statement

```typescript
import {
  compose,
  withRateLimit,
  withCache,
  withErrorHandling,
  success,
  paginated,
  error,
  getPaginationParams,
  ValidationError,
  NotFoundError
} from '@/lib/api'
```

## Common Patterns

### Basic GET Endpoint
```typescript
export const GET = compose(
  withRateLimit({ tokens: 40 }),
  withErrorHandling()
)(async (req, ctx) => {
  const data = await fetchData()
  return success(data)
})
```

### Cached GET Endpoint
```typescript
export const GET = compose(
  withRateLimit({ tokens: 100 }),
  withCache({ ttl: 300 }),  // 5 minutes
  withErrorHandling()
)(async (req, ctx) => {
  const data = await fetchData()
  return success(data)
})
```

### Paginated Endpoint
```typescript
export const GET = compose(
  withRateLimit(),
  withCache({ ttl: 60 }),
  withErrorHandling()
)(async (req, ctx) => {
  const { page, limit } = getPaginationParams(req)
  const { data, total } = await fetchPaginated(page, limit)

  return paginated(data, {
    page,
    per_page: limit,
    total_count: total,
    has_more: page * limit < total
  })
})
```

### Protected POST Endpoint
```typescript
export const POST = compose(
  withRateLimit({ tokens: 10 }),
  withErrorHandling()
)(async (req, ctx) => {
  const body = await req.json()

  if (!body.email) {
    throw new ValidationError('Email required')
  }

  const result = await createResource(body)
  return created(result, `/resource/${result.id}`)
})
```

## Rate Limit Presets

```typescript
withRateLimit({ tokens: 5, window: '1 m' })    // Strict
withRateLimit({ tokens: 10, window: '1 m' })   // Conservative
withRateLimit({ tokens: 40, window: '1 m' })   // Default
withRateLimit({ tokens: 100, window: '1 m' })  // Generous
withRateLimit({ tokens: 200, window: '1 m' })  // Public
```

Or use presets:
```typescript
import { RateLimitPresets } from '@/lib/api'

withRateLimit(RateLimitPresets.strict)
withRateLimit(RateLimitPresets.generous)
withRateLimit(RateLimitPresets.public)
```

## Cache Presets

```typescript
withCache({ ttl: 30 })     // Short (30s)
withCache({ ttl: 60 })     // Default (1 min)
withCache({ ttl: 300 })    // Medium (5 min)
withCache({ ttl: 900 })    // Long (15 min)
withCache({ ttl: 3600 })   // Hour (1 hour)
```

Or use presets:
```typescript
import { CachePresets } from '@/lib/api'

withCache(CachePresets.short)
withCache(CachePresets.medium)
withCache(CachePresets.hour)
```

## Response Helpers

### Success Responses
```typescript
return success({ users: [...] })
return success(data, { message: 'Success!' })
return paginated(items, { page: 1, per_page: 20, total_count: 100, has_more: true })
return created({ id: '123' }, '/resource/123')
return noContent()
```

### Error Responses
```typescript
throw new ValidationError('Invalid email')
throw new NotFoundError('User not found')
throw new AuthenticationError()
throw new AuthorizationError()
throw new ConflictError('Already exists')

// Or use helpers
return error('Error message', 500)
return notFound('Resource not found')
return unauthorized()
return forbidden()
```

## Helper Functions

```typescript
// Pagination
const { page, limit, offset } = getPaginationParams(req, {
  defaultLimit: 20,
  maxLimit: 100
})

// Query params
const status = getQueryParam(req, 'status')
const required = getQueryParam(req, 'id', { required: true })
const withDefault = getQueryParam(req, 'type', { default: 'all' })

// JSON body
const body = await parseJsonBody(req, {
  required: ['email', 'name']
})
```

## Error Types

```typescript
import {
  ApiError,              // Base error (use for custom errors)
  ValidationError,       // 400 - Bad request
  AuthenticationError,   // 401 - Unauthorized
  AuthorizationError,    // 403 - Forbidden
  NotFoundError,         // 404 - Not found
  ConflictError,         // 409 - Conflict
  RateLimitError         // 429 - Rate limit exceeded
} from '@/lib/api'
```

## Middleware Order

**ALWAYS use this order:**
```typescript
export const GET = compose(
  withRateLimit(),      // 1. First - reject early
  withCache(),          // 2. Second - cache successful responses
  withErrorHandling()   // 3. Last - catch all errors
)(handler)
```

## Context Object

Access middleware data via context:
```typescript
export const GET = compose(
  withRateLimit(),
  withCache(),
  withErrorHandling()
)(async (req, ctx) => {
  // Available in ctx:
  ctx.rateLimitRemaining  // number
  ctx.rateLimitReset      // number
  ctx.cachedData          // any (if from cache)
  ctx.params              // Route params
})
```

## Custom Configuration

### Custom Rate Limit Key
```typescript
withRateLimit({
  tokens: 20,
  keyGenerator: async (req) => {
    const userId = req.headers.get('x-user-id')
    return userId || 'anonymous'
  }
})
```

### Custom Cache Key
```typescript
withCache({
  ttl: 300,
  includeParams: ['id', 'type'],  // Only these params
  excludeParams: ['timestamp']     // Ignore these params
})
```

### Custom Error Handler
```typescript
withErrorHandling({
  onError: async (error, req) => {
    if (error instanceof CustomError) {
      return NextResponse.json({ custom: true }, { status: 418 })
    }
  }
})
```

## Testing

```typescript
import { compose, withRateLimit, withErrorHandling } from '@/lib/api'

describe('GET /api/test', () => {
  it('should return success', async () => {
    const response = await fetch('/api/test')
    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data).toHaveProperty('data')
  })

  it('should enforce rate limit', async () => {
    // Make multiple requests rapidly
    const responses = await Promise.all(
      Array(50).fill(null).map(() => fetch('/api/test'))
    )

    const rateLimited = responses.filter(r => r.status === 429)
    expect(rateLimited.length).toBeGreaterThan(0)
  })
})
```

## Migration Checklist

- [ ] Import middleware from `@/lib/api`
- [ ] Convert `export async function` to `export const` with `compose()`
- [ ] Add rate limiting (first)
- [ ] Add caching if needed (second)
- [ ] Add error handling (last)
- [ ] Replace response formatting with helpers
- [ ] Replace query parsing with helper functions
- [ ] Test thoroughly
- [ ] Update documentation

## Common Mistakes

### ❌ Don't forget to invoke compose
```typescript
// WRONG
export const GET = compose(withRateLimit())

// RIGHT
export const GET = compose(withRateLimit())(async (req, ctx) => { ... })
```

### ❌ Don't put error handling first
```typescript
// WRONG
compose(withErrorHandling(), withRateLimit())

// RIGHT
compose(withRateLimit(), withErrorHandling())
```

### ❌ Don't return error responses directly
```typescript
// WRONG
if (error) return NextResponse.json({ error }, { status: 500 })

// RIGHT
if (error) throw error
```

## More Information

- Full docs: [README.md](./README.md)
- Migration guide: [MIGRATION_EXAMPLE.md](./MIGRATION_EXAMPLE.md)
- Implementation report: [IMPLEMENTATION_REPORT.md](./IMPLEMENTATION_REPORT.md)

# Error Handling Usage Examples

This document provides comprehensive examples of using the standardized error handling system across different API routes and scenarios.

## Table of Contents
- [Basic Usage](#basic-usage)
- [Error Class Examples](#error-class-examples)
- [Migration Patterns](#migration-patterns)
- [Real-World Scenarios](#real-world-scenarios)

---

## Basic Usage

### Standard API Route Pattern

```typescript
import { handleApiError, ApiResponse } from '@/lib/api/error-handler'
import { NotFoundError, DatabaseError } from '@/lib/errors/app-errors'

export async function GET(request: Request) {
  try {
    const data = await fetchSomething()

    if (!data) {
      throw new NotFoundError('Resource not found')
    }

    return ApiResponse.success(data)
  } catch (error) {
    return handleApiError(error)
  }
}
```

### POST Request with Validation

```typescript
import { handleApiError, ApiResponse } from '@/lib/api/error-handler'
import { ValidationError } from '@/lib/errors/app-errors'

export async function POST(request: Request) {
  try {
    const body = await request.json()

    if (!body.email?.includes('@')) {
      throw new ValidationError('Invalid email format', 'email')
    }

    const result = await createResource(body)
    return ApiResponse.created(result)
  } catch (error) {
    return handleApiError(error)
  }
}
```

---

## Error Class Examples

### ValidationError (400)
Used for invalid input, malformed requests, or business rule violations.

```typescript
import { ValidationError } from '@/lib/errors/app-errors'

// Field-specific validation
if (!barNumber.match(/^\d{6}$/)) {
  throw new ValidationError('Bar number must be 6 digits', 'barNumber')
}

// General validation
if (startDate > endDate) {
  throw new ValidationError('Start date must be before end date')
}

// Multiple field validation
if (!body.judgeId || !body.courtId) {
  throw new ValidationError('Both judgeId and courtId are required')
}
```

### AuthenticationError (401)
Used when user credentials are missing or invalid.

```typescript
import { AuthenticationError } from '@/lib/errors/app-errors'

const session = await getSession()
if (!session) {
  throw new AuthenticationError('Authentication required')
}

const user = await verifyToken(token)
if (!user) {
  throw new AuthenticationError('Invalid or expired token')
}
```

### AuthorizationError (403)
Used when user lacks permissions for the requested action.

```typescript
import { AuthorizationError } from '@/lib/errors/app-errors'

if (user.role !== 'admin') {
  throw new AuthorizationError('Admin access required')
}

if (user.id !== resource.ownerId) {
  throw new AuthorizationError('You do not have access to this resource')
}

if (!user.verifiedBarNumber) {
  throw new AuthorizationError('Bar number verification required')
}
```

### NotFoundError (404)
Used when requested resources don't exist.

```typescript
import { NotFoundError } from '@/lib/errors/app-errors'

const judge = await getJudge(id)
if (!judge) {
  throw new NotFoundError('Judge not found')
}

const court = await getCourtBySlug(slug)
if (!court) {
  throw new NotFoundError(`Court with slug "${slug}" not found`)
}
```

### RateLimitError (429)
Used when rate limits are exceeded.

```typescript
import { RateLimitError } from '@/lib/errors/app-errors'

const requestCount = await redis.incr(`rate:${userId}`)
if (requestCount > RATE_LIMIT) {
  throw new RateLimitError('Rate limit exceeded. Please try again in 1 hour.')
}
```

### DatabaseError (500)
Used for database operation failures.

```typescript
import { DatabaseError } from '@/lib/errors/app-errors'

try {
  const { data, error } = await supabase
    .from('judges')
    .insert(judgeData)

  if (error) {
    throw new DatabaseError('Failed to insert judge record', error)
  }
} catch (error) {
  // Will be caught and handled by handleApiError
  throw error
}
```

### ExternalAPIError (502)
Used when external service calls fail.

```typescript
import { ExternalAPIError } from '@/lib/errors/app-errors'

try {
  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: prompt }]
  })
} catch (error) {
  throw new ExternalAPIError(
    'AI provider request failed',
    'OpenAI',
    error as Error
  )
}

try {
  const result = await fetch('https://external-api.com/data')
  if (!result.ok) {
    throw new ExternalAPIError(
      `External service returned ${result.status}`,
      'ExternalAPI'
    )
  }
} catch (error) {
  throw error
}
```

---

## Migration Patterns

### Before: Inconsistent Error Handling

```typescript
// Pattern 1: Plain text errors
export async function GET(request: Request) {
  try {
    const data = await fetchData()
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  }
}

// Pattern 2: Mixed response formats
export async function POST(request: Request) {
  const body = await request.json()
  if (!body.email) {
    return NextResponse.json({ message: 'Email required' }, { status: 400 })
  }
  // ... more code
}

// Pattern 3: No error logging
export async function DELETE(request: Request) {
  try {
    await deleteResource(id)
    return new NextResponse(null, { status: 200 })
  } catch (err) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
```

### After: Standardized Error Handling

```typescript
import { handleApiError, ApiResponse } from '@/lib/api/error-handler'
import { NotFoundError, ValidationError } from '@/lib/errors/app-errors'

// Pattern 1: Standardized errors
export async function GET(request: Request) {
  try {
    const data = await fetchData()
    if (!data) {
      throw new NotFoundError('Resource not found')
    }
    return ApiResponse.success(data)
  } catch (error) {
    return handleApiError(error)
  }
}

// Pattern 2: Consistent validation
export async function POST(request: Request) {
  try {
    const body = await request.json()
    if (!body.email) {
      throw new ValidationError('Email is required', 'email')
    }
    const result = await createResource(body)
    return ApiResponse.created(result)
  } catch (error) {
    return handleApiError(error)
  }
}

// Pattern 3: Proper logging and response
export async function DELETE(request: Request) {
  try {
    await deleteResource(id)
    return ApiResponse.noContent()
  } catch (error) {
    return handleApiError(error)
  }
}
```

---

## Real-World Scenarios

### Judge Search API

```typescript
import { handleApiError, ApiResponse } from '@/lib/api/error-handler'
import { ValidationError, DatabaseError } from '@/lib/errors/app-errors'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    const jurisdiction = searchParams.get('jurisdiction')

    // Validation
    if (!query || query.length < 2) {
      throw new ValidationError(
        'Search query must be at least 2 characters',
        'q'
      )
    }

    // Database operation
    const { data, error } = await supabase
      .from('judges')
      .select('*')
      .textSearch('name', query)
      .eq('jurisdiction', jurisdiction)

    if (error) {
      throw new DatabaseError('Search query failed', error)
    }

    return ApiResponse.success({
      judges: data,
      count: data.length
    })
  } catch (error) {
    return handleApiError(error)
  }
}
```

### Advertisement Purchase API

```typescript
import { handleApiError, ApiResponse } from '@/lib/api/error-handler'
import {
  AuthenticationError,
  AuthorizationError,
  ValidationError,
  ExternalAPIError
} from '@/lib/errors/app-errors'

export async function POST(request: Request) {
  try {
    // Authentication check
    const session = await getSession()
    if (!session) {
      throw new AuthenticationError('Authentication required')
    }

    // Authorization check
    const user = await getUser(session.userId)
    if (!user.verifiedBarNumber) {
      throw new AuthorizationError(
        'Bar number verification required to purchase ads'
      )
    }

    // Request validation
    const body = await request.json()
    if (!body.courtId || !body.duration) {
      throw new ValidationError('Court ID and duration are required')
    }

    // External payment processing
    try {
      const payment = await stripe.paymentIntents.create({
        amount: calculatePrice(body.duration),
        currency: 'usd',
        customer: user.stripeCustomerId
      })
    } catch (error) {
      throw new ExternalAPIError(
        'Payment processing failed',
        'Stripe',
        error as Error
      )
    }

    // Create advertisement
    const ad = await createAdvertisement({
      userId: user.id,
      courtId: body.courtId,
      duration: body.duration,
      paymentIntentId: payment.id
    })

    return ApiResponse.created(ad)
  } catch (error) {
    return handleApiError(error)
  }
}
```

### Analytics Processing

```typescript
import { handleApiError, ApiResponse } from '@/lib/api/error-handler'
import {
  NotFoundError,
  DatabaseError,
  ValidationError
} from '@/lib/errors/app-errors'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const judgeId = params.id

    // Validate UUID format
    if (!judgeId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      throw new ValidationError('Invalid judge ID format', 'id')
    }

    // Fetch judge
    const { data: judge, error: judgeError } = await supabase
      .from('judges')
      .select('*')
      .eq('id', judgeId)
      .single()

    if (judgeError) {
      if (judgeError.code === 'PGRST116') {
        throw new NotFoundError('Judge not found')
      }
      throw new DatabaseError('Failed to fetch judge', judgeError)
    }

    // Fetch analytics
    const { data: analytics, error: analyticsError } = await supabase
      .from('bias_patterns')
      .select('*')
      .eq('judge_id', judgeId)

    if (analyticsError) {
      throw new DatabaseError('Failed to fetch analytics', analyticsError)
    }

    return ApiResponse.success({
      judge,
      analytics,
      generatedAt: new Date().toISOString()
    })
  } catch (error) {
    return handleApiError(error)
  }
}
```

### AI Search Integration

```typescript
import { handleApiError, ApiResponse } from '@/lib/api/error-handler'
import {
  ValidationError,
  ExternalAPIError,
  RateLimitError
} from '@/lib/errors/app-errors'

export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Validate query
    if (!body.query || body.query.length < 3) {
      throw new ValidationError(
        'Search query must be at least 3 characters',
        'query'
      )
    }

    // Check rate limit
    const userId = await getUserId()
    const count = await redis.incr(`ai-search:${userId}`)

    if (count > 10) {
      throw new RateLimitError(
        'AI search rate limit exceeded. Please try again in 1 hour.'
      )
    }

    // Call AI provider
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'You are a legal research assistant.' },
          { role: 'user', content: body.query }
        ]
      })

      return ApiResponse.success({
        answer: response.choices[0].message.content,
        usage: response.usage
      })
    } catch (error) {
      throw new ExternalAPIError(
        'AI provider request failed',
        'OpenAI',
        error as Error
      )
    }
  } catch (error) {
    return handleApiError(error)
  }
}
```

---

## Best Practices

1. **Always use try-catch blocks** in API routes
2. **Throw specific error types** rather than generic errors
3. **Include field names** in ValidationError when applicable
4. **Use ApiResponse helpers** for success responses
5. **Let handleApiError** handle all error responses
6. **Include context** in error messages (e.g., resource IDs, operation names)
7. **Chain error causes** when wrapping errors (e.g., DatabaseError with underlying Supabase error)

## Migration Checklist

When migrating an API route:

- [ ] Import `handleApiError` and `ApiResponse`
- [ ] Import relevant error classes
- [ ] Wrap handler logic in try-catch
- [ ] Replace manual error responses with error classes
- [ ] Replace success responses with `ApiResponse` methods
- [ ] Use `handleApiError(error)` in catch block
- [ ] Remove console.log/console.error (handled by error classes)
- [ ] Test all error paths (validation, auth, not found, etc.)

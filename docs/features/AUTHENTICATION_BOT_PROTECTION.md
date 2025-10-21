# Authentication & Bot Protection System

**Feature Status:** ✅ Ready for Deployment
**Date Implemented:** 2025-10-20
**Version:** 1.0

---

## Overview

A comprehensive authentication and bot protection system that prevents abuse, enforces usage limits, and enables professional verification for advertisers on the JudgeFinder platform.

### Key Features

1. **Cloudflare Turnstile Integration** - Privacy-first CAPTCHA protection
2. **Authentication-Gated AI Chat** - Sign-in required for AI assistant
3. **Tiered Rate Limiting** - Fair usage enforcement
4. **Professional Verification** - Bar number validation for advertisers
5. **User Roles System** - Automatic role-based access control

---

## Architecture

### Authentication Flow

```
Anonymous User
    ↓
Clicks AI Chat
    ↓
"Sign In Required" Message
    ↓
Redirects to Clerk Sign-In
    ↓
Signs In / Signs Up
    ↓
Redirects back to AI Chat
    ↓
Types first message
    ↓
Turnstile CAPTCHA appears
    ↓
Completes CAPTCHA
    ↓
Message sent to AI
    ↓
Rate Limited (20 messages/hour)
```

### Advertiser Onboarding Flow

```
User clicks "Become an Advertiser"
    ↓
Redirects to /advertise/onboarding
    ↓
Sign-in required (if not authenticated)
    ↓
Fills out form:
  - Select state (CA, NY, TX, etc.)
  - Enter bar number
    ↓
Completes Turnstile CAPTCHA
    ↓
Submits form
    ↓
API verifies:
  - Format validation
  - Duplicate check
  - CAPTCHA verification
    ↓
Database updated:
  - bar_number = submitted value
  - bar_state = selected state
  - verification_status = 'verified'
  - bar_verified_at = NOW()
    ↓
Trigger automatically sets:
  - user_role = 'advertiser'
    ↓
Success! Redirects to advertiser dashboard
```

### Rate Limiting Strategy

| User Type | Endpoint | Limit | Window | Storage |
|-----------|----------|-------|--------|---------|
| Anonymous | `/api/judges/search` | 10 requests | 1 day | Redis |
| Authenticated | `/api/judges/search` | 100 requests | 1 hour | Redis |
| Authenticated | `/api/chat` | 20 messages | 1 hour | Redis |

**Graceful Degradation:** If Redis is unavailable, rate limiting is bypassed to maintain functionality.

---

## Components

### 1. Turnstile Integration

**Files:**
- `/lib/auth/turnstile.ts` - Server-side verification
- `/components/auth/TurnstileWidget.tsx` - Client-side widget

**Usage:**

```tsx
import { TurnstileWidget } from '@/components/auth/TurnstileWidget'

// In your component
const [turnstileToken, setTurnstileToken] = useState<string | null>(null)

<TurnstileWidget
  onVerify={(token) => setTurnstileToken(token)}
  onError={() => console.error('CAPTCHA failed')}
  onExpire={() => setTurnstileToken(null)}
/>

// In API call
fetch('/api/some-endpoint', {
  method: 'POST',
  body: JSON.stringify({
    turnstileToken,
    // ... other data
  })
})
```

**Server-side verification:**

```typescript
import { verifyTurnstileToken } from '@/lib/auth/turnstile'
import { getClientIp } from '@/lib/security/rate-limit'

const { turnstileToken } = await request.json()
const clientIp = getClientIp(request)
const isValid = await verifyTurnstileToken(turnstileToken, clientIp)

if (!isValid) {
  return NextResponse.json(
    { error: 'CAPTCHA verification failed' },
    { status: 403 }
  )
}
```

### 2. Rate Limiting

**Files:**
- `/lib/security/rate-limit.ts` - Rate limiting utilities

**Usage:**

```typescript
import { buildRateLimiter, getClientIp } from '@/lib/security/rate-limit'

// Define limiter
const searchLimiter = buildRateLimiter({
  tokens: 100,        // 100 requests
  window: '1 h',      // per hour
  prefix: 'search',   // Redis key prefix
})

// In API route
const { userId } = await auth()
const clientIp = getClientIp(request)

// Use userId for authenticated, IP for anonymous
const rateLimitKey = userId ? `user:${userId}` : `ip:${clientIp}`

const result = await searchLimiter.limit(rateLimitKey)

if (!result.success) {
  return NextResponse.json(
    { error: 'Rate limit exceeded' },
    {
      status: 429,
      headers: {
        'X-RateLimit-Limit': '100',
        'X-RateLimit-Remaining': String(result.remaining),
        'X-RateLimit-Reset': String(result.reset),
      }
    }
  )
}
```

### 3. User Roles System

**Database Schema:**

```sql
-- user_role column
ALTER TABLE users ADD COLUMN user_role TEXT NOT NULL DEFAULT 'user';
ALTER TABLE users ADD CONSTRAINT users_user_role_check
  CHECK (user_role IN ('user', 'advertiser', 'admin'));

-- Bar verification columns
ALTER TABLE users ADD COLUMN bar_number TEXT;
ALTER TABLE users ADD COLUMN bar_state TEXT;
ALTER TABLE users ADD COLUMN bar_verified_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN verification_status TEXT DEFAULT 'none';
ALTER TABLE users ADD CONSTRAINT users_verification_status_check
  CHECK (verification_status IN ('none', 'pending', 'verified', 'rejected'));

-- Auto-promotion trigger
CREATE TRIGGER trigger_set_advertiser_role
  BEFORE UPDATE ON users
  FOR EACH ROW
  WHEN (OLD.verification_status IS DISTINCT FROM NEW.verification_status)
  EXECUTE FUNCTION set_advertiser_role_on_verification();
```

**Role Definitions:**

- **user** (default) - Standard access, can search judges and use AI chat
- **advertiser** (verified) - Can create ad campaigns and access premium features
- **admin** (manual) - Full platform access and user management

**Automatic Promotion:**

When a user's `verification_status` changes to `'verified'` and `bar_verified_at` is set, the database trigger automatically promotes `user_role` to `'advertiser'`.

---

## API Endpoints

### POST `/api/advertising/verify-bar`

Verifies a law professional's bar number and grants advertiser role.

**Authentication:** Required (Clerk)

**Request:**

```json
{
  "barNumber": "123456",
  "barState": "CA",
  "turnstileToken": "0x..."
}
```

**Response (Success):**

```json
{
  "success": true,
  "message": "Bar number verified successfully. You now have advertiser access.",
  "barNumber": "123456",
  "barState": "CA"
}
```

**Response (Error):**

```json
{
  "error": "This bar number is already registered to another account."
}
```

**Status Codes:**
- `200` - Success
- `400` - Invalid input
- `401` - Not authenticated
- `403` - CAPTCHA verification failed
- `409` - Bar number already registered
- `500` - Server error

---

## Configuration

### Environment Variables

```bash
# Cloudflare Turnstile (Required for production)
NEXT_PUBLIC_TURNSTILE_SITE_KEY=0x4AAAAAAA...  # Public key (client-side)
TURNSTILE_SECRET_KEY=0x4AAAAAAA...             # Secret key (server-side)

# Upstash Redis (Required for rate limiting)
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=AXX...

# Clerk (Required for authentication)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...

# Supabase (Required for database)
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### Development vs Production

**Development Mode:**
- Test Turnstile keys (always pass): `1x00000000000000000000AA`
- Turnstile verification bypassed if `NODE_ENV=development` and keys not set
- Rate limiting still enforced (use local Redis or skip)

**Production Mode:**
- Real Turnstile keys required
- Real bar number validation (format only, no API currently)
- Full rate limiting enforcement
- Error tracking via Sentry

---

## Security Considerations

### CAPTCHA Bypass Prevention

- Turnstile tokens are single-use
- Server-side verification required
- IP address included in verification
- Tokens expire after 5 minutes

### Rate Limit Evasion Prevention

- Redis-based sliding window algorithm
- Keys based on user ID (authenticated) or IP (anonymous)
- Distributed rate limiting (works across Netlify functions)
- TTL automatically expires old keys

### Bar Number Security

- Format validation: `^[A-Z0-9\-]{3,20}$`
- Duplicate detection before saving
- Cleaned and normalized before storage
- Protected by CAPTCHA to prevent enumeration attacks

### SQL Injection Prevention

- Parameterized queries via Supabase client
- Input validation and sanitization
- No raw SQL from user input

---

## Testing

### Manual Testing Checklist

See `/docs/AUTH_DEPLOYMENT_GUIDE.md` for comprehensive testing checklist.

### Automated Tests

**Location:** `/tests/`

- **Unit Tests:**
  - `/tests/unit/auth/turnstile.test.ts` - Turnstile verification
  - `/tests/unit/auth/bar-number-validation.test.ts` - Input validation

- **Integration Tests:**
  - `/tests/integration/api/chat-route.test.ts` - AI chat API
  - `/tests/integration/api/search-route.test.ts` - Search API
  - `/tests/integration/api/verify-bar-route.test.ts` - Bar verification

- **E2E Tests:**
  - `/tests/e2e/auth/ai-chatbox-auth.spec.ts` - Full authentication flow

**Run tests:**

```bash
# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# All tests
npm test
```

---

## Monitoring

### Key Metrics

**Authentication:**
- Sign-in conversion rate (users who sign in to access chat)
- Authentication success/failure rate
- Average time to complete sign-in flow

**Turnstile:**
- CAPTCHA completion rate
- CAPTCHA failure rate
- User abandonment after CAPTCHA

**Rate Limiting:**
- Rate limit hit count per endpoint
- Anonymous vs authenticated request distribution
- Peak traffic patterns

**Bar Verification:**
- Verification submission rate
- Verification success/failure rate
- Time to complete onboarding
- Most common error reasons

### Monitoring Queries

```sql
-- User role distribution
SELECT user_role, COUNT(*) as count
FROM users
GROUP BY user_role;

-- Recent verifications
SELECT
  DATE(bar_verified_at) as date,
  COUNT(*) as verifications
FROM users
WHERE bar_verified_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(bar_verified_at)
ORDER BY date DESC;

-- State distribution
SELECT bar_state, COUNT(*) as count
FROM users
WHERE bar_state IS NOT NULL
GROUP BY bar_state
ORDER BY count DESC;

-- Verification status
SELECT verification_status, COUNT(*) as count
FROM users
GROUP BY verification_status;
```

### Sentry Error Tracking

**Watch for:**
- Turnstile verification failures
- Rate limit Redis connection errors
- Bar verification API errors
- Database constraint violations
- Trigger execution failures

---

## Troubleshooting

### Common Issues

#### Turnstile Widget Not Appearing

**Symptoms:** CAPTCHA doesn't render

**Diagnosis:**
- Check browser console for errors
- Verify `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is set
- Check network tab for Cloudflare API calls

**Solutions:**
```bash
# Verify environment variable
echo $NEXT_PUBLIC_TURNSTILE_SITE_KEY

# Should start with 0x (production) or 1x (test)
```

#### Rate Limiting Not Working

**Symptoms:** Users exceed limits without 429 errors

**Diagnosis:**
```bash
# Check Redis configuration
netlify env:get UPSTASH_REDIS_REST_URL
netlify env:get UPSTASH_REDIS_REST_TOKEN

# Check Redis connection
# Visit: https://console.upstash.com/
```

**Solutions:**
- Verify Redis credentials
- Check Redis database is active
- Monitor Redis connection pool

#### Bar Verification Fails

**Symptoms:** All verifications fail with 500 error

**Diagnosis:**
```sql
-- Check if migration was applied
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name IN ('user_role', 'bar_number');
```

**Solutions:**
- Re-run database migration
- Check Supabase logs for errors
- Verify trigger exists and is enabled

#### Trigger Not Promoting Users

**Symptoms:** User stays as 'user' after verification

**Diagnosis:**
```sql
-- Check trigger exists
SELECT * FROM information_schema.triggers
WHERE trigger_name = 'trigger_set_advertiser_role';

-- Check function exists
SELECT proname FROM pg_proc
WHERE proname = 'set_advertiser_role_on_verification';
```

**Solutions:**
```sql
-- Manually promote if needed
UPDATE users
SET user_role = 'advertiser'
WHERE verification_status = 'verified'
  AND bar_verified_at IS NOT NULL
  AND user_role != 'advertiser';

-- Re-create trigger
DROP TRIGGER IF EXISTS trigger_set_advertiser_role ON users;
CREATE TRIGGER trigger_set_advertiser_role
  BEFORE UPDATE ON users
  FOR EACH ROW
  WHEN (OLD.verification_status IS DISTINCT FROM NEW.verification_status)
  EXECUTE FUNCTION set_advertiser_role_on_verification();
```

---

## Future Enhancements

### Phase 2 (Q1 2025)
- [ ] Integrate real State Bar API for automatic verification
- [ ] Email notifications for verification status
- [ ] Admin dashboard for manual review
- [ ] Verification appeal process

### Phase 3 (Q2 2025)
- [ ] Risk-based CAPTCHA (adaptive bot detection)
- [ ] Machine learning for fraud detection
- [ ] Multi-state bar support
- [ ] International attorney verification

### Phase 4 (Q3 2025)
- [ ] Behavioral analytics for abuse detection
- [ ] Dynamic rate limiting (adjust per user)
- [ ] Advanced user reputation system
- [ ] SSO integration for law firms

---

## Support

### Documentation
- [Deployment Guide](/docs/AUTH_DEPLOYMENT_GUIDE.md)
- [Deployment Summary](/DEPLOYMENT_SUMMARY.md)
- [Environment Variables](/.env.example)

### External Resources
- [Cloudflare Turnstile Docs](https://developers.cloudflare.com/turnstile/)
- [Clerk Authentication](https://clerk.com/docs)
- [Upstash Redis](https://docs.upstash.com/redis)

### Getting Help

**Internal:**
- Development team: Check git history for implementation details
- Support team: See troubleshooting section above

**External:**
- Cloudflare support: https://developers.cloudflare.com/support/
- Clerk support: https://clerk.com/support
- Upstash support: https://upstash.com/docs/common/help/support

---

## Change Log

### Version 1.0 (2025-10-20)
- ✅ Initial implementation
- ✅ Cloudflare Turnstile integration
- ✅ Authentication-gated AI chat
- ✅ Tiered rate limiting
- ✅ Bar number verification
- ✅ User roles system
- ✅ Advertiser onboarding flow
- ✅ Database migration
- ✅ Comprehensive documentation

---

**Maintained By:** Development Team
**Last Updated:** 2025-10-20
**Status:** Production Ready

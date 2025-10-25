# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Guidelines

- Only modify code directly relevant to the specific request. Avoid changing unrelated functionality.
- Never replace code with placeholders like `# ... rest of the processing ...`. Always include complete code.
- Break problems into smaller steps. Think through each step separately before implementing.
- Always provide a complete PLAN with REASONING based on evidence from code and logs before making changes.
- Explain your OBSERVATIONS clearly, then provide REASONING to identify the exact issue. Add console logs when needed to gather more information.

## Development Commands

### Development & Build

```bash
npm run dev              # Start dev server with env validation (localhost:3000)
npm run dev:turbo        # Start with Turbo mode (faster HMR)
npm run build            # Production build with env validation
npm run build:netlify    # Netlify-specific build (skips env validation)
npm start                # Start production server
npm run clean            # Clear Next.js cache
```

### Testing

```bash
npm test                 # Run all Vitest tests
npm run test:unit        # Unit tests only (tests/unit)
npm run test:integration # Integration tests only (tests/integration)
npm run test:a11y        # Accessibility tests (tests/a11y)
npm run test:e2e         # Playwright E2E tests
npm run test:e2e:ui      # E2E tests with Playwright UI
npm run test:watch       # Watch mode for rapid testing
npm run test:coverage    # Generate coverage report
npm run test:all         # Run all test suites (unit + integration + a11y + e2e)

# Run a single test file in watch mode
npm run test:watch -- tests/unit/specific-test.test.ts
```

### Code Quality

```bash
npm run lint             # ESLint check
npm run lint:strict      # ESLint with zero warnings allowed
npm run type-check       # TypeScript type checking
npm run format           # Format all files with Prettier
npm run format:check     # Check formatting without modifying
```

### Data Sync & Analytics

```bash
npm run sync:courts      # Sync courts from CourtListener
npm run sync:judges      # Sync judges from CourtListener
npm run sync:decisions   # Sync judicial decisions
npm run analytics:generate # Batch generate AI analytics for judges
npm run data:status      # Check data freshness and counts
```

### Database Operations

```bash
npm run integrity:full   # Full database integrity check
npm run validate:relationships # Validate judge-court relationships

# Apply migrations to Supabase
npx supabase db push

# Connect to production database (requires SUPABASE_DB_PASSWORD)
PGPASSWORD="$SUPABASE_DB_PASSWORD" psql -h <host> -U postgres -d postgres
```

### Launch/Production Commands

```bash
npm run launch:analytics # Generate analytics for all judges (Day 1-2)
npm run launch:data      # Run full data sync (courts + judges)
npm run launch:validate  # Validate all systems before launch
```

## Architecture Overview

### Tech Stack

- **Framework**: Next.js 15 (App Router) + TypeScript
- **Database**: Supabase PostgreSQL with RLS policies
- **Authentication**: Clerk with fail-fast production validation
- **AI**: Google Gemini 1.5 Flash (primary), OpenAI GPT-4o-mini (fallback)
- **Cache/Rate Limiting**: Upstash Redis
- **Hosting**: Netlify with @netlify/plugin-nextjs
- **Monitoring**: Sentry error tracking
- **Email**: SendGrid for transactional emails

### Project Structure

```
app/                    # Next.js App Router
  api/                  # API routes (serverless functions)
    chat/               # AI chat assistant
    admin/              # Admin endpoints (sync, stats)
      bar-verifications/ # Bar verification management (NEW)
    advertising/        # Advertiser APIs
      verify-bar/       # Bar number submission (NEW)
    cron/               # Scheduled jobs (daily/weekly sync)
  judges/[slug]/        # Dynamic judge pages
  courts/[slug]/        # Dynamic court pages
  attorneys/            # Attorney directory (NEW)

components/             # React components
  judges/               # Judge-specific UI
  chat/                 # AI chatbot UI
  ads/                  # Advertising components
  dashboard/            # Dashboard components

lib/                    # Core business logic
  analytics/            # Judicial bias calculations & metrics
  ai/                   # Legal query classification & search
  sync/                 # Data sync orchestration
    queue-manager.ts    # Atomic job processing with row-locking
  domain/               # DDD patterns (aggregates, value objects, services)
  courtlistener/        # CourtListener API client
  supabase/             # Supabase client & helpers
  auth/                 # Clerk authentication utilities
  security/             # Rate limiting, API auth, headers
  verification/         # Bar number verification (NEW)
    state-bar-client.ts # State Bar API integration
  email/                # Email service (NEW)
    service.ts          # SendGrid email service
    templates.ts        # Email templates
    dunning-manager.ts  # Payment dunning workflow
  stripe/               # Stripe payment integration
    webhooks.ts         # Webhook handlers
    organization-billing.ts # Subscription management

scripts/                # Node automation scripts
  sync-*.js             # Manual sync scripts
  batch-generate-analytics.js
  database-integrity-check.js

supabase/migrations/    # SQL migrations (timestamped)
tests/                  # Test suites
  unit/                 # Unit tests (Vitest)
  integration/          # Integration tests
  e2e/                  # E2E tests (Playwright)
  a11y/                 # Accessibility tests
```

## Core Business Logic

### 1. Judicial Analytics System (Importance: 95/100)

**Location**: `lib/analytics/bias-calculations.ts`

The platform's most critical component. Analyzes judicial patterns through:

- **Bias Pattern Detection**: Case outcome correlation analysis
- **Settlement Rate Analysis**: By case type and monetary value
- **Motion Grant Rates**: With statistical confidence scoring
- **Temporal Trend Analysis**: Decision patterns over time
- **Baseline Comparisons**: Against jurisdiction averages

**Key Concept**: Requires minimum 500 cases for statistical confidence. All metrics include confidence intervals.

### 2. Court Advertising Platform (Importance: 90/100)

**Location**: `lib/domain/services/AdPricingService.ts`, `lib/stripe/judge-products.ts`

**🔑 BUSINESS MODEL**: JudgeFinder is **FREE for end users**. Revenue comes from legal professional advertising.

- **End Users**: 100% FREE (search, analytics, bias reports, no registration required)
- **Advertisers** (Lawyers/Law Firms): Pay for ad placement on judge profile pages

**Universal $500 Standard Pricing for Advertisers** (Updated 2025-10-20):

- **Standard Pricing**: $500/month, $5,000/year for ALL judge ad placements (federal and state)
- **Exclusive Placement Premium**: $750/month (1.5x multiplier, no competing ads on judge page)
- **Bundle Discounts**: 10% (3+ spots), 15% (5+ spots), 20% (10+ spots)
- **Annual Discount**: 2 months free (10-month pricing for 12-month subscription)
- **Professional Verification**: Bar number required for advertising (lawyers only)
- **Geographic Targeting**: Court-specific placement rules

**Deprecated**: Tiered pricing (basic/premium/enterprise) and court-level multipliers removed for simplicity.

**Critical**: All advertisers must have verified bar numbers. See Bar Verification System below.

### 3. Bar Verification System (Importance: 88/100) 🆕

**Location**: `lib/verification/state-bar-client.ts`, `app/api/advertising/verify-bar/route.ts`

Attorney credential verification for advertiser access:

**Flow**:

1. User submits bar number via `/api/advertising/verify-bar`
2. System validates format and creates `bar_verifications` record with `status='pending'`
3. Admin reviews via `/api/admin/bar-verifications` (manual verification currently)
4. On approval: User gets `user_role='advertiser'` and `verification_status='verified'`
5. User receives email notification via SendGrid

**Database Tables**:

- `app_users` - Added fields: `user_role`, `bar_number`, `bar_state`, `bar_verified_at`, `verification_status`
- `bar_verifications` - Audit trail of all verification requests

**Security**:

- Rate limiting: 10 submissions/hour per user
- Turnstile CAPTCHA required
- Unique constraint on `(bar_number, bar_state)` prevents duplicates
- Admin-only approval endpoints with MFA enforcement

**Future**: Automated State Bar API integration (Phase 2) - currently manual verification workflow.

See `docs/BAR_VERIFICATION.md` for complete documentation.

### 4. Email Notification System (Importance: 85/100) 🆕

**Location**: `lib/email/service.ts`, `lib/email/templates.ts`, `lib/email/dunning-manager.ts`

SendGrid-based transactional email system:

**Email Types**:

- **Payment Success**: Receipt with subscription details
- **Payment Failed**: Retry notification with action link
- **Dunning Sequence**: Multi-stage failed payment recovery (3, 7, 14 days)
- **Subscription Canceled**: Confirmation and access end date
- **Bar Verification**: Submission confirmation, approval/rejection

**Features**:

- Template-based emails with branding
- Automatic retry logic for failed sends
- Complete audit trail in `email_send_log` table
- Graceful degradation if SendGrid unavailable
- Dunning manager with exponential backoff

**Configuration**:

- `SENDGRID_API_KEY` - Required for production
- `SENDGRID_FROM_EMAIL` - Verified sender (billing@judgefinder.io)

**Testing**: Emails are logged even if SendGrid is not configured (dev mode).

### 5. Judge Assignment Management (Importance: 85/100)

**Location**: `lib/sync/judge-sync.ts`

Multi-source judicial position tracking:

- **Court Transfer Detection**: Identifies when judges change courts
- **Retirement Analysis**: Uses docket pattern changes
- **Multi-jurisdiction Tracking**: Handles judges serving multiple courts
- **Historical Preservation**: Maintains complete position history

**Business Rule**: Single active position per court, temporal overlaps flagged for review.

### 6. Legal Search Intelligence (Importance: 80/100)

**Location**: `lib/ai/legal-query-classifier.ts`, `lib/ai/search-intelligence.ts`

AI-powered search with legal domain knowledge:

- **Practice Area Classification**: Identifies legal specialties in queries
- **Judge Expertise Matching**: Maps queries to relevant judges
- **Court Hierarchy Awareness**: Results ranked by jurisdictional relevance
- **Professional Intent Detection**: Distinguishes legal professionals from general public

### 7. Data Sync Queue System (Importance: 80/100) 🆕

**Location**: `lib/sync/queue-manager.ts`

Distributed job queue with atomic claim-and-lock pattern:

**Key Features**:

- **PostgreSQL Row Locking**: Uses `FOR UPDATE SKIP LOCKED` to prevent race conditions
- **Atomic Job Claiming**: Multiple workers can safely process queue concurrently
- **Retry Logic**: Exponential backoff with configurable max retries (default: 3)
- **Priority Queuing**: Jobs processed by priority (higher first)
- **Status Tracking**: `pending`, `running`, `completed`, `failed`, `cancelled`

**Job Types**:

- `court` - Sync court data from CourtListener
- `judge` - Sync judge profiles
- `decision` - Sync case decisions
- `full` - Complete data refresh
- `cleanup` - Maintenance tasks

**Database**: `sync_queue` table with indexes on `(status, priority, scheduled_for)`

**Critical**: This prevents duplicate sync operations when running multiple Netlify function instances.

### 8. Data Quality Control (Importance: 75/100)

**Location**: `lib/sync/data-quality-validator.ts`

- **Court Relationship Validation**: Ensures valid court hierarchies
- **Judge Assignment Integrity**: Prevents invalid court-judge associations
- **Case Distribution Analysis**: Identifies data anomalies
- **Minimum Case Thresholds**: 500 cases required for analytics
- **Statistical Confidence Scoring**: Quality metrics for all analytics

## Authentication & Security

### Fail-Fast Security Model

The platform **REFUSES to start in production** without valid Clerk authentication keys.

**Protected Routes** (via `middleware.ts`):

- `/profile/*`, `/settings/*`, `/dashboard/*` - User areas
- `/api/chat` - AI assistant (requires sign-in)
- `/api/admin/*` - Admin endpoints (requires `x-api-key` header + admin role)
- `/api/cron/*` - Scheduled jobs (requires `CRON_SECRET`)
- `/ads/buy`, `/api/checkout/*`, `/api/billing/*` - Advertiser-only routes

**Development vs Production**:

- **Development**: Allows running without Clerk (with warnings) for local dev
- **Production**: Hard fails if `CLERK_SECRET_KEY` missing or invalid

**Rate Limiting**:

- Anonymous users: 10 searches/24 hours
- Authenticated users: 100 searches/hour, 20 chat messages/hour
- Bar verification: 10 submissions/hour per user
- Implemented via Upstash Redis in `lib/security/rate-limit.ts`

### Bot Protection

- **Cloudflare Turnstile**: CAPTCHA for AI chat (first message) and bar verification
- **Rate Limiting**: Multi-tier limits (anonymous vs authenticated)
- **API Key Rotation**: Admin endpoints use rotated keys

### Admin Security

- Admin routes check `is_admin = true` in `app_users` table
- MFA enforcement for sensitive operations (planned)
- All admin actions logged with `clerk_user_id`

## Database Schema Patterns

### Key Tables

- `judges` - Judge profiles with bias analytics
- `courts` - Court directory with hierarchy
- `cases` - Judicial decisions and outcomes
- `judge_court_positions` - Historical position tracking
- `app_users` - Clerk user mapping with roles (`user_role`: user/advertiser/admin)
- `bar_verifications` - Attorney verification audit trail 🆕
- `ad_spots` - Advertising inventory
- `ad_orders` - Purchase records
- `sync_queue` - Data sync job queue 🆕
- `email_send_log` - Email delivery audit trail 🆕

### Important Patterns

1. **Judge-Case Matching**: Multi-stage normalized name matching with jurisdiction context
2. **Court Hierarchy**: Parent-child relationships for appellate/trial courts
3. **RLS Policies**: Row-level security for user data isolation
4. **Materialized Views**: Performance optimization for analytics queries
5. **Atomic Operations**: PostgreSQL row-locking for queue management

### Critical Notes

- **Clerk user mapping**: Use `clerk_user_id` field in `app_users` table, NOT `clerk_id`
- **User Roles**: Enum `user_role` in ('user', 'advertiser', 'admin')
- **Verification Status**: Enum `verification_status` in ('none', 'pending', 'verified', 'rejected')

### Migration Workflow

```bash
# Migrations are in supabase/migrations/ with timestamp prefix
# Apply via Supabase dashboard SQL editor or CLI:
npx supabase db push
```

## AI Integration

### Dual-Model Strategy

1. **Primary**: Google Gemini 1.5 Flash (cost-effective, fast)
2. **Fallback**: OpenAI GPT-4o-mini (when Gemini unavailable)

**Cost Tracking**: `lib/ai/cost-tracker.ts` monitors API spend

### AI Features

- **Judicial Analytics**: Bias pattern summaries (`lib/analytics/ai-augment.ts`)
- **Legal Chat**: Context-aware Q&A about judges/courts (`app/api/chat/route.ts`)
- **Search Classification**: Query understanding (`lib/ai/legal-query-classifier.ts`)

**Key Insight**: All AI responses include citations to source data and confidence disclaimers.

## Domain-Driven Design Patterns

The codebase uses DDD patterns in `lib/domain/`:

### Aggregates

- `JudgeAggregate.ts` - Judge entity with position history

### Value Objects

- `BarNumber.ts` - Validated state bar numbers 🆕
- `Jurisdiction.ts` - Court jurisdiction identifiers
- `Money.ts` - Currency amounts with precision

### Services

- `AdPricingService.ts` - Complex pricing calculations
- `CourtAssignmentService.ts` - Judge-court assignment logic

### Specifications

- `JudgeEligibilitySpec.ts` - Composable eligibility rules

**Pattern**: Use these for business logic encapsulation, not for simple CRUD.

## Common Development Patterns

### Error Handling

Always use detailed error logging with context:

```typescript
console.error('[Component Name] Error occurred:', {
  message: error instanceof Error ? error.message : String(error),
  stack: error instanceof Error ? error.stack : undefined,
  context: { userId, judgeId, etc },
})
```

### API Routes

Follow the pattern in `app/api/chat/route.ts`:

1. Log request received
2. Log environment check (without exposing keys)
3. Validate authentication
4. Check rate limits (with graceful degradation)
5. Process request with detailed step logging
6. Return specific error messages (not generic "error occurred")

### Graceful Degradation

Services should continue when dependencies unavailable:

- Redis down → Skip rate limiting with warning
- RPC function missing → Fall back to SELECT query
- OpenAI down → Use Gemini
- AI unavailable → Return cached/static data
- SendGrid unavailable → Log email attempt without sending

### Component Development

- Use `lib/auth/safe-clerk-components.tsx` for auth-aware components
- All interactive elements must support keyboard navigation
- Include ARIA labels for screen readers
- Test with `npm run test:a11y`

## Deployment

### Netlify

Build configuration in `netlify.toml`:

- Node 20 (or 22)
- Next.js plugin enabled
- Environment variables set in Netlify dashboard

**Critical Environment Variables**:

- `CLERK_SECRET_KEY` - REQUIRED for production
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - REQUIRED for production
- `OPENAI_API_KEY` - AI chat functionality
- `GOOGLE_AI_API_KEY` - Analytics generation
- `SUPABASE_SERVICE_ROLE_KEY` - Database access
- `SUPABASE_JWT_SECRET` - Service account token signing
- `UPSTASH_REDIS_REST_URL` & `UPSTASH_REDIS_REST_TOKEN` - Rate limiting
- `TURNSTILE_SECRET_KEY` & `NEXT_PUBLIC_TURNSTILE_SITE_KEY` - Bot protection
- `STRIPE_SECRET_KEY` - Payment processing
- `STRIPE_WEBHOOK_SECRET` - Webhook validation
- `STRIPE_PRICE_MONTHLY` - $500/month price ID
- `STRIPE_PRICE_YEARLY` - $5,000/year price ID
- `SENDGRID_API_KEY` - Email notifications 🆕
- `SENDGRID_FROM_EMAIL` - Verified sender address 🆕
- `ENCRYPTION_KEY` - Secure data encryption (required in production)
- `CRON_SECRET` - Scheduled job authentication

### Netlify Function Timeouts 🆕

Default functions timeout at 10 seconds. Long-running operations use background functions:

**Background Functions** (5-minute timeout):

- `/api/sync/courts/route` - Court data sync
- `/api/sync/judges/route` - Judge data sync
- `/api/sync/queue/process/route` - Queue processor

Configuration in `netlify.toml`:

```toml
[functions."api/sync/courts/route"]
  [[functions."api/sync/courts/route".timeout]]
    maxDuration = 300  # 5 minutes
```

### Scheduled Jobs

Netlify cron jobs (configured in `netlify.toml`):

- **Daily** (`0 2 * * *`): `/api/cron/daily-sync` - Updates judges/decisions
- **Weekly** (`0 3 * * 0`): `/api/cron/weekly-sync` - Full court sync
- **Daily** (`0 4 * * *`): `/api/cron/cleanup-checkouts` - Clean expired sessions 🆕

**Security**: All cron routes require `CRON_SECRET` in header.

### Secrets Scanning Configuration 🆕

Netlify's secret scanner has custom configuration to prevent false positives:

**Excluded Paths** (in `netlify.toml`):

- `.next/**`, `node_modules/**` - Build artifacts
- `coverage/**`, `reports/**` - Test outputs
- `docs/**`, `README.md` - Documentation
- `.env.example` - Template file (safe)

**Excluded Keys**:

- `NEXT_PUBLIC_*` - Intentionally public variables
- `ADMIN_USER_IDS` - Clerk IDs (not sensitive)
- Build configuration variables

This prevents build failures from detecting public keys in documentation.

## Testing

### Test Structure

```
tests/
  unit/              # Fast, isolated unit tests (Vitest)
  integration/       # API and database integration tests
  e2e/               # Full user flow tests (Playwright)
  a11y/              # Accessibility compliance tests
  fixtures/          # Shared test data
  helpers/           # Test utilities
```

### Running Tests

```bash
# Unit tests (fast, run frequently)
npm run test:unit

# Integration tests (require database)
npm run test:integration

# E2E tests (require running server)
npm run test:e2e
npm run test:e2e:ui  # With Playwright UI

# Accessibility tests
npm run test:a11y

# Single test file in watch mode
npm run test:watch -- tests/unit/analytics/bias-calculations.test.ts

# Coverage report
npm run test:coverage
```

### Writing Tests

- Place tests next to the code they test when possible
- Use descriptive test names: `it('should reject invalid bar number format')`
- Mock external dependencies (Stripe, SendGrid, CourtListener)
- Test error cases and edge cases, not just happy paths

## Troubleshooting

### Development Issues

1. **"Authentication not configured" error**
   - Set `CLERK_SECRET_KEY` in `.env.local` (or run in dev mode with warnings)

2. **Missing judge data**
   - Run `npm run sync:judges` to populate local database
   - Check Supabase env vars are set

3. **AI chat failing**
   - Check Netlify function logs for `[Chat API]` entries
   - Verify `OPENAI_API_KEY` is set and valid
   - Look for specific error status codes (401, 403, 429, 500)

4. **Rate limit errors**
   - Redis connection: Check Upstash credentials
   - Code continues with degraded rate limiting if Redis unavailable

5. **Type errors after pulling**
   - Run `npm run type-check` to see all errors
   - May need to regenerate Supabase types

6. **Email not sending** 🆕
   - Check `SENDGRID_API_KEY` is configured
   - Verify `SENDGRID_FROM_EMAIL` is verified in SendGrid dashboard
   - Check `email_send_log` table for delivery attempts and errors
   - In development, emails are logged but not sent (normal behavior)

7. **Bar verification not working** 🆕
   - Ensure `bar_verifications` table exists (run migration)
   - Check `app_users` has `user_role`, `bar_number`, `bar_state` columns
   - Verify admin user has `is_admin = true` in database
   - Check Turnstile CAPTCHA is configured

### Production Issues

1. **Check Netlify function logs** - Most detailed error information
2. **Check Sentry** - Aggregated errors with stack traces
3. **Use admin endpoints** - `/api/admin/sync-status` for queue health
4. **Monitor Redis** - Upstash dashboard for rate limit metrics
5. **Check email logs** 🆕 - Query `email_send_log` table for delivery issues
6. **Verify cron jobs** 🆕 - Check Netlify function logs for scheduled execution

### Database Debugging

```sql
-- Check sync queue status
SELECT type, status, COUNT(*)
FROM sync_queue
GROUP BY type, status;

-- Check bar verification status
SELECT verification_status, COUNT(*)
FROM app_users
GROUP BY verification_status;

-- Check email delivery
SELECT
  email_type,
  status,
  COUNT(*),
  MAX(created_at) as last_sent
FROM email_send_log
GROUP BY email_type, status
ORDER BY last_sent DESC;

-- Check advertiser roles
SELECT user_role, COUNT(*)
FROM app_users
GROUP BY user_role;
```

## Important Notes

- **Clerk user mapping** - Use `clerk_user_id` field in `app_users` table, NOT `clerk_id`
- **RPC functions** - May not exist in all environments, always provide fallback queries
- **Minimum 500 cases** - Required for statistical confidence in bias analytics
- **Bar number validation** - Use `BarNumber.validate()` for advertiser verification
- **Accessibility** - WCAG 2.2 Level AA compliance required
- **Email graceful degradation** - System continues if SendGrid unavailable (logs only)
- **Atomic queue operations** - Always use `queue-manager.ts` for sync jobs, never manual updates
- **Background functions** - Use for operations >10 seconds (configure in `netlify.toml`)

## Additional Resources

See `docs/` directory for detailed documentation:

- `docs/architecture/ARCHITECTURE.md` - System architecture
- `docs/api/API_REFERENCE.md` - API endpoint documentation
- `docs/operations/SYNC_AND_CRON.md` - Data sync details
- `docs/security/SECURITY.md` - Security best practices
- `docs/accessibility/CHAT_A11Y.md` - Accessibility guidelines
- `docs/BAR_VERIFICATION.md` - Bar verification system documentation 🆕
- `docs/EMAIL_SYSTEM.md` - Email notification system 🆕
- `docs/CACHING_STRATEGY.md` - Redis caching patterns 🆕

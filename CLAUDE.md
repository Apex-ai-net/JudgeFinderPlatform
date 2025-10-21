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

### Project Structure
```
app/                    # Next.js App Router
  api/                  # API routes (serverless functions)
    chat/               # AI chat assistant
    admin/              # Admin endpoints (sync, stats)
    cron/               # Scheduled jobs (daily/weekly sync)
  judges/[slug]/        # Dynamic judge pages
  courts/[slug]/        # Dynamic court pages

components/             # React components
  judges/               # Judge-specific UI
  chat/                 # AI chatbot UI
  ads/                  # Advertising components

lib/                    # Core business logic
  analytics/            # Judicial bias calculations & metrics
  ai/                   # Legal query classification & search
  sync/                 # Data sync orchestration
  domain/               # DDD patterns (aggregates, value objects, services)
  courtlistener/        # CourtListener API client
  supabase/             # Supabase client & helpers
  auth/                 # Clerk authentication utilities
  security/             # Rate limiting, API auth, headers

scripts/                # Node automation scripts
  sync-*.js             # Manual sync scripts
  batch-generate-analytics.js
  database-integrity-check.js

supabase/migrations/    # SQL migrations (timestamped)
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

**Critical**: All advertisers must have verified bar numbers. See `lib/domain/value-objects/BarNumber.ts` for validation.

### 3. Judge Assignment Management (Importance: 85/100)
**Location**: `lib/sync/judge-sync.ts`

Multi-source judicial position tracking:
- **Court Transfer Detection**: Identifies when judges change courts
- **Retirement Analysis**: Uses docket pattern changes
- **Multi-jurisdiction Tracking**: Handles judges serving multiple courts
- **Historical Preservation**: Maintains complete position history

**Business Rule**: Single active position per court, temporal overlaps flagged for review.

### 4. Legal Search Intelligence (Importance: 80/100)
**Location**: `lib/ai/legal-query-classifier.ts`, `lib/ai/search-intelligence.ts`

AI-powered search with legal domain knowledge:
- **Practice Area Classification**: Identifies legal specialties in queries
- **Judge Expertise Matching**: Maps queries to relevant judges
- **Court Hierarchy Awareness**: Results ranked by jurisdictional relevance
- **Professional Intent Detection**: Distinguishes legal professionals from general public

### 5. Data Quality Control (Importance: 75/100)
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
- `/api/admin/*` - Admin endpoints (requires `x-api-key` header)
- `/api/cron/*` - Scheduled jobs (requires `CRON_SECRET`)

**Development vs Production**:
- **Development**: Allows running without Clerk (with warnings) for local dev
- **Production**: Hard fails if `CLERK_SECRET_KEY` missing or invalid

**Rate Limiting**:
- Anonymous users: 10 searches/24 hours
- Authenticated users: 100 searches/hour, 20 chat messages/hour
- Implemented via Upstash Redis in `lib/security/rate-limit.ts`

### Bot Protection
- **Cloudflare Turnstile**: CAPTCHA for AI chat (first message)
- **Rate Limiting**: Multi-tier limits (anonymous vs authenticated)
- **API Key Rotation**: Admin endpoints use rotated keys

## Database Schema Patterns

### Key Tables
- `judges` - Judge profiles with bias analytics
- `courts` - Court directory with hierarchy
- `cases` - Judicial decisions and outcomes
- `judge_court_positions` - Historical position tracking
- `app_users` - Clerk user mapping (uses `clerk_user_id` not `clerk_id`)
- `ad_spots` - Advertising inventory
- `ad_orders` - Purchase records

### Important Patterns
1. **Judge-Case Matching**: Multi-stage normalized name matching with jurisdiction context
2. **Court Hierarchy**: Parent-child relationships for appellate/trial courts
3. **RLS Policies**: Row-level security for user data isolation
4. **Materialized Views**: Performance optimization for analytics queries

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
- `BarNumber.ts` - Validated state bar numbers
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
  context: { userId, judgeId, etc }
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
- `UPSTASH_REDIS_REST_URL` & `UPSTASH_REDIS_REST_TOKEN` - Rate limiting
- `TURNSTILE_SECRET_KEY` & `NEXT_PUBLIC_TURNSTILE_SITE_KEY` - Bot protection

### Scheduled Jobs
Netlify cron jobs (configured in dashboard):
- Daily: `/api/cron/daily-sync` - Updates judges/decisions
- Weekly: `/api/cron/weekly-sync` - Full court sync

**Security**: Both require `CRON_SECRET` in header.

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

### Production Issues
1. **Check Netlify function logs** - Most detailed error information
2. **Check Sentry** - Aggregated errors with stack traces
3. **Use admin endpoints** - `/api/admin/sync-status` for queue health
4. **Monitor Redis** - Upstash dashboard for rate limit metrics

## Important Notes

- **Clerk user mapping** - Use `clerk_user_id` field in `app_users` table, NOT `clerk_id`
- **RPC functions** - May not exist in all environments, always provide fallback queries
- **Minimum 500 cases** - Required for statistical confidence in bias analytics
- **Bar number validation** - Use `BarNumber.validate()` for advertiser verification
- **Accessibility** - WCAG 2.2 Level AA compliance required

## Additional Resources

See `docs/` directory for detailed documentation:
- `docs/architecture/ARCHITECTURE.md` - System architecture
- `docs/api/API_REFERENCE.md` - API endpoint documentation
- `docs/operations/SYNC_AND_CRON.md` - Data sync details
- `docs/security/SECURITY.md` - Security best practices
- `docs/accessibility/CHAT_A11Y.md` - Accessibility guidelines

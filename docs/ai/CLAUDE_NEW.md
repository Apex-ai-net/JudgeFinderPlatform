# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# JudgeFinder Platform - AI-Powered Judicial Transparency Tool

## Platform Status: PRE-LAUNCH - 5 Days to Production

**Live Production URL:** `https://olms-4375-tw501-x421.netlify.app/`
**Local Development:** `http://localhost:3005` (NOT default 3000)
**Deployment:** GitHub → Netlify (automatic on push to main)

## Critical Development Rules

1. **Dev Server Port:** Always use `npx next dev -p 3005` - Port 3005 is the project standard
2. **Clerk Auth:** Keys may be placeholders - authentication disabled in dev if not configured
3. **Build Command:** Use `npm run build` - Netlify plugin handles output configuration
4. **Windows Environment:** Optimized for Windows/WSL - worker threads disabled in next.config.js
5. **Path Aliases:** Use `@/*` for imports (configured in both tsconfig.json and webpack)
6. **Console Suppression:** All console.* (except error) suppressed in production builds

## Tech Stack & Configuration

- **Framework:** Next.js 15.5.3 with App Router, TypeScript 5.3.3
- **React:** 18.3.0 (Concurrent Features enabled)
- **Database:** Supabase Postgres with `@supabase/ssr`
- **Auth:** Clerk 6.31.3 (graceful fallback mode)
- **Cache/Rate Limit:** Upstash Redis 1.32.0
- **AI:** Google Gemini 1.5 Flash (primary) + OpenAI GPT-4o-mini (fallback)
- **Hosting:** Netlify with `@netlify/plugin-nextjs`
- **Error Monitoring:** Sentry 8.20.0
- **Node:** v20+ (npm >=10)

## Essential Commands

```bash
# Development (ALWAYS use port 3005)
npx next dev -p 3005              # Start dev server
npm run type-check                # TypeScript validation
npm run lint                      # ESLint check
npm run test                      # Run lint + type-check

# AI & Analytics (5-day launch priority)
npm run analytics:generate        # Batch generate AI analytics for judges
npm run bias:analyze             # Run bias detection analysis

# Data Sync Operations
npm run sync:courts              # Sync court data from CourtListener
npm run sync:judges              # Sync judge profiles
npm run sync:decisions           # Sync case decisions

# Data Validation & Integrity
npm run integrity:full           # Complete database integrity check
npm run validate:relationships   # Validate court-judge assignments
npm run data:status             # Check current data population status

# Scheduled Jobs (Manual Trigger)
npm run cron:daily              # Manual daily sync
npm run cron:weekly             # Manual weekly sync
npm run assignments:update      # Update judge-court assignments

# Deployment
npm run build                   # Build for production
netlify deploy --dir=.next     # Deploy to draft URL
netlify deploy --prod          # Deploy to production
```

## 5-Day Launch Plan

### Days 1-2: Data Population (Priority 1)
```bash
npm run sync:judges && npm run sync:decisions && npm run analytics:generate
```
**Goal:** Every active California judge has AI analytics generated

### Day 3: Fix Critical Errors (Priority 2)
- Add `export const dynamic = 'force-dynamic'` to dynamic API routes
- Verify Clerk keys or document fallback behavior
- Complete missing admin pages

### Day 4: Production Setup (Priority 3)
```bash
netlify deploy --prod
```
- Configure environment variables in Netlify dashboard
- Set up Upstash Redis for rate limiting
- Configure Sentry error tracking

### Day 5: Final Validation (Priority 4)
```bash
npm run integrity:full && npm run validate:relationships
```
- Test all judge search functionality
- Verify comparison tool works
- Check all API endpoints
- Performance testing (target: <3s page loads)

## Architecture & Code Organization

### Frontend Structure
```
app/
├── (dynamic routes use force-dynamic export)
├── compare/page.tsx          # Judge comparison tool (3-judge limit)
├── judges/
│   ├── page.tsx             # Judge directory with advanced search
│   └── [slug]/page.tsx      # Individual judge profile
├── courts/page.tsx          # Court directory
├── jurisdictions/[county]/  # County-specific pages
└── api/                     # All API routes (see below)

components/
├── judges/
│   ├── SearchSection.tsx    # Advanced search with filters
│   ├── BiasPatternAnalysis.tsx  # AI bias visualization
│   └── ComparisonGrid.tsx   # Side-by-side judge comparison
├── ui/                      # Reusable UI components (shadcn/ui)
└── security/                # Security-related components
```

### Backend Systems
```
lib/
├── ai/
│   └── judicial-analytics.js    # Core AI bias analysis (6 categories)
├── sync/                        # CourtListener data sync systems
├── security/
│   ├── headers.ts              # CSP, HSTS, XSS protection
│   ├── api-auth.ts             # Cron job authentication
│   └── rate-limit.ts           # Upstash Redis rate limiting
├── cache/
│   ├── redis.ts               # Redis caching layer
│   └── simple-cache.ts        # In-memory fallback cache
├── middleware/
│   └── judge-redirects.ts     # SEO-friendly URL redirects
└── supabase/                  # Database client & helpers

scripts/
├── batch-generate-analytics.js     # AI analytics generation
├── comprehensive-validation.js     # Data integrity checks
├── automated-assignment-updater.js # Judge-court assignments
└── sync-*.js                       # Various sync operations

middleware.ts              # Clerk auth + security headers + redirects
instrumentation.ts         # Sentry error monitoring setup
```

### Configuration Files
```
next.config.js            # Console suppression, image optimization, security
tsconfig.json            # @ alias, strict mode, bundler resolution
netlify.toml             # Build config (handled by plugin)
.cursorrules             # AI coding guidelines (see below)
.cursor/rules/*.mdc      # Domain-specific coding rules
```

## API Architecture Overview

**Note:** All API routes require appropriate authentication or API keys in production

### Judge APIs (25 endpoints - Primary Platform Feature)
```
/api/judges/
├── GET list                    # Paginated directory
├── GET search                  # Real-time search
├── GET advanced-search         # Multi-filter search
├── GET [id]/analytics          # Comprehensive analytics
├── GET [id]/bias-analysis      # AI-powered bias detection (5 metrics)
├── GET [id]/case-outcomes      # Outcome analysis
├── GET [id]/recent-cases       # Latest activity
└── ... (20+ more endpoints)
```

### Admin APIs (Protected by Clerk + API Keys)
```
/api/admin/
├── GET stats                   # Platform statistics
├── GET sync-status            # Queue health, logs, freshness
├── POST sync-status           # Queue control (requires x-api-key)
├── POST sync                  # Manual sync trigger
└── GET verification           # Data integrity status
```

### Automation APIs (Cron Authentication Required)
```
/api/cron/
├── POST daily-sync            # 2:00 AM, 2:00 PM daily
└── POST weekly-sync           # Sundays 3:00 AM

/api/sync/
├── POST courts               # Manual court sync
├── POST decisions            # Manual decision sync
└── POST judges              # Manual judge sync
```

### Security & Monitoring
```
/api/health                   # System health check (public)
/api/security/csp-report      # CSP violation reporting
```

## AI Analytics System

### Core Bias Detection
**Primary Agent:** Google Gemini 1.5 Flash
**Fallback Agent:** OpenAI GPT-4o-mini
**Analysis Depth:** 50+ case documents per judge
**Confidence Range:** 60-95%

### 5 Bias Detection Metrics
1. **Consistency** - Decision pattern stability
2. **Speed** - Decision timeline analysis
3. **Settlement Preference** - Settlement vs trial tendencies
4. **Risk Tolerance** - Conservative vs aggressive rulings
5. **Predictability** - Pattern reliability score

### Implementation Details
- Location: `lib/ai/judicial-analytics.js`
- Caching: Redis-backed with 7-day TTL
- Cost Optimization: Token usage tracking, progressive analysis
- Error Recovery: Automatic fallback to GPT-4o-mini

## Data Synchronization Architecture

### CourtListener Integration
- **Primary Source:** Official court data API
- **Rate Limiting:** 1000ms delays, exponential backoff
- **Circuit Breaker:** 5 failure threshold, 60s cooldown
- **Retry Logic:** 5 attempts with backoff cap at 15s
- **Resumable:** Progress tracking with queue system

### Sync Configuration (Optional Tuning)
```bash
COURTLISTENER_REQUEST_DELAY_MS=1000       # Default: 1s between requests
COURTLISTENER_MAX_RETRIES=5               # Default: 5 attempts
COURTLISTENER_REQUEST_TIMEOUT_MS=30000    # Default: 30s timeout
COURTLISTENER_CIRCUIT_THRESHOLD=5         # Default: 5 failures
```

## Security Infrastructure

### Middleware Security Stack (middleware.ts)
1. **Clerk Authentication** - Protects /profile, /settings, /dashboard, /admin
2. **Judge Redirects** - SEO-friendly URL rewrites
3. **Security Headers** - CSP, HSTS, XSS protection via `lib/security/headers.ts`
4. **Cache Control** - Path-based caching strategy

### Production Security Features
- Console output suppression (prevents secrets leakage)
- Environment-specific CSP policies
- Redis-powered rate limiting
- API key authentication for cron/admin endpoints
- Sentry error tracking with source map hiding

### Authentication Fallback Behavior
- Clerk keys missing/invalid → Public mode enabled
- Protected routes → Authentication still enforced if keys valid
- Admin routes → Additional role-based checks
- Graceful degradation for development environments

## Domain-Specific Coding Guidelines (.cursorrules)

### Key Development Principles
1. **No Placeholders:** Always include complete code (never `# ... rest of processing ...`)
2. **Step-by-Step:** Break problems into smaller steps with clear reasoning
3. **Evidence-Based:** Plan changes based on code/logs evidence
4. **Complete Context:** Explain observations and reasoning before implementing

### Core Business Components (from .cursorrules)

**1. Judicial Analytics Engine** (Importance: 90/100)
- Path: `lib/ai/judicial-analytics.js`
- 6-category bias detection system
- Confidence scoring 60-95%

**2. Court Data Management** (Importance: 85/100)
- Path: `lib/sync/court-sync.ts`
- Jurisdiction hierarchy mapping
- Judge-court relationship validation

**3. Case Analytics Processing** (Importance: 85/100)
- Path: `lib/analytics/bias-calculations.ts`
- Multi-factor judicial scoring
- Practice area pattern detection

**4. Legal Advertising System** (Importance: 80/100)
- Built but inactive - platform operates as free public service
- Complete $78.5K/month revenue pipeline ready

## Data Models (.cursor/rules/judicial-data-models.mdc)

### Core Entities
```typescript
Judge {
  id, name, currentPosition, historicalPositions,
  specializations, courtAssignments, metrics, status
}

Court {
  id, name, type, jurisdiction, parentCourt,
  divisions, judges, caseTypes
}

Case {
  id, number, type, court, assignedJudge,
  filingDate, status, parties, motions, decisions
}

Jurisdiction {
  id, name, type, parentJurisdiction,
  courts, geographicBoundaries, specialRules
}
```

### Key Relationships
- Judge-Court Assignment: Current + historical tracking
- Court Hierarchy: Parent-child + division organization
- Case-Judge Linking: Primary + pro tem substitutions
- Jurisdiction Authority: Geographic + hierarchical structure

### Validation Rules
- No overlapping court assignments for judges
- Case type restrictions by court
- Geographic boundary enforcement
- Term limit tracking

## Common Development Scenarios

### Adding a New API Endpoint
1. Create route in `app/api/[feature]/route.ts`
2. Add appropriate authentication via middleware or API key check
3. Use Supabase client from `lib/supabase/`
4. Implement rate limiting for public endpoints
5. Add to API documentation in this file

### Modifying AI Analytics
1. Update `lib/ai/judicial-analytics.js` for core logic
2. Regenerate analytics: `npm run analytics:generate`
3. Verify cache invalidation in Redis
4. Test confidence scoring ranges (60-95%)
5. Monitor token usage for cost optimization

### Adding Judge Data
1. Run sync: `npm run sync:judges`
2. Validate relationships: `npm run validate:relationships`
3. Check integrity: `npm run integrity:full`
4. Generate analytics: `npm run analytics:generate`
5. Verify on profile page

### Debugging Sync Issues
1. Check logs: `sync_logs/` directory
2. Review queue status: `GET /api/admin/sync-status` (requires x-api-key header)
3. Monitor CourtListener rate limits (circuit breaker status)
4. Verify environment variables (especially COURTLISTENER_API_KEY)
5. Restart queue if needed: `POST /api/admin/sync-status { action: 'restart_queue' }`

### Testing Deployment
```bash
# Build locally first
npm run build

# Test with dev server
npx next dev -p 3005

# Deploy to draft URL
netlify deploy --dir=.next

# Test draft deployment with Playwright
# (Use production URL in tests)

# Deploy to production
netlify deploy --prod
```

## Environment Variables Reference

```bash
# AI Services (Required for analytics)
GOOGLE_AI_API_KEY=              # Gemini 1.5 Flash (primary)
OPENAI_API_KEY=                 # GPT-4o-mini (fallback)

# External APIs (Required for sync)
COURTLISTENER_API_KEY=          # CourtListener API

# Database (Required)
NEXT_PUBLIC_SUPABASE_URL=       # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=  # Public anon key
SUPABASE_SERVICE_ROLE_KEY=      # Service role key (server only)

# Cache & Rate Limiting (Required for production)
UPSTASH_REDIS_REST_URL=         # Redis REST URL
UPSTASH_REDIS_REST_TOKEN=       # Redis token

# Security (Required for production)
CRON_SECRET=                    # Cron job authentication
SYNC_API_KEY=                   # Admin API authentication

# Optional
CLERK_SECRET_KEY=               # Clerk auth (fallback mode if missing)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
SENTRY_DSN=                     # Error monitoring
NEXT_PUBLIC_SITE_URL=           # Base URL
```

## Known Issues & Workarounds

### Issue: Worker Thread Errors on Windows
**Solution:** Disabled in next.config.js - `workerThreads: false`, `cpus: 1`

### Issue: Build Warnings Don't Block Deployment
**Solution:** `eslint.ignoreDuringBuilds: true` in next.config.js - Fix locally with `npm run lint`

### Issue: Clerk Keys Missing
**Behavior:** Authentication gracefully disabled, public routes remain accessible
**Fix:** Configure production Clerk keys in Netlify environment variables

### Issue: Rate Limiting from CourtListener
**Solution:** Increase `COURTLISTENER_REQUEST_DELAY_MS` or reduce batch sizes in sync scripts

### Issue: Stale Analytics Cache
**Solution:** Redis TTL set to 7 days - regenerate manually with `npm run analytics:generate`

## Testing Strategy

### Manual Testing Checklist
- [ ] Judge search (basic query)
- [ ] Advanced search (multiple filters)
- [ ] Judge profile page loads
- [ ] Bias analysis displays correctly
- [ ] Comparison tool (3 judges)
- [ ] Court directory
- [ ] API health endpoint

### Performance Targets
- Page load: <3 seconds
- API response: <500ms (cached), <2s (uncached)
- Analytics generation: ~30s per judge
- Build time: <5 minutes

### Load Testing
```bash
# Use API health endpoint for basic testing
curl -s https://olms-4375-tw501-x421.netlify.app/api/health

# Test sync status (requires API key)
curl -H "x-api-key: $SYNC_API_KEY" \
  https://olms-4375-tw501-x421.netlify.app/api/admin/sync-status
```

## Additional Documentation

- **Launch Plan:** `docs/launch/LAUNCH_PLAN.md`
- **AI Agents:** `docs/ai/AI_AGENTS.md`
- **Architecture:** `docs/architecture/ARCHITECTURE.md`
- **API Reference:** `docs/api/API_REFERENCE.md`
- **Database Schema:** `docs/data/DATABASE.md`
- **Security:** `docs/security/SECURITY.md`
- **Operations:** `docs/operations/OPERATIONS.md`

## Platform Mission

Advanced judicial transparency and AI-powered bias detection platform for citizens, attorneys, and litigants researching judicial patterns across California's court system.

**Mission:** Promote judicial transparency through AI-powered bias detection and automated data analysis, delivered as a free public service.
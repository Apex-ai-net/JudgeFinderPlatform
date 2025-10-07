# JudgeFinder Platform

AI-powered judicial transparency platform providing real-time analytics and bias
detection across California's courts.

## Launch status: 5 Days to Production

See `docs/LAUNCH_PLAN.md` for the full deployment strategy.

## Quick Launch Commands

```bash
# Generate AI analytics for all judges (Day 1-2)
npm run launch:analytics

# Run complete data sync (Day 1)
npm run launch:data

# Validate all systems (Day 5)
npm run launch:validate
```

## Overview

JudgeFinder delivers data-driven insights into judicial patterns using AI
analysis and automated data ingestion from official sources.

## Highlights

- **AI Analytics**: Gemini 1.5 Flash primary, GPT-4o-mini fallback
- **Real-time Sync**: Daily and weekly automated jobs with retries and queueing
- **Coverage**: California courts and judges with decision documents

## Docs Navigation

- Getting Started: `docs/getting-started/SETUP.md`, `docs/getting-started/ENVIRONMENT.md`
- Architecture: `docs/architecture/ARCHITECTURE.md`
- AI Agents: `docs/ai/AI_AGENTS.md`
- Data & Automation: `docs/operations/SYNC_AND_CRON.md`, `docs/operations/OPERATIONS.md`
- API & Database: `docs/api/API_REFERENCE.md`, `docs/data/DATABASE.md`
- Security: `docs/security/SECURITY.md`
- Launch: `docs/launch/LAUNCH_PLAN.md`
- Contributing: `docs/contributing/CONTRIBUTING.md`

## Architecture & Tech Stack

- **Framework**: Next.js 15 + TypeScript
- **Database**: Supabase Postgres
- **Auth**: Clerk
- **Cache/Rate limit**: Upstash Redis
- **Hosting**: Netlify (`@netlify/plugin-nextjs`)
- **Error Monitoring**: Sentry

## iOS App (separated)

- The native wrapper has been extracted to a dedicated iOS repository: JudgeBinder iOS.
- GitHub repository: https://github.com/thefiredev-cloud/JudgeBinder-iOS
- Local path (created during split): `../JudgeBinder-iOS`
- Architecture: Capacitor wrapper loading `https://judgefinder.io` with native features (haptics, push, share).
- See `../JudgeBinder-iOS/README.md` (or the repo README) for setup and scripts.

## Environment Variables

```bash
# Authentication (REQUIRED for production)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_xxx  # Must start with pk_
CLERK_SECRET_KEY=sk_live_xxx

# AI Services
GOOGLE_AI_API_KEY=your_gemini_api_key
OPENAI_API_KEY=your_openai_fallback_key

# External APIs
COURTLISTENER_API_KEY=your_courtlistener_key

# Automation
CRON_SECRET=secure_cron_token
SYNC_API_KEY=manual_sync_trigger_key

# Database (Supabase)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Rate Limiting / Cache
UPSTASH_REDIS_REST_URL=your_redis_url
UPSTASH_REDIS_REST_TOKEN=your_redis_token

# CourtListener Tuning (optional, defaults shown)
COURTLISTENER_REQUEST_DELAY_MS=1000
COURTLISTENER_MAX_RETRIES=5
COURTLISTENER_REQUEST_TIMEOUT_MS=30000
COURTLISTENER_BACKOFF_CAP_MS=15000
COURTLISTENER_CIRCUIT_THRESHOLD=5
COURTLISTENER_CIRCUIT_COOLDOWN_MS=60000

# Optional
SENTRY_DSN=your_sentry_dsn
NEXT_PUBLIC_SITE_URL=https://your-site.netlify.app
```

Tip: If deploying on Netlify, prefer syncing local env with:

```bash
netlify link             # one-time, select the site
netlify env:pull --json > .env.local
# Or: netlify env:list --json
```

## Authentication & Security

**Fail-Fast Security Model:**

The platform implements a fail-fast authentication pattern:

- **Production**: REQUIRES valid Clerk authentication keys. The application will refuse to start if keys are missing or invalid.
- **Development**: Allows running without Clerk keys (with prominent warnings) for local development convenience.

**Protected Routes:**

- `/profile/*` - User profile management
- `/settings/*` - User settings
- `/dashboard/*` - User dashboard
- `/admin/*` - Administrative functions

**Authentication Flow:**

1. Clerk provides the authentication UI and user management
2. Users are automatically synchronized to the Supabase database
3. Session management via Clerk's secure session handling
4. Protected routes enforce authentication via middleware

**Setup Clerk Authentication:**

1. Create account at https://clerk.com
2. Create a new application
3. Copy the publishable key (starts with `pk_`) to `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
4. Copy the secret key to `CLERK_SECRET_KEY`
5. Configure sign-in/sign-up URLs in Clerk dashboard (optional)

**Security Features:**

- Startup validation ensures authentication is configured before serving requests
- Middleware enforces authentication on protected routes
- Production deployments fail immediately if auth is misconfigured
- CSP headers, HSTS, and XSS protection enabled
- Rate limiting via Upstash Redis
- Sentry error tracking and monitoring

## Getting Started (Local)

```bash
# Install dependencies
npm install

# Create .env.local and fill with the variables above
# Note: Clerk keys are optional for local dev but REQUIRED for production

# Start dev server
npm run dev
```

Default dev URL: `http://localhost:3000` (Next.js default).

## Data Sync & Analytics

Scripts are designed for incremental, resumable syncs with retries and logging
to `sync_logs`.

```bash
# Manual syncs
npm run sync:courts
npm run sync:judges
npm run sync:decisions

# Batch generate analytics
npm run analytics:generate

# Check data status (requires Supabase env in .env.local)
npm run data:status

# Smoke test key APIs (supply base URL + secrets)
node scripts/test-all-api-endpoints.js \
  --base https://your-site.netlify.app \
  --sync-key $SYNC_API_KEY \
  --cron-secret $CRON_SECRET
```

Admin endpoints (protected via `SYNC_API_KEY` header in production):

- `GET /api/admin/sync-status` – queue health, recent logs, freshness
- `POST /api/admin/sync-status` – queue actions
  (`queue_job`, `cancel_jobs`, `cleanup`, `restart_queue`)
- `POST /api/admin/sync` – admin-triggered sync (Clerk admin auth)

Health:

- `GET /api/health` – basic health check

## Scheduled Jobs

- Daily cron: `app/api/cron/daily-sync/route.ts`
- Weekly cron: `app/api/cron/weekly-sync/route.ts`

## Project Structure

```text
app/                 # Next.js App Router (APIs, pages)
components/          # UI and feature components
lib/                 # ai/, supabase/, sync/, utils/
scripts/             # Node automation scripts
supabase/            # SQL migrations and config
```

## Netlify Deployment (Recommended)

**CRITICAL: Production deployment will FAIL if authentication is not properly configured.**

1) Configure Clerk authentication FIRST:
   - Create production Clerk application at https://clerk.com
   - Get your production keys (pk_live_xxx and sk_live_xxx)

2) Connect repository to Netlify (UI) and set ALL required env vars in Site Settings → Environment
   - **MUST include**: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`
   - All other required variables from the Environment Variables section above

3) Build config is in `netlify.toml` (Node 18, Next plugin). Deploys on push to `main`.

4) Secure cron and admin endpoints by setting `CRON_SECRET` and `SYNC_API_KEY`.

5) After deploy, validate:

```bash
# Health
curl -s https://<site>/api/health | jq

# Sync status (requires header)
curl -s -H "x-api-key: $SYNC_API_KEY" https://<site>/api/admin/sync-status | jq
```

## Troubleshooting

- Missing data locally: ensure `.env.local` includes Supabase URL and keys
- CourtListener failures: verify `COURTLISTENER_API_KEY` and API availability
- Queue stuck: `POST /api/admin/sync-status { action: 'restart_queue' }` with `x-api-key`
- Rate limits: scripts include delays; reduce `batchSize` in options

## License

MIT. See `LICENSE` for details.

— Built for judicial transparency.

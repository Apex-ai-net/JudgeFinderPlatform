# Architecture Overview

## High-Level
- Frontend: Next.js App Router + TypeScript
- Data: Supabase Postgres (+ SQL migrations in `supabase/migrations/`)
- AI: Gemini 1.5 Flash primary, OpenAI GPT‑4o‑mini fallback
- Sync: CourtListener integrations and internal queue manager
- Infra: Netlify (hosting), Upstash Redis (rate limiting/cache), Sentry (monitoring)

## Repo Map
```
app/                 # App Router pages and API routes
  api/
    health/route.ts
    admin/
      stats/route.ts
      sync-status/route.ts
      ...
    cron/
      daily-sync/route.ts
      weekly-sync/route.ts

components/          # UI and feature components
  judges/
    BiasPatternAnalysis.tsx

lib/                 # Core libraries
  ai/
    judicial-analytics.js
  courtlistener/
    client.ts
  sync/
    court-sync.ts
    judge-sync.ts
    decision-sync.ts
    queue-manager.ts
  rate-limit.ts
  supabase/
    ...

scripts/             # Node automation & utilities
  automated-assignment-updater.js
  batch-generate-analytics.js
  comprehensive-validation.js
  sync-*.js

supabase/
  migrations/        # SQL migrations

netlify.toml         # Netlify build config
middleware.ts        # Security headers / request handling
```

## Data Flow (Simplified)
1) CourtListener → `lib/courtlistener/client.ts` → `lib/sync/*` → Supabase tables
2) Decisions → processed text → AI analytics → cached and displayed in UI
3) Cron routes enqueue sync jobs; `queue-manager` schedules, retries, and logs
4) Admin endpoints surface status, logs, and controls

## MCP (Model Context Protocol)
- Endpoint: `POST /api/mcp` (JSON-RPC style)
- Auth: Bearer `VERCEL_MCP_TOKEN` (required; enforced server-side)
- Tools exposed: `search_judges`, `get_judge_analytics`, `get_bias_analysis`
- Internals: Tools proxy to existing platform APIs; responses wrapped as MCP `content`
- Protections: Upstash-based rate limiting; CORS via centralized security headers

## Security Headers
- Managed centrally in `lib/security/headers.ts`; applied in `middleware.ts`
- CSP tailored per environment; HSTS in production; reporting endpoints enabled



# AI Agents Overview

## Purpose and Scope

- Document the intelligent agents, automations, and analytics services that power JudgeFinder.
- Provide quick orientation for new agents and engineers.
- Link to runtime code locations and key dashboards for each capability.

## Agent Stack Summary

### Judicial Analytics Agent (Primary)

- **Model:** Google Gemini 1.5 Flash
- **Location:** `lib/ai/judicial-analytics.js`
- **Responsibilities:**
  - Analyze judge decisions to produce bias metrics (consistency, speed, settlement preference, risk tolerance, predictability).
  - Compute confidence intervals and normalize outputs for UI consumption.
  - Provide structured JSON via `/api/judges/[id]/bias-analysis`.
- **Key Integrations:**
  - UI component `components/judges/BiasPatternAnalysis.tsx` for visualization.
  - Cache layer with invalidation triggered on new decision data.

### Judicial Analytics Agent (Fallback)

- **Model:** OpenAI GPT-4o-mini
- **Location:** `lib/ai/judicial-analytics.js`
- **Responsibilities:**
  - Maintain analytics availability when Gemini quotas fail.
  - Produce compatible payloads with reduced token budgets.

### Search Intelligence Agent

- **Model:** Google Gemini 1.5 Flash (natural language)
- **Location:** `lib/ai/search-intelligence.ts`
- **Responsibilities:**
  - Interpret user search queries to derive intent, entities, and expanded keywords.
  - Provide AI-enhanced suggestions and conversational responses.
  - Power `/api/search/intelligence` features and UI badges.

### Court Data Synchronization Manager

- **Location:** `lib/sync/court-sync.ts`
- **Responsibilities:**
  - Batch synchronize courts from CourtListener with rate limiting and change detection.
  - Maintain integrity checks for jurisdiction boundaries and assignment conflicts.

### Judge Profile Sync Agent

- **Location:** `lib/sync/judge-sync.ts`
- **Responsibilities:**
  - Reconcile judge metadata, position history, and slugs.
  - Validate assignments against court records, logging anomalies for review.

### Decision Document Processor

- **Location:** `lib/sync/decision-sync.ts`
- **Responsibilities:**
  - Fetch and parse recent decisions; extract text for analytics ingestion.
  - Limit per-judge document counts to control costs.
  - Trigger analytics regeneration jobs.

### Assignment Update Scheduler

- **Location:** `scripts/automated-assignment-updater.js`
- **Responsibilities:**
  - Monitor judge-court assignment changes, classify severity, and queue actions.
  - Maintain historical assignment records for auditing.

## Automation Pipelines

### Daily Cron (`app/api/cron/daily-sync/route.ts`)

- Runs at 02:00 and 14:00 PT.
- Tasks:
  - Queue decision sync.
  - Refresh judge profiles.
  - Capture performance metrics.

### Weekly Cron (`app/api/cron/weekly-sync/route.ts`)

- Runs Sundays 03:00 PT.
- Tasks:
  - Full court data refresh.
  - Regenerate analytics.
  - Run integrity validation.

### Manual Operations

- `npm run sync:judges`, `npm run sync:courts`, `npm run sync:decisions`.
- `npm run analytics:generate`, `npm run bias:analyze` for analytics regeneration.

## Observability & Controls

- **Logging:** Each agent emits structured logs to Supabase tables (`sync_logs`, `analytics_runs`).
- **Error Monitoring:** Sentry instrumentation via `instrumentation.ts` captures failures with agent tags.
- **Rate Limiting:** `lib/security/rate-limit.ts` enforces API and sync throttling using Upstash Redis.
- **Configuration:** Environment variables documented in `ENV_VARS_REFERENCE.md` and `README.md` must be set per environment.

## Operational Playbooks

- Recovery workflow: `AGENT_SWARM_SUMMARY.md`, `EXECUTE_RECOVERY_NOW.md`.
- Launch procedures: `docs/launch/LAUNCH_PLAN.md` and `docs/launch/EXTENDED_ROADMAP.md`.
- Day-to-day operations: `docs/operations/OPERATIONS.md`, `docs/operations/SYNC_AND_CRON.md`.
- Security posture: `docs/security/SECURITY.md` and `SECURITY_IMPLEMENTATION_SUMMARY.md`.

## Upcoming Enhancements

- Multi-state expansion for court and judge ingestion.
- Elasticsearch migration for advanced search features.
- Bias alerting and professional dashboards (see `docs/launch/EXTENDED_ROADMAP.md`).
- Automated transparency reports and public data exports.

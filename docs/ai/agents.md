# Agent Operations Runbook

## Launch Readiness Snapshot

- Launch plan lives in `docs/launch/LAUNCH_PLAN.md`.
- Use extended roadmap (`docs/launch/EXTENDED_ROADMAP.md`) for 6–12 month objectives.
- Mission: deliver AI-powered judicial transparency for California; expand nationwide.

## Quick Commands

```bash
npm run launch:data        # Judge + court + decision sync
npm run launch:analytics   # Generate bias analytics across judges
npm run launch:validate    # Full integrity and validation checks
```

## Core Agents

### Judicial Analytics Agent

- **Model:** Google Gemini 1.5 Flash
- **Code:** `lib/ai/judicial-analytics.js`
- **Output:** Structured bias metrics with confidence intervals.
- **Fallback:** GPT-4o-mini (same file) to preserve output compatibility.

### Search Intelligence Agent

- **Model:** Google Gemini 1.5 Flash
- **Code:** `lib/ai/search-intelligence.ts`
- **Purpose:** Intent detection, keyword expansion, and suggestion generation for legal search queries.

### Data Sync Agents

- **Court Sync:** `lib/sync/court-sync.ts` (CourtListener integration, change detection, rate limiting).
- **Judge Sync:** `lib/sync/judge-sync.ts` (position history, slug management, integrity checks).
- **Decision Sync:** `lib/sync/decision-sync.ts` (document ingestion, analytics pipeline).

### Assignment Update Scheduler

- **Script:** `scripts/automated-assignment-updater.js`
- **Function:** Detect assignment changes, classify severity, queue updates, and maintain history.

## Scheduled Automation

- **Daily Cron:** `app/api/cron/daily-sync/route.ts`
  - 02:00 / 14:00 PT. Queues decision sync, judge refresh, metrics capture.
- **Weekly Cron:** `app/api/cron/weekly-sync/route.ts`
  - Sunday 03:00 PT. Full court refresh, analytics regeneration, integrity validation.
- **Manual Overrides:**
  - `npm run sync:*` for targeted syncs.
  - `npm run analytics:generate`, `npm run bias:analyze` for analytics refresh.

## Monitoring & Controls

- **Logs:** Stored in Supabase tables (`sync_logs`, `analytics_runs`).
- **Alerts:** Sentry instrumentation via `instrumentation.ts` with agent tagging.
- **Rate Limits:** Managed by `lib/security/rate-limit.ts` leveraging Upstash Redis.
- **Environment Configuration:** Required keys listed in `ENV_VARS_REFERENCE.md`.

## Operational Playbooks

- Recovery execution: `AGENT_SWARM_SUMMARY.md`, `EXECUTE_RECOVERY_NOW.md`.
- Day-to-day ops: `docs/operations/OPERATIONS.md`, `docs/operations/SYNC_AND_CRON.md`.
- Security: `docs/security/SECURITY.md`, `SECURITY_IMPLEMENTATION_SUMMARY.md`.
- Testing: `tests/` directory, `TESTING_QUICKSTART.md`.

## Future Enhancements

- Multi-state data expansion, bias alerts, professional dashboards.
- Elasticsearch migration and conversational assistant upgrades.
- Automation of transparency reports and partner integrations.

# Data Sync & Cron Jobs

## Sync Systems
- Courts: `lib/sync/court-sync.ts` (batching, change detection, retry)
- Judges: `lib/sync/judge-sync.ts` (profiles, assignments, slugs)
- Decisions: `lib/sync/decision-sync.ts` (text extraction, feed to AI)
- Queue: `lib/sync/queue-manager.ts` (priorities, retry, metrics)

Typical usage:
```ts
await courtSyncManager.syncCourts({ batchSize: 20, jurisdiction: 'CA', forceRefresh: false })
```

## Cron Routes
- Daily: `app/api/cron/daily-sync/route.ts`
  - Twice daily judge/decision updates
  - Auth: `Authorization: Bearer ${CRON_SECRET}`
- Weekly: `app/api/cron/weekly-sync/route.ts`
  - Courts refresh, judge refresh, federal maintenance, decisions, cleanup
  - Staggered scheduling with backoff

## Admin & Health APIs
- Health: `GET /api/health`
- Sync status: `GET /api/admin/sync-status`
- Sync control: `POST /api/admin/sync-status` with header `x-api-key: ${SYNC_API_KEY}`

Actions supported by `POST /api/admin/sync-status`:
- `queue_job` (type: decision|judge|court)
- `cancel_jobs`
- `cleanup`
- `restart_queue`

## Vercel Deployment Notes

- Vercel Hobby plan forces Serverless `maxDuration` ≤ 300s. Keep `/api/sync/decisions` at 60s so it only queues work; the worker endpoint `/api/sync/queue/process` already runs at `maxDuration = 300` and should process one job per call.
- Ensure a cron (Vercel Cron or external) hits `/api/sync/queue/process` with header `x-api-key: ${CRON_SECRET}` every few minutes so jobs drain.
- Required environment variables for sync: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SYNC_API_KEY`, `CRON_SECRET`, `COURTLISTENER_API_KEY`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`.
- Prefer small batch sizes (`batchSize <= 10`) to keep job execution under the 300-second cap.



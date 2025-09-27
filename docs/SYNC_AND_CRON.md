> Moved to `docs/operations/SYNC_AND_CRON.md`.

See: `docs/operations/SYNC_AND_CRON.md`

## Vercel Deployment Guidance

- Set `maxDuration` ≤ 300 on all API routes; use 60 seconds on queuing endpoints such as `/api/sync/decisions` so they only enqueue work.
- Route `/api/sync/queue/process` remains the long-running worker; keep `maxDuration = 300` and invoke it via Vercel Cron (or external scheduler) with `CRON_SECRET` so queued jobs are processed.
- Ensure the following environment variables exist in Vercel: `SYNC_API_KEY`, `CRON_SECRET`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `COURTLISTENER_API_KEY`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`.
- For large sync batches, prefer smaller `batchSize` (<10) so each job finishes within the limit.


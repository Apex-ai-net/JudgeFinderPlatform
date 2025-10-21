# ✅ COMPLETED - Database Migration Instructions

## Migration: claim_next_sync_job RPC Function

**Status:** ✅ COMPLETED on 2025-10-20 via Supabase Dashboard
**Applied by:** Tanner Osterkamp
**Method:** Option 2 (Supabase SQL Editor)

This migration fixes the HIGH severity race condition in the queue manager by creating an atomic job claiming function.

---

## Option 1: Run via API Endpoint (Easiest)

1. **Deploy the code** (already pushed to GitHub)
   ```bash
   # Code is already deployed via Netlify auto-deploy
   ```

2. **Call the migration endpoint** (must be logged in as admin)
   ```bash
   curl -X POST https://judgefinder.io/api/admin/run-migration \
     -H "Cookie: your-session-cookie"
   ```

   Or visit in browser (while logged in as admin):
   ```
   https://judgefinder.io/api/admin/run-migration
   ```

3. **Verify success** - You should see:
   ```json
   {
     "success": true,
     "message": "Migration completed successfully"
   }
   ```

4. **Delete the migration endpoint**
   ```bash
   rm app/api/admin/run-migration/route.ts
   git add app/api/admin/run-migration/route.ts
   git commit -m "chore: remove one-time migration endpoint"
   git push
   ```

---

## Option 2: Run via Supabase Dashboard (Recommended if Option 1 fails)

1. **Go to Supabase Dashboard**
   - Visit: https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql/new

2. **Copy and paste this SQL:**

```sql
-- Migration: Add atomic claim_next_sync_job RPC function
-- Purpose: Fix race condition in queue manager by using PostgreSQL row-level locking
-- Security: Prevents multiple workers from claiming the same job

-- Create RPC function to atomically claim next pending job
CREATE OR REPLACE FUNCTION claim_next_sync_job(current_time timestamptz)
RETURNS TABLE (
  id text,
  type text,
  status text,
  options jsonb,
  priority integer,
  scheduled_for timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  result jsonb,
  error_message text,
  retry_count integer,
  max_retries integer,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  claimed_job RECORD;
BEGIN
  -- Atomically find and claim the next pending job
  -- FOR UPDATE SKIP LOCKED prevents race conditions:
  -- - FOR UPDATE locks the row for update
  -- - SKIP LOCKED skips rows locked by other transactions
  -- This ensures only one worker claims each job

  UPDATE sync_queue
  SET
    status = 'running',
    started_at = NOW(),
    updated_at = NOW()
  WHERE sync_queue.id = (
    SELECT sync_queue.id
    FROM sync_queue
    WHERE sync_queue.status = 'pending'
      AND sync_queue.scheduled_for <= current_time
    ORDER BY sync_queue.priority DESC, sync_queue.created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  )
  RETURNING * INTO claimed_job;

  -- Return the claimed job or NULL if no jobs available
  IF claimed_job.id IS NOT NULL THEN
    RETURN QUERY SELECT
      claimed_job.id,
      claimed_job.type,
      claimed_job.status,
      claimed_job.options,
      claimed_job.priority,
      claimed_job.scheduled_for,
      claimed_job.started_at,
      claimed_job.completed_at,
      claimed_job.result,
      claimed_job.error_message,
      claimed_job.retry_count,
      claimed_job.max_retries,
      claimed_job.created_at,
      claimed_job.updated_at;
  END IF;
END;
$$;

-- Grant execute permission to all roles
GRANT EXECUTE ON FUNCTION claim_next_sync_job(timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION claim_next_sync_job(timestamptz) TO anon;
GRANT EXECUTE ON FUNCTION claim_next_sync_job(timestamptz) TO authenticated;

-- Add comment explaining the function
COMMENT ON FUNCTION claim_next_sync_job IS 'Atomically claims the next pending sync job using row-level locking to prevent race conditions. Uses FOR UPDATE SKIP LOCKED to ensure only one worker processes each job.';
```

3. **Click "Run"**

4. **Verify success** - You should see:
   ```
   Success. No rows returned
   ```

---

## Option 3: Install Supabase CLI (For future migrations)

```bash
# Install Supabase CLI
brew install supabase/tap/supabase

# Login
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Run all pending migrations
supabase db push
```

---

## ✅ Verification Results

**Migration verified successfully on 2025-10-20:**

### Supabase SQL Editor Test Results:

```sql
-- ✅ Function exists
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_name = 'claim_next_sync_job';
-- Result: claim_next_sync_job | FUNCTION

-- ✅ Function works (claimed a job from backlog)
SELECT * FROM claim_next_sync_job(NOW());
-- Result: Successfully claimed job and changed status from 'pending' to 'running'
```

### Application Status:

✅ The queue manager ([queue-manager.ts](lib/sync/queue-manager.ts)) will NO LONGER show this warning:
```
[SECURITY] claim_next_sync_job RPC not found - using unsafe fallback
```

The atomic RPC function is now the primary method for claiming jobs in production.

---

## What This Migration Does

1. **Creates PostgreSQL Function**: `claim_next_sync_job(timestamptz)`
   - Atomically finds next pending job
   - Locks it using `FOR UPDATE SKIP LOCKED`
   - Updates status to 'running'
   - Returns the claimed job

2. **Security Features**:
   - Only one worker can claim each job (atomic operation)
   - No race window between SELECT and UPDATE
   - `SKIP LOCKED` prevents workers from waiting on locked rows
   - `SECURITY DEFINER` ensures proper execution context

3. **Permissions**:
   - Grants execute to service_role (queue manager)
   - Grants execute to authenticated (admin testing)
   - Grants execute to anon (for public API if needed)

---

## Rollback (If needed)

If you need to rollback this migration:

```sql
DROP FUNCTION IF EXISTS claim_next_sync_job(timestamptz);
```

Note: The application will fall back to the unsafe method with race condition.

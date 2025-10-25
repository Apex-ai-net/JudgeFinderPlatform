-- Migration: Add atomic claim_next_sync_job RPC function
-- Purpose: Fix race condition in queue manager by using PostgreSQL row-level locking
-- Security: Prevents multiple workers from claiming the same job

-- Create RPC function to atomically claim next pending job
CREATE OR REPLACE FUNCTION claim_next_sync_job(p_current_time timestamptz)
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
      AND sync_queue.scheduled_for <= p_current_time
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

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION claim_next_sync_job(timestamptz) TO service_role;

-- Add comment explaining the function
COMMENT ON FUNCTION claim_next_sync_job IS 'Atomically claims the next pending sync job using row-level locking to prevent race conditions. Uses FOR UPDATE SKIP LOCKED to ensure only one worker processes each job.';

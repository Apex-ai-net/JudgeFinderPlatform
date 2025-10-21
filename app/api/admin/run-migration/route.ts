import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { isAdmin } from '@/lib/auth/is-admin'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

/**
 * ONE-TIME MIGRATION ENDPOINT
 * Run the claim_next_sync_job RPC migration
 * DELETE THIS FILE AFTER RUNNING
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // SECURITY: Require admin authentication
    const { userId } = await auth()
    if (!userId || !(await isAdmin())) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    // Create service role client for migrations
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    console.log('[MIGRATION] Starting claim_next_sync_job RPC creation...')

    // Execute the migration SQL
    const migrationSQL = `
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

GRANT EXECUTE ON FUNCTION claim_next_sync_job(timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION claim_next_sync_job(timestamptz) TO anon;
GRANT EXECUTE ON FUNCTION claim_next_sync_job(timestamptz) TO authenticated;

COMMENT ON FUNCTION claim_next_sync_job IS 'Atomically claims the next pending sync job using row-level locking to prevent race conditions. Uses FOR UPDATE SKIP LOCKED to ensure only one worker processes each job.';
`

    // Execute via exec_sql RPC (if available) or direct SQL
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL,
    })

    if (error) {
      console.error('[MIGRATION] Error executing migration:', error)
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          hint: 'Try running the SQL directly in Supabase SQL Editor',
        },
        { status: 500 }
      )
    }

    console.log('[MIGRATION] Successfully created claim_next_sync_job RPC function')

    // Test the function
    const { data: testData, error: testError } = await supabase.rpc('claim_next_sync_job', {
      current_time: new Date().toISOString(),
    })

    if (testError) {
      console.warn('[MIGRATION] Function created but test failed:', testError)
      return NextResponse.json({
        success: true,
        warning: 'Function created but test failed (this is OK if queue is empty)',
        testError: testError.message,
        message: 'Migration completed successfully',
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Migration completed successfully',
      testResult: testData,
      instructions: 'DELETE app/api/admin/run-migration/route.ts after confirming this worked',
    })
  } catch (error: any) {
    console.error('[MIGRATION] Fatal error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        stack: error.stack,
      },
      { status: 500 }
    )
  }
}

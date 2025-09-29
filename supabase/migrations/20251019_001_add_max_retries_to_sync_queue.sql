-- Align sync_queue schema with application expectations.
-- Adds the missing max_retries column and backfills existing rows.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'sync_queue'
      AND column_name = 'max_retries'
  ) THEN
    ALTER TABLE public.sync_queue
      ADD COLUMN max_retries INTEGER DEFAULT 3;

    UPDATE public.sync_queue
    SET max_retries = 3
    WHERE max_retries IS NULL;

    ALTER TABLE public.sync_queue
      ALTER COLUMN max_retries SET NOT NULL;
  END IF;
END $$;



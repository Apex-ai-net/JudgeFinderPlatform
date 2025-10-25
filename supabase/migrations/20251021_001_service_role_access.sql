-- Ensure critical tables have row level security enabled and grant
-- Supabase's service_role full read/write access for backend sync jobs.

-- Judges --------------------------------------------------------------
ALTER TABLE public.judges ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'judges'
      AND policyname = 'Service role full access on judges'
  ) THEN
    CREATE POLICY "Service role full access on judges" ON public.judges
        FOR ALL
        USING (auth.role() = 'service_role')
        WITH CHECK (auth.role() = 'service_role');
  END IF;
END
$$;

-- Courts --------------------------------------------------------------
ALTER TABLE public.courts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'courts'
      AND policyname = 'Service role full access on courts'
  ) THEN
    CREATE POLICY "Service role full access on courts" ON public.courts
        FOR ALL
        USING (auth.role() = 'service_role')
        WITH CHECK (auth.role() = 'service_role');
  END IF;
END
$$;

-- Cases ---------------------------------------------------------------
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'cases'
      AND policyname = 'Service role full access on cases'
  ) THEN
    CREATE POLICY "Service role full access on cases" ON public.cases
        FOR ALL
        USING (auth.role() = 'service_role')
        WITH CHECK (auth.role() = 'service_role');
  END IF;
END
$$;

-- Sync Logs -----------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sync_logs') THEN
    ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'sync_logs'
        AND policyname = 'Service role full access on sync_logs'
    ) THEN
      CREATE POLICY "Service role full access on sync_logs" ON public.sync_logs
          FOR ALL
          USING (auth.role() = 'service_role')
          WITH CHECK (auth.role() = 'service_role');
    END IF;
  END IF;
END
$$;

-- Performance Metrics -------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'performance_metrics') THEN
    ALTER TABLE public.performance_metrics ENABLE ROW LEVEL SECURITY;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'performance_metrics'
        AND policyname = 'Service role full access on performance_metrics'
    ) THEN
      CREATE POLICY "Service role full access on performance_metrics" ON public.performance_metrics
          FOR ALL
          USING (auth.role() = 'service_role')
          WITH CHECK (auth.role() = 'service_role');
    END IF;
  END IF;
END
$$;

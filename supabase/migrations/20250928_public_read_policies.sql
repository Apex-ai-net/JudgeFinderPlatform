-- Public read access policies for core browse endpoints
-- Idempotent creation to avoid duplicate policy errors

DO $$
BEGIN
  -- Judges public SELECT
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'judges'
      AND policyname = 'Judges are viewable by everyone'
  ) THEN
    EXECUTE $POLICY$
      CREATE POLICY "Judges are viewable by everyone" ON public.judges
        FOR SELECT
        USING (true);
    $POLICY$;
  END IF;

  -- Courts public SELECT
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'courts'
      AND policyname = 'Courts are viewable by everyone'
  ) THEN
    EXECUTE $POLICY$
      CREATE POLICY "Courts are viewable by everyone" ON public.courts
        FOR SELECT
        USING (true);
    $POLICY$;
  END IF;

  -- Cases public SELECT (used by analytics and optional filters)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'cases'
      AND policyname = 'Cases are viewable by everyone'
  ) THEN
    EXECUTE $POLICY$
      CREATE POLICY "Cases are viewable by everyone" ON public.cases
        FOR SELECT
        USING (true);
    $POLICY$;
  END IF;
END $$;



-- =====================================================
-- Migration: Enable RLS on All Public Tables
-- =====================================================
-- Priority: P0 - CRITICAL SECURITY FIX
-- Issue: 10 tables exposed without RLS protection
-- Reference: docs/5-AGENT-CODEBASE-ANALYSIS-ACTION-PLAN.md
-- =====================================================

-- Enable RLS on tables missing protection
ALTER TABLE IF EXISTS public.app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.judge_court_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.sync_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.pricing_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.law_firm_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.judge_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.case_attorneys ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.courthouse_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.documents ENABLE ROW LEVEL SECURITY;

-- Verification query (should return 0 rows after migration)
-- SELECT schemaname, tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public' AND rowsecurity = false;

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'RLS enabled on all public tables - security hardening complete';
END $$;



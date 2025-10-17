#!/bin/bash
# =====================================================
# Script: Fix Function Search Paths
# =====================================================
# Purpose: Add SET search_path to all SECURITY DEFINER functions
# Priority: P1 - MEDIUM (Post-launch Week 1)
# Usage: ./scripts/fix-function-search-paths.sh
# =====================================================

set -e

echo "🔧 Fixing function search paths..."
echo "This will add 'SET search_path = public, extensions' to all SECURITY DEFINER functions"
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Install with: npm install -g supabase"
    exit 1
fi

# Get project ref
PROJECT_REF="xstlnicbnzdxlgfiewmg"

echo "📊 Getting list of functions without search_path..."

# Query to find all SECURITY DEFINER functions without search_path
SQL_QUERY="
SELECT
  n.nspname as schema,
  p.proname as function_name,
  pg_get_functiondef(p.oid) as definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.prosecdef = true
  AND NOT EXISTS (
    SELECT 1 FROM unnest(p.proconfig) AS config
    WHERE config LIKE 'search_path=%'
  )
ORDER BY p.proname;
"

echo "Functions found:"
echo ""

# Alternative: Use ALTER FUNCTION for quick fix
echo "🚀 Quick fix using ALTER FUNCTION..."
echo ""

# List of functions to fix
FUNCTIONS=(
  "update_ad_orders_updated_at()"
  "refresh_analytics_materialized_views()"
  "update_judge_court_positions_updated_at()"
  "calculate_ad_pricing(text, integer, boolean)"
  "generate_court_slug(text)"
  "update_court_slug()"
  "update_onboarding_analytics()"
  "get_batch_decision_summaries(text[])"
  "track_feature_usage(text, text)"
  "update_updated_at_column()"
  "get_onboarding_completion_rate()"
  "get_feature_adoption_metrics()"
  "get_ai_search_ctr()"
  "get_top_search_patterns()"
  "get_ai_feature_effectiveness()"
  "generate_judge_slug(text)"
  "suggest_similar_judges(uuid)"
  "update_judge_search_vector()"
  "search_judges_ranked(text)"
  "search_judges_simple(text)"
  "is_service_account()"
  "is_admin()"
  "current_user_id()"
  "is_service_role()"
  "log_service_account_activity(text, text, text, text, jsonb)"
  "update_judge_analytics_cache_updated_at()"
  "get_top_courts_by_cases()"
  "get_cache_stats()"
  "clear_judge_cache(uuid)"
  "clear_all_cache()"
  "search_judges(text)"
  "update_court_judge_counts()"
)

echo "Will update ${#FUNCTIONS[@]} functions..."
echo ""

# Generate SQL for all functions
cat > /tmp/fix_search_paths.sql << 'EOF'
-- Auto-generated SQL to fix function search paths
-- Generated on: $(date)

EOF

for func in "${FUNCTIONS[@]}"; do
  echo "ALTER FUNCTION public.$func SET search_path = public, extensions;" >> /tmp/fix_search_paths.sql
done

echo "✅ Generated SQL file: /tmp/fix_search_paths.sql"
echo ""
echo "📝 SQL Preview:"
head -n 20 /tmp/fix_search_paths.sql
echo "..."
echo ""

echo "🚀 To apply these changes:"
echo ""
echo "Option 1 - Direct SQL execution:"
echo "  psql \$DATABASE_URL < /tmp/fix_search_paths.sql"
echo ""
echo "Option 2 - Create migration:"
echo "  cp /tmp/fix_search_paths.sql supabase/migrations/\$(date +%Y%m%d%H%M%S)_fix_function_search_paths.sql"
echo "  supabase db push"
echo ""
echo "Option 3 - Use Supabase dashboard:"
echo "  1. Go to https://supabase.com/dashboard/project/$PROJECT_REF/editor"
echo "  2. Open SQL Editor"
echo "  3. Copy contents of /tmp/fix_search_paths.sql"
echo "  4. Execute"
echo ""

# Ask for confirmation
read -p "Apply changes now? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🚀 Applying changes..."

    if [ -z "$DATABASE_URL" ]; then
        echo "❌ DATABASE_URL environment variable not set"
        echo "Set it with: export DATABASE_URL=postgresql://..."
        exit 1
    fi

    psql "$DATABASE_URL" < /tmp/fix_search_paths.sql

    echo "✅ Functions updated successfully!"
    echo ""
    echo "🔍 Verify with:"
    echo "  SELECT proname, proconfig FROM pg_proc WHERE proname LIKE 'update_%' AND prosecdef = true;"
else
    echo "⏸️  Skipped. You can apply manually later."
fi

echo ""
echo "✅ Done!"



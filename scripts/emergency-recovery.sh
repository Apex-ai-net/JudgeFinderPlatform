#!/bin/bash

# =====================================================
# JudgeFinder.io Emergency Recovery Script
# =====================================================
# This script automates the recovery process outlined in
# SITE_DIAGNOSTIC_REPORT_2025_10_10.md
#
# Usage:
#   chmod +x scripts/emergency-recovery.sh
#   ./scripts/emergency-recovery.sh
# =====================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="${BASE_URL:-https://judgefinder.io}"
SUPABASE_PROJECT_ID="xstlnicbnzdxlgfiewmg"

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required commands exist
check_requirements() {
    log_info "Checking requirements..."
    
    local missing_commands=()
    
    if ! command -v curl &> /dev/null; then
        missing_commands+=("curl")
    fi
    
    if ! command -v jq &> /dev/null; then
        missing_commands+=("jq")
    fi
    
    if ! command -v netlify &> /dev/null; then
        log_warning "Netlify CLI not found. Install with: npm install -g netlify-cli"
        read -p "Continue anyway? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
    
    if [ ${#missing_commands[@]} -gt 0 ]; then
        log_error "Missing required commands: ${missing_commands[*]}"
        log_error "Please install them and try again."
        exit 1
    fi
    
    log_success "All requirements met"
}

# Test a single endpoint
test_endpoint() {
    local name="$1"
    local url="$2"
    local expected_status="${3:-200}"
    
    log_info "Testing: $name"
    
    local response
    local status
    
    response=$(curl -s -w "\n%{http_code}" "$url" 2>/dev/null)
    status=$(echo "$response" | tail -n 1)
    
    if [ "$status" = "$expected_status" ]; then
        log_success "$name - HTTP $status ✓"
        return 0
    else
        log_error "$name - HTTP $status (expected $expected_status)"
        return 1
    fi
}

# Phase 1: Test current status
phase_1_diagnostics() {
    echo
    echo "================================================="
    echo "Phase 1: System Diagnostics"
    echo "================================================="
    
    log_info "Testing API endpoints..."
    
    # Test health endpoint
    test_endpoint "Health Check" "$BASE_URL/api/health" || true
    
    # Test judge list
    test_endpoint "Judge List" "$BASE_URL/api/judges/list?limit=5" || true
    
    # Test search
    test_endpoint "Judge Search" "$BASE_URL/api/judges/search?q=smith" || true
    
    # Test homepage
    test_endpoint "Homepage" "$BASE_URL" || true
    
    echo
    log_info "Checking detailed health status..."
    local health_response
    health_response=$(curl -s "$BASE_URL/api/health" 2>/dev/null || echo "{}")
    
    if [ -n "$health_response" ]; then
        echo "$health_response" | jq '.' 2>/dev/null || echo "$health_response"
    fi
    
    echo
    read -p "Continue with recovery? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Recovery cancelled by user"
        exit 0
    fi
}

# Phase 2: Database fix
phase_2_database_fix() {
    echo
    echo "================================================="
    echo "Phase 2: Database Fix"
    echo "================================================="
    
    log_warning "This phase requires manual action in Supabase dashboard"
    echo
    echo "Steps:"
    echo "1. Open: https://supabase.com/dashboard/project/$SUPABASE_PROJECT_ID/editor"
    echo "2. Navigate to SQL Editor"
    echo "3. Copy contents of: supabase/migrations/20251001_002_fix_search_function_return_type.sql"
    echo "4. Paste into SQL Editor"
    echo "5. Click 'Run'"
    echo "6. Verify success: SELECT * FROM search_judges_ranked('test', NULL, 5, 0.3);"
    echo
    
    read -p "Have you completed the database fix? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_warning "Skipping database fix. Some features may not work."
    else
        log_success "Database fix confirmed"
    fi
}

# Phase 3: Environment variables
phase_3_env_vars() {
    echo
    echo "================================================="
    echo "Phase 3: Environment Variables Check"
    echo "================================================="
    
    if ! command -v netlify &> /dev/null; then
        log_warning "Netlify CLI not installed. Skipping env var check."
        log_info "Install with: npm install -g netlify-cli"
        return
    fi
    
    log_info "Checking if linked to Netlify site..."
    if netlify status &> /dev/null; then
        log_success "Linked to Netlify site"
        
        log_info "Listing environment variables..."
        netlify env:list || log_warning "Could not list env vars"
    else
        log_warning "Not linked to Netlify site"
        log_info "Run: netlify link --name=olms-4375-tw501-x421"
    fi
    
    echo
    log_info "Critical environment variables that should be set:"
    echo "  - NEXT_PUBLIC_SUPABASE_URL"
    echo "  - NEXT_PUBLIC_SUPABASE_ANON_KEY"
    echo "  - SUPABASE_SERVICE_ROLE_KEY"
    echo "  - SUPABASE_JWT_SECRET"
    echo "  - NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"
    echo "  - CLERK_SECRET_KEY"
    echo "  - UPSTASH_REDIS_REST_URL"
    echo "  - UPSTASH_REDIS_REST_TOKEN"
    echo "  - SYNC_API_KEY"
    echo "  - CRON_SECRET"
    echo "  - ENCRYPTION_KEY"
    echo
    
    read -p "Are all environment variables configured? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_warning "Please configure environment variables before continuing"
        log_info "See: docs/SITE_DIAGNOSTIC_REPORT_2025_10_10.md (Agent 2)"
    fi
}

# Phase 4: Rebuild
phase_4_rebuild() {
    echo
    echo "================================================="
    echo "Phase 4: Rebuild Application"
    echo "================================================="
    
    if ! command -v netlify &> /dev/null; then
        log_warning "Netlify CLI not installed. Please rebuild via dashboard:"
        echo "  https://app.netlify.com/sites/olms-4375-tw501-x421/deploys"
        echo "  Click: Trigger deploy → Clear cache and deploy site"
        return
    fi
    
    log_info "Ready to trigger a clean rebuild..."
    
    read -p "Trigger Netlify rebuild now? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_info "Triggering rebuild with cache clear..."
        netlify build --clear-cache || log_error "Build failed"
    else
        log_info "Skipping rebuild"
    fi
}

# Phase 5: Verification
phase_5_verification() {
    echo
    echo "================================================="
    echo "Phase 5: Post-Recovery Verification"
    echo "================================================="
    
    log_info "Waiting 30 seconds for deployment to stabilize..."
    sleep 30
    
    log_info "Testing all critical endpoints..."
    
    local failures=0
    
    # Health check
    if ! test_endpoint "Health Check" "$BASE_URL/api/health"; then
        ((failures++))
    fi
    
    # Judge list
    if ! test_endpoint "Judge List" "$BASE_URL/api/judges/list?limit=5"; then
        ((failures++))
    fi
    
    # Search
    if ! test_endpoint "Judge Search" "$BASE_URL/api/judges/search?q=smith&limit=5"; then
        ((failures++))
    fi
    
    # Courts
    if ! test_endpoint "Courts API" "$BASE_URL/api/courts?limit=5"; then
        ((failures++))
    fi
    
    # Homepage
    if ! test_endpoint "Homepage" "$BASE_URL"; then
        ((failures++))
    fi
    
    echo
    if [ $failures -eq 0 ]; then
        log_success "All tests passed! ✓"
        log_success "Site appears to be functional"
    else
        log_warning "$failures tests failed"
        log_warning "Review errors above and check logs"
    fi
    
    # Test search response
    echo
    log_info "Testing search response data..."
    local search_response
    search_response=$(curl -s "$BASE_URL/api/judges/search?q=smith&limit=5" 2>/dev/null)
    
    if echo "$search_response" | jq -e '.results' &> /dev/null; then
        local result_count
        result_count=$(echo "$search_response" | jq '.results | length')
        log_success "Search returned $result_count results"
    else
        log_error "Search response is invalid"
        echo "$search_response" | head -n 20
    fi
}

# Phase 6: Analytics
phase_6_analytics() {
    echo
    echo "================================================="
    echo "Phase 6: Analytics Cache Generation (Optional)"
    echo "================================================="
    
    log_info "Analytics cache generation takes ~13-14 minutes"
    log_info "This will improve profile load times from 15-20s to <100ms"
    echo
    
    read -p "Generate analytics cache now? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_info "Starting analytics generation..."
        npm run analytics:generate || log_error "Analytics generation failed"
    else
        log_info "Skipping analytics generation"
        log_info "You can run later with: npm run analytics:generate"
    fi
}

# Main execution
main() {
    echo "================================================="
    echo "JudgeFinder.io Emergency Recovery Script"
    echo "================================================="
    echo
    echo "This script will guide you through recovering the site."
    echo "It follows the plan in: docs/SITE_DIAGNOSTIC_REPORT_2025_10_10.md"
    echo
    
    check_requirements
    
    phase_1_diagnostics
    phase_2_database_fix
    phase_3_env_vars
    phase_4_rebuild
    phase_5_verification
    phase_6_analytics
    
    echo
    echo "================================================="
    echo "Recovery Process Complete"
    echo "================================================="
    log_info "Next steps:"
    echo "  1. Monitor error rates in Sentry"
    echo "  2. Watch Netlify function logs: netlify functions:log"
    echo "  3. Test major user flows"
    echo "  4. Set up uptime monitoring"
    echo
    log_success "See docs/SITE_DIAGNOSTIC_REPORT_2025_10_10.md for details"
}

# Run main function
main "$@"


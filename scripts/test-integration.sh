#!/bin/bash

# Integration Testing Script
# Runs comprehensive integration tests before deployment
#
# Usage: npm run test:integration
# Or: bash scripts/test-integration.sh

set -e  # Exit on error

echo "=================================="
echo "Integration Testing Suite"
echo "=================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track overall status
FAILED=0
PASSED=0

# Helper function to print status
print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓${NC} $2"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} $2"
        ((FAILED++))
    fi
}

echo "Step 1: Environment Validation"
echo "------------------------------"
npm run validate:env
print_status $? "Environment variables configured"
echo ""

echo "Step 2: Type Checking"
echo "------------------------------"
npm run type-check
print_status $? "TypeScript compilation"
echo ""

echo "Step 3: Linting"
echo "------------------------------"
if npm run lint 2>&1 | grep -q "✖.*error"; then
    print_status 1 "ESLint (has errors)"
else
    print_status 0 "ESLint (no errors)"
fi
echo ""

echo "Step 4: Unit Tests"
echo "------------------------------"
npm run test:unit
print_status $? "Unit test suite"
echo ""

echo "Step 5: Integration Tests"
echo "------------------------------"
npm run test:integration
print_status $? "Integration test suite"
echo ""

echo "Step 6: Build Verification"
echo "------------------------------"
npm run build:production
print_status $? "Production build"
echo ""

echo "Step 7: Database Connection"
echo "------------------------------"
# Test database connection by running a simple query
if node -e "
const { createClient } = require('@supabase/supabase-js');
const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);
client.from('judges').select('count').limit(1).then(({error}) => {
    if (error) {
        console.error('Database connection failed:', error.message);
        process.exit(1);
    }
    process.exit(0);
});
" 2>/dev/null; then
    print_status 0 "Database connectivity"
else
    print_status 1 "Database connectivity"
fi
echo ""

echo "Step 8: Redis Connection"
echo "------------------------------"
# Test Redis connection
if node -e "
const { Redis } = require('@upstash/redis');
if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    console.log('Redis not configured (optional)');
    process.exit(0);
}
const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
});
redis.ping().then(() => process.exit(0)).catch(() => process.exit(1));
" 2>/dev/null; then
    print_status 0 "Redis connectivity"
else
    print_status 1 "Redis connectivity (may be optional)"
fi
echo ""

echo "Step 9: API Endpoints (if server running)"
echo "------------------------------"
# Only test if NEXT_PUBLIC_SITE_URL is set
if [ -n "$NEXT_PUBLIC_SITE_URL" ]; then
    BASE_URL="$NEXT_PUBLIC_SITE_URL"

    # Test health endpoint
    if curl -s -f "$BASE_URL/api/health" > /dev/null 2>&1; then
        print_status 0 "Health endpoint"
    else
        print_status 1 "Health endpoint"
    fi

    # Test judges API
    if curl -s -f "$BASE_URL/api/judges?limit=1" > /dev/null 2>&1; then
        print_status 0 "Judges API endpoint"
    else
        print_status 1 "Judges API endpoint"
    fi

    # Test search API
    if curl -s -f "$BASE_URL/api/search?q=test" > /dev/null 2>&1; then
        print_status 0 "Search API endpoint"
    else
        print_status 1 "Search API endpoint"
    fi
else
    echo -e "${YELLOW}⊘${NC} API endpoints (server not running or URL not configured)"
fi
echo ""

echo "Step 10: Git Hooks"
echo "------------------------------"
# Check if husky is installed
if [ -d ".husky" ]; then
    print_status 0 "Git hooks configured"
else
    print_status 1 "Git hooks not configured"
fi
echo ""

echo "=================================="
echo "Integration Test Summary"
echo "=================================="
echo -e "${GREEN}Passed:${NC} $PASSED"
echo -e "${RED}Failed:${NC} $FAILED"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All integration tests passed!${NC}"
    echo "System is ready for deployment."
    exit 0
else
    echo -e "${RED}✗ Some tests failed.${NC}"
    echo "Please review failures before deploying."
    exit 1
fi

#!/bin/bash
# Post-Deployment Verification Script for Authentication & Bot Protection
# Run this after deployment to verify everything is working

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default to production URL
SITE_URL="${SITE_URL:-https://judgefinder.io}"

echo "========================================="
echo "Authentication Deployment Verification"
echo "========================================="
echo "Testing: $SITE_URL"
echo ""

# Counter for passed/failed tests
PASSED=0
FAILED=0

# Helper function to test endpoints
test_endpoint() {
    local name="$1"
    local url="$2"
    local expected_status="$3"

    echo -n "Testing $name... "

    status=$(curl -s -o /dev/null -w "%{http_code}" "$url")

    if [ "$status" = "$expected_status" ]; then
        echo -e "${GREEN}✅ PASS${NC} (HTTP $status)"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}❌ FAIL${NC} (Expected: $expected_status, Got: $status)"
        ((FAILED++))
        return 1
    fi
}

# Helper function to check for text in response
test_content() {
    local name="$1"
    local url="$2"
    local search_text="$3"

    echo -n "Testing $name... "

    response=$(curl -s "$url")

    if echo "$response" | grep -q "$search_text"; then
        echo -e "${GREEN}✅ PASS${NC} (Found: '$search_text')"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}❌ FAIL${NC} (Not found: '$search_text')"
        ((FAILED++))
        return 1
    fi
}

echo "1. Basic Site Health Checks"
echo "----------------------------"
test_endpoint "Homepage" "$SITE_URL" "200"
test_endpoint "Judges page" "$SITE_URL/judges" "200"
test_endpoint "Advertise page" "$SITE_URL/advertise" "200"
echo ""

echo "2. API Endpoint Health"
echo "----------------------"
# These should return errors without proper auth, but at least respond
test_endpoint "Chat API (should require auth)" "$SITE_URL/api/chat" "401"
test_endpoint "Search API (should work)" "$SITE_URL/api/judges/search?q=test" "200"
echo ""

echo "3. Protected Routes"
echo "-------------------"
test_endpoint "Advertiser onboarding (requires auth)" "$SITE_URL/advertise/onboarding" "200"
echo ""

echo "4. Static Resources"
echo "-------------------"
test_endpoint "Favicon" "$SITE_URL/favicon.ico" "200"
echo ""

echo "5. Environment Configuration"
echo "----------------------------"

echo -n "Checking Netlify environment variables... "
if command -v netlify &> /dev/null; then
    if netlify env:get NEXT_PUBLIC_TURNSTILE_SITE_KEY &> /dev/null; then
        echo -e "${GREEN}✅ PASS${NC} (Turnstile configured)"
        ((PASSED++))
    else
        echo -e "${YELLOW}⚠️  WARNING${NC} (Turnstile not configured)"
        ((FAILED++))
    fi
else
    echo -e "${YELLOW}⚠️  SKIP${NC} (Netlify CLI not available)"
fi
echo ""

echo "6. Database Migration Verification"
echo "-----------------------------------"
echo -e "${YELLOW}⚠️  Manual check required${NC}"
echo "Run this SQL in Supabase to verify migration:"
echo ""
echo "  SELECT column_name FROM information_schema.columns"
echo "  WHERE table_name = 'users'"
echo "  AND column_name IN ('user_role', 'bar_number', 'bar_state', 'bar_verified_at', 'verification_status');"
echo ""
echo "Expected: 5 rows returned"
echo ""

echo "7. Security Headers"
echo "-------------------"
echo -n "Checking security headers... "
headers=$(curl -s -I "$SITE_URL")

if echo "$headers" | grep -q "x-frame-options"; then
    echo -e "${GREEN}✅ PASS${NC} (Security headers present)"
    ((PASSED++))
else
    echo -e "${YELLOW}⚠️  WARNING${NC} (Some security headers missing)"
fi
echo ""

echo "8. Performance Check"
echo "--------------------"
echo -n "Measuring response time... "
response_time=$(curl -o /dev/null -s -w "%{time_total}" "$SITE_URL")
echo "$response_time seconds"

if (( $(echo "$response_time < 2.0" | bc -l) )); then
    echo -e "${GREEN}✅ PASS${NC} (Response time acceptable)"
    ((PASSED++))
else
    echo -e "${YELLOW}⚠️  WARNING${NC} (Response time > 2s)"
fi
echo ""

echo "========================================="
echo "Verification Summary"
echo "========================================="
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All automated checks passed!${NC}"
    echo ""
    echo "Manual verification steps:"
    echo "1. Test AI chat authentication flow"
    echo "2. Verify Turnstile CAPTCHA appears"
    echo "3. Test rate limiting with multiple requests"
    echo "4. Complete advertiser onboarding flow"
    echo "5. Check Sentry for any errors"
    echo "6. Verify database migration in Supabase"
    echo ""
    exit 0
else
    echo -e "${RED}❌ Some checks failed. Review and fix before proceeding.${NC}"
    echo ""
    exit 1
fi

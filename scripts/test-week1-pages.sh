#!/bin/bash

# Week 1 Implementation Testing Script
# Tests all newly created pages for 404 errors

set -e

echo "================================================"
echo "Week 1 Implementation - Page Verification Test"
echo "================================================"
echo ""

BASE_URL="${1:-http://localhost:3000}"
FAILED_TESTS=0
PASSED_TESTS=0

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test function
test_page() {
    local url="$1"
    local description="$2"

    echo -n "Testing: $description... "

    # Use curl to test if page returns 200
    response=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL$url" 2>/dev/null || echo "000")

    if [ "$response" = "200" ]; then
        echo -e "${GREEN}✓ PASS${NC} (HTTP $response)"
        ((PASSED_TESTS++))
    else
        echo -e "${RED}✗ FAIL${NC} (HTTP $response)"
        ((FAILED_TESTS++))
    fi
}

echo "Testing Hub Pages"
echo "─────────────────────────────────────────────"
test_page "/attorneys" "Attorney Directory Hub"
test_page "/case-analytics" "Case Analytics Hub"
test_page "/legal-research-tools" "Legal Research Tools"
test_page "/judicial-analytics" "Judicial Analytics Dashboard"
echo ""

echo "Testing Jurisdiction-Specific Pages"
echo "─────────────────────────────────────────────"
test_page "/attorneys/los-angeles-county" "Attorneys - Los Angeles County"
test_page "/attorneys/orange-county" "Attorneys - Orange County"
test_page "/attorneys/san-diego-county" "Attorneys - San Diego County"
test_page "/case-analytics/los-angeles-county" "Case Analytics - Los Angeles County"
test_page "/case-analytics/orange-county" "Case Analytics - Orange County"
test_page "/case-analytics/san-diego-county" "Case Analytics - San Diego County"
echo ""

echo "Testing Internal Links from RelatedContent"
echo "─────────────────────────────────────────────"
echo "Note: These should no longer return 404 errors"
test_page "/attorneys/santa-clara-county" "Attorneys - Santa Clara County"
test_page "/case-analytics/alameda-county" "Case Analytics - Alameda County"
test_page "/legal-research-tools" "Research Tools (from judge pages)"
echo ""

echo "Testing Sitemap Inclusion"
echo "─────────────────────────────────────────────"
if curl -s "$BASE_URL/sitemap.xml" | grep -q "/attorneys"; then
    echo -e "${GREEN}✓ PASS${NC} - Attorneys pages in sitemap"
    ((PASSED_TESTS++))
else
    echo -e "${RED}✗ FAIL${NC} - Attorneys pages NOT in sitemap"
    ((FAILED_TESTS++))
fi

if curl -s "$BASE_URL/sitemap.xml" | grep -q "/case-analytics"; then
    echo -e "${GREEN}✓ PASS${NC} - Case analytics pages in sitemap"
    ((PASSED_TESTS++))
else
    echo -e "${RED}✗ FAIL${NC} - Case analytics pages NOT in sitemap"
    ((FAILED_TESTS++))
fi

if curl -s "$BASE_URL/sitemap.xml" | grep -q "/legal-research-tools"; then
    echo -e "${GREEN}✓ PASS${NC} - Legal research tools in sitemap"
    ((PASSED_TESTS++))
else
    echo -e "${RED}✗ FAIL${NC} - Legal research tools NOT in sitemap"
    ((FAILED_FAILED++))
fi

if curl -s "$BASE_URL/sitemap.xml" | grep -q "/judicial-analytics"; then
    echo -e "${GREEN}✓ PASS${NC} - Judicial analytics in sitemap"
    ((PASSED_TESTS++))
else
    echo -e "${RED}✗ FAIL${NC} - Judicial analytics NOT in sitemap"
    ((FAILED_TESTS++))
fi

echo ""
echo "================================================"
echo "Test Results Summary"
echo "================================================"
echo -e "Passed: ${GREEN}$PASSED_TESTS${NC}"
echo -e "Failed: ${RED}$FAILED_TESTS${NC}"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}✓ ALL TESTS PASSED${NC}"
    echo "Week 1 implementation is working correctly!"
    exit 0
else
    echo -e "${RED}✗ SOME TESTS FAILED${NC}"
    echo "Please review the failed tests above."
    exit 1
fi

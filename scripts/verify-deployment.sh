#!/bin/bash
# ==============================================
# JudgeFinder Platform - Deployment Verification
# ==============================================
# Verifies critical functionality after deployment
# Exit code 0: All checks passed
# Exit code 1: One or more checks failed
# ==============================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DEPLOY_URL="${DEPLOY_URL:-https://judgefinder.io}"
TIMEOUT="${TIMEOUT:-10}"
FAILED_CHECKS=0
TOTAL_CHECKS=0

# Print header
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  JudgeFinder Deployment Verification${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "Target URL: ${DEPLOY_URL}"
echo -e "Timeout: ${TIMEOUT}s"
echo -e "Timestamp: $(date -u +"%Y-%m-%d %H:%M:%S UTC")"
echo ""

# Helper function to run a check
run_check() {
    local name="$1"
    local url="$2"
    local expected_status="${3:-200}"
    local pattern="$4"

    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    echo -n "[$TOTAL_CHECKS] $name... "

    # Make the request
    response=$(curl -s -w "\n%{http_code}" --max-time "$TIMEOUT" "$url" 2>&1)
    status_code=$(echo "$response" | tail -n 1)
    body=$(echo "$response" | sed '$d')

    # Check status code
    if [ "$status_code" != "$expected_status" ]; then
        echo -e "${RED}FAILED${NC} (HTTP $status_code, expected $expected_status)"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
        return 1
    fi

    # Check pattern if provided
    if [ -n "$pattern" ]; then
        if echo "$body" | grep -q "$pattern"; then
            echo -e "${GREEN}PASSED${NC}"
            return 0
        else
            echo -e "${RED}FAILED${NC} (pattern not found: $pattern)"
            FAILED_CHECKS=$((FAILED_CHECKS + 1))
            return 1
        fi
    fi

    echo -e "${GREEN}PASSED${NC}"
    return 0
}

# Helper function to run POST check
run_post_check() {
    local name="$1"
    local url="$2"
    local data="$3"
    local expected_status="${4:-200}"

    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    echo -n "[$TOTAL_CHECKS] $name... "

    # Make the POST request
    status_code=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -d "$data" \
        -w "%{http_code}" \
        -o /dev/null \
        --max-time "$TIMEOUT" \
        "$url" 2>&1)

    if [ "$status_code" != "$expected_status" ]; then
        echo -e "${RED}FAILED${NC} (HTTP $status_code, expected $expected_status)"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
        return 1
    fi

    echo -e "${GREEN}PASSED${NC}"
    return 0
}

# Helper function to check response time
run_performance_check() {
    local name="$1"
    local url="$2"
    local max_time="$3"

    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    echo -n "[$TOTAL_CHECKS] $name (max ${max_time}s)... "

    # Measure response time
    response_time=$(curl -o /dev/null -s -w '%{time_total}' --max-time "$TIMEOUT" "$url" 2>&1)

    # Compare with threshold (using awk for floating point comparison)
    if awk -v rt="$response_time" -v mt="$max_time" 'BEGIN {exit !(rt <= mt)}'; then
        echo -e "${GREEN}PASSED${NC} (${response_time}s)"
        return 0
    else
        echo -e "${YELLOW}SLOW${NC} (${response_time}s, threshold: ${max_time}s)"
        # Don't fail the deployment for slow responses, just warn
        return 0
    fi
}

echo -e "${BLUE}Running deployment checks...${NC}"
echo ""

# ==============================================
# Critical Endpoint Checks
# ==============================================

echo -e "${BLUE}--- Critical Endpoints ---${NC}"

# 1. Homepage loads successfully
run_check "Homepage loads" "$DEPLOY_URL/" 200 "JudgeFinder"

# 2. Health check endpoint
run_check "Health check" "$DEPLOY_URL/api/health" 200 "healthy"

# 3. Sitemap is accessible
run_check "Sitemap accessible" "$DEPLOY_URL/sitemap.xml" 200 "urlset"

# 4. Robots.txt is accessible
run_check "Robots.txt accessible" "$DEPLOY_URL/robots.txt" 200 "User-agent"

# 5. API search endpoint (basic test)
run_check "Search API responds" "$DEPLOY_URL/api/search?q=test" 200

# 6. Courts API endpoint
run_check "Courts API responds" "$DEPLOY_URL/api/courts" 200

echo ""

# ==============================================
# Static Resource Checks
# ==============================================

echo -e "${BLUE}--- Static Resources ---${NC}"

# Check that critical static resources are accessible
run_check "Favicon loads" "$DEPLOY_URL/favicon.ico" 200

# Check Next.js is serving properly
run_check "Next.js build info" "$DEPLOY_URL/_next/static" 200

echo ""

# ==============================================
# SEO & Metadata Checks
# ==============================================

echo -e "${BLUE}--- SEO & Metadata ---${NC}"

# Check for Open Graph tags
run_check "Open Graph tags present" "$DEPLOY_URL/" 200 "og:title"

# Check for meta description
run_check "Meta description present" "$DEPLOY_URL/" 200 "description"

echo ""

# ==============================================
# Performance Checks
# ==============================================

echo -e "${BLUE}--- Performance ---${NC}"

# Homepage should load within 3 seconds
run_performance_check "Homepage load time" "$DEPLOY_URL/" 3

# API health check should be fast
run_performance_check "Health check response time" "$DEPLOY_URL/api/health" 1

# Search API should respond quickly
run_performance_check "Search API response time" "$DEPLOY_URL/api/search?q=test" 2

echo ""

# ==============================================
# Security Headers Check
# ==============================================

echo -e "${BLUE}--- Security Headers ---${NC}"

TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
echo -n "[$TOTAL_CHECKS] Security headers present... "

headers=$(curl -s -I --max-time "$TIMEOUT" "$DEPLOY_URL/" 2>&1)

missing_headers=()

if ! echo "$headers" | grep -q "X-Frame-Options"; then
    missing_headers+=("X-Frame-Options")
fi

if ! echo "$headers" | grep -q "X-Content-Type-Options"; then
    missing_headers+=("X-Content-Type-Options")
fi

if ! echo "$headers" | grep -q "Referrer-Policy"; then
    missing_headers+=("Referrer-Policy")
fi

if [ ${#missing_headers[@]} -eq 0 ]; then
    echo -e "${GREEN}PASSED${NC}"
else
    echo -e "${YELLOW}WARNING${NC} (missing: ${missing_headers[*]})"
    # Don't fail deployment for missing headers, just warn
fi

echo ""

# ==============================================
# Environment Variable Check (if API available)
# ==============================================

echo -e "${BLUE}--- Environment Configuration ---${NC}"

TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
echo -n "[$TOTAL_CHECKS] Environment variables loaded... "

# Check health endpoint for environment info
health_response=$(curl -s --max-time "$TIMEOUT" "$DEPLOY_URL/api/health" 2>&1)

if echo "$health_response" | grep -q "environment"; then
    env_value=$(echo "$health_response" | grep -o '"environment":"[^"]*"' | cut -d'"' -f4)
    echo -e "${GREEN}PASSED${NC} (environment: $env_value)"
else
    echo -e "${YELLOW}WARNING${NC} (unable to verify)"
fi

echo ""

# ==============================================
# Console Error Check (Basic)
# ==============================================

echo -e "${BLUE}--- Build Verification ---${NC}"

TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
echo -n "[$TOTAL_CHECKS] No obvious build errors... "

# Check if page contains common error markers
page_content=$(curl -s --max-time "$TIMEOUT" "$DEPLOY_URL/" 2>&1)

if echo "$page_content" | grep -qi "internal server error\|500\|application error"; then
    echo -e "${RED}FAILED${NC} (error markers found in HTML)"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
elif echo "$page_content" | grep -qi "<!DOCTYPE html"; then
    echo -e "${GREEN}PASSED${NC}"
else
    echo -e "${YELLOW}WARNING${NC} (unexpected response format)"
fi

echo ""

# ==============================================
# Summary
# ==============================================

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Verification Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "Total checks: $TOTAL_CHECKS"
echo -e "Passed: $((TOTAL_CHECKS - FAILED_CHECKS))"
echo -e "Failed: $FAILED_CHECKS"
echo ""

if [ $FAILED_CHECKS -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed!${NC}"
    echo -e "${GREEN}Deployment verified successfully.${NC}"
    exit 0
else
    echo -e "${RED}✗ $FAILED_CHECKS check(s) failed!${NC}"
    echo -e "${RED}Deployment verification failed.${NC}"
    exit 1
fi

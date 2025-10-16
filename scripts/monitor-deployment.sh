#!/bin/bash

# Monitor Netlify deployment and verify pagination fix
# Usage: ./scripts/monitor-deployment.sh

set -e

DEPLOY_ID="68f088f89fa67794268deb64"
SITE_URL="https://judgefinder.io"
MAX_WAIT=180 # 3 minutes

echo "🚀 Monitoring Netlify Deployment"
echo "Deploy ID: $DEPLOY_ID"
echo "Site URL: $SITE_URL"
echo ""

# Function to check deployment status
check_deployment_status() {
    # Using curl to check if site is responding
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$SITE_URL")
    echo "$HTTP_STATUS"
}

# Wait for deployment
echo "⏳ Waiting for deployment to complete..."
ELAPSED=0
INTERVAL=10

while [ $ELAPSED -lt $MAX_WAIT ]; do
    sleep $INTERVAL
    ELAPSED=$((ELAPSED + INTERVAL))

    STATUS=$(check_deployment_status)
    echo "[${ELAPSED}s] Site status: $STATUS"

    if [ "$STATUS" = "200" ]; then
        echo ""
        echo "✅ Site is responding (HTTP $STATUS)"
        break
    fi
done

if [ $ELAPSED -ge $MAX_WAIT ]; then
    echo ""
    echo "⚠️  Deployment monitoring timed out after ${MAX_WAIT}s"
    echo "Check Netlify dashboard: https://app.netlify.com/sites/judgefinder/deploys"
    exit 1
fi

echo ""
echo "🔍 Verifying Pagination Fix..."
echo ""

# Test page 2 - should show "Alicia R. Ekland" (judge #25), not "A. Lee Harris"
echo "Test 1: Fetching /judges?page=2"
PAGE_2_CONTENT=$(curl -s "$SITE_URL/judges?page=2")

if echo "$PAGE_2_CONTENT" | grep -q "Alicia R. Ekland"; then
    echo "✅ Page 2 shows correct judge: Alicia R. Ekland (judge #25)"
    TEST_1_PASS=true
elif echo "$PAGE_2_CONTENT" | grep -q "A. Lee Harris"; then
    echo "❌ Page 2 still shows page 1 judge: A. Lee Harris"
    echo "   This means Netlify cache wasn't cleared!"
    TEST_1_PASS=false
else
    echo "⚠️  Could not determine page 2 content"
    TEST_1_PASS=false
fi

echo ""
echo "📊 Test Results:"
echo ""

if [ "$TEST_1_PASS" = true ]; then
    echo "🎉 PAGINATION FIX VERIFIED!"
    echo ""
    echo "✅ Page 2 shows correct judges"
    echo ""
    echo "Next steps:"
    echo "1. Test manually: open $SITE_URL/judges?page=2"
    echo "2. Run E2E tests: npm run test:e2e"
    echo ""
    exit 0
else
    echo "⚠️  Pagination still showing page 1 data"
    echo ""
    echo "REQUIRED ACTION:"
    echo "Netlify cache needs to be cleared manually"
    echo ""
    exit 1
fi

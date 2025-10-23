#!/bin/bash
# Check CourtListener API Rate Limit Status
# Shows when the quota will reset

set -e

# Load env vars if .env.local exists
if [ -f .env.local ]; then
  export $(cat .env.local | grep COURTLISTENER_API_KEY | xargs)
fi

if [ -z "$COURTLISTENER_API_KEY" ]; then
  echo "❌ COURTLISTENER_API_KEY not set in .env.local"
  exit 1
fi

echo "🔍 Checking CourtListener API rate limit status..."
echo ""

# Make a simple API call and capture headers
RESPONSE=$(curl -s -i -H "Authorization: Token $COURTLISTENER_API_KEY" \
  "https://www.courtlistener.com/api/rest/v4/people/?id=1" 2>&1)

# Extract retry-after header if it exists
RETRY_AFTER=$(echo "$RESPONSE" | grep -i "retry-after:" | awk '{print $2}' | tr -d '\r')

# Extract status code
STATUS=$(echo "$RESPONSE" | grep "HTTP/" | awk '{print $2}')

echo "Status Code: $STATUS"
echo ""

if [ "$STATUS" = "429" ]; then
  echo "⏸️  Rate limit hit!"
  echo ""
  if [ -n "$RETRY_AFTER" ]; then
    MINUTES=$((RETRY_AFTER / 60))
    echo "⏱️  Retry after: $RETRY_AFTER seconds (~$MINUTES minutes)"
    echo ""

    # Calculate reset time
    if command -v date &> /dev/null; then
      if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS date command
        RESET_TIME=$(date -u -v+"${RETRY_AFTER}S" "+%Y-%m-%d %H:%M:%S UTC")
      else
        # Linux date command
        RESET_TIME=$(date -u -d "+${RETRY_AFTER} seconds" "+%Y-%m-%d %H:%M:%S UTC")
      fi
      echo "🕐 Rate limit resets at: $RESET_TIME"
    fi
  else
    echo "No retry-after header found. Check again in 1 hour."
  fi
  echo ""
  echo "💡 The sync script will automatically wait and retry."
  echo "   You can also wait and run manually:"
  echo "   npx tsx scripts/sync-education-data.ts -- --limit=10"
elif [ "$STATUS" = "200" ]; then
  echo "✅ API quota available!"
  echo ""
  echo "🚀 Ready to sync. Run:"
  echo "   npx tsx scripts/sync-education-data.ts -- --limit=10"
else
  echo "⚠️  Unexpected status: $STATUS"
  echo ""
  echo "Response:"
  echo "$RESPONSE" | head -20
fi

echo ""

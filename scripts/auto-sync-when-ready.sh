#!/bin/bash
# Auto-start education sync when rate limit resets
# Usage: bash scripts/auto-sync-when-ready.sh [--limit=N]

set -e

# Parse arguments
LIMIT_ARG=""
for arg in "$@"; do
  if [[ $arg == --limit=* ]]; then
    LIMIT_ARG="$arg"
  fi
done

# Load env vars
if [ -f .env.local ]; then
  export $(cat .env.local | grep COURTLISTENER_API_KEY | xargs)
fi

if [ -z "$COURTLISTENER_API_KEY" ]; then
  echo "❌ COURTLISTENER_API_KEY not set in .env.local"
  exit 1
fi

echo "🤖 Auto-Sync: Waiting for CourtListener rate limit to reset..."
echo ""

# Check every minute until rate limit is clear
while true; do
  # Check rate limit
  RESPONSE=$(curl -s -i -H "Authorization: Token $COURTLISTENER_API_KEY" \
    "https://www.courtlistener.com/api/rest/v4/people/?id=1" 2>&1)

  STATUS=$(echo "$RESPONSE" | grep "HTTP/" | awk '{print $2}')

  if [ "$STATUS" = "200" ]; then
    echo ""
    echo "✅ Rate limit cleared! Starting sync..."
    echo ""

    # Run the sync
    if [ -n "$LIMIT_ARG" ]; then
      npx tsx scripts/sync-education-data.ts -- "$LIMIT_ARG"
    else
      npx tsx scripts/sync-education-data.ts
    fi

    break
  elif [ "$STATUS" = "429" ]; then
    # Extract retry-after
    RETRY_AFTER=$(echo "$RESPONSE" | grep -i "retry-after:" | awk '{print $2}' | tr -d '\r')

    if [ -n "$RETRY_AFTER" ]; then
      MINUTES=$((RETRY_AFTER / 60))

      # Calculate reset time
      if [[ "$OSTYPE" == "darwin"* ]]; then
        RESET_TIME=$(date -u -v+"${RETRY_AFTER}S" "+%H:%M:%S UTC")
      else
        RESET_TIME=$(date -u -d "+${RETRY_AFTER} seconds" "+%H:%M:%S UTC")
      fi

      echo -ne "\r⏸️  Rate limit hit. Resets at $RESET_TIME (~$MINUTES min). Checking again in 60s...   "
    else
      echo -ne "\r⏸️  Rate limit hit. Checking again in 60s...   "
    fi

    sleep 60
  else
    echo "⚠️  Unexpected status: $STATUS. Waiting 60s..."
    sleep 60
  fi
done

echo ""
echo "✅ Sync complete!"

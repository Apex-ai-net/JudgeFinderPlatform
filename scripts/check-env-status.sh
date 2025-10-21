#!/bin/bash
# ============================================
# Check Environment Variable Status
# ============================================
# This script checks which environment variables are still masked
# or missing in .env.local
# ============================================

ENV_FILE=".env.local"

if [ ! -f "$ENV_FILE" ]; then
    echo "ERROR: .env.local not found"
    echo "Run: ./scripts/fetch-netlify-env.sh first"
    exit 1
fi

echo "============================================"
echo "Environment Variable Status Check"
echo "============================================"
echo ""

# Count masked values
MASKED_COUNT=$(grep -c '\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*' "$ENV_FILE" 2>/dev/null || echo "0")

echo "Masked Values Found: $MASKED_COUNT"
echo ""

if [ "$MASKED_COUNT" -gt 0 ]; then
    echo "The following variables still have masked values:"
    echo "================================================"
    grep '\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*' "$ENV_FILE" | while read -r line; do
        VAR_NAME=$(echo "$line" | cut -d'=' -f1)
        VAR_ENDING=$(echo "$line" | grep -o '[a-zA-Z0-9+/=]\{4\}$')
        echo "  - $VAR_NAME (ends with: $VAR_ENDING)"
    done
    echo ""
    echo "ACTION REQUIRED:"
    echo "1. Go to: https://app.netlify.com/sites/judgefinder/settings/env"
    echo "2. Copy the full values for each masked variable"
    echo "3. Update .env.local with the complete values"
    echo ""
else
    echo "SUCCESS! No masked values found."
    echo ""
fi

# Check for critical required variables
echo "============================================"
echo "Critical Variables Status"
echo "============================================"
echo ""

CRITICAL_VARS=(
    "CLERK_SECRET_KEY"
    "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"
    "SUPABASE_SERVICE_ROLE_KEY"
    "NEXT_PUBLIC_SUPABASE_URL"
    "NEXT_PUBLIC_SUPABASE_ANON_KEY"
)

ALL_SET=true

for VAR in "${CRITICAL_VARS[@]}"; do
    if grep -q "^${VAR}=.\+$" "$ENV_FILE" && ! grep -q "^${VAR}=\*\*\*\*" "$ENV_FILE"; then
        # Check if not masked
        if ! grep "^${VAR}=" "$ENV_FILE" | grep -q '\*\*\*\*'; then
            echo "  ✓ $VAR is set"
        else
            echo "  ✗ $VAR is MASKED"
            ALL_SET=false
        fi
    else
        echo "  ✗ $VAR is NOT SET"
        ALL_SET=false
    fi
done

echo ""

if [ "$ALL_SET" = true ]; then
    echo "✓ All critical variables are configured!"
    echo ""
    echo "You can now run:"
    echo "  npm run dev"
else
    echo "⚠ Some critical variables are still masked or missing."
    echo ""
    echo "See NETLIFY_ENV_SETUP_GUIDE.md for instructions on how to retrieve them."
fi

echo ""
echo "============================================"
echo "Optional Variables"
echo "============================================"
echo ""

OPTIONAL_VARS=(
    "OPENAI_API_KEY"
    "GOOGLE_AI_API_KEY"
    "UPSTASH_REDIS_REST_URL"
    "UPSTASH_REDIS_REST_TOKEN"
)

for VAR in "${OPTIONAL_VARS[@]}"; do
    if grep -q "^${VAR}=.\+$" "$ENV_FILE" && ! grep "^${VAR}=" "$ENV_FILE" | grep -q '\*\*\*\*'; then
        echo "  ✓ $VAR is set"
    else
        echo "  - $VAR is masked/not set (optional, will use fallbacks)"
    fi
done

echo ""
echo "For full details, see:"
echo "  - NETLIFY_ENV_SETUP_GUIDE.md"
echo "  - .env.example"
echo ""

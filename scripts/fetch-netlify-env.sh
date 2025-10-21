#!/bin/bash
# ============================================
# Fetch Netlify Environment Variables
# ============================================
# This script fetches the full (unmasked) values of environment variables
# from Netlify production and updates .env.local
#
# Usage: ./scripts/fetch-netlify-env.sh
# ============================================

set -e

echo "============================================"
echo "Fetching Environment Variables from Netlify"
echo "============================================"
echo ""

# Check if Netlify CLI is installed
if ! command -v netlify &> /dev/null; then
    echo "ERROR: Netlify CLI is not installed"
    echo "Install with: npm install -g netlify-cli"
    exit 1
fi

# Check if linked to Netlify site
if ! netlify status &> /dev/null; then
    echo "ERROR: Not logged into Netlify or not linked to a site"
    echo "Run: netlify login && netlify link"
    exit 1
fi

echo "Fetching masked environment variables..."
echo ""

# Create a temporary file for the new .env.local
TEMP_ENV_FILE="/tmp/env.local.tmp"
ENV_FILE=".env.local"

# Start building the new .env.local file
cat > "$TEMP_ENV_FILE" << 'EOF'
# ============================================
# JudgeFinder Platform - Local Development Environment
# ============================================
# Auto-generated from Netlify production environment
# Generated on: $(date +%Y-%m-%d)
#
# IMPORTANT: This file contains sensitive data and should NEVER be committed to git.
# It is already in .gitignore for protection.
# ============================================

EOF

# List of all environment variables to fetch
ENV_VARS=(
    "NEXT_PUBLIC_SUPABASE_URL"
    "NEXT_PUBLIC_SUPABASE_ANON_KEY"
    "SUPABASE_SERVICE_ROLE_KEY"
    "SUPABASE_DATABASE_URL"
    "SUPABASE_JWT_SECRET"
    "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"
    "CLERK_SECRET_KEY"
    "NEXT_PUBLIC_CLERK_SIGN_IN_URL"
    "NEXT_PUBLIC_CLERK_SIGN_UP_URL"
    "NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL"
    "NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL"
    "NEXT_PUBLIC_TURNSTILE_SITE_KEY"
    "TURNSTILE_SECRET_KEY"
    "OPENAI_API_KEY"
    "GOOGLE_AI_API_KEY"
    "COURTLISTENER_API_KEY"
    "COURTLISTENER_WEBHOOK_VERIFY_TOKEN"
    "UPSTASH_REDIS_REST_URL"
    "UPSTASH_REDIS_REST_TOKEN"
    "STRIPE_SECRET_KEY"
    "STRIPE_WEBHOOK_SECRET"
    "STRIPE_PRICE_MONTHLY"
    "STRIPE_PRICE_YEARLY"
    "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"
    "NEXT_PUBLIC_SENTRY_DSN"
    "SENTRY_DSN"
    "NEXT_PUBLIC_SITE_URL"
    "NEXT_PUBLIC_APP_URL"
    "NEXT_PUBLIC_APP_NAME"
    "ADMIN_USER_IDS"
    "SYNC_API_KEY"
    "CRON_SECRET"
    "ENCRYPTION_KEY"
    "SESSION_SECRET"
    "NEXT_PUBLIC_ENABLE_ADS"
    "NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT"
)

# Fetch each variable
for VAR in "${ENV_VARS[@]}"; do
    echo "Fetching: $VAR"
    VALUE=$(netlify env:get "$VAR" --context production 2>/dev/null || echo "")

    if [ -n "$VALUE" ]; then
        echo "$VAR=$VALUE" >> "$TEMP_ENV_FILE"
    else
        echo "# $VAR= (not set in Netlify)" >> "$TEMP_ENV_FILE"
    fi
done

# Add local development overrides
cat >> "$TEMP_ENV_FILE" << 'EOF'

# ------------------------------
# Local Development Overrides
# ------------------------------
NODE_ENV=development
EOF

echo ""
echo "============================================"
echo "Environment variables fetched successfully!"
echo "============================================"
echo ""
echo "Backing up existing .env.local (if it exists)..."
if [ -f "$ENV_FILE" ]; then
    cp "$ENV_FILE" "${ENV_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
    echo "Backup created: ${ENV_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
fi

echo "Creating new .env.local file..."
mv "$TEMP_ENV_FILE" "$ENV_FILE"

echo ""
echo "SUCCESS! .env.local has been created with all environment variables."
echo ""
echo "IMPORTANT SECURITY NOTES:"
echo "1. .env.local is in .gitignore - NEVER commit it"
echo "2. Keep this file secure and do not share it"
echo "3. If values are still masked, you may need Netlify admin permissions"
echo ""
echo "Next steps:"
echo "1. Review .env.local to ensure all values are populated"
echo "2. Run: npm run dev"
echo ""

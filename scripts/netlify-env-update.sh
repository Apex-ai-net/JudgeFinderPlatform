#!/bin/bash

# ============================================
# Netlify Environment Variables Update Script
# ============================================
# This script helps you update all required environment variables in Netlify
# Run this script after setting up new API keys or rotating credentials
#
# Prerequisites:
# 1. Install Netlify CLI: npm install -g netlify-cli
# 2. Login to Netlify: netlify login
# 3. Link to your site: netlify link
#
# Usage:
#   chmod +x scripts/netlify-env-update.sh
#   ./scripts/netlify-env-update.sh
# ============================================

set -e  # Exit on any error

echo "============================================"
echo "Netlify Environment Variables Setup"
echo "============================================"
echo ""

# Check if Netlify CLI is installed
if ! command -v netlify &> /dev/null; then
    echo "ERROR: Netlify CLI is not installed"
    echo "Install it with: npm install -g netlify-cli"
    exit 1
fi

# Check if site is linked
if [ ! -f ".netlify/state.json" ]; then
    echo "ERROR: Site is not linked to Netlify"
    echo "Run: netlify link"
    exit 1
fi

echo "This script will guide you through setting up all required environment variables."
echo "You'll need to gather values from the following services:"
echo ""
echo "  - Supabase: https://app.supabase.com/project/_/settings/api"
echo "  - Clerk: https://dashboard.clerk.com"
echo "  - OpenAI: https://platform.openai.com/api-keys"
echo "  - Google AI: https://makersuite.google.com/app/apikey"
echo "  - CourtListener: https://www.courtlistener.com/help/api/"
echo "  - Upstash Redis: https://console.upstash.com/"
echo "  - Stripe: https://dashboard.stripe.com/apikeys"
echo "  - Sentry: https://sentry.io/settings/projects/"
echo ""

read -p "Press Enter to continue or Ctrl+C to cancel..."

# ============================================
# HELPER FUNCTIONS
# ============================================

set_env_var() {
    local var_name=$1
    local var_description=$2
    local var_example=$3
    local is_required=$4

    echo ""
    echo "----------------------------------------"
    echo "Setting: $var_name"
    echo "Description: $var_description"
    if [ ! -z "$var_example" ]; then
        echo "Example: $var_example"
    fi
    echo "Required: $is_required"
    echo "----------------------------------------"

    if [ "$is_required" = "OPTIONAL" ]; then
        read -p "Do you want to set this variable? (y/n): " should_set
        if [ "$should_set" != "y" ]; then
            echo "Skipping $var_name"
            return
        fi
    fi

    read -sp "Enter value for $var_name: " var_value
    echo ""

    if [ -z "$var_value" ]; then
        echo "WARNING: Empty value provided, skipping $var_name"
        return
    fi

    # Set the variable in Netlify
    netlify env:set "$var_name" "$var_value" --context production
    echo "✓ $var_name set successfully"
}

# ============================================
# DATABASE CONFIGURATION (SUPABASE)
# ============================================

echo ""
echo "============================================"
echo "1. SUPABASE DATABASE CONFIGURATION"
echo "============================================"
echo "Get these from: https://app.supabase.com/project/_/settings/api"

set_env_var "NEXT_PUBLIC_SUPABASE_URL" \
    "Supabase project URL (public)" \
    "https://abcdefgh.supabase.co" \
    "REQUIRED"

set_env_var "NEXT_PUBLIC_SUPABASE_ANON_KEY" \
    "Supabase anonymous key (public, protected by RLS)" \
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
    "REQUIRED"

set_env_var "SUPABASE_SERVICE_ROLE_KEY" \
    "Supabase service role key (CRITICAL: server-side only, bypasses RLS)" \
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
    "REQUIRED"

set_env_var "SUPABASE_JWT_SECRET" \
    "Supabase JWT secret for signing service account tokens" \
    "your-super-secret-jwt-token-32-chars-min" \
    "REQUIRED"

# ============================================
# AUTHENTICATION (CLERK)
# ============================================

echo ""
echo "============================================"
echo "2. CLERK AUTHENTICATION"
echo "============================================"
echo "Get these from: https://dashboard.clerk.com"

set_env_var "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY" \
    "Clerk publishable key (public)" \
    "pk_live_..." \
    "REQUIRED"

set_env_var "CLERK_SECRET_KEY" \
    "Clerk secret key (CRITICAL: server-side only)" \
    "sk_live_..." \
    "REQUIRED"

# ============================================
# AI SERVICES
# ============================================

echo ""
echo "============================================"
echo "3. AI SERVICES"
echo "============================================"

echo "OpenAI API (fallback for AI analytics)"
echo "Get from: https://platform.openai.com/api-keys"
set_env_var "OPENAI_API_KEY" \
    "OpenAI API key (must start with 'sk-')" \
    "sk-proj-..." \
    "OPTIONAL"

echo ""
echo "Google AI / Gemini (primary AI provider)"
echo "Get from: https://makersuite.google.com/app/apikey"
set_env_var "GOOGLE_AI_API_KEY" \
    "Google AI API key (starts with 'AIza')" \
    "AIzaSy..." \
    "RECOMMENDED"

# ============================================
# EXTERNAL APIS
# ============================================

echo ""
echo "============================================"
echo "4. COURTLISTENER API"
echo "============================================"
echo "Get from: https://www.courtlistener.com/help/api/"

set_env_var "COURTLISTENER_API_KEY" \
    "CourtListener API key for judicial data" \
    "your-api-key" \
    "REQUIRED"

# ============================================
# CACHE & RATE LIMITING (UPSTASH REDIS)
# ============================================

echo ""
echo "============================================"
echo "5. UPSTASH REDIS (CACHE & RATE LIMITING)"
echo "============================================"
echo "Get from: https://console.upstash.com/"

set_env_var "UPSTASH_REDIS_REST_URL" \
    "Upstash Redis REST URL" \
    "https://your-instance.upstash.io" \
    "REQUIRED"

set_env_var "UPSTASH_REDIS_REST_TOKEN" \
    "Upstash Redis REST token" \
    "AYourTokenHere..." \
    "REQUIRED"

# ============================================
# PAYMENT PROCESSING (STRIPE)
# ============================================

echo ""
echo "============================================"
echo "6. STRIPE PAYMENT PROCESSING"
echo "============================================"
echo "Get from: https://dashboard.stripe.com/apikeys"
echo "Use LIVE keys (sk_live_, pk_live_) for production"

set_env_var "STRIPE_SECRET_KEY" \
    "Stripe secret key (server-side)" \
    "sk_live_..." \
    "RECOMMENDED"

set_env_var "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY" \
    "Stripe publishable key (client-side)" \
    "pk_live_..." \
    "RECOMMENDED"

set_env_var "STRIPE_WEBHOOK_SECRET" \
    "Stripe webhook signing secret" \
    "whsec_..." \
    "OPTIONAL"

# ============================================
# MONITORING & ERROR TRACKING (SENTRY)
# ============================================

echo ""
echo "============================================"
echo "7. SENTRY ERROR TRACKING"
echo "============================================"
echo "Get from: https://sentry.io/settings/projects/"

set_env_var "SENTRY_DSN" \
    "Sentry DSN for server-side tracking" \
    "https://key@org.ingest.sentry.io/project" \
    "RECOMMENDED"

set_env_var "NEXT_PUBLIC_SENTRY_DSN" \
    "Sentry DSN for client-side tracking (usually same as SENTRY_DSN)" \
    "https://key@org.ingest.sentry.io/project" \
    "RECOMMENDED"

set_env_var "SENTRY_AUTH_TOKEN" \
    "Sentry auth token for source map uploads" \
    "your-auth-token" \
    "OPTIONAL"

# ============================================
# INTERNAL SECURITY & API PROTECTION
# ============================================

echo ""
echo "============================================"
echo "8. INTERNAL SECURITY KEYS"
echo "============================================"
echo "Generate these with: openssl rand -base64 32"

set_env_var "SYNC_API_KEY" \
    "API key for internal sync operations (generate with: openssl rand -base64 32)" \
    "base64-encoded-32-char-string" \
    "REQUIRED"

set_env_var "CRON_SECRET" \
    "Secret for authenticating scheduled/cron functions (generate with: openssl rand -base64 32)" \
    "base64-encoded-32-char-string" \
    "REQUIRED"

set_env_var "ENCRYPTION_KEY" \
    "Encryption key for sensitive data (CRITICAL: generate with: openssl rand -base64 32)" \
    "base64-encoded-32-char-string" \
    "REQUIRED"

# ============================================
# ADMIN CONFIGURATION
# ============================================

echo ""
echo "============================================"
echo "9. ADMIN CONFIGURATION"
echo "============================================"
echo "Get user IDs from: https://dashboard.clerk.com/apps/{app_id}/users"

set_env_var "ADMIN_USER_IDS" \
    "Comma-separated list of Clerk user IDs with admin access" \
    "user_2abc123def,user_2xyz456ghi" \
    "REQUIRED"

# ============================================
# ANALYTICS & TRACKING (OPTIONAL)
# ============================================

echo ""
echo "============================================"
echo "10. ANALYTICS & TRACKING (OPTIONAL)"
echo "============================================"

set_env_var "NEXT_PUBLIC_GA_MEASUREMENT_ID" \
    "Google Analytics 4 measurement ID" \
    "G-XXXXXXXXXX" \
    "OPTIONAL"

set_env_var "NEXT_PUBLIC_POSTHOG_KEY" \
    "PostHog project API key" \
    "phc_..." \
    "OPTIONAL"

# ============================================
# SEO VERIFICATION (OPTIONAL)
# ============================================

echo ""
echo "============================================"
echo "11. SEO VERIFICATION (OPTIONAL)"
echo "============================================"

set_env_var "NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION" \
    "Google Search Console verification code" \
    "your-verification-code" \
    "OPTIONAL"

set_env_var "NEXT_PUBLIC_BING_SITE_VERIFICATION" \
    "Bing Webmaster Tools verification code" \
    "your-verification-code" \
    "OPTIONAL"

# ============================================
# COMPLETION
# ============================================

echo ""
echo "============================================"
echo "✓ Environment Variables Setup Complete!"
echo "============================================"
echo ""
echo "Next steps:"
echo "1. Verify all variables in Netlify UI:"
echo "   https://app.netlify.com/sites/YOUR_SITE/configuration/env"
echo ""
echo "2. Trigger a new deployment to use the new environment variables:"
echo "   netlify deploy --prod"
echo ""
echo "3. Monitor the deployment for any errors:"
echo "   netlify open:site"
echo ""
echo "4. Test your application thoroughly after deployment"
echo ""
echo "IMPORTANT SECURITY REMINDERS:"
echo "- Never commit .env files to version control"
echo "- Rotate keys regularly (every 90 days recommended)"
echo "- Use different keys for development and production"
echo "- Enable 2FA on all service accounts"
echo "- Monitor Netlify deployment logs for secret detection warnings"
echo ""
echo "============================================"

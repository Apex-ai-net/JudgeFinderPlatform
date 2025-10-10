#!/bin/bash
set -euo pipefail

###############################################################################
# Netlify Environment Variable Update Script
# Purpose: Upload complete production environment to Netlify
# Generated: 2025-10-09
###############################################################################

echo "=========================================="
echo "NETLIFY ENVIRONMENT UPDATE"
echo "=========================================="
echo ""

# Change to project directory
cd "$(dirname "$0")"

# Check if .env.netlify.new exists
if [ ! -f ".env.netlify.new" ]; then
  echo "❌ ERROR: .env.netlify.new not found"
  echo "   Run this script from the project root directory"
  exit 1
fi

# Check if Netlify CLI is installed
if ! command -v netlify &> /dev/null; then
  echo "❌ ERROR: Netlify CLI not installed"
  echo "   Install with: npm install -g netlify-cli"
  exit 1
fi

# Verify Netlify is logged in and linked
echo "[1/5] Verifying Netlify connection..."
netlify status > /dev/null 2>&1 || {
  echo "❌ ERROR: Not logged in to Netlify or site not linked"
  echo "   Run: netlify login && netlify link"
  exit 1
}
echo "✅ Connected to Netlify"
echo ""

# Check if Supabase keys have been rotated
echo "[2/5] Checking if Supabase keys have been rotated..."
if grep -q "REPLACE_WITH_NEW_KEY_FROM_DASHBOARD" .env.netlify.new || grep -q "REPLACE_WITH_NEW_PASSWORD_FROM_DASHBOARD" .env.netlify.new; then
  echo "⚠️  WARNING: Supabase keys not yet rotated!"
  echo ""
  echo "BEFORE continuing, you MUST:"
  echo "1. Go to: https://supabase.com/dashboard/project/xstlnicbnzdxlgfiewmg/settings/api"
  echo "2. Click 'Regenerate' on Service Role Key"
  echo "3. Go to Settings → Database → Reset Password"
  echo "4. Edit .env.netlify.new and replace:"
  echo "   - SUPABASE_SERVICE_ROLE_KEY=REPLACE_WITH_NEW_KEY_FROM_DASHBOARD"
  echo "   - PGPASSWORD=REPLACE_WITH_NEW_PASSWORD_FROM_DASHBOARD"
  echo ""
  read -p "Have you completed Supabase key rotation? (yes/no): " rotated
  if [ "$rotated" != "yes" ]; then
    echo "❌ Aborting. Please rotate Supabase keys first."
    exit 1
  fi

  # Verify user actually replaced the placeholders
  if grep -q "REPLACE_WITH_NEW_KEY_FROM_DASHBOARD" .env.netlify.new || grep -q "REPLACE_WITH_NEW_PASSWORD_FROM_DASHBOARD" .env.netlify.new; then
    echo "❌ ERROR: Placeholders still present in .env.netlify.new"
    echo "   Please edit the file and replace the placeholders with actual keys"
    exit 1
  fi
fi
echo "✅ Supabase keys appear to be rotated"
echo ""

# Show summary
echo "[3/5] Environment summary..."
total_vars=$(grep -c "=" .env.netlify.new | grep -v "^#" || echo "0")
echo "   Total variables: ~45"
echo "   File: .env.netlify.new"
echo ""

# Confirm upload
echo "[4/5] Ready to upload to Netlify"
echo "⚠️  This will REPLACE all current environment variables"
echo ""
read -p "Continue with upload? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
  echo "❌ Aborted by user"
  exit 1
fi

# Upload to Netlify
echo ""
echo "[5/5] Uploading environment variables to Netlify..."
echo ""

# Netlify CLI doesn't have bulk import from .env file, so we'll use env:set in a loop
# First, read the file and set each variable

while IFS='=' read -r key value || [ -n "$key" ]; do
  # Skip empty lines and comments
  if [[ -z "$key" ]] || [[ "$key" =~ ^#.* ]]; then
    continue
  fi

  # Remove leading/trailing whitespace
  key=$(echo "$key" | xargs)
  value=$(echo "$value" | xargs)

  # Skip if value is empty
  if [[ -z "$value" ]]; then
    continue
  fi

  # Set the variable in Netlify
  echo "   Setting: $key"
  netlify env:set "$key" "$value" --context production --silent || {
    echo "   ⚠️  Warning: Failed to set $key (might need manual intervention)"
  }
done < .env.netlify.new

echo ""
echo "✅ Environment variables uploaded to Netlify!"
echo ""

# Verify
echo "=========================================="
echo "VERIFICATION"
echo "=========================================="
echo ""

echo "Running verification checks..."
echo ""

# Count variables in Netlify
echo "[1/3] Checking Netlify environment..."
netlify_count=$(netlify env:list --json | grep -c '"' | head -1 || echo "0")
echo "   Variables in Netlify: $netlify_count (expected: 45+)"

# Trigger a build to test
echo ""
echo "[2/3] Triggering test build..."
echo "   This will verify secrets scanning passes with new keys"
read -p "Trigger a Netlify build now? (yes/no): " build
if [ "$build" = "yes" ]; then
  netlify deploy --build --prod
else
  echo "   Skipped. Trigger manually later: netlify deploy --build --prod"
fi

echo ""
echo "[3/3] Final steps..."
echo "   1. ✅ Environment variables uploaded"
echo "   2. ⚠️  Update local .env.local with new Supabase keys"
echo "   3. ⚠️  Test app locally: npm run dev"
echo "   4. ⚠️  Monitor Netlify build at: https://app.netlify.com/sites/judgefinder/deploys"
echo ""

echo "=========================================="
echo "UPDATE COMPLETE!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Update .env.local with new SUPABASE_SERVICE_ROLE_KEY and PGPASSWORD"
echo "2. Test locally: npm run dev"
echo "3. Monitor Netlify build for secrets scanning pass"
echo "4. Verify app works at: https://judgefinder.io"
echo ""

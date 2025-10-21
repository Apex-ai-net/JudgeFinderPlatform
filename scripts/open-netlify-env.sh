#!/bin/bash
# ============================================
# Open Netlify Environment Variables Dashboard
# ============================================
# Quick shortcut to open the Netlify environment variables page
# ============================================

NETLIFY_SITE_ID="8b098167-7710-4770-81ae-1eb3eb75c84b"
NETLIFY_ENV_URL="https://app.netlify.com/sites/judgefinder/settings/env"

echo "Opening Netlify environment variables dashboard..."
echo "URL: $NETLIFY_ENV_URL"
echo ""
echo "Instructions:"
echo "1. Click on each masked variable (ending with asterisks)"
echo "2. Copy the full value"
echo "3. Update the corresponding line in .env.local"
echo ""
echo "Critical variables to retrieve:"
echo "  - CLERK_SECRET_KEY"
echo "  - NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"
echo "  - SUPABASE_SERVICE_ROLE_KEY"
echo ""

# Open in default browser
if command -v open &> /dev/null; then
    # macOS
    open "$NETLIFY_ENV_URL"
elif command -v xdg-open &> /dev/null; then
    # Linux
    xdg-open "$NETLIFY_ENV_URL"
elif command -v start &> /dev/null; then
    # Windows
    start "$NETLIFY_ENV_URL"
else
    echo "Could not detect browser command."
    echo "Please manually open: $NETLIFY_ENV_URL"
fi

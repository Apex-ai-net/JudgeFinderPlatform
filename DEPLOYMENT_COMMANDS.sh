#!/bin/bash
# Authentication & Bot Protection Deployment Commands
# Execute these commands in order to deploy the feature

set -e  # Exit on error

echo "========================================="
echo "Authentication & Bot Protection Deployment"
echo "========================================="
echo ""

# Step 1: Database Migration
echo "Step 1: Apply Database Migration"
echo "================================="
echo ""
echo "Option A: Using Supabase CLI (recommended)"
echo "  supabase db push"
echo ""
echo "Option B: Using Supabase Dashboard"
echo "  1. Go to: https://app.supabase.com/project/<your-project>/sql"
echo "  2. Copy contents of: supabase/migrations/20251020_173114_add_user_roles_and_verification.sql"
echo "  3. Paste and click 'Run'"
echo ""
echo "Press Enter when migration is complete..."
read

# Step 2: Configure Environment Variables
echo ""
echo "Step 2: Configure Environment Variables"
echo "========================================"
echo ""
echo "First, create your Turnstile site at: https://dash.cloudflare.com/"
echo "Then set the keys in Netlify:"
echo ""
echo "  netlify env:set NEXT_PUBLIC_TURNSTILE_SITE_KEY \"0xYourRealSiteKey\""
echo "  netlify env:set TURNSTILE_SECRET_KEY \"0xYourRealSecretKey\""
echo ""
echo "Verify all environment variables:"
echo "  netlify env:list"
echo ""
echo "Press Enter when environment variables are set..."
read

# Step 3: Pre-Deployment Checks
echo ""
echo "Step 3: Pre-Deployment Checks"
echo "=============================="
echo ""

echo "Running linter..."
npm run lint || { echo "Linting failed! Fix errors before deploying."; exit 1; }

echo "Running type check..."
npm run type-check || { echo "Type checking failed! Fix errors before deploying."; exit 1; }

echo "Building locally..."
npm run build || { echo "Build failed! Fix errors before deploying."; exit 1; }

echo "✅ All pre-deployment checks passed!"
echo ""

# Step 4: Git Commit
echo "Step 4: Commit Changes"
echo "======================"
echo ""
echo "Staging all files..."
git add .

echo "Creating commit..."
git commit -m "feat(auth): implement authentication and bot protection system

- Add Cloudflare Turnstile CAPTCHA integration for bot protection
- Require authentication for AI chatbox (prevents abuse)
- Implement tiered rate limiting:
  - Anonymous users: 10 searches/day
  - Authenticated users: 100 searches/hour, 20 chat messages/hour
- Add law professional verification system with bar number validation
- Create user roles system (user, advertiser, admin)
- Add advertiser onboarding flow with verification
- Protect sensitive routes with middleware
- Add database migration for user roles and verification columns
- Add @marsidev/react-turnstile package dependency

Technical Changes:
- New: lib/auth/turnstile.ts - Turnstile verification utilities
- New: components/auth/TurnstileWidget.tsx - Reusable CAPTCHA component
- New: app/advertise/onboarding/page.tsx - Advertiser onboarding UI
- New: app/api/advertising/verify-bar/route.ts - Bar verification endpoint
- New: supabase/migrations/20251020_173114_add_user_roles_and_verification.sql
- Modified: app/api/chat/route.ts - Added auth check + rate limiting
- Modified: app/api/judges/search/route.ts - Added tiered rate limits
- Modified: components/chat/AILegalAssistant.tsx - Auth gate + Turnstile
- Modified: middleware.ts - Protect /api/chat route

Database Changes:
- Add user_role column (user|advertiser|admin)
- Add bar_number, bar_state, bar_verified_at columns
- Add verification_status column (none|pending|verified|rejected)
- Add automatic role promotion trigger

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"

echo "✅ Commit created!"
echo ""

# Step 5: Push to GitHub
echo "Step 5: Push to GitHub"
echo "======================"
echo ""
echo "Ready to push to origin/main?"
echo "This will trigger Netlify deployment."
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]
then
    git push origin main
    echo "✅ Pushed to GitHub!"
else
    echo "⚠️  Skipped push. Run 'git push origin main' when ready."
    exit 0
fi

# Step 6: Monitor Deployment
echo ""
echo "Step 6: Monitor Deployment"
echo "=========================="
echo ""
echo "Watching Netlify deployment..."
echo "You can also monitor at: https://app.netlify.com/sites/<your-site>/deploys"
echo ""
echo "Press Ctrl+C to stop watching (deployment will continue)"
netlify watch || true

echo ""
echo "========================================="
echo "Deployment Complete!"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Run post-deployment verification tests"
echo "2. Check Sentry for any errors"
echo "3. Monitor user feedback"
echo "4. Review metrics after 24 hours"
echo ""
echo "See DEPLOYMENT_SUMMARY.md and docs/AUTH_DEPLOYMENT_GUIDE.md for details."

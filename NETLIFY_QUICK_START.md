# Netlify Deployment - Quick Start Guide

Get your JudgeFinder Platform deployed to Netlify in under 30 minutes.

## Prerequisites Checklist

Before starting, have these ready:

- [ ] Netlify account
- [ ] Supabase project with database configured
- [ ] Clerk application configured
- [ ] CourtListener API key
- [ ] Upstash Redis database
- [ ] Node.js 20+ installed locally
- [ ] Git repository access

## 5-Step Deployment

### Step 1: Install Netlify CLI (2 minutes)

```bash
# Install globally
npm install -g netlify-cli

# Login to Netlify
netlify login

# This will open a browser to authenticate
```

### Step 2: Link Repository (3 minutes)

```bash
# Navigate to project directory
cd JudgeFinderPlatform

# Link to Netlify (creates new site or links to existing)
netlify init

# Follow the prompts:
# - Create & configure a new site
# - Choose your team
# - Site name: judgefinder-platform (or your preferred name)
# - Build command: npm run build
# - Directory to deploy: .next
# - Netlify functions folder: netlify/functions
```

### Step 3: Set Environment Variables (15 minutes)

Use the automated script:

```bash
# Make script executable
chmod +x scripts/netlify-env-update.sh

# Run interactive setup
./scripts/netlify-env-update.sh
```

The script will prompt you for each variable. Have these ready:

**From Supabase** (https://app.supabase.com/project/_/settings/api):

- Project URL
- Anon key
- Service role key
- JWT secret

**From Clerk** (https://dashboard.clerk.com):

- Publishable key
- Secret key

**From CourtListener** (https://www.courtlistener.com/help/api/):

- API key

**From Upstash** (https://console.upstash.com):

- Redis REST URL
- Redis REST token

**Generate locally**:

```bash
# For SYNC_API_KEY, CRON_SECRET, ENCRYPTION_KEY
openssl rand -base64 32
```

**From Clerk Dashboard** (https://dashboard.clerk.com/apps/YOUR_APP/users):

- Admin user IDs (copy your user ID from the users page)

### Step 4: Verify Configuration (5 minutes)

```bash
# Run security verification
chmod +x scripts/verify-build-security.sh
./scripts/verify-build-security.sh

# Check environment variables are set
netlify env:list

# Should see 15+ variables listed
```

### Step 5: Deploy (5 minutes)

```bash
# Push to trigger deployment
git add .
git commit -m "Configure Netlify deployment"
git push origin main

# Or deploy directly
netlify deploy --prod

# Open your site
netlify open:site
```

## Verification

After deployment, verify these:

1. **Site loads**: Visit your Netlify URL
2. **Sign-in works**: Go to `/sign-in`
3. **No errors in logs**: Check Netlify deploy logs
4. **Functions work**: Check function logs

```bash
# Check deployment status
netlify status

# View function logs
netlify functions:log

# Open site
netlify open:site
```

## Common Issues

### "Secret detected in build"

```bash
# Run security check
./scripts/verify-build-security.sh

# Remove any .env files from git
git rm --cached .env*
echo ".env*" >> .gitignore
git commit -m "Remove .env files"
git push
```

### "Environment variable not found"

```bash
# Verify variable is set
netlify env:get VARIABLE_NAME

# If missing, set it
netlify env:set VARIABLE_NAME "value"

# Redeploy
netlify deploy --prod
```

### "Build failed"

```bash
# Test build locally first
npm run build

# Check for errors
npm run type-check
npm run lint

# Fix errors and try again
```

## Next Steps

After successful deployment:

1. **Configure custom domain** (optional)
   - Site settings → Domain management → Add custom domain

2. **Set up deploy notifications**
   - Site settings → Build & deploy → Deploy notifications

3. **Enable automatic deployments**
   - Already enabled by default for main branch

4. **Set up monitoring**
   - Configure Sentry (if not already)
   - Monitor function logs regularly

5. **Schedule key rotation**
   - Add calendar reminder for 90 days
   - Use `./scripts/netlify-env-update.sh` to update

## Documentation

For more details, see:

- [Complete Deployment Guide](./docs/NETLIFY_DEPLOYMENT_README.md)
- [Security Guide](./docs/NETLIFY_SECURITY_GUIDE.md)
- [Troubleshooting](./docs/NETLIFY_TROUBLESHOOTING.md)

## Support

If you get stuck:

1. Check [Troubleshooting Guide](./docs/NETLIFY_TROUBLESHOOTING.md)
2. Run `./scripts/verify-build-security.sh` for diagnostics
3. Check Netlify build logs for specific errors
4. Create an issue in the repository

## Quick Reference

```bash
# Deployment
netlify deploy --prod              # Deploy to production
netlify rollback                   # Rollback to previous

# Environment Variables
netlify env:list                   # List all variables
netlify env:set KEY "value"        # Set variable
./scripts/netlify-env-update.sh    # Interactive setup

# Monitoring
netlify status                     # Site status
netlify open:site                  # Open deployed site
netlify functions:log              # View function logs

# Security
./scripts/verify-build-security.sh # Run all security checks
```

---

**Deployment Time**: ~30 minutes first time, ~5 minutes after that

**Need Help?** See [NETLIFY_DEPLOYMENT_README.md](./docs/NETLIFY_DEPLOYMENT_README.md) for complete guide.

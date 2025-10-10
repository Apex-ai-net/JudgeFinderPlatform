# Netlify Deployment - Complete Setup Guide

This guide provides a complete walkthrough for deploying the JudgeFinder Platform to Netlify with proper security configuration.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Initial Setup](#initial-setup)
3. [Configuration Files](#configuration-files)
4. [Environment Variables](#environment-variables)
5. [Deployment Process](#deployment-process)
6. [Verification](#verification)
7. [Maintenance](#maintenance)

---

## Prerequisites

### Required Accounts

- [ ] Netlify account ([sign up](https://app.netlify.com/signup))
- [ ] GitHub/GitLab account with repository access
- [ ] Supabase project ([sign up](https://app.supabase.com))
- [ ] Clerk application ([sign up](https://dashboard.clerk.com))
- [ ] CourtListener API key ([get key](https://www.courtlistener.com/help/api/))
- [ ] Upstash Redis database ([sign up](https://console.upstash.com))

### Recommended Accounts

- [ ] OpenAI API key ([get key](https://platform.openai.com/api-keys))
- [ ] Google AI API key ([get key](https://makersuite.google.com/app/apikey))
- [ ] Stripe account ([sign up](https://dashboard.stripe.com))
- [ ] Sentry project ([sign up](https://sentry.io))

### Development Tools

```bash
# Install Node.js 20+
node --version  # Should be v20.x.x or higher

# Install Netlify CLI globally
npm install -g netlify-cli

# Verify installation
netlify --version
```

---

## Initial Setup

### 1. Clone and Install Dependencies

```bash
# Clone the repository
git clone <repository-url>
cd JudgeFinderPlatform

# Install dependencies
npm install

# Verify installation
npm run type-check
```

### 2. Create Netlify Site

Two options:

#### Option A: Using Netlify CLI (Recommended)

```bash
# Login to Netlify
netlify login

# Create new site
netlify init

# Follow prompts:
# - Choose "Create & configure a new site"
# - Select your team
# - Enter site name (e.g., judgefinder-platform)
# - Build command: npm run build
# - Deploy directory: .next
# - Functions directory: netlify/functions
```

#### Option B: Using Netlify UI

1. Go to [Netlify Dashboard](https://app.netlify.com)
2. Click "Add new site" → "Import an existing project"
3. Connect to your Git provider
4. Select the repository
5. Configure build settings:
   - **Build command**: `npm run build`
   - **Publish directory**: `.next`
   - **Functions directory**: `netlify/functions`
6. Click "Deploy site"

### 3. Link Local Repository to Netlify

```bash
# Link to existing site
netlify link

# Follow prompts to select your site

# Verify link
netlify status
```

---

## Configuration Files

### Required Files Overview

| File             | Purpose                            | Location     |
| ---------------- | ---------------------------------- | ------------ |
| `netlify.toml`   | Netlify build configuration        | Root of repo |
| `.netlifyignore` | Files to exclude from deployment   | Root of repo |
| `.env.example`   | Template for environment variables | Root of repo |
| `.gitignore`     | Files to exclude from git          | Root of repo |

### 1. netlify.toml Configuration

The `netlify.toml` file should already exist. Key sections:

```toml
[build]
  command = "npm run build"
  functions = "netlify/functions"

[build.environment]
  NODE_VERSION = "20"
  NPM_FLAGS = "--include=dev"

  # Critical: Secret scanner configuration
  SECRETS_SCAN_OMIT_PATHS = ".netlify/**,.next/**,..."
  SECRETS_SCAN_OMIT_KEYS = "NEXT_PUBLIC_*,..."
```

**Don't modify unless you know what you're doing!** The secret scanner settings are pre-configured to prevent false positives.

### 2. .netlifyignore Configuration

The `.netlifyignore` file should already exist and is pre-configured to exclude:

- Environment files (`.env*`)
- Development files and tests
- Build artifacts
- IDE configurations
- Backup files
- Documentation with sensitive info

**Verification**:

```bash
# Check .netlifyignore exists and is configured
cat .netlifyignore | grep "\.env"
```

### 3. .gitignore Configuration

Verify `.gitignore` is properly configured:

```bash
# Should include these patterns
.env
.env.*
!.env.example
*.key
*.pem
secrets.txt
```

---

## Environment Variables

### Setup Methods

#### Method 1: Automated Script (Recommended)

```bash
# Make script executable
chmod +x scripts/netlify-env-update.sh

# Run interactive setup
./scripts/netlify-env-update.sh
```

The script will:

- Guide you through each required variable
- Provide instructions on where to get values
- Automatically set variables in Netlify
- Verify your configuration

#### Method 2: Manual via CLI

```bash
# Set individual variables
netlify env:set VARIABLE_NAME "value" --context production

# Example
netlify env:set NEXT_PUBLIC_SUPABASE_URL "https://abc123.supabase.co" --context production
```

#### Method 3: Manual via Netlify UI

1. Go to Site settings → Environment variables
2. Click "Add a variable"
3. Enter key and value
4. Select scopes (production, deploy-preview, branch-deploy)
5. Click "Create variable"

### Required Variables

Complete list in priority order:

#### Critical (App won't start without these)

```bash
# Database
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_JWT_SECRET

# Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY

# External APIs
COURTLISTENER_API_KEY

# Cache & Rate Limiting
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN

# Security
SYNC_API_KEY          # Generate: openssl rand -base64 32
CRON_SECRET           # Generate: openssl rand -base64 32
ENCRYPTION_KEY        # Generate: openssl rand -base64 32

# Admin
ADMIN_USER_IDS        # Comma-separated Clerk user IDs
```

#### Recommended (For full functionality)

```bash
# AI Services
OPENAI_API_KEY
GOOGLE_AI_API_KEY

# Payments
STRIPE_SECRET_KEY
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
STRIPE_WEBHOOK_SECRET

# Monitoring
SENTRY_DSN
NEXT_PUBLIC_SENTRY_DSN
```

### Verification

```bash
# List all variables
netlify env:list

# Verify specific variable
netlify env:get NEXT_PUBLIC_SUPABASE_URL

# Count variables (should be 20+ for full setup)
netlify env:list | wc -l
```

---

## Deployment Process

### First Deployment

```bash
# 1. Verify environment variables are set
netlify env:list

# 2. Run security verification
chmod +x scripts/verify-build-security.sh
./scripts/verify-build-security.sh

# 3. Commit any changes
git add .
git commit -m "Configure Netlify deployment"
git push origin main

# 4. Monitor deployment
netlify open

# Or watch logs in terminal
netlify watch
```

### Subsequent Deployments

Standard git workflow triggers automatic deployments:

```bash
# 1. Make changes
# 2. Verify security
./scripts/verify-build-security.sh

# 3. Commit and push
git add .
git commit -m "Your commit message"
git push

# Deployment happens automatically
```

### Manual Deployment

```bash
# Build and deploy production
netlify deploy --prod

# Deploy specific directory
netlify deploy --prod --dir=.next

# Skip build (use existing .next)
netlify deploy --prod --skip-build
```

### Deploy Contexts

Netlify supports different deployment contexts:

#### Production

- Triggered by: Push to `main` branch
- URL: `https://your-site.netlify.app`
- Uses: `[context.production]` environment variables

#### Deploy Preview

- Triggered by: Pull requests
- URL: `https://deploy-preview-{PR-number}--your-site.netlify.app`
- Uses: `[context.deploy-preview]` environment variables

#### Branch Deploy

- Triggered by: Push to other branches
- URL: `https://{branch-name}--your-site.netlify.app`
- Uses: `[context.branch-deploy]` environment variables

---

## Verification

### Post-Deployment Checklist

```bash
# 1. Check deployment status
netlify status

# 2. Open deployed site
netlify open:site

# 3. Check function logs
netlify functions:log

# 4. Verify environment variables
netlify env:list | grep -E "SUPABASE|CLERK|STRIPE"
```

### Manual Testing

Visit these URLs:

```bash
# Homepage
https://your-site.netlify.app/

# Authentication
https://your-site.netlify.app/sign-in

# API health check (if implemented)
https://your-site.netlify.app/api/health

# Dashboard (requires auth)
https://your-site.netlify.app/dashboard
```

### Monitoring

Set up monitoring for:

1. **Netlify Deploy Notifications**
   - Site settings → Build & deploy → Deploy notifications
   - Enable email/Slack notifications for failed builds

2. **Sentry Error Tracking**
   - Visit https://sentry.io/projects/
   - Verify errors are being captured

3. **Function Logs**

   ```bash
   # Tail function logs in real-time
   netlify functions:log --follow
   ```

4. **Build Performance**
   - Site settings → Builds
   - Monitor build times and look for trends

---

## Maintenance

### Regular Tasks

#### Daily

- Monitor Netlify deploy logs for errors
- Check Sentry for new errors
- Verify critical functions are working

#### Weekly

- Review failed deployments
- Check function performance metrics
- Update dependencies if needed

#### Monthly

- Review and rotate API keys (every 90 days recommended)
- Audit environment variables
- Review Netlify analytics
- Check for security updates

### Key Rotation

When rotating keys (recommended every 90 days):

```bash
# 1. Generate new keys in each service
# 2. Update Netlify env vars
./scripts/netlify-env-update.sh

# 3. Deploy with new keys
netlify deploy --prod

# 4. Verify deployment
netlify open:site

# 5. Wait 24 hours, then revoke old keys
```

See [NETLIFY_SECURITY_GUIDE.md](./NETLIFY_SECURITY_GUIDE.md#key-rotation) for detailed key rotation process.

### Troubleshooting

For common issues, see [NETLIFY_TROUBLESHOOTING.md](./NETLIFY_TROUBLESHOOTING.md).

Quick diagnosis:

```bash
# Run comprehensive security check
./scripts/verify-build-security.sh

# Check Netlify build logs
netlify logs

# View function logs
netlify functions:log

# Check environment variables
netlify env:list
```

### Rollback

If a deployment fails:

```bash
# Option 1: Automatic rollback to previous deploy
netlify rollback

# Option 2: Manual rollback via UI
# Site settings → Deploys → [Previous deploy] → Publish deploy
```

---

## Security Best Practices

### Do's ✓

- ✓ Use environment variables for all secrets
- ✓ Run `verify-build-security.sh` before committing
- ✓ Rotate keys every 90 days
- ✓ Use different keys for development and production
- ✓ Enable 2FA on all service accounts
- ✓ Monitor deploy logs for secret detection warnings
- ✓ Keep `.netlifyignore` and `.gitignore` up to date

### Don'ts ✗

- ✗ Never commit `.env` files
- ✗ Never hardcode API keys in code
- ✗ Never share environment variables publicly
- ✗ Never use production keys in development
- ✗ Never bypass the pre-commit security check
- ✗ Never commit files with `secret` or `key` in the name

---

## Scripts Reference

### Security Verification

```bash
# Comprehensive security check
./scripts/verify-build-security.sh

# Pre-commit hook (automatic)
# Installed via husky, runs on every commit
```

### Environment Setup

```bash
# Interactive environment variable setup
./scripts/netlify-env-update.sh

# Set individual variable
netlify env:set VARIABLE_NAME "value"
```

### Deployment

```bash
# Deploy to production
netlify deploy --prod

# Deploy preview
netlify deploy

# Watch for changes and auto-deploy
netlify dev
```

---

## Additional Resources

### Documentation

- [Netlify Security Guide](./NETLIFY_SECURITY_GUIDE.md) - Comprehensive security configuration
- [Netlify Troubleshooting](./NETLIFY_TROUBLESHOOTING.md) - Common issues and solutions
- [Environment Variables Template](.env.example) - All required variables with examples

### Official Documentation

- [Netlify Documentation](https://docs.netlify.com/)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Netlify CLI](https://docs.netlify.com/cli/get-started/)

### Support

- Create an issue in the repository
- Netlify Support: https://www.netlify.com/support/
- Community Forum: https://answers.netlify.com/

---

## Quick Reference Commands

```bash
# Setup
netlify login                    # Login to Netlify
netlify init                     # Create new site
netlify link                     # Link to existing site

# Environment Variables
netlify env:list                 # List all variables
netlify env:set KEY "value"      # Set variable
netlify env:get KEY              # Get variable value
netlify env:unset KEY            # Delete variable

# Deployment
netlify deploy --prod            # Deploy to production
netlify deploy                   # Deploy preview
netlify rollback                 # Rollback to previous

# Monitoring
netlify status                   # Check site status
netlify open                     # Open Netlify dashboard
netlify open:site                # Open deployed site
netlify functions:log            # View function logs

# Development
netlify dev                      # Local development server
netlify watch                    # Watch for changes

# Security
./scripts/verify-build-security.sh       # Run security checks
./scripts/netlify-env-update.sh          # Update environment variables
```

---

**Last Updated**: October 2024
**Version**: 1.0.0

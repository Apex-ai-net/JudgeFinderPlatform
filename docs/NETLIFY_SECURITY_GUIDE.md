# Netlify Security Configuration Guide

## Table of Contents

1. [Overview](#overview)
2. [Secret Scanner Configuration](#secret-scanner-configuration)
3. [Environment Variables Setup](#environment-variables-setup)
4. [Deployment Best Practices](#deployment-best-practices)
5. [Troubleshooting](#troubleshooting)
6. [Security Checklist](#security-checklist)
7. [Key Rotation](#key-rotation)

---

## Overview

This guide explains how to properly configure Netlify deployments for the JudgeFinder Platform to prevent secret detection errors and maintain security best practices.

### Key Security Principles

1. **Never commit secrets** - All API keys and sensitive values must be stored in Netlify environment variables
2. **Use public variables correctly** - Only `NEXT_PUBLIC_*` prefixed variables are safe for client-side use
3. **Exclude build artifacts** - Configure `.netlifyignore` to prevent uploading unnecessary files
4. **Configure secret scanner** - Tell Netlify which paths and keys to ignore during scanning

---

## Secret Scanner Configuration

Netlify automatically scans your codebase for potential secrets during deployment. We've configured the scanner to prevent false positives while maintaining security.

### Understanding SECRETS_SCAN_OMIT_PATHS

Located in `netlify.toml`, this configuration tells Netlify which paths to skip during secret scanning:

```toml
SECRETS_SCAN_OMIT_PATHS = ".netlify/**,.next/**,node_modules/**,..."
```

#### Why Each Path is Excluded

| Path              | Reason                                                 |
| ----------------- | ------------------------------------------------------ |
| `.netlify/**`     | Netlify's internal build artifacts                     |
| `.next/**`        | Next.js build output (may contain bundled public keys) |
| `node_modules/**` | Third-party dependencies (not our code)                |
| `.git/**`         | Git repository metadata                                |
| `coverage/**`     | Test coverage reports                                  |
| `*.tsbuildinfo`   | TypeScript incremental compilation cache               |
| `.eslintcache`    | ESLint cache file                                      |
| `reports/**`      | Generated analysis reports                             |
| `*.log`           | Log files from build process                           |

### Understanding SECRETS_SCAN_OMIT_KEYS

This configuration tells Netlify which environment variable names are intentionally public:

```toml
SECRETS_SCAN_OMIT_KEYS = "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,..."
```

#### Why Each Key is Public

| Key                                  | Reason                                                      |
| ------------------------------------ | ----------------------------------------------------------- |
| `NEXT_PUBLIC_*`                      | Next.js convention - intentionally exposed to browser       |
| `NEXT_PUBLIC_SUPABASE_URL`           | Public project URL, not sensitive                           |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`      | Public anonymous key, protected by Row Level Security (RLS) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`  | Clerk's public key, safe for client-side                    |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe's public key for checkout                            |
| `ADMIN_USER_IDS`                     | Clerk user IDs (publicly visible in UI, not sensitive)      |
| `NODE_VERSION`                       | Build configuration, not sensitive                          |

### What Should NEVER Be Public

These keys must ONLY be in Netlify environment variables, never in code:

- `SUPABASE_SERVICE_ROLE_KEY` - Bypasses Row Level Security
- `CLERK_SECRET_KEY` - Server-side authentication
- `STRIPE_SECRET_KEY` - Payment processing
- `OPENAI_API_KEY` - AI service billing
- `GOOGLE_AI_API_KEY` - AI service billing
- `UPSTASH_REDIS_REST_TOKEN` - Database access
- `ENCRYPTION_KEY` - Data encryption
- `SYNC_API_KEY` - Internal API authentication
- `CRON_SECRET` - Scheduled function authentication
- `SENTRY_AUTH_TOKEN` - Source map upload authentication

---

## Environment Variables Setup

### Method 1: Using the Netlify CLI (Recommended)

We provide a script that guides you through setting all environment variables:

```bash
# 1. Install Netlify CLI
npm install -g netlify-cli

# 2. Login to Netlify
netlify login

# 3. Link your local repository to Netlify site
netlify link

# 4. Run the environment setup script
chmod +x scripts/netlify-env-update.sh
./scripts/netlify-env-update.sh
```

The script will:

- Prompt you for each required variable
- Provide instructions on where to get values
- Automatically set variables in Netlify
- Validate your configuration

### Method 2: Using the Netlify UI

1. Go to your site in Netlify Dashboard
2. Navigate to **Site configuration** → **Environment variables**
3. Click **Add a variable**
4. Choose **scopes**: `production`, `deploy-preview`, and/or `branch-deploy`

### Required Variables

#### Critical (Application Won't Start Without These)

```bash
# Database
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
SUPABASE_JWT_SECRET=your-jwt-secret

# Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...

# External APIs
COURTLISTENER_API_KEY=your-api-key

# Cache & Rate Limiting
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=AYourToken...

# Security
SYNC_API_KEY=base64-random-string
CRON_SECRET=base64-random-string
ENCRYPTION_KEY=base64-random-string

# Admin
ADMIN_USER_IDS=user_abc123,user_def456
```

#### Recommended (For Full Functionality)

```bash
# AI Services
OPENAI_API_KEY=sk-proj-...
GOOGLE_AI_API_KEY=AIzaSy...

# Payments
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...

# Monitoring
SENTRY_DSN=https://key@org.ingest.sentry.io/project
NEXT_PUBLIC_SENTRY_DSN=https://key@org.ingest.sentry.io/project
```

#### Optional (Enhanced Features)

```bash
# Analytics
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
NEXT_PUBLIC_POSTHOG_KEY=phc_...

# SEO Verification
NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=your-code
NEXT_PUBLIC_BING_SITE_VERIFICATION=your-code

# Feature Flags
ENABLE_BETA_FEATURES=false
DEBUG_MODE=false
MAINTENANCE_MODE=false
```

### Generating Secure Random Keys

For internal security keys (SYNC_API_KEY, CRON_SECRET, ENCRYPTION_KEY):

```bash
# On macOS/Linux
openssl rand -base64 32

# On Windows (PowerShell)
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))

# On Windows (Git Bash)
openssl rand -base64 32
```

---

## Deployment Best Practices

### Pre-Deployment Checklist

Run our security verification script before every deployment:

```bash
chmod +x scripts/verify-build-security.sh
./scripts/verify-build-security.sh
```

This checks for:

- ✓ No `.env` files committed
- ✓ No secrets in codebase
- ✓ Required environment variables present
- ✓ Proper `.gitignore` and `.netlifyignore` configuration
- ✓ No secrets in build artifacts
- ✓ Proper Netlify configuration

### Secure Deployment Workflow

```bash
# 1. Verify security
./scripts/verify-build-security.sh

# 2. Commit changes (only if verification passes)
git add .
git commit -m "Your commit message"

# 3. Push to trigger Netlify deployment
git push origin main
```

### Context-Specific Deployments

Netlify supports different contexts with different configurations:

#### Production

```toml
[context.production]
  command = "npm run build:production"
```

Used for: Main production deployment (judgefinder.io)

#### Deploy Preview

```toml
[context.deploy-preview]
  command = "npm run build"
```

Used for: Pull request previews

#### Branch Deploy

```toml
[context.branch-deploy]
  command = "npm run build"
```

Used for: Branch-specific deployments (e.g., staging)

You can set different environment variables for each context in Netlify UI.

---

## Troubleshooting

### Issue: "Secret detected in build"

**Symptom**: Netlify fails deployment with secret detection error

**Solutions**:

1. **Identify the detected secret**:
   - Check Netlify build logs for the exact file and pattern
   - Determine if it's a real secret or false positive

2. **If it's a real secret**:

   ```bash
   # Remove from code
   git rm --cached path/to/file

   # Add to .gitignore
   echo "path/to/file" >> .gitignore

   # Move value to Netlify environment variable
   netlify env:set SECRET_NAME "secret_value"
   ```

3. **If it's a false positive (public key)**:
   - Add to `SECRETS_SCAN_OMIT_KEYS` in `netlify.toml`
   - Or add the file path to `SECRETS_SCAN_OMIT_PATHS`

4. **Common false positives**:
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Public key, add to OMIT_KEYS
   - `ADMIN_USER_IDS` - Clerk user IDs, not sensitive
   - Build artifacts in `.next/` - Already in OMIT_PATHS

### Issue: "Environment variable not found"

**Symptom**: Build succeeds but app crashes at runtime

**Solutions**:

1. **Verify variable is set**:

   ```bash
   netlify env:list
   ```

2. **Check variable scope**:
   - Ensure it's set for the correct context (production/deploy-preview/branch-deploy)
   - Variables are case-sensitive

3. **Check variable name**:
   - Client-side variables MUST start with `NEXT_PUBLIC_`
   - Server-side variables must NOT have this prefix

4. **Re-deploy**:
   ```bash
   netlify deploy --prod --trigger
   ```

### Issue: "Build artifacts contain secrets"

**Symptom**: Verification script detects secrets in `.next/` directory

**Solutions**:

1. **Identify the source**:
   - Search your codebase for direct usage of `process.env.SECRET_KEY`
   - Check if you're using server-side secrets in client components

2. **Fix client component usage**:

   ```typescript
   // ❌ WRONG - Server secret in client component
   'use client'
   const secret = process.env.STRIPE_SECRET_KEY

   // ✓ CORRECT - Use API route
   ;('use client')
   const response = await fetch('/api/checkout')
   ```

3. **Fix server component usage**:
   ```typescript
   // ✓ CORRECT - Server component can use secrets
   const secret = process.env.STRIPE_SECRET_KEY
   // But ensure this component is NOT imported by client components
   ```

### Issue: "Netlify function timeout"

**Symptom**: Functions exceed 10-second timeout

**Solutions**:

1. **Increase timeout in netlify.toml**:

   ```toml
   [functions]
     [functions.timeout]
       api = 26  # Max 26 seconds for standard functions
   ```

2. **Use background functions for long tasks**:
   - Background functions can run up to 15 minutes
   - Move long-running tasks to `/netlify/functions-background/`

### Issue: "Module not found in production"

**Symptom**: Build succeeds locally but fails on Netlify

**Solutions**:

1. **Check devDependencies**:
   - Netlify installs devDependencies by default with `NPM_FLAGS = "--include=dev"`
   - Verify this is set in `netlify.toml`

2. **Clear build cache**:
   - In Netlify UI: Site configuration → Build & deploy → Clear cache and retry

3. **Check Node version**:
   ```toml
   [build.environment]
     NODE_VERSION = "20"
   ```

---

## Security Checklist

### Before Every Deployment

- [ ] Run `./scripts/verify-build-security.sh`
- [ ] No `.env` files committed or staged
- [ ] All secrets moved to Netlify environment variables
- [ ] `.gitignore` and `.netlifyignore` properly configured
- [ ] Build completes successfully locally
- [ ] No hardcoded API keys in codebase

### Environment Variables

- [ ] All required variables set in Netlify UI
- [ ] Variables scoped to correct contexts (production/preview/branch)
- [ ] Public variables use `NEXT_PUBLIC_` prefix
- [ ] Server variables do NOT use `NEXT_PUBLIC_` prefix
- [ ] Secure random keys generated properly (32+ characters)

### Netlify Configuration

- [ ] `netlify.toml` exists and properly configured
- [ ] `SECRETS_SCAN_OMIT_PATHS` includes all necessary paths
- [ ] `SECRETS_SCAN_OMIT_KEYS` includes only truly public keys
- [ ] Build command configured correctly
- [ ] Function timeouts configured appropriately

### Code Review

- [ ] No `process.env.SECRET_KEY` in client components
- [ ] API routes properly authenticate requests
- [ ] RLS policies configured in Supabase
- [ ] Rate limiting implemented for API routes
- [ ] Error messages don't expose sensitive data

---

## Key Rotation

### When to Rotate Keys

- **Immediately**: If a key is exposed or committed to version control
- **Regularly**: Every 90 days for production keys
- **After staff changes**: When team members with key access leave

### Rotation Process

1. **Generate new keys** in each service:
   - Supabase: Project Settings → API → Regenerate keys
   - Clerk: Dashboard → API Keys → Rotate keys
   - Stripe: Dashboard → Developers → API keys → Create new
   - OpenAI: Platform → API keys → Create new key
   - Google AI: Create new API key
   - Upstash: Create new token

2. **Update Netlify environment variables**:

   ```bash
   # Use the update script
   ./scripts/netlify-env-update.sh

   # Or update individually
   netlify env:set KEY_NAME "new_value"
   ```

3. **Update webhook secrets**:
   - Stripe: Update webhook endpoint with new secret
   - Clerk: Update webhook endpoints if rotating Clerk keys

4. **Deploy with new keys**:

   ```bash
   netlify deploy --prod
   ```

5. **Verify deployment**:
   - Check Netlify logs for errors
   - Test critical functionality
   - Monitor error rates in Sentry

6. **Revoke old keys**:
   - **Wait 24 hours** after successful deployment
   - Delete old keys from each service
   - Document rotation in key management system

### Emergency Key Rotation

If a key is compromised:

1. **Immediately revoke** the exposed key in the service
2. **Generate new key** and update Netlify
3. **Force redeploy**: `netlify deploy --prod --trigger`
4. **Monitor** for unauthorized access attempts
5. **Review** how the exposure occurred and prevent recurrence

---

## Additional Resources

### Official Documentation

- [Netlify Environment Variables](https://docs.netlify.com/environment-variables/overview/)
- [Netlify File-Based Configuration](https://docs.netlify.com/configure-builds/file-based-configuration/)
- [Netlify Secret Scanner](https://docs.netlify.com/security/secret-scanning/)
- [Next.js Environment Variables](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)

### Related Documentation

- `.env.example` - Template for local development environment
- `netlify.toml` - Netlify deployment configuration
- `.netlifyignore` - Files excluded from deployment
- `scripts/netlify-env-update.sh` - Environment setup script
- `scripts/verify-build-security.sh` - Pre-deployment verification

### Getting Help

1. **Check Netlify build logs**: Site → Deploys → [Failed deploy] → Deploy log
2. **Netlify Support**: [https://www.netlify.com/support/](https://www.netlify.com/support/)
3. **Community Forum**: [https://answers.netlify.com/](https://answers.netlify.com/)
4. **Project Issues**: Create an issue in the repository with:
   - Error message from Netlify logs
   - Steps to reproduce
   - Results from `verify-build-security.sh`

---

## Version History

| Version | Date       | Changes                              |
| ------- | ---------- | ------------------------------------ |
| 1.0.0   | 2024-10-09 | Initial comprehensive security guide |

---

**Last Updated**: October 2024
**Maintained By**: JudgeFinder Platform Team

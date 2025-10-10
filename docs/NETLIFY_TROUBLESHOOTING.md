# Netlify Deployment Troubleshooting Guide

Quick reference for common Netlify deployment issues and their solutions.

## Quick Diagnosis

```bash
# Run this first to identify issues
./scripts/verify-build-security.sh
```

---

## Common Error Messages

### 1. "Secret detected in build"

**Error Message**:

```
Build failed due to a secret detected in build output
Detected pattern: sk_live_xxxxxxxxxx
```

**Quick Fix**:

```bash
# 1. Find the file containing the secret
grep -r "sk_live_" . --exclude-dir={node_modules,.next,.git}

# 2. Remove from git
git rm --cached path/to/file
echo "path/to/file" >> .gitignore

# 3. Set as environment variable
netlify env:set SECRET_NAME "secret_value"

# 4. Redeploy
git commit -am "Remove hardcoded secret"
git push
```

**If it's a false positive (public key)**:

Add to `netlify.toml`:

```toml
SECRETS_SCAN_OMIT_KEYS = "existing_keys,NEW_PUBLIC_KEY_NAME"
```

---

### 2. "Module not found: Can't resolve 'X'"

**Error Message**:

```
Module not found: Can't resolve '@supabase/supabase-js'
```

**Quick Fix**:

```bash
# Verify package is in package.json
npm install @supabase/supabase-js --save

# Commit and push
git add package.json package-lock.json
git commit -m "Add missing dependency"
git push
```

**If package is in devDependencies**:

Ensure `netlify.toml` has:

```toml
[build.environment]
  NPM_FLAGS = "--include=dev"
```

---

### 3. "NEXT_PUBLIC_X is undefined"

**Error Message**:

```
ReferenceError: NEXT_PUBLIC_SUPABASE_URL is undefined
```

**Quick Fix**:

```bash
# 1. Set in Netlify
netlify env:set NEXT_PUBLIC_SUPABASE_URL "https://your-project.supabase.co"

# 2. Verify it's set
netlify env:list

# 3. Trigger redeploy
netlify deploy --prod --trigger
```

**Common mistake**: Variable name must start with `NEXT_PUBLIC_` for client-side use.

---

### 4. "Function invocation timed out"

**Error Message**:

```
Function timed out after 10 seconds
```

**Quick Fix**:

Add to `netlify.toml`:

```toml
[functions]
  [functions.timeout]
    api = 26  # Max for standard functions
```

**For long-running tasks**:

- Move to background functions: `netlify/functions-background/`
- Background functions can run up to 15 minutes

---

### 5. "Build script returned non-zero exit code: 1"

**Error Message**:

```
Build script returned non-zero exit code: 1
```

**Quick Fix**:

```bash
# 1. Test build locally
npm run build

# 2. Check for TypeScript errors
npm run type-check

# 3. Check for linting errors
npm run lint

# 4. Review build logs in Netlify for specific error
```

**Common causes**:

- TypeScript type errors
- Missing environment variables
- Import path errors
- Linting errors in strict mode

---

### 6. "Error: No such file or directory"

**Error Message**:

```
ENOENT: no such file or directory, open '.env.local'
```

**Quick Fix**:

This usually means your build script expects `.env.local` but it's not uploaded (correct behavior).

**Solution**: Remove the script that reads `.env.local` during build, or make it optional:

```javascript
// Before
const envConfig = require('dotenv').config({ path: '.env.local' })

// After
const envConfig = require('dotenv').config({ path: '.env.local' })
if (envConfig.error && process.env.NODE_ENV !== 'production') {
  console.warn('.env.local not found')
}
```

---

### 7. "Cannot read properties of undefined"

**Error Message**:

```
TypeError: Cannot read properties of undefined (reading 'SUPABASE_SERVICE_ROLE_KEY')
```

**Quick Fix**:

```bash
# 1. Verify variable is set in Netlify
netlify env:list | grep SUPABASE_SERVICE_ROLE_KEY

# 2. If missing, set it
netlify env:set SUPABASE_SERVICE_ROLE_KEY "your-key"

# 3. Check that you're accessing it correctly
# Server component/API route
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

# NOT in client component (will be undefined)
```

---

### 8. "Authentication failed"

**Error Message**:

```
Error: Authentication failed for Clerk/Supabase/etc.
```

**Quick Fix**:

```bash
# 1. Verify all auth-related env vars are set
netlify env:list | grep CLERK
netlify env:list | grep SUPABASE

# 2. Check if keys are correct (not test keys in production)
# Clerk: Should use pk_live_ and sk_live_ for production
# Stripe: Should use pk_live_ and sk_live_ for production

# 3. Verify keys match between services
# NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY should match CLERK_SECRET_KEY project
```

---

### 9. ".netlifyignore ignored in build"

**Symptom**: Files you excluded in `.netlifyignore` are still being deployed

**Quick Fix**:

```bash
# 1. Verify .netlifyignore is in root directory
ls -la .netlifyignore

# 2. Check .netlifyignore syntax (no leading slashes for patterns)
# Good:
.env
.env.*
node_modules/

# Bad:
/.env
/.env.*
/node_modules/

# 3. Clear Netlify cache
# In Netlify UI: Site configuration → Clear cache and retry
```

---

### 10. "Rate limit exceeded"

**Error Message**:

```
Error: Rate limit exceeded for API X
```

**Quick Fix**:

Check if you have rate limiting configured:

```typescript
// Should have rate limiting in API routes
import { rateLimit } from '@/lib/rate-limit'

export async function GET(request: Request) {
  const identifier = getClientIdentifier(request)
  const { success } = await rateLimit.limit(identifier)

  if (!success) {
    return new Response('Rate limit exceeded', { status: 429 })
  }

  // ... rest of handler
}
```

**For external APIs**:

- Check API quota in service dashboard
- Implement exponential backoff in API calls
- Add caching to reduce API calls

---

## Deployment Verification Checklist

After deployment, verify:

```bash
# 1. Check deployment status
netlify status

# 2. View recent deploy
netlify open:site

# 3. Check function logs
netlify functions:log

# 4. Monitor for errors
# Check Sentry dashboard
# Check Netlify deploy logs
```

### Quick Health Check

Visit these URLs after deployment:

```bash
https://your-site.netlify.app/          # Homepage
https://your-site.netlify.app/api/health  # API health check (if implemented)
https://your-site.netlify.app/sign-in    # Auth check
```

---

## Environment Variable Issues

### Debug Environment Variables

```bash
# List all environment variables
netlify env:list

# Get specific variable
netlify env:get VARIABLE_NAME

# Set variable for all contexts
netlify env:set VARIABLE_NAME "value"

# Set for specific context
netlify env:set VARIABLE_NAME "value" --context production
netlify env:set VARIABLE_NAME "value" --context deploy-preview
netlify env:set VARIABLE_NAME "value" --context branch-deploy

# Delete variable
netlify env:unset VARIABLE_NAME
```

### Common Environment Variable Mistakes

| Issue                          | Problem                       | Solution                                            |
| ------------------------------ | ----------------------------- | --------------------------------------------------- |
| Client variable not accessible | Missing `NEXT_PUBLIC_` prefix | Rename to `NEXT_PUBLIC_VARIABLE`                    |
| Server variable exposed        | Has `NEXT_PUBLIC_` prefix     | Remove prefix, use in server-only code              |
| Variable not found             | Wrong context scope           | Set for correct context (production/preview/branch) |
| Old value still used           | Cache not cleared             | Clear cache or trigger new deploy                   |

---

## Build Performance Issues

### Slow Builds

```toml
# In netlify.toml, add caching
[build]
  command = "npm run build"

[build.environment]
  # Enable caching
  NPM_CONFIG_CACHE = ".npm-cache"
  NEXT_TELEMETRY_DISABLED = "1"
```

### Out of Memory

```toml
[build.environment]
  NODE_OPTIONS = "--max_old_space_size=4096"
```

---

## Network Issues

### External API Timeouts

```javascript
// Add timeout to fetch calls
const controller = new AbortController()
const timeout = setTimeout(() => controller.abort(), 5000)

try {
  const response = await fetch(url, {
    signal: controller.signal,
    headers: { ... }
  })
} finally {
  clearTimeout(timeout)
}
```

### Database Connection Issues

```javascript
// Verify Supabase connection
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Test connection
const { data, error } = await supabase.from('test').select('count')
if (error) console.error('Database connection failed:', error)
```

---

## Secret Scanner Deep Dive

### Understanding Secret Patterns

Netlify scans for these patterns:

| Pattern     | Service        | Example               |
| ----------- | -------------- | --------------------- |
| `sk_live_*` | Stripe         | `sk_live_51ABC...`    |
| `sk_test_*` | Stripe         | `sk_test_51ABC...`    |
| `pk_live_*` | Stripe         | `pk_live_51ABC...`    |
| `whsec_*`   | Stripe Webhook | `whsec_ABC123...`     |
| `sk-proj-*` | OpenAI         | `sk-proj-ABC123...`   |
| `AIzaSy*`   | Google         | `AIzaSyABC123...`     |
| `eyJhbG...` | JWT tokens     | Base64 encoded tokens |

### Safely Excluding Patterns

**Only exclude if**:

1. It's a public key (e.g., `NEXT_PUBLIC_*`)
2. It's not sensitive (e.g., `ADMIN_USER_IDS`)
3. It's in a build artifact path

**Never exclude**:

1. Server-side API keys
2. Database credentials
3. Encryption keys
4. Webhook secrets

---

## Getting More Help

### Gather Debug Information

```bash
# 1. Get build log
netlify deploy --build --debug > build-debug.log 2>&1

# 2. Get environment info
netlify env:list > env-list.txt

# 3. Run security verification
./scripts/verify-build-security.sh > security-check.txt

# 4. Check git status
git status > git-status.txt
```

### Create Support Ticket

Include:

1. Build log or specific error message
2. `netlify.toml` configuration
3. Relevant environment variables (names only, not values)
4. Steps to reproduce
5. Expected vs. actual behavior

### Community Resources

- Netlify Community Forum: https://answers.netlify.com/
- Netlify Status: https://www.netlifystatus.com/
- Next.js Discord: https://discord.gg/nextjs

---

## Emergency Procedures

### Complete Deployment Failure

```bash
# 1. Roll back to previous deploy
netlify rollback

# 2. Identify what changed
git diff HEAD~1

# 3. Fix the issue
# ... make changes ...

# 4. Test locally
npm run build
npm run start

# 5. Redeploy
git add .
git commit -m "Fix: deployment issue"
git push
```

### Secret Exposed in Build

```bash
# 1. IMMEDIATELY revoke the exposed key in the service
# (Stripe, Clerk, OpenAI, etc.)

# 2. Generate new key

# 3. Update Netlify env
netlify env:set SECRET_NAME "new_value"

# 4. Remove from code if committed
git rm --cached path/to/file
git commit -m "Remove exposed secret"
git push

# 5. Monitor for unauthorized access
# Check service logs, Sentry, etc.
```

---

**Last Updated**: October 2024

# Scripts Directory

This directory contains utility scripts for the JudgeFinder platform. Scripts are organized by category for easier navigation and maintenance.

## Quick Reference

```bash
# Development
npm run dev              # Start dev server
npm run setup            # Install deps and validate env
npm run validate:env     # Validate environment variables

# Production
npm run build:production # Production build
npm run backup-database  # Backup database

# Data Management
npm run sync:courts      # Sync court data
npm run sync:judges      # Sync judge data
npm run analytics:generate # Generate analytics

# Diagnostics & Troubleshooting
npm run diagnose:analytics # Comprehensive analytics diagnostics
npm run data:status      # Overall data quality check
```

## Categories

### Production Scripts

Critical scripts for production deployment and monitoring.

- **backup-database.sh** - Database backup with timestamp

  ```bash
  npm run backup-database
  ```

  Requires: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

- **cleanup-production-data.ts** - Clean up production data issues

  ```bash
  npm run cleanup-production-data
  ```

  Requires: Production database credentials

- **validate-production-data.ts** - Validate production data integrity

  ```bash
  npm run validate-production-data
  ```

  Requires: Production database credentials

- **notify-deployment.ts** - Send deployment notifications

  ```bash
  ts-node scripts/notify-deployment.ts
  ```

  Requires: `SLACK_WEBHOOK_URL` or notification service credentials

- **verify-deployment.sh** - Verify successful deployment

  ```bash
  bash scripts/verify-deployment.sh
  ```

- **rotate-api-keys.sh** - Rotate API keys securely
  ```bash
  bash scripts/rotate-api-keys.sh
  ```
  Requires: Admin access to API key management

### Migration Scripts

Database migration and schema management.

- **apply-migrations.ts** - Apply pending migrations

  ```bash
  ts-node scripts/apply-migrations.ts
  ```

- **apply-migrations-direct.ts** - Direct migration application

  ```bash
  ts-node scripts/apply-migrations-direct.ts
  ```

- **apply-migrations-manually.sql** - Manual migration SQL
  Execute manually in database client

- **apply-via-api.ts** - Apply migrations via API

  ```bash
  ts-node scripts/apply-via-api.ts
  ```

- **test-migration.ts** - Test migration safety

  ```bash
  npm run test-migration
  ```

- **verify-migrations.ts** - Verify migration state

  ```bash
  ts-node scripts/verify-migrations.ts
  ```

- **analyze-migration-state.js** - Analyze current migration status
  ```bash
  node scripts/analyze-migration-state.js
  ```

### Data Sync Scripts

Synchronize data from external sources.

- **sync-courts-manual.js** - Manually sync court data

  ```bash
  npm run sync:courts
  ```

  Requires: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

- **sync-judges-manual.js** - Manually sync judge data

  ```bash
  npm run sync:judges
  ```

- **sync-decisions-manual.js** - Sync decision data

  ```bash
  npm run sync:decisions
  ```

- **sync-courtlistener-judges.js** - Sync from CourtListener API

  ```bash
  node scripts/sync-courtlistener-judges.js
  ```

  Requires: `COURTLISTENER_API_KEY`

- **trigger-judges-sync.js** - Trigger judge data sync

  ```bash
  node scripts/trigger-judges-sync.js
  ```

- **run-daily-sync.js** - Daily automated sync (cron)

  ```bash
  npm run cron:daily
  ```

- **run-weekly-sync.js** - Weekly automated sync (cron)
  ```bash
  npm run cron:weekly
  ```

### Import Scripts

Import data from various sources.

- **import-all-ca-courts.js** - Import California courts

  ```bash
  node scripts/import-all-ca-courts.js
  ```

- **import-all-ca-judges.js** - Import California judges

  ```bash
  node scripts/import-all-ca-judges.js
  ```

- **import-us-federal-judges.js** - Import federal judges

  ```bash
  npm run import:federal
  ```

  Requires: Federal judiciary data source access

- **import-wcab-judges.js** - Import WCAB judges
  ```bash
  npm run import:wcab
  ```

### Analytics Scripts

Generate and analyze judicial analytics.

- **diagnose-analytics-issues.js** - Comprehensive analytics diagnostics

  ```bash
  npm run diagnose:analytics
  ```

  **Features:**
  - Environment variable validation
  - Database connectivity testing
  - Judge data quality analysis
  - Analytics cache verification
  - Redis connectivity test
  - Actionable recommendations

  **Usage Examples:**

  ```bash
  # General diagnostics
  npm run diagnose:analytics

  # Check specific judge
  npm run diagnose:analytics -- --judge-id abc123-def456-ghi789

  # Sample more judges (default: 10)
  npm run diagnose:analytics -- --sample-size 25

  # Verbose output
  npm run diagnose:analytics -- --verbose
  ```

  **What It Checks:**
  - ✓ Environment variables (Supabase, Redis, AI keys)
  - ✓ Database schema and table access
  - ✓ Judge case counts and data quality
  - ✓ Analytics cache status
  - ✓ Sample sizes per metric
  - ✓ Redis caching functionality

  See [DIAGNOSTICS.md](./DIAGNOSTICS.md) for detailed documentation.

- **batch-generate-analytics.js** - Batch analytics generation

  ```bash
  npm run analytics:generate
  ```

  Requires: Database access with analytics tables

- **run-bias-analysis.js** - Run bias pattern analysis

  ```bash
  npm run bias:analyze
  ```

- **test-analytics-modules.ts** - Test analytics modules

  ```bash
  npm run test:analytics:modules
  ```

- **test-analytics-endpoints.js** - Test analytics API endpoints
  ```bash
  npm run test:analytics:endpoints
  ```

### Database Management

Database integrity, validation, and maintenance.

- **database-integrity-check.js** - Full integrity check

  ```bash
  npm run integrity:full
  ```

- **run-validation.js** - Validate data relationships

  ```bash
  npm run validate:relationships
  ```

- **validate-court-judge-relationships.js** - Validate court-judge links

  ```bash
  node scripts/validate-court-judge-relationships.js
  ```

- **comprehensive-case-judge-linking.js** - Link cases to judges

  ```bash
  node scripts/comprehensive-case-judge-linking.js
  ```

- **link-cases-to-judges.js** - Simple case-judge linking

  ```bash
  node scripts/link-cases-to-judges.js
  ```

- **redistribute-cases-evenly.js** - Redistribute case assignments

  ```bash
  node scripts/redistribute-cases-evenly.js
  ```

- **production-redistribute.js** - Production case redistribution

  ```bash
  node scripts/production-redistribute.js
  ```

- **final-production-redistribute.js** - Final redistribution pass

  ```bash
  node scripts/final-production-redistribute.js
  ```

- **fast-redistribute.js** - Fast redistribution algorithm

  ```bash
  node scripts/fast-redistribute.js
  ```

- **automated-assignment-updater.js** - Automated case assignment updates
  ```bash
  npm run assignments:update
  ```

### Database Inspection

Scripts for inspecting database state and schema.

- **check-data-status.js** - Check current data status

  ```bash
  npm run data:status
  ```

- **check-schema.js** - Inspect database schema

  ```bash
  node scripts/check-schema.js
  ```

- **deep-schema-check.js** - Deep schema validation

  ```bash
  node scripts/deep-schema-check.js
  ```

- **check-tables-exist.mjs** - Verify table existence

  ```bash
  node scripts/check-tables-exist.mjs
  ```

- **check-actual-users.mjs** - Check actual user records

  ```bash
  node scripts/check-actual-users.mjs
  ```

- **check-rls-errors.mjs** - Check RLS policy errors

  ```bash
  node scripts/check-rls-errors.mjs
  ```

- **verify-database.mjs** - Comprehensive database verification

  ```bash
  node scripts/verify-database.mjs
  ```

- **verify-table-access.mjs** - Verify table access permissions

  ```bash
  node scripts/verify-table-access.mjs
  ```

- **verify-table-details.mjs** - Verify table structure details

  ```bash
  node scripts/verify-table-details.mjs
  ```

- **list-all-accessible-tables.mjs** - List all accessible tables

  ```bash
  node scripts/list-all-accessible-tables.mjs
  ```

- **find-migration-table.mjs** - Find migration tracking table

  ```bash
  node scripts/find-migration-table.mjs
  ```

- **analyze-db-direct.js** - Direct database analysis

  ```bash
  node scripts/analyze-db-direct.js
  ```

- **fix-table-access.mjs** - Fix table access issues
  ```bash
  node scripts/fix-table-access.mjs
  ```

### Testing Scripts

Testing utilities and data quality checks.

- **test-data-quality.ts** - Test data quality metrics

  ```bash
  ts-node scripts/test-data-quality.ts
  ```

- **validate-normalization.cjs** - Test name normalization

  ```bash
  npm run test:normalization
  ```

- **audit-court-slugs.ts** - Audit court slug generation
  ```bash
  npm run audit:court-slugs
  ```

### Development Tools

Development utilities and code generation.

- **template-copy.mjs** - Copy code templates

  ```bash
  npm run template:api        # API route template
  npm run template:component  # Component template
  npm run template:sync       # Sync script template
  ```

- **generate-pwa-icons.js** - Generate PWA icons

  ```bash
  node scripts/generate-pwa-icons.js
  ```

- **generate-social-images.js** - Generate social media images

  ```bash
  node scripts/generate-social-images.js
  ```

- **test-mcp.js** - Test MCP integration
  ```bash
  npm run test:mcp
  ```

### Stripe Integration

Stripe payment and catalog management.

- **stripe/sync-catalog.ts** - Sync Stripe product catalog
  ```bash
  npm run stripe:sync-catalog
  ```
  Requires: `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`

### Legacy/Deprecated Scripts

Scripts kept for reference but may be outdated.

- **check-db-state.sql** - SQL query for DB state (run manually)
- **apply-search-fix-migration.js** - Specific search fix (one-time use)
- **production-redistribute-log-1757666481555.json** - Log file (artifact)

## Environment Variables

### Required for Development

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_key
CLERK_SECRET_KEY=your_clerk_secret

# OpenAI
OPENAI_API_KEY=your_openai_key

# Upstash Redis
UPSTASH_REDIS_REST_URL=your_upstash_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_token
```

### Required for Production

```bash
# All development variables plus:
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://judgefinder.io

# Sentry (optional but recommended)
SENTRY_DSN=your_sentry_dsn
SENTRY_AUTH_TOKEN=your_sentry_token

# Stripe
STRIPE_SECRET_KEY=your_stripe_secret
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable

# External APIs
COURTLISTENER_API_KEY=your_courtlistener_key
```

## Best Practices

1. **Always test scripts in development first** before running in production
2. **Backup the database** before running migration or redistribution scripts
3. **Monitor logs** when running sync scripts to catch errors early
4. **Use npm scripts** when available instead of calling scripts directly
5. **Check environment variables** are set before running scripts that require them

## Adding New Scripts

When adding a new script:

1. Place it in the appropriate subdirectory if it's part of a category (e.g., `stripe/`, `mcp/`)
2. Add an npm script in `package.json` if it will be run frequently
3. Document it in this README under the appropriate category
4. Include required environment variables
5. Add usage examples
6. Make it executable if it's a shell script: `chmod +x scripts/your-script.sh`

## Troubleshooting

### Common Issues

**Permission Denied**

```bash
chmod +x scripts/script-name.sh
```

**Module Not Found**

```bash
npm install  # Reinstall dependencies
```

**Environment Variables Missing**

```bash
npm run validate:env  # Check which variables are missing
```

**Database Connection Issues**

- Verify Supabase credentials in `.env.local`
- Check network connectivity
- Ensure RLS policies allow the operation

## Support

For issues with specific scripts, check the script's source code for inline documentation and error messages. Most scripts include helpful error messages that indicate what went wrong.

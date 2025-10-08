# Migration Safety Guide

## Overview

This guide provides comprehensive procedures for safely managing database migrations, performing rollbacks, and recovering from migration failures in the JudgeFinder platform.

## Table of Contents

1. [Pre-Migration Checklist](#pre-migration-checklist)
2. [Backup Procedures](#backup-procedures)
3. [Migration Testing](#migration-testing)
4. [Rollback Procedures](#rollback-procedures)
5. [Disaster Recovery](#disaster-recovery)
6. [Emergency Contacts](#emergency-contacts)

---

## Pre-Migration Checklist

Before applying any database migration to production, complete the following steps:

### 1. Validate Migration SQL

```bash
# Review migration file for syntax and logic errors
cat supabase/migrations/YYYYMMDD_migration_name.sql

# Check for destructive operations (DROP, DELETE, TRUNCATE)
grep -E "DROP|DELETE|TRUNCATE" supabase/migrations/YYYYMMDD_migration_name.sql
```

### 2. Create Database Backup

**CRITICAL: Always create a backup before migrations**

```bash
# Create full database backup
./scripts/backup-database.sh

# Verify backup was created
ls -lh backups/

# Expected output: judgefinder_backup_YYYYMMDD_HHMMSS.tar.gz
```

**Backup includes:**
- Full schema (tables, indexes, constraints, functions)
- All data from production tables
- Compressed archive with timestamp

### 3. Run Validation Script

```bash
# Run pre-launch validation
npm run validate-production-data

# Exit codes:
# 0 = All validations passed
# 1 = Critical issues found (blocking)
# 2 = Warnings found (review recommended)
```

**Do not proceed with migration if critical issues are found.**

### 4. Test Migration in Staging

```bash
# Run migration test in staging environment
npm run test-migration -- --url=$STAGING_DB_URL --key=$STAGING_SERVICE_KEY

# Exit codes:
# 0 = Test passed, safe to deploy
# 1 = Test failed, rollback performed
```

### 5. Schedule Maintenance Window

- **Recommended:** Apply migrations during low-traffic hours (2-4 AM UTC)
- **Notify team:** Send Slack notification to #engineering
- **Enable maintenance mode:** If migration affects user-facing features

---

## Backup Procedures

### Automated Daily Backups

Backups run automatically via cron job at 2 AM UTC:

```bash
# Cron schedule (in netlify.toml or vercel.json)
0 2 * * * ./scripts/backup-database.sh
```

### Manual Backup Creation

```bash
# Full backup (schema + data)
./scripts/backup-database.sh

# Schema only
./scripts/backup-database.sh --schema-only

# Data only
./scripts/backup-database.sh --data-only
```

### Backup Storage

- **Location:** `./backups/`
- **Retention:** Last 10 backups kept automatically
- **Off-site:** Backups should be copied to S3/Google Cloud Storage for disaster recovery

```bash
# Copy latest backup to S3
aws s3 cp backups/judgefinder_backup_latest.tar.gz \
  s3://judgefinder-backups/$(date +%Y%m%d)/
```

### Backup Verification

```bash
# Extract backup
tar -xzf backups/judgefinder_backup_YYYYMMDD_HHMMSS.tar.gz

# Check file size (should be > 1MB for production)
du -h backups/judgefinder_backup_YYYYMMDD_HHMMSS.tar.gz

# Verify backup metadata
cat backups/judgefinder_backup_YYYYMMDD_HHMMSS_metadata.json
```

---

## Migration Testing

### Testing in Staging Environment

1. **Set staging credentials:**

```bash
export SUPABASE_STAGING_URL="https://staging-project.supabase.co"
export SUPABASE_STAGING_SERVICE_KEY="staging-service-role-key"
```

2. **Run migration test:**

```bash
npm run test-migration

# The script will:
# - Take database snapshot
# - Apply pending migrations
# - Validate foreign key constraints
# - Check for data loss
# - Test query performance
# - Rollback on failure
```

3. **Review test report:**

```bash
cat migration-test-report.json
```

### Manual Testing Steps

If automated testing fails, perform manual validation:

```sql
-- 1. Check table counts before migration
SELECT 'judges' as table_name, COUNT(*) as count FROM judges
UNION ALL
SELECT 'courts', COUNT(*) FROM courts
UNION ALL
SELECT 'cases', COUNT(*) FROM cases;

-- 2. Apply migration manually
\i supabase/migrations/YYYYMMDD_migration_name.sql

-- 3. Verify counts match
SELECT 'judges' as table_name, COUNT(*) as count FROM judges
UNION ALL
SELECT 'courts', COUNT(*) FROM courts
UNION ALL
SELECT 'cases', COUNT(*) FROM cases;

-- 4. Test critical queries
SELECT j.name, c.name
FROM judges j
JOIN courts c ON j.court_id = c.id
LIMIT 10;
```

---

## Rollback Procedures

### Automated Rollback

If migration test fails, rollback is performed automatically. For manual rollback:

### 1. Immediate Rollback (within 5 minutes)

If migration just applied and system is unstable:

```bash
# 1. Restore from most recent backup
cd backups

# 2. Extract latest backup
LATEST_BACKUP=$(ls -t judgefinder_backup_*.tar.gz | head -1)
tar -xzf $LATEST_BACKUP

# 3. Restore to database
psql $SUPABASE_DB_URL < judgefinder_backup_*_full.sql

# 4. Verify restoration
psql $SUPABASE_DB_URL -c "SELECT COUNT(*) FROM judges;"
```

### 2. Rollback with Migration Script

If migration file includes rollback SQL:

```sql
-- Example rollback section in migration file
-- ROLLBACK COMMANDS:
-- DROP TABLE IF EXISTS new_table;
-- ALTER TABLE judges DROP COLUMN new_column;
```

```bash
# Extract rollback commands
grep -A 20 "ROLLBACK COMMANDS:" supabase/migrations/YYYYMMDD_migration_name.sql > rollback.sql

# Apply rollback
psql $SUPABASE_DB_URL < rollback.sql
```

### 3. Point-in-Time Recovery (Supabase)

Supabase Pro/Team plans support point-in-time recovery:

```bash
# Restore to specific timestamp (via Supabase Dashboard)
# 1. Go to Database > Backups
# 2. Select timestamp before migration
# 3. Click "Restore to this point"
```

### Rollback Verification Checklist

After rollback, verify:

- [ ] All tables exist and are accessible
- [ ] Record counts match pre-migration snapshot
- [ ] Critical queries execute successfully
- [ ] Foreign key constraints are intact
- [ ] Application endpoints respond correctly
- [ ] No data loss detected

```bash
# Run validation after rollback
npm run validate-production-data
```

---

## Disaster Recovery

### Scenario 1: Complete Database Loss

**Steps:**

1. **Identify latest backup:**

```bash
ls -lht backups/ | head -5
```

2. **Provision new Supabase project** (if necessary)

3. **Restore from backup:**

```bash
# Extract backup
tar -xzf backups/judgefinder_backup_YYYYMMDD_HHMMSS.tar.gz

# Restore full database
psql $NEW_DB_URL < judgefinder_backup_*_full.sql
```

4. **Update environment variables:**

```bash
# Update .env.local with new database URL
NEXT_PUBLIC_SUPABASE_URL=new_url
SUPABASE_SERVICE_ROLE_KEY=new_key
```

5. **Validate data integrity:**

```bash
npm run validate-production-data
```

6. **Run smoke tests:**

```bash
# Test critical endpoints
curl https://judgefinder.io/api/health
curl https://judgefinder.io/api/judges/list
```

### Scenario 2: Data Corruption

**Steps:**

1. **Stop all write operations:**

```sql
-- Revoke write access (temporary)
REVOKE INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public FROM authenticated;
```

2. **Identify corrupted data:**

```bash
# Run integrity checks
npm run validate-production-data

# Check specific issues
psql $SUPABASE_DB_URL -f scripts/check-db-state.sql
```

3. **Restore affected tables:**

```bash
# Extract backup
tar -xzf backups/judgefinder_backup_YYYYMMDD_HHMMSS.tar.gz

# Restore specific table
psql $SUPABASE_DB_URL -c "DROP TABLE judges CASCADE;"
psql $SUPABASE_DB_URL < judges_*_data.sql
```

4. **Run cleanup script:**

```bash
npm run cleanup-production-data -- --force
```

5. **Restore write access:**

```sql
-- Grant write access back
GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon;
GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
```

### Scenario 3: Migration Stuck/Hanging

**Steps:**

1. **Check for blocking queries:**

```sql
-- Find blocking queries
SELECT pid, usename, state, query, wait_event_type
FROM pg_stat_activity
WHERE state = 'active' AND wait_event_type = 'Lock';

-- Terminate blocking query (CAUTION)
SELECT pg_terminate_backend(pid);
```

2. **Cancel migration transaction:**

```sql
-- If migration is in transaction
ROLLBACK;
```

3. **Clear migration tracking:**

```sql
-- Remove failed migration from tracking table
DELETE FROM schema_migrations
WHERE version = 'YYYYMMDD_migration_name';
```

4. **Restore from backup if necessary**

---

## Rollback SQL Templates

### Adding Column Rollback

```sql
-- Migration
ALTER TABLE judges ADD COLUMN new_field TEXT;

-- Rollback
ALTER TABLE judges DROP COLUMN new_field;
```

### Creating Table Rollback

```sql
-- Migration
CREATE TABLE new_table (id UUID PRIMARY KEY, ...);

-- Rollback
DROP TABLE IF EXISTS new_table CASCADE;
```

### Adding Index Rollback

```sql
-- Migration
CREATE INDEX idx_judges_new_field ON judges(new_field);

-- Rollback
DROP INDEX IF EXISTS idx_judges_new_field;
```

### Data Migration Rollback

```sql
-- Migration
UPDATE judges SET status = 'active' WHERE status IS NULL;

-- Rollback (requires backup)
-- Restore judges table from backup or use:
UPDATE judges SET status = NULL WHERE status = 'active' AND updated_at > 'migration_timestamp';
```

---

## Emergency Contacts

### Incident Response Team

| Role | Name | Contact | Availability |
|------|------|---------|--------------|
| Lead Engineer | [Name] | [Slack/Phone] | 24/7 |
| DevOps Lead | [Name] | [Slack/Phone] | Business hours |
| Database Admin | [Name] | [Slack/Phone] | On-call |
| CTO | [Name] | [Slack/Phone] | Emergency only |

### Escalation Path

1. **Level 1 (0-15 min):** On-duty engineer attempts rollback
2. **Level 2 (15-30 min):** Escalate to Lead Engineer
3. **Level 3 (30-60 min):** Escalate to CTO, consider full restore
4. **Level 4 (60+ min):** External support (Supabase Support)

### Support Resources

- **Supabase Support:** support@supabase.io (Pro/Team plans)
- **Database Backup Storage:** AWS S3 `s3://judgefinder-backups/`
- **Monitoring Dashboard:** https://judgefinder.io/admin/data-quality
- **Status Page:** https://status.judgefinder.io

---

## Post-Incident Review

After any migration incident or rollback, complete the following:

### 1. Document Timeline

```markdown
## Incident Report: [Date]

**Timeline:**
- [HH:MM] Migration started
- [HH:MM] Issue detected
- [HH:MM] Rollback initiated
- [HH:MM] Service restored

**Root Cause:**
[Description]

**Resolution:**
[Steps taken]

**Prevention:**
[Future improvements]
```

### 2. Update Runbooks

Add learnings to this document and team knowledge base.

### 3. Improve Automation

Identify manual steps that could be automated.

### 4. Team Debrief

Schedule blameless post-mortem within 48 hours.

---

## Best Practices

### Do's

✅ **Always** create backup before migrations
✅ **Always** test migrations in staging first
✅ **Always** have rollback plan documented
✅ **Always** monitor database during migration
✅ **Always** validate data after migration
✅ Schedule migrations during low-traffic hours
✅ Use transactions for data migrations
✅ Add comments explaining migration purpose

### Don'ts

❌ **Never** apply untested migrations to production
❌ **Never** skip backup creation
❌ **Never** migrate without rollback plan
❌ **Never** use `CASCADE` without understanding impact
❌ **Never** perform migrations during peak hours
❌ Don't modify multiple tables without transaction
❌ Don't ignore validation warnings

---

## Helpful Commands

### Quick Reference

```bash
# Create backup
./scripts/backup-database.sh

# Validate data
npm run validate-production-data

# Test migration
npm run test-migration

# Run cleanup
npm run cleanup-production-data -- --dry-run

# Check database health
psql $SUPABASE_DB_URL -c "\l+"
psql $SUPABASE_DB_URL -c "\dt+"

# View recent migrations
psql $SUPABASE_DB_URL -c "SELECT * FROM schema_migrations ORDER BY version DESC LIMIT 10;"

# Check database size
psql $SUPABASE_DB_URL -c "SELECT pg_size_pretty(pg_database_size('postgres'));"
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-01-XX | Initial documentation |

---

## Additional Resources

- [Supabase Migration Guide](https://supabase.com/docs/guides/database/migrations)
- [PostgreSQL Backup Documentation](https://www.postgresql.org/docs/current/backup.html)
- [Database Safety Checklist](./DATABASE_SAFETY_CHECKLIST.md)

---

**Last Updated:** 2025-01-XX
**Maintained By:** Engineering Team
**Review Frequency:** Quarterly

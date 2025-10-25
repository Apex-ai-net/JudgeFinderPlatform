# CourtListener Bulk Import - Quick Start

**5-Minute Quick Start Guide**

---

## Prerequisites

```bash
# Required environment variables in .env.local
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

---

## Quick Commands

### Import Everything (Recommended)
```bash
npm run bulk:import
```
**Time**: ~15-20 minutes
**Result**: ~200 courts + ~2,000 judges

### Import Courts Only
```bash
npm run bulk:import:courts
```
**Time**: ~1 minute
**Result**: ~200 California courts

### Import Judges Only
```bash
npm run bulk:import:judges
```
**Time**: ~15 minutes
**Result**: ~2,000 California judges

### Resume Interrupted Import
```bash
npm run bulk:resume
```
**Use when**: Network fails or process is killed

---

## What You'll See

```
🚀 CourtListener Bulk Data Import
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📥 Downloading: courts.jsonl.bz2
  ⏳ Progress: 100% (1.2MB / 1.2MB)
  ✅ Downloaded: 1.2MB

📊 Processing Courts...
  ⏳ Processed 200 courts | Created: 200 | Updated: 0

📊 Courts Import Complete
✅ Total Processed: 200
⏱️  Duration: 45.2s

[... similar for judges ...]

🎉 BULK IMPORT COMPLETE
📊 Courts: 200 created, 0 errors
👨‍⚖️ Judges: 1850 created, 0 errors
⏱️  Total Duration: 18.3 minutes
```

---

## After Import

### Verify Success
```bash
npm run data:status
npm run integrity:full
```

### Generate Analytics
```bash
npm run analytics:generate
```
**Time**: ~1.5-2 hours for 2,000 judges

### Set Up Daily Sync
```bash
# Add to cron for incremental updates
npm run sync:judges  # Daily
npm run sync:courts  # Weekly
```

---

## Common Issues

### Download Fails
```bash
# Check network
curl -I https://com-courtlistener-storage.s3.amazonaws.com/bulk-data/courts.jsonl.bz2

# Retry with resume
npm run bulk:resume
```

### Database Errors
```bash
# Check credentials
echo $SUPABASE_SERVICE_ROLE_KEY

# Verify connection
npm run data:status
```

### Need to Start Over
```bash
# Delete checkpoint file
rm .cache/bulk-data/import-checkpoint.json

# Re-run
npm run bulk:import
```

---

## Key Benefits

- **200x faster** than API import (15 min vs 2 days)
- **Zero API quota** used
- **Resume capability** if interrupted
- **Complete historical** data included

---

## Full Documentation

- **Comprehensive Guide**: `/docs/data/BULK_IMPORT_GUIDE.md`
- **Implementation Summary**: `/BULK_IMPORT_IMPLEMENTATION_SUMMARY.md`
- **Script Source**: `/scripts/bulk-import-courtlistener-data.ts`

---

## Quick Reference

| Command | Purpose | Time |
|---------|---------|------|
| `npm run bulk:import` | Import all | ~18 min |
| `npm run bulk:import:courts` | Courts only | ~1 min |
| `npm run bulk:import:judges` | Judges only | ~15 min |
| `npm run bulk:resume` | Resume failed | Varies |

---

**Next Steps**: See full guide at `/docs/data/BULK_IMPORT_GUIDE.md`

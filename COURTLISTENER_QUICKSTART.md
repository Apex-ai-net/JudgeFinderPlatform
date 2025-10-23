# CourtListener Enhancement - Quick Start Guide

**Total Time**: ~75 minutes | **Impact**: +1,400 judges with education data

---

## 🚀 3-Step Launch

### Step 1: Apply Migration (2 minutes)

Go to: https://supabase.com/dashboard/project/xstlnicbnzdxlgfiewmg/sql/new

Paste and run:
```sql
ALTER TABLE judges ADD COLUMN IF NOT EXISTS positions JSONB DEFAULT '[]'::jsonb;
```

Verify:
```bash
node scripts/check-migration-status.js
```
Expected: `✅ positions column EXISTS`

---

### Step 2: Test Sync (1 minute)

```bash
npx tsx scripts/sync-education-data.ts -- --limit=10
```

Expected: `✅ Success: true` and `✏️ Updated: 8-10 judges`

---

### Step 3: Full Sync (70 minutes)

```bash
npx tsx scripts/sync-education-data.ts
```

**Safe Rate**:
- 24 judges/min
- 1,440/hr (well under 5,000/hr quota)
- No risk of API ban

**Expected Result**:
- Before: 254 judges (13%) with education
- After: 1,400+ judges (74%) with education
- Gain: +1,146 judges

---

## 📊 Verify Success

```bash
node scripts/final-cl-audit.js
```

Look for:
```
With Education: 1400+ (74%+)
```

---

## ❓ Troubleshooting

**Migration fails?**
→ See: [scripts/manual-migration-instructions.md](scripts/manual-migration-instructions.md)

**Rate limit hit?**
→ Wait 1 hour, quota resets automatically

**Want to pause?**
→ Ctrl+C (safe to resume later)

---

## 📖 Full Documentation

- **Complete Guide**: [docs/COURTLISTENER_ENHANCEMENT_COMPLETE.md](docs/COURTLISTENER_ENHANCEMENT_COMPLETE.md)
- **API Reference**: [docs/integrations/courtlistener/COURTLISTENER_QUICK_REFERENCE.md](docs/integrations/courtlistener/COURTLISTENER_QUICK_REFERENCE.md)
- **Migration Help**: [scripts/manual-migration-instructions.md](scripts/manual-migration-instructions.md)

---

## 🎯 What's Next?

After education sync completes, you can add:
- **Political affiliations** (party, dates)
- **Position history** (career, appointments)
- **Bulk bootstrap** (for non-CA expansion)

All use the same safe rate-limited approach.

---

**Ready?** Start with Step 1! 🚀

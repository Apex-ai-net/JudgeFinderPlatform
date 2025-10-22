# Quick Guide: Enable Position 3 Ad Slots

## TL;DR

Your database currently **blocks position 3** ad slots for judges. Run this migration to fix it:

**File:** `/Users/tanner-osterkamp/JudgeFinderPlatform/supabase/migrations/20251022_001_support_three_ad_positions.sql`

---

## The Problem

4 database tables have constraints that limit positions to 1 and 2:

| Table | Constraint | Current Limit |
|-------|-----------|---------------|
| `ad_spot_bookings` | `CHECK (position IN (1, 2))` | Blocks position 3 bookings |
| `judge_ad_products` | `CHECK (position IN (1, 2))` | Blocks position 3 Stripe products |
| `pending_checkouts` | `CHECK (ad_position IN (1, 2))` | Blocks position 3 checkout forms |
| `ad_spots` | `CHECK ... OR position <= 2` | Blocks position 3 for judges |

**Plus:** Migration `20251018_001` set all judge position 3 slots to `status='maintenance'`

---

## The Solution

### Step 1: Run the Migration

```bash
# In Supabase Dashboard > SQL Editor, run:
cat supabase/migrations/20251022_001_support_three_ad_positions.sql
```

Or use the Supabase CLI:
```bash
supabase db push
```

### Step 2: Verify

```sql
-- All judges should have 3 slots
SELECT COUNT(*) FROM ad_spots
WHERE entity_type = 'judge' AND position = 3 AND status = 'available';

-- Should match total judge count
SELECT COUNT(*) FROM judges;
```

---

## What the Migration Does

1. Updates CHECK constraint on `ad_spot_bookings`: (1,2) → (1,2,3)
2. Updates CHECK constraint on `judge_ad_products`: (1,2) → (1,2,3)
3. Updates CHECK constraint on `pending_checkouts`: (1,2) → (1,2,3)
4. Removes judge position restriction on `ad_spots`
5. Changes judge position 3 from 'maintenance' → 'available'
6. Creates missing position 3 ad_spot rows for all judges

---

## Key Files

- **Migration:** `/Users/tanner-osterkamp/JudgeFinderPlatform/supabase/migrations/20251022_001_support_three_ad_positions.sql`
- **Analysis:** `/Users/tanner-osterkamp/JudgeFinderPlatform/docs/AD_SLOT_SCHEMA_ANALYSIS.md`
- **Type Defs:** `/Users/tanner-osterkamp/JudgeFinderPlatform/types/advertising.ts` (already supports 1|2|3)

---

## Business Impact

- **Before:** 2 ad slots per judge
- **After:** 3 ad slots per judge
- **Inventory Increase:** +50%
- **Revenue Increase:** +$500/month per judge (position 3)

---

## Safety

- Migration is transactional (atomically succeeds or fails)
- Idempotent (safe to run multiple times)
- Includes verification checks and detailed logging
- Rollback plan included in analysis document

---

## Testing Checklist

After running the migration:

- [ ] Verify all judges have 3 ad_spots (query above)
- [ ] Test creating position 3 booking in database
- [ ] Test Stripe product creation for position 3
- [ ] Check frontend displays all 3 positions
- [ ] Verify checkout flow accepts position 3

---

## Questions?

See full analysis: `/Users/tanner-osterkamp/JudgeFinderPlatform/docs/AD_SLOT_SCHEMA_ANALYSIS.md`

# Ad Slot Position Schema Analysis
**Date:** 2025-10-22
**Author:** Database Architecture Analysis
**Status:** Schema Update Required

## Executive Summary

The current Supabase database schema **DOES NOT** fully support 3 ad slot positions per judge. Multiple constraints and configuration settings limit judge ad slots to positions 1 and 2 only. This analysis identifies all schema limitations and provides a migration to enable position 3.

---

## Findings

### 1. Table: `ad_spot_bookings`
**Location:** `/Users/tanner-osterkamp/JudgeFinderPlatform/supabase/migrations/20250119000000_judge_ad_products_and_bookings.sql` (Line 59)

**Current Constraint:**
```sql
position integer NOT NULL CHECK (position IN (1, 2))
```

**Issue:** Position values are restricted to 1 or 2 only. Position 3 will be rejected.

**Impact:** HIGH - Prevents booking position 3 ad slots.

---

### 2. Table: `judge_ad_products`
**Location:** `/Users/tanner-osterkamp/JudgeFinderPlatform/supabase/migrations/20250119000000_judge_ad_products_and_bookings.sql` (Line 12)

**Current Constraint:**
```sql
position integer NOT NULL CHECK (position IN (1, 2))
```

**Issue:** Stripe products can only be created for positions 1 and 2.

**Impact:** HIGH - Prevents creating Stripe products for position 3.

---

### 3. Table: `pending_checkouts`
**Location:** `/Users/tanner-osterkamp/JudgeFinderPlatform/supabase/migrations/20251020_002_pending_checkouts_table.sql` (Line 31)

**Current Constraint:**
```sql
ad_position INTEGER CHECK (ad_position IN (1, 2))
```

**Issue:** Checkout form data cannot save position 3 selections.

**Impact:** MEDIUM - Prevents users from initiating position 3 checkouts.

---

### 4. Table: `ad_spots`
**Location:** `/Users/tanner-osterkamp/JudgeFinderPlatform/supabase/migrations/20251018_001_disable_extra_judge_positions.sql` (Lines 5-21)

**Current Constraint:**
```sql
CHECK (
  position BETWEEN 1 AND 3
  AND (
    entity_type <> 'judge'
    OR position <= 2
  )
)
```

**Issue:** Compound constraint explicitly blocks judges from having position values > 2.

**Additional Issue:** Migration 20251018_001 set all judge position 3 slots to `status='maintenance'`:
```sql
UPDATE ad_spots
SET status = 'maintenance'
WHERE entity_type = 'judge'
  AND position > 2;
```

**Impact:** CRITICAL - Two-part block:
1. Database constraint prevents position 3 for judges
2. Existing position 3 rows are marked as unavailable

---

## Schema State Analysis

### Tables Supporting Position 3
- `ad_spots` (for courts only) - positions 1-3 allowed
- `attorney_slots` - positions 1-3 allowed (legacy system)

### Tables Blocking Position 3
- `ad_spot_bookings` - blocks at constraint level
- `judge_ad_products` - blocks at constraint level
- `pending_checkouts` - blocks at constraint level
- `ad_spots` (for judges) - blocks at constraint AND status level

### TypeScript Type Definitions
**Location:** `/Users/tanner-osterkamp/JudgeFinderPlatform/types/advertising.ts` (Line 30)

**Current Type:**
```typescript
export interface AdSpot {
  position: 1 | 2 | 3
  // ...
}
```

**Status:** CORRECT - TypeScript already supports positions 1, 2, and 3.

---

## Migration Required

### Changes Needed

1. **Update `ad_spot_bookings` constraint**
   - From: `CHECK (position IN (1, 2))`
   - To: `CHECK (position IN (1, 2, 3))`

2. **Update `judge_ad_products` constraint**
   - From: `CHECK (position IN (1, 2))`
   - To: `CHECK (position IN (1, 2, 3))`

3. **Update `pending_checkouts` constraint**
   - From: `CHECK (ad_position IN (1, 2))`
   - To: `CHECK (ad_position IN (1, 2, 3))`

4. **Update `ad_spots` constraint**
   - Remove judge-specific position restriction
   - Allow positions 1-3 for all entity types

5. **Re-enable position 3 ad spots**
   - Change `status='maintenance'` to `status='available'` for judge position 3 rows

6. **Create missing position 3 rows**
   - Ensure all judges have position 3 ad_spots records created

---

## Migration File Created

**File:** `/Users/tanner-osterkamp/JudgeFinderPlatform/supabase/migrations/20251022_001_support_three_ad_positions.sql`

### What It Does:
1. Drops and recreates CHECK constraints on all 4 affected tables
2. Updates ad_spots status from 'maintenance' to 'available' for position 3
3. Creates missing position 3 ad_spot records for all judges
4. Adds verification checks and logging
5. Updates database documentation comments

### Safety Features:
- Wrapped in transaction (BEGIN/COMMIT)
- Uses `IF NOT EXISTS` and `ON CONFLICT DO NOTHING` for idempotency
- Includes comprehensive verification checks
- Logs detailed migration results

---

## Verification Queries

After running the migration, verify the changes:

### 1. Check All Judges Have 3 Ad Spots
```sql
SELECT entity_id, COUNT(*) as slot_count
FROM ad_spots
WHERE entity_type = 'judge'
GROUP BY entity_id
HAVING COUNT(*) != 3;
```
**Expected:** 0 rows (all judges should have exactly 3 slots)

### 2. Check Position 3 Availability
```sql
SELECT COUNT(*) as available_position_3_slots
FROM ad_spots
WHERE entity_type = 'judge'
  AND position = 3
  AND status = 'available';
```
**Expected:** Should equal the total number of judges

### 3. Verify Constraints Allow Position 3
```sql
SELECT
  conrelid::regclass AS table_name,
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conname IN (
  'ad_spot_bookings_position_check',
  'judge_ad_products_position_check',
  'pending_checkouts_ad_position_check',
  'ad_spots_position_check'
);
```
**Expected:** All constraints should allow values 1, 2, 3

### 4. Test Insert Position 3 Booking
```sql
-- Should succeed (change IDs to match your data)
INSERT INTO ad_spot_bookings (
  judge_id,
  position,
  court_level,
  billing_interval,
  monthly_price,
  status
) VALUES (
  '<some-judge-id>',
  3,
  'federal',
  'monthly',
  500.00,
  'active'
);
```

---

## Rollback Plan

If the migration needs to be reversed:

```sql
BEGIN;

-- Revert ad_spot_bookings
ALTER TABLE ad_spot_bookings
  DROP CONSTRAINT IF EXISTS ad_spot_bookings_position_check,
  ADD CONSTRAINT ad_spot_bookings_position_check CHECK (position IN (1, 2));

-- Revert judge_ad_products
ALTER TABLE judge_ad_products
  DROP CONSTRAINT IF EXISTS judge_ad_products_position_check,
  ADD CONSTRAINT judge_ad_products_position_check CHECK (position IN (1, 2));

-- Revert pending_checkouts
ALTER TABLE pending_checkouts
  DROP CONSTRAINT IF EXISTS pending_checkouts_ad_position_check,
  ADD CONSTRAINT pending_checkouts_ad_position_check CHECK (ad_position IN (1, 2));

-- Revert ad_spots
ALTER TABLE ad_spots
  DROP CONSTRAINT IF EXISTS ad_spots_position_check,
  ADD CONSTRAINT ad_spots_position_check CHECK (
    position BETWEEN 1 AND 3
    AND (entity_type <> 'judge' OR position <= 2)
  );

-- Disable position 3 again
UPDATE ad_spots
SET status = 'maintenance'
WHERE entity_type = 'judge' AND position = 3;

COMMIT;
```

---

## Business Impact

### Current State (Before Migration)
- Judges can have 2 ad slots (positions 1 and 2)
- Position 3 inventory exists but is unusable
- Total inventory: ~2N slots (N = number of judges)

### After Migration
- Judges can have 3 ad slots (positions 1, 2, and 3)
- All position 3 inventory becomes bookable
- Total inventory: ~3N slots (50% inventory increase)

### Revenue Impact
- Universal pricing: $500/month per slot
- Additional revenue per judge: $500/month (position 3)
- Platform-wide additional revenue: $500 * N judges per month

---

## Related Files

### Database Migrations
- `/Users/tanner-osterkamp/JudgeFinderPlatform/supabase/migrations/20250119000000_judge_ad_products_and_bookings.sql`
- `/Users/tanner-osterkamp/JudgeFinderPlatform/supabase/migrations/20250823_001_create_advertising_system.sql`
- `/Users/tanner-osterkamp/JudgeFinderPlatform/supabase/migrations/20250919_002_ad_spots_rls_and_seed.sql`
- `/Users/tanner-osterkamp/JudgeFinderPlatform/supabase/migrations/20251018_001_disable_extra_judge_positions.sql`
- `/Users/tanner-osterkamp/JudgeFinderPlatform/supabase/migrations/20251020_002_pending_checkouts_table.sql`

### TypeScript Types
- `/Users/tanner-osterkamp/JudgeFinderPlatform/types/advertising.ts`

### Components Using Ad Positions
- `/Users/tanner-osterkamp/JudgeFinderPlatform/components/judges/AdvertiserSlots.tsx`
- `/Users/tanner-osterkamp/JudgeFinderPlatform/components/courts/CourtAdvertiserSlots.tsx`
- `/Users/tanner-osterkamp/JudgeFinderPlatform/app/ads/checkout/judge/page.tsx`

---

## Recommendations

1. **Immediate Action:** Run migration `20251022_001_support_three_ad_positions.sql` in Supabase SQL Editor

2. **Testing:**
   - Run all verification queries
   - Test creating Stripe products for position 3
   - Test booking position 3 ad slots
   - Verify frontend displays 3 positions correctly

3. **Application Code Review:**
   - Verify no hardcoded position limits in TypeScript/JavaScript
   - Check frontend components render all 3 positions
   - Ensure Stripe integration supports position 3

4. **Documentation:**
   - Update API documentation to reflect 3 positions
   - Update user-facing documentation about available positions
   - Update pricing pages if needed

5. **Monitoring:**
   - Track position 3 booking rates
   - Monitor for any constraint violation errors
   - Validate revenue increases from expanded inventory

---

## Conclusion

**Current Status:** Database schema DOES NOT support 3 ad positions for judges due to multiple CHECK constraints and a maintenance flag.

**Resolution:** Migration file created at `/Users/tanner-osterkamp/JudgeFinderPlatform/supabase/migrations/20251022_001_support_three_ad_positions.sql`

**Action Required:** Run the migration in Supabase to enable position 3 ad slots.

**Risk Level:** LOW - Migration is idempotent, transactional, and includes rollback plan.

**Expected Outcome:** All judges will have 3 bookable ad positions, increasing platform inventory by 50%.

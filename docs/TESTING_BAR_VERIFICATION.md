# Bar Verification Testing Guide

This guide provides step-by-step instructions for testing the bar verification system.

## Prerequisites

1. **Database Migration Applied**

   ```bash
   # Verify migration is applied
   psql $DATABASE_URL -c "\d bar_verifications"
   ```

2. **Admin Account Created**
   - Sign in with admin account
   - Verify `is_admin = true` in database

3. **Test User Account**
   - Create a test user account (non-admin)
   - Note the Clerk user ID

## Testing Workflow

### 1. Submit Bar Verification (User)

**Endpoint:** `POST /api/advertising/verify-bar`

```bash
# Test with valid bar number
curl -X POST https://judgefinder.io/api/advertising/verify-bar \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_CLERK_TOKEN" \
  -d '{
    "barNumber": "123456",
    "barState": "CA"
  }'
```

**Expected Response:**

```json
{
  "success": true,
  "message": "Bar number submitted for verification. An administrator will review your submission within 24-48 hours.",
  "barNumber": "123456",
  "barState": "CA",
  "status": "pending"
}
```

**Verify in Database:**

```sql
SELECT * FROM bar_verifications
WHERE user_id = 'YOUR_USER_ID'
ORDER BY created_at DESC LIMIT 1;

-- Should show:
-- status: 'pending'
-- bar_number: '123456'
-- bar_state: 'CA'
```

### 2. List Pending Verifications (Admin)

**Endpoint:** `GET /api/admin/bar-verifications?status=pending`

```bash
curl https://judgefinder.io/api/admin/bar-verifications?status=pending \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Expected Response:**

```json
{
  "verifications": [
    {
      "id": "uuid-here",
      "user_id": "clerk_user_id",
      "bar_number": "123456",
      "bar_state": "CA",
      "status": "pending",
      "submitted_at": "2025-10-24T...",
      "user": {
        "email": "user@example.com",
        "full_name": "Test User"
      }
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 50,
  "hasMore": false
}
```

### 3. Approve Verification (Admin)

**Endpoint:** `POST /api/admin/bar-verifications/approve`

```bash
curl -X POST https://judgefinder.io/api/admin/bar-verifications/approve \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "verificationId": "UUID_FROM_STEP_2",
    "action": "approve",
    "notes": "Verified active CA attorney on State Bar website"
  }'
```

**Expected Response:**

```json
{
  "success": true,
  "action": "approve",
  "verificationId": "uuid",
  "status": "verified",
  "message": "Bar verification approved. User has been granted advertiser access."
}
```

**Verify in Database:**

```sql
-- Check bar_verifications table
SELECT * FROM bar_verifications WHERE id = 'UUID';
-- Should show:
-- status: 'verified'
-- verified_at: timestamp
-- verified_by: admin_user_id
-- admin_notes: your notes

-- Check app_users table
SELECT user_role, verification_status, bar_verified_at
FROM app_users
WHERE clerk_user_id = 'USER_ID';
-- Should show:
-- user_role: 'advertiser'
-- verification_status: 'verified'
-- bar_verified_at: timestamp
```

### 4. Reject Verification (Admin)

**Endpoint:** `POST /api/admin/bar-verifications/approve`

```bash
curl -X POST https://judgefinder.io/api/admin/bar-verifications/approve \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "verificationId": "UUID",
    "action": "reject",
    "notes": "Bar number not found in State Bar database"
  }'
```

**Expected Response:**

```json
{
  "success": true,
  "action": "reject",
  "verificationId": "uuid",
  "status": "rejected",
  "message": "Bar verification rejected."
}
```

**Verify in Database:**

```sql
SELECT verification_status, user_role FROM app_users WHERE clerk_user_id = 'USER_ID';
-- Should show:
-- verification_status: 'rejected'
-- user_role: 'user' (NOT 'advertiser')
```

## Edge Case Testing

### Test 1: Duplicate Bar Number

**Scenario:** Two users try to register the same bar number

```bash
# User 1 submits
curl -X POST https://judgefinder.io/api/advertising/verify-bar \
  -H "Authorization: Bearer USER1_TOKEN" \
  -d '{"barNumber": "123456", "barState": "CA"}'

# User 2 tries same bar number
curl -X POST https://judgefinder.io/api/advertising/verify-bar \
  -H "Authorization: Bearer USER2_TOKEN" \
  -d '{"barNumber": "123456", "barState": "CA"}'
```

**Expected:**

- User 1: Success (pending)
- User 2: Error 409 - "This bar number is already registered to another account"

### Test 2: Invalid Bar Number Format

```bash
curl -X POST https://judgefinder.io/api/advertising/verify-bar \
  -H "Authorization: Bearer USER_TOKEN" \
  -d '{"barNumber": "invalid!", "barState": "CA"}'
```

**Expected:**

- Error 400 - "Invalid bar number format"

### Test 3: Unauthenticated Request

```bash
curl -X POST https://judgefinder.io/api/advertising/verify-bar \
  -d '{"barNumber": "123456", "barState": "CA"}'
```

**Expected:**

- Error 401 - "Authentication required"

### Test 4: Non-Admin Access to Admin Endpoint

```bash
curl https://judgefinder.io/api/admin/bar-verifications \
  -H "Authorization: Bearer NON_ADMIN_TOKEN"
```

**Expected:**

- Error 403 - "Forbidden - Admin access required"

### Test 5: Double Approval Prevention

```bash
# First approval
curl -X POST https://judgefinder.io/api/admin/bar-verifications/approve \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -d '{"verificationId": "UUID", "action": "approve"}'

# Try to approve again
curl -X POST https://judgefinder.io/api/admin/bar-verifications/approve \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -d '{"verificationId": "UUID", "action": "approve"}'
```

**Expected:**

- First: Success
- Second: Error 400 - "Verification already processed"

## Performance Testing

### Load Test: Multiple Submissions

```bash
# Submit 100 verification requests
for i in {1..100}; do
  curl -X POST https://judgefinder.io/api/advertising/verify-bar \
    -H "Authorization: Bearer USER_TOKEN" \
    -d "{\"barNumber\": \"$i\", \"barState\": \"CA\"}" &
done
wait
```

**Verify:**

- All requests succeed or fail gracefully
- No race conditions (check unique constraints)
- Rate limiting kicks in appropriately

### Cache Testing: Courts API

```bash
# First request (cache miss)
time curl -I https://judgefinder.io/api/courts?jurisdiction=CA

# Second request (cache hit)
time curl -I https://judgefinder.io/api/courts?jurisdiction=CA

# Different params (new cache entry)
time curl -I https://judgefinder.io/api/courts?jurisdiction=CA&county=Los%20Angeles
```

**Expected:**

- First request: ~200-500ms
- Second request: ~50-100ms (much faster)
- Cache headers present: `Cache-Control: public, s-maxage=3600`
- Different params create separate cache entries

## Security Testing

### Test 1: SQL Injection

```bash
curl -X POST https://judgefinder.io/api/advertising/verify-bar \
  -H "Authorization: Bearer USER_TOKEN" \
  -d '{"barNumber": "123456; DROP TABLE app_users--", "barState": "CA"}'
```

**Expected:**

- Error 400 - "Invalid bar number format"
- No SQL executed

### Test 2: XSS in Admin Notes

```bash
curl -X POST https://judgefinder.io/api/admin/bar-verifications/approve \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -d '{"verificationId": "UUID", "action": "approve", "notes": "<script>alert(1)</script>"}'
```

**Expected:**

- Notes stored as plain text
- No script execution when displayed

### Test 3: CSRF Protection

```bash
# Try to submit without CSRF token (if implemented)
curl -X POST https://judgefinder.io/api/advertising/verify-bar \
  -H "Origin: https://malicious.com" \
  -d '{"barNumber": "123456", "barState": "CA"}'
```

**Expected:**

- Request blocked or fails authentication

## Database Performance Testing

### Test Query Performance

```sql
-- Test verification lookup (should be fast with index)
EXPLAIN ANALYZE
SELECT * FROM bar_verifications
WHERE status = 'pending'
ORDER BY submitted_at DESC
LIMIT 50;

-- Should use index: idx_bar_verifications_status
-- Execution time: < 10ms

-- Test user bar number lookup
EXPLAIN ANALYZE
SELECT * FROM bar_verifications
WHERE bar_number = '123456' AND bar_state = 'CA';

-- Should use index: idx_bar_verifications_bar_number
-- Execution time: < 5ms
```

## Integration Testing

### Test Complete Flow

1. User submits bar verification
2. Verification appears in admin dashboard
3. Admin approves verification
4. User role updates to 'advertiser'
5. User can now access advertising features
6. Verification record shows complete audit trail

**Automation Script:**

```bash
#!/bin/bash

# 1. Submit verification
VERIFICATION_ID=$(curl -X POST https://judgefinder.io/api/advertising/verify-bar \
  -H "Authorization: Bearer $USER_TOKEN" \
  -d '{"barNumber": "999999", "barState": "CA"}' | jq -r '.verificationId')

# 2. List verifications (admin)
PENDING_COUNT=$(curl https://judgefinder.io/api/admin/bar-verifications?status=pending \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.total')

echo "Pending verifications: $PENDING_COUNT"

# 3. Approve verification
curl -X POST https://judgefinder.io/api/admin/bar-verifications/approve \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d "{\"verificationId\": \"$VERIFICATION_ID\", \"action\": \"approve\"}"

# 4. Verify user role changed
USER_ROLE=$(curl https://judgefinder.io/api/user/profile \
  -H "Authorization: Bearer $USER_TOKEN" | jq -r '.user_role')

if [ "$USER_ROLE" = "advertiser" ]; then
  echo "✅ Test passed: User is now advertiser"
else
  echo "❌ Test failed: User role is $USER_ROLE"
fi
```

## Monitoring & Alerts

### Key Metrics to Track

1. **Verification Volume**

   ```sql
   SELECT COUNT(*) FROM bar_verifications
   WHERE submitted_at >= NOW() - INTERVAL '24 hours';
   ```

2. **Approval Rate**

   ```sql
   SELECT
     COUNT(*) FILTER (WHERE status = 'verified') * 100.0 / COUNT(*) as approval_rate
   FROM bar_verifications
   WHERE verified_at >= NOW() - INTERVAL '30 days';
   ```

3. **Average Review Time**
   ```sql
   SELECT
     AVG(EXTRACT(EPOCH FROM (verified_at - submitted_at)) / 3600) as avg_hours
   FROM bar_verifications
   WHERE verified_at >= NOW() - INTERVAL '30 days';
   ```

### Set Up Alerts

- **Pending verification > 48 hours:** Email admin
- **Verification submission spike:** Check for abuse
- **Approval rate < 50%:** Investigate rejection reasons

## Rollback Plan

If issues occur after deployment:

1. **Disable verification endpoint:**

   ```typescript
   // app/api/advertising/verify-bar/route.ts
   return NextResponse.json({ error: 'Verification system temporarily disabled' }, { status: 503 })
   ```

2. **Manually approve urgent cases:**

   ```sql
   UPDATE app_users
   SET verification_status = 'verified',
       bar_verified_at = NOW(),
       user_role = 'advertiser'
   WHERE clerk_user_id = 'URGENT_USER_ID';
   ```

3. **Revert migration (if needed):**
   ```sql
   DROP TABLE bar_verifications;
   ALTER TABLE app_users DROP COLUMN verification_status;
   -- Restore from backup
   ```

## Success Criteria

- ✅ User can submit bar verification
- ✅ Admin can view pending verifications
- ✅ Admin can approve/reject verifications
- ✅ User role updates automatically on approval
- ✅ Duplicate bar numbers are prevented
- ✅ Invalid formats are rejected
- ✅ Non-admins cannot approve verifications
- ✅ Audit trail is complete and accurate
- ✅ Performance meets targets (< 500ms API responses)
- ✅ Security tests pass (no SQL injection, XSS, etc.)

## Post-Deployment Checklist

- [ ] Migration applied successfully
- [ ] All tests passing
- [ ] Admin dashboard accessible
- [ ] Email notifications working
- [ ] Monitoring alerts configured
- [ ] Documentation updated
- [ ] Team trained on admin workflow
- [ ] Support tickets routed correctly

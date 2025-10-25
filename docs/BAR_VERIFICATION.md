# Attorney Bar Verification System

This document describes JudgeFinder's attorney bar number verification system for legal professional advertisers.

## Overview

JudgeFinder requires verified attorney credentials for users who want to advertise on the platform. This ensures:

1. **Trust & Safety** - Only licensed attorneys can advertise
2. **Compliance** - Meets legal advertising requirements
3. **Quality Control** - Prevents spam and fraud
4. **Professional Standards** - Maintains platform integrity

## Architecture

### Components

1. **Verification API** (`/api/advertising/verify-bar`)
   - Accepts bar number submissions from users
   - Validates format and checks for duplicates
   - Creates verification request record

2. **Admin Approval API** (`/api/admin/bar-verifications`)
   - Lists pending verification requests
   - Allows admins to approve/reject submissions
   - Updates user roles and permissions

3. **State Bar Client** (`lib/verification/state-bar-client.ts`)
   - Abstraction layer for State Bar APIs
   - Currently: Manual verification workflow
   - Future: Automated API integration

4. **Database Tables**
   - `app_users` - User profiles with bar information
   - `bar_verifications` - Verification request audit trail

## Verification Flow

### User Perspective

1. User navigates to advertising page
2. Prompted to verify bar credentials
3. Submits bar number and state
4. Receives confirmation of pending review
5. Waits for admin approval (24-48 hours)
6. Receives email notification of decision
7. If approved: Gains advertiser role and access

### Admin Perspective

1. Receives notification of new verification request
2. Accesses admin dashboard → Bar Verifications
3. Reviews submission details:
   - User information (name, email)
   - Bar number and state
   - Submission timestamp
4. Manually verifies credentials:
   - Check State Bar website
   - Verify attorney status (active/inactive)
   - Validate bar number format
5. Makes decision:
   - **Approve** → User becomes advertiser
   - **Reject** → User notified with reason
6. Optionally adds admin notes

## Database Schema

### app_users Table

```sql
ALTER TABLE app_users ADD COLUMN user_role TEXT NOT NULL DEFAULT 'user';
ALTER TABLE app_users ADD COLUMN bar_number TEXT;
ALTER TABLE app_users ADD COLUMN bar_state TEXT;
ALTER TABLE app_users ADD COLUMN bar_verified_at TIMESTAMPTZ;
ALTER TABLE app_users ADD COLUMN verification_status TEXT DEFAULT 'none';

-- Constraints
CHECK (user_role IN ('user', 'advertiser', 'admin'))
CHECK (verification_status IN ('none', 'pending', 'verified', 'rejected'))
```

**Fields:**

- `user_role` - User permission level
- `bar_number` - State Bar identification number
- `bar_state` - State of bar admission (e.g., CA, NY)
- `bar_verified_at` - Timestamp of successful verification
- `verification_status` - Current verification state

### bar_verifications Table

```sql
CREATE TABLE bar_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL REFERENCES app_users(clerk_user_id),
    bar_number TEXT NOT NULL,
    bar_state TEXT NOT NULL DEFAULT 'CA',
    status TEXT NOT NULL DEFAULT 'pending',
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    verified_at TIMESTAMPTZ,
    verified_by TEXT REFERENCES app_users(clerk_user_id),
    admin_notes TEXT,
    api_response JSONB,
    api_checked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Purpose:**

- Complete audit trail of all verification requests
- Tracks admin decisions and reasoning
- Stores API responses for automated checks
- Enables analytics and reporting

## API Endpoints

### POST /api/advertising/verify-bar

Submit bar number for verification.

**Request:**

```json
{
  "barNumber": "123456",
  "barState": "CA",
  "turnstileToken": "token-from-captcha"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Bar number submitted for verification...",
  "barNumber": "123456",
  "barState": "CA",
  "status": "pending"
}
```

**Security:**

- Requires authentication (Clerk)
- CAPTCHA verification (Turnstile)
- Rate limiting (10 requests/hour)
- Duplicate prevention (one pending per user)

### GET /api/admin/bar-verifications

List verification requests (admin only).

**Query Parameters:**

- `status` - Filter by status (pending/verified/rejected/all)
- `limit` - Results per page (default: 50, max: 100)
- `page` - Page number (default: 1)

**Response:**

```json
{
  "verifications": [
    {
      "id": "uuid",
      "user_id": "clerk_user_id",
      "bar_number": "123456",
      "bar_state": "CA",
      "status": "pending",
      "submitted_at": "2025-10-24T10:00:00Z",
      "user": {
        "email": "attorney@example.com",
        "full_name": "Jane Doe"
      }
    }
  ],
  "total": 10,
  "page": 1,
  "limit": 50,
  "hasMore": false
}
```

### POST /api/admin/bar-verifications/approve

Approve or reject a verification request (admin only).

**Request:**

```json
{
  "verificationId": "uuid",
  "action": "approve",
  "notes": "Verified active CA attorney #123456"
}
```

**Response:**

```json
{
  "success": true,
  "action": "approve",
  "verificationId": "uuid",
  "status": "verified",
  "message": "Bar verification approved..."
}
```

## State Bar Integration

### Current Implementation (Phase 1)

Manual verification workflow:

- Admin manually checks State Bar website
- Decision recorded in database
- User notified via email

### Future Implementation (Phase 2)

Automated State Bar API integration:

```typescript
// lib/verification/state-bar-client.ts
const result = await verifyBarNumber({
  barNumber: '123456',
  state: 'CA',
  lastName: 'Doe', // Optional validation
})

if (result.valid && result.status === 'active') {
  // Automatically approve
} else {
  // Flag for manual review
}
```

**Challenges:**

- No public California State Bar API (as of 2025)
- Web scraping is fragile and rate-limited
- May require special API access application

**Supported States (Future):**

- California (CA) - Web scraping or API
- New York (NY) - API if available
- Texas (TX) - API if available
- Others - Manual verification

## Security Considerations

### Fraud Prevention

1. **Duplicate Detection**
   - One bar number per account
   - Unique constraint on (bar_number, bar_state)
   - Check existing registrations

2. **Format Validation**
   - State-specific regex patterns
   - Length and character requirements
   - Checksum validation (where applicable)

3. **Rate Limiting**
   - Max 10 submissions per hour per IP
   - Max 3 submissions per day per user
   - Exponential backoff on failures

4. **CAPTCHA Protection**
   - Cloudflare Turnstile on submission
   - Prevents automated abuse
   - Invisible challenge for UX

### Audit Trail

Every verification action is logged:

```typescript
console.log('[SECURITY AUDIT] Bar verification attempt', {
  user_id: userId,
  bar_number: cleanedBarNumber,
  bar_state: barState,
  ip_address: clientIp,
  timestamp: new Date().toISOString(),
})
```

### Admin Authorization

- Only users with `is_admin = true` can approve/reject
- Admin actions are logged with user ID
- Admin notes required for rejections

## Testing

### Manual Testing

1. **Submit verification as user:**

   ```bash
   curl -X POST https://judgefinder.io/api/advertising/verify-bar \
     -H "Authorization: Bearer $CLERK_TOKEN" \
     -d '{
       "barNumber": "123456",
       "barState": "CA",
       "turnstileToken": "test-token"
     }'
   ```

2. **List pending as admin:**

   ```bash
   curl https://judgefinder.io/api/admin/bar-verifications?status=pending \
     -H "Authorization: Bearer $ADMIN_TOKEN"
   ```

3. **Approve verification:**
   ```bash
   curl -X POST https://judgefinder.io/api/admin/bar-verifications/approve \
     -H "Authorization: Bearer $ADMIN_TOKEN" \
     -d '{
       "verificationId": "uuid",
       "action": "approve",
       "notes": "Verified manually"
     }'
   ```

### Automated Testing

```typescript
// Test bar number format validation
describe('Bar Verification', () => {
  it('should reject invalid bar number format', async () => {
    const response = await POST('/api/advertising/verify-bar', {
      barNumber: 'invalid',
      barState: 'CA',
    })
    expect(response.status).toBe(400)
  })

  it('should prevent duplicate bar numbers', async () => {
    // First submission succeeds
    await POST('/api/advertising/verify-bar', {
      barNumber: '123456',
      barState: 'CA',
    })

    // Second submission fails
    const response = await POST('/api/advertising/verify-bar', {
      barNumber: '123456',
      barState: 'CA',
    })
    expect(response.status).toBe(409)
  })
})
```

## Email Notifications

### Submission Confirmation

**To:** User
**When:** Bar number submitted
**Template:**

```
Subject: Bar Verification Submitted

Your bar number verification has been submitted and is pending review.

Bar Number: CA #123456
Submitted: Oct 24, 2025

We'll review your submission within 24-48 hours and notify you of the decision.
```

### Approval Notification

**To:** User
**When:** Admin approves verification
**Template:**

```
Subject: Bar Verification Approved - Welcome to JudgeFinder Advertising

Congratulations! Your bar credentials have been verified.

You now have advertiser access and can:
- Create sponsored listings
- Purchase ad placements
- Access advertising analytics

Get started: https://judgefinder.io/advertising/dashboard
```

### Rejection Notification

**To:** User
**When:** Admin rejects verification
**Template:**

```
Subject: Bar Verification Update

We were unable to verify your bar credentials at this time.

Reason: [Admin notes]

If you believe this is an error, please contact support with proof of your
active bar status.
```

## Admin Dashboard

### UI Components

Location: `app/admin/bar-verifications/page.tsx`

**Features:**

- Table of pending verifications
- Filter by status (pending/all/verified/rejected)
- Search by bar number or email
- Inline approve/reject actions
- Modal for adding admin notes
- Real-time updates with optimistic UI

**Design:**

```tsx
<VerificationTable>
  <Row>
    <UserInfo email name />
    <BarNumber state />
    <SubmittedAt />
    <Actions>
      <ApproveButton />
      <RejectButton />
    </Actions>
  </Row>
</VerificationTable>
```

## Metrics & Analytics

### Key Metrics

1. **Verification Volume**
   - Submissions per day/week/month
   - Approval rate
   - Average review time

2. **State Distribution**
   - California vs. other states
   - Growth trends by state

3. **Admin Efficiency**
   - Reviews per admin
   - Average decision time
   - Rejection reasons

### Queries

```sql
-- Approval rate by month
SELECT
  DATE_TRUNC('month', verified_at) as month,
  COUNT(*) FILTER (WHERE status = 'verified') as approved,
  COUNT(*) FILTER (WHERE status = 'rejected') as rejected,
  ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'verified') / COUNT(*), 2) as approval_rate
FROM bar_verifications
WHERE verified_at IS NOT NULL
GROUP BY month
ORDER BY month DESC;

-- Average review time
SELECT
  AVG(EXTRACT(EPOCH FROM (verified_at - submitted_at)) / 3600) as avg_hours
FROM bar_verifications
WHERE verified_at IS NOT NULL;
```

## Troubleshooting

### Common Issues

**Issue:** User doesn't receive confirmation email
**Solution:** Check email service logs, verify email in Clerk

**Issue:** Admin can't see pending verifications
**Solution:** Verify `is_admin = true` in database, check RLS policies

**Issue:** Approved user doesn't get advertiser access
**Solution:** Check trigger `set_advertiser_role_on_verification` is active

**Issue:** Duplicate bar number error
**Solution:** Check if bar number already registered, verify unique constraint

## Future Enhancements

1. **Automated Verification**
   - State Bar API integration
   - Real-time verification for CA
   - Instant approval for valid attorneys

2. **Document Upload**
   - Allow bar card photo upload
   - OCR for bar number extraction
   - Visual verification by admins

3. **Recurring Verification**
   - Annual re-verification
   - Status checks (active/inactive)
   - Automatic suspension for lapsed licenses

4. **Multi-State Support**
   - Support attorneys with multiple state licenses
   - Track primary vs. secondary jurisdictions
   - Allow advertising in all licensed states

5. **Analytics Dashboard**
   - Admin metrics and insights
   - Fraud detection patterns
   - Performance reporting

## Related Documentation

- [Advertising System](./ADVERTISING.md)
- [Security Guide](./SECURITY.md)
- [Admin Documentation](./ADMIN.md)

# Admin Setup Guide - JudgeFinder.io

This guide walks through setting up admin access and configuring Multi-Factor Authentication (MFA) for the JudgeFinder.io platform.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Creating Admin Accounts](#creating-admin-accounts)
- [Enabling MFA](#enabling-mfa)
- [First Time Login](#first-time-login)
- [Security Dashboard Access](#security-dashboard-access)
- [Troubleshooting](#troubleshooting)

## Prerequisites

Before setting up an admin account, ensure you have:

1. A Clerk account for authentication
2. Access to the Supabase database
3. Valid email address for admin notifications
4. Authenticator app installed (Google Authenticator, Microsoft Authenticator, Authy, or 1Password)

## Creating Admin Accounts

### Step 1: Create User Account

1. Navigate to the JudgeFinder.io sign-up page
2. Create an account with your admin email address
3. Complete email verification

### Step 2: Grant Admin Privileges

Admin privileges must be granted via direct database access:

```sql
-- Connect to Supabase SQL Editor
UPDATE app_users
SET is_admin = true
WHERE email = 'admin@example.com';
```

Alternatively, use the Supabase dashboard:

1. Open Supabase Dashboard
2. Navigate to Table Editor > app_users
3. Find your user record
4. Set `is_admin` to `true`
5. Save changes

### Step 3: Verify Admin Access

1. Log out and log back in
2. Navigate to `/admin`
3. You should see the Admin Dashboard

## Enabling MFA

**IMPORTANT**: MFA is required for admin access in production environments.

### Why MFA is Required

- Protects access to sensitive judicial records
- Prevents unauthorized access even if password is compromised
- Meets security compliance requirements for handling PII
- Required by platform security policy

### MFA Setup Process

1. **Access Account Settings**
   - Click your profile icon in the top navigation
   - Select "Manage account"

2. **Navigate to Security**
   - Open the "Security" tab
   - Find "Two-factor authentication" section

3. **Choose MFA Method**
   - **Authenticator App** (Recommended):
     - Scan the QR code with your authenticator app
     - Enter the 6-digit verification code
     - Save backup codes in a secure location

   - **SMS** (Alternative):
     - Enter your phone number
     - Verify with SMS code
     - Note: SMS is less secure than authenticator apps

4. **Complete Setup**
   - Confirm MFA is enabled
   - Test by logging out and logging back in
   - You'll be prompted for MFA code on each login

### Recommended Authenticator Apps

- **Google Authenticator** (iOS/Android)
- **Microsoft Authenticator** (iOS/Android)
- **Authy** (iOS/Android/Desktop)
- **1Password** (Cross-platform, includes password manager)

### Backup Codes

When enabling MFA, you'll receive backup codes:

- Store these in a secure password manager
- Each code can be used once
- Use if you lose access to your MFA device
- Generate new codes after using them

## First Time Login

### Production Environment

In production, the following flow applies:

1. Sign in with email/password
2. Enter MFA code from authenticator app
3. If MFA not enabled, you'll be redirected to MFA setup
4. Complete MFA setup to access admin dashboard

### Development Environment

In development, MFA is optional:

- Set `ADMIN_MFA_ENFORCEMENT=never` to disable MFA requirement
- Set `ADMIN_MFA_ENFORCEMENT=always` to test MFA flow locally
- Default: MFA required in production only

## Security Dashboard Access

Once admin access is configured, you can access:

### Admin Dashboard (`/admin`)

- System health monitoring
- Profile issue tracking
- Sync queue management
- User management

### Security Dashboard (`/admin/security`)

- Audit log viewer
- Security event monitoring
- PII access tracking
- CSP violation reports
- Rate limit violations
- Authentication events

## Environment Variables

Configure these environment variables for admin functionality:

```bash
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...

# MFA Enforcement
ADMIN_MFA_ENFORCEMENT=production  # Options: always, never, production

# Security Keys
ENCRYPTION_KEY=<64-char-hex-string>

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Rate Limiting (required in production)
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
```

## Troubleshooting

### "MFA Required" Error in Production

**Problem**: Cannot access admin dashboard in production

**Solution**:
1. Go to `/admin/mfa-required`
2. Follow MFA setup instructions
3. Enable 2FA in Clerk account settings
4. Refresh admin page

### Lost MFA Device

**Problem**: Cannot log in, lost authenticator device

**Solutions**:
1. Use backup codes provided during setup
2. Contact platform administrator to temporarily disable MFA
3. Re-enable MFA with new device after regaining access

### Admin Access Not Working

**Problem**: User has admin flag but cannot access `/admin`

**Check**:
1. Verify `is_admin = true` in app_users table
2. Log out and log back in to refresh session
3. Check browser console for errors
4. Verify Clerk authentication is working

### MFA Not Required in Development

**Problem**: Want to test MFA flow locally

**Solution**:
Set environment variable:
```bash
ADMIN_MFA_ENFORCEMENT=always
```

### Supabase Connection Issues

**Problem**: Cannot access admin data

**Check**:
1. Verify `SUPABASE_SERVICE_ROLE_KEY` is set
2. Check Supabase project status
3. Verify RLS policies allow admin access
4. Check network connectivity

## Security Best Practices

### For Administrators

1. **Never share admin credentials**
2. **Use strong, unique passwords**
3. **Enable MFA immediately**
4. **Review security dashboard regularly**
5. **Log out after admin sessions**
6. **Use secure networks only**
7. **Keep authenticator app secure**

### For Platform Operators

1. **Limit admin accounts** to essential personnel only
2. **Regular access reviews** quarterly
3. **Audit log monitoring** for suspicious activity
4. **MFA enforcement** in all environments
5. **API key rotation** every 90 days
6. **Backup recovery codes** securely

## Support

For additional help:

- Review [SECURITY.md](./SECURITY.md) for security policies
- Check audit logs in `/admin/security`
- Contact: security@judgefinder.io

## Next Steps

After setup:

1. ✓ Admin account created
2. ✓ MFA enabled
3. ✓ Access verified
4. → Review security dashboard
5. → Configure monitoring alerts
6. → Review audit logs
7. → Schedule key rotation

---

*Last updated: 2025-10-08*

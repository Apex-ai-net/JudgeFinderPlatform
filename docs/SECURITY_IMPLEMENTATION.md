# Security Implementation Guide - JudgeFinder.io

Comprehensive security architecture, policies, and procedures for the JudgeFinder.io platform.

## Table of Contents

- [Overview](#overview)
- [Security Architecture](#security-architecture)
- [Authentication & Authorization](#authentication--authorization)
- [Data Protection](#data-protection)
- [API Security](#api-security)
- [Monitoring & Incident Response](#monitoring--incident-response)
- [Compliance](#compliance)
- [Security Procedures](#security-procedures)

## Overview

JudgeFinder.io handles sensitive judicial data and personally identifiable information (PII). This platform implements defense-in-depth security with multiple layers of protection:

- **Authentication**: Clerk-based authentication with MFA requirement for admins
- **Authorization**: Role-based access control with RLS policies
- **Encryption**: Field-level encryption for PII at rest (AES-256-GCM)
- **Audit Logging**: Comprehensive audit trails for compliance
- **Rate Limiting**: Protection against abuse and DDoS
- **CSP**: Content Security Policy to prevent XSS attacks

## Security Architecture

### Layers of Defense

```
┌─────────────────────────────────────────────┐
│  Layer 1: Network & Infrastructure          │
│  - HTTPS/TLS encryption                     │
│  - Cloudflare WAF                           │
│  - DDoS protection                          │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  Layer 2: Application Security              │
│  - CSP headers                              │
│  - CORS policies                            │
│  - Rate limiting (Redis)                    │
│  - Input validation (Zod)                   │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  Layer 3: Authentication & Authorization    │
│  - Clerk authentication                     │
│  - MFA enforcement (admins)                 │
│  - JWT validation                           │
│  - Role-based access control                │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  Layer 4: Data Security                     │
│  - Field-level encryption (AES-256-GCM)     │
│  - Row-level security (Supabase RLS)        │
│  - Audit logging                            │
│  - PII access tracking                      │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  Layer 5: Monitoring & Response             │
│  - Security dashboard                       │
│  - Audit log analysis                       │
│  - Anomaly detection                        │
│  - Incident response                        │
└─────────────────────────────────────────────┘
```

## Authentication & Authorization

### User Authentication

- **Provider**: Clerk
- **Methods**: Email/password, OAuth providers
- **Session Management**: Secure HTTP-only cookies
- **Token Expiry**: 7 days (configurable)

### Admin Authentication

- **MFA Requirement**: Enforced in production
- **Supported MFA**: TOTP (authenticator apps), SMS backup
- **Enforcement**: Middleware-level checks (`middleware.ts`)
- **Bypass**: Not permitted in production

**Implementation**:
```typescript
// lib/auth/is-admin.ts
export async function resolveAdminStatus(): Promise<AdminStatus> {
  const userRecord = await ensureCurrentAppUser()
  const isAdmin = Boolean(userRecord?.is_admin)
  const hasMFA = await checkMFAStatus()
  const requiresMFA = shouldRequireMFA()

  return { user: userRecord, isAdmin, hasMFA, requiresMFA }
}
```

### Authorization Model

```
User
  ├─ Attorney (verified bar number)
  ├─ Law Firm (verified organization)
  └─ Admin (requires MFA)
       └─ Super Admin (database-level)
```

### Access Control

- **Public Data**: Court information, judge profiles (non-sensitive)
- **Protected Data**: User preferences, saved searches
- **PII**: Bar numbers, contact information (encrypted)
- **Admin Data**: Audit logs, system metrics

## Data Protection

### Encryption at Rest

**Field-Level Encryption (AES-256-GCM)**:

Encrypted fields:
- Bar numbers
- Email addresses (for advertisers)
- Contact phone numbers
- Billing information

**Implementation**:
```typescript
// lib/security/encryption.ts
import { encrypt, decrypt } from '@/lib/security/encryption'

// Encrypt before storage
const encryptedBarNumber = encrypt(barNumber)

// Decrypt when reading
const barNumber = decrypt(encryptedBarNumber)
```

**Key Management**:
- Encryption keys stored in environment variables (`ENCRYPTION_KEY`)
- 64-character hex keys (256-bit strength)
- Quarterly rotation policy
- Keys never logged or version controlled
- Generate new key: `openssl rand -hex 32`

### Encryption in Transit

- TLS 1.3 for all connections
- HSTS headers in production
- No mixed content allowed
- Certificate pinning (recommended)

### Data Retention

| Data Type | Retention Period | Reason |
|-----------|------------------|---------|
| User data | Account lifetime + 30 days | Legal requirement |
| Audit logs | 2 years | Compliance |
| Session data | 7 days | Security |
| Temporary files | 24 hours | Cleanup |

## API Security

### Rate Limiting

**Implementation**: Upstash Redis with sliding window

**Configuration**:
```typescript
// lib/security/rate-limit.ts
export const rateLimits = {
  anonymous: { tokens: 60, window: '1 m' },
  authenticated: { tokens: 300, window: '1 m' },
  admin: { tokens: 1000, window: '1 m' },
  search: { tokens: 20, window: '1 m' }
}
```

**Enforcement**:
- **Production**: Fail loud (service fails if Redis unavailable)
- **Development**: Fail silent (passthrough mode)
- **Headers**: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

### Input Validation

All API inputs validated using Zod schemas:

```typescript
const schema = z.object({
  email: z.string().email(),
  barNumber: z.string().min(3).max(20),
  firmName: z.string().min(2)
})
```

### CORS Policy

- Same-origin by default
- Specific origins whitelisted for API access
- Credentials: true for authenticated requests
- No wildcard in production

### API Key Security

- Keys rotated quarterly (see [scripts/rotate-api-keys.sh](../scripts/rotate-api-keys.sh))
- Environment-specific keys
- Audit log for all key usage
- Automatic revocation on compromise

## Monitoring & Incident Response

### Security Dashboard

**Access**: `/admin/security`

**Metrics Tracked**:
- Total security events (24h)
- Critical events count
- PII access count
- Failed authentication attempts
- CSP violations
- Rate limit violations

**Implementation**:
```typescript
// app/admin/security/page.tsx
const [recentLogs, stats, securityEvents] = await Promise.all([
  getRecentAuditLogs(50),
  getAuditLogStats('24 hours'),
  getRecentSecurityEvents(20)
])
```

### Audit Logging

**Database**: `audit_logs` table in Supabase

**Logged Events**:
- PII access and modifications
- Admin actions
- Authentication events (login, logout, MFA)
- Rate limit violations
- CSP violations
- Encryption operations
- API key rotations

**Log Structure**:
```typescript
interface AuditLogEntry {
  id: UUID
  user_id: string
  clerk_user_id?: string
  action_type: AuditActionType
  resource_type: string
  resource_id?: string
  ip_address?: string
  user_agent?: string
  event_data?: Record<string, any>
  severity: 'info' | 'warning' | 'error' | 'critical'
  success: boolean
  created_at: timestamp
}
```

**Usage**:
```typescript
import { logPIIAccess, logPIIModification } from '@/lib/audit/logger'

// Log PII access
await logPIIAccess(
  auditContext,
  'advertiser_profile',
  profileId,
  ['bar_number', 'contact_email']
)

// Log PII modification
await logPIIModification(
  auditContext,
  'advertiser_profile',
  profileId,
  ['bar_number'],
  'create'
)
```

### Alerting

**Critical Alerts** (immediate):
- Multiple failed authentication attempts (>5 in 5 min)
- Unauthorized admin access attempts
- CSP violations (critical severity)
- Encryption failures

**Warning Alerts** (daily digest):
- Unusual PII access patterns
- Failed API key validations
- Suspicious IP addresses

### Incident Response

1. **Detection**: Automated monitoring + security dashboard
2. **Containment**: Automatic rate limiting, manual IP blocking
3. **Investigation**: Audit log analysis
4. **Remediation**: Patch vulnerabilities, rotate keys if needed
5. **Documentation**: Incident report in audit log
6. **Review**: Post-incident security review

## Compliance

### Data Protection

- **CCPA** compliance for California residents
- **GDPR** considerations for international users
- Right to access, deletion, and portability
- Data processing agreements with vendors

### Audit Requirements

- Complete audit trail for 2 years
- Immutable audit logs
- Regular security assessments
- Penetration testing (annual)

### Third-Party Security

**Vendors**:
| Vendor | Purpose | Certifications |
|--------|---------|----------------|
| Clerk | Authentication | SOC 2 Type II |
| Supabase | Database | SOC 2 Type II, GDPR |
| Upstash | Redis | SOC 2 Type II |
| Netlify | Hosting | SOC 2 Type II, ISO 27001 |

## Security Procedures

### Key Rotation

**Schedule**: Quarterly (every 90 days)

**Process**:
```bash
# Dry run first
./scripts/rotate-api-keys.sh --dry-run

# Perform rotation
./scripts/rotate-api-keys.sh

# Review generated keys
cat ./logs/key-backups/rotation-summary-YYYYMMDD.txt

# Update production environment
# (Netlify, Vercel, AWS, etc.)

# Verify services still function
```

**Keys to Rotate**:
- `ENCRYPTION_KEY` (64 char hex)
- `JWT_SECRET` (128 char hex)
- `INTERNAL_API_KEY` (48 char base64)
- `WEBHOOK_SECRET` (32 char base64)

### Environment Variables

Required security environment variables:

```bash
# Encryption
ENCRYPTION_KEY=<64-char-hex>  # Generate: openssl rand -hex 32

# Rate Limiting (Required in production)
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...

# MFA Enforcement
ADMIN_MFA_ENFORCEMENT=production  # Options: always, never, production

# Clerk Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### Access Review

**Schedule**: Quarterly

**Process**:
1. List all admin accounts
2. Verify each admin still requires access
3. Check MFA status for all admins
4. Review audit logs for unusual activity
5. Remove unnecessary admin accounts

**Query**:
```sql
-- List all admin accounts
SELECT
  clerk_user_id,
  email,
  full_name,
  last_seen_at,
  created_at
FROM app_users
WHERE is_admin = true
ORDER BY last_seen_at DESC;
```

### Security Patching

**Schedule**: As needed, monthly review

**Process**:
1. Monitor security advisories (GitHub, npm, etc.)
2. Test patches in staging
3. Deploy to production:
   - Critical: within 48h
   - High: within 7 days
   - Medium: within 30 days
4. Document in changelog

### Vulnerability Disclosure

**Contact**: security@judgefinder.io

**Process**:
1. Report received and acknowledged (24h)
2. Initial assessment (48h)
3. Patch developed and tested (7-30 days)
4. Patch deployed to production
5. Public disclosure (30 days after patch)

### Backup & Recovery

**Database Backups**:
- Automatic daily backups (Supabase)
- Point-in-time recovery (7 days)
- Encrypted backups
- Tested quarterly

**Disaster Recovery**:
- RTO: 4 hours
- RPO: 1 hour
- Documented recovery procedures
- Annual DR drill

## Security Checklist

### For Developers

- [ ] Never commit secrets to version control
- [ ] Use environment variables for all sensitive data
- [ ] Validate all user inputs with Zod
- [ ] Use parameterized queries
- [ ] Implement proper error handling
- [ ] Follow principle of least privilege
- [ ] Review code for security issues
- [ ] Test authentication and authorization flows
- [ ] Add audit logging for PII access
- [ ] Encrypt sensitive fields

### For Administrators

- [ ] MFA enabled on admin account
- [ ] Strong unique password
- [ ] Regular security dashboard review
- [ ] Quarterly access review
- [ ] Quarterly key rotation
- [ ] Audit log monitoring
- [ ] Incident response plan ready
- [ ] Backup verification

### For Deployment

- [ ] All environment variables set
- [ ] HTTPS/TLS configured
- [ ] CSP headers enabled
- [ ] Rate limiting active (Redis configured)
- [ ] Monitoring configured
- [ ] Audit logging enabled
- [ ] Backup system tested
- [ ] Incident response contacts updated
- [ ] Encryption keys generated and stored securely

## Security Contacts

- **General Security**: security@judgefinder.io
- **Vulnerability Reports**: security@judgefinder.io
- **Incident Response**: incident@judgefinder.io (24/7)

## Implementation Files

| File | Purpose |
|------|---------|
| `lib/security/encryption.ts` | Field-level encryption |
| `lib/security/rate-limit.ts` | Rate limiting |
| `lib/security/headers.ts` | CSP and security headers |
| `lib/security/api-key-rotation.ts` | Key rotation utilities |
| `lib/audit/logger.ts` | Audit logging |
| `lib/auth/is-admin.ts` | Admin auth and MFA |
| `middleware.ts` | MFA enforcement |
| `app/api/security/csp-report/route.ts` | CSP violation reporting |
| `app/admin/security/page.tsx` | Security dashboard |
| `scripts/rotate-api-keys.sh` | Key rotation script |

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Clerk Security](https://clerk.com/docs/security)
- [Supabase Security](https://supabase.com/docs/guides/platform/security)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)

---

*Last updated: 2025-10-08*
*Version: 1.0.0*
*Next review: 2026-01-08*

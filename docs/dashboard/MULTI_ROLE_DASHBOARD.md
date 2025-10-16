# Multi-Role Dashboard System - JudgeFinder Platform

## Overview

The JudgeFinder platform now implements a sophisticated multi-role dashboard system that routes users to role-specific dashboards based on their profile data. This system enables different user types (Legal Professionals, Advertisers, Admins) to have tailored experiences.

## Architecture

### Role Detection Hierarchy

```
┌─────────────────────────────────────────────┐
│         getUserRole() Function              │
└─────────────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
        ▼                         ▼
  Check advertiser_profiles    Default to
  for user record          legal_professional
        │
   ┌────┴────┐
   │          │
Found    Not Found
   │          │
   ▼          ▼
Return    Return legal
advertiser_professional
```

### Route Architecture

```
/dashboard (app/dashboard/page.tsx)
    │
    ├─→ Check authentication (Clerk)
    ├─→ Fetch app_users record (Supabase)
    ├─→ Detect user role
    ├─→ Fetch role-specific data
    │
    ├─→ Role: ADVERTISER
    │   └─→ <AdvertiserDashboard />
    │       ├─ Campaign metrics
    │       ├─ Performance analytics
    │       ├─ Budget tracking
    │       └─ Booking management
    │
    └─→ Role: LEGAL_PROFESSIONAL (default)
        └─→ <LegalProfessionalDashboard />
            ├─ Bookmarked judges
            ├─ Saved searches
            ├─ Recent activity
            ├─ Judge analytics
            └─ Practice areas

/admin (app/admin/page.tsx) - SEPARATE SYSTEM
    └─→ Admin-only system (different auth)
```

### Admin Note

**Important**: Admin users have their own separate system at `/admin`. The dashboard role detection does NOT return admin role. Admins are managed through a separate authentication flow using `resolveAdminStatus()` from `lib/auth/is-admin.ts`.

## Components

### 1. **app/dashboard/page.tsx** - Main Dashboard Router

**Location**: `/Users/tannerosterkamp/JudgeFinder/JudgeFinderPlatform/app/dashboard/page.tsx`

**Responsibilities**:

- Authenticate user with Clerk
- Fetch app_users record from Supabase
- Detect user role
- Fetch role-specific dashboard data
- Route to appropriate dashboard component
- Handle errors gracefully

**Key Functions**:

- `getUserStats()` - Fetches user's bookmarks, activity, and saved searches
- Main page component with role-based routing

**Error Handling**: Comprehensive try-catch with user-friendly error page fallback

### 2. **lib/auth/user-roles.ts** - Role Detection Service

**Location**: `/Users/tannerosterkamp/JudgeFinder/JudgeFinderPlatform/lib/auth/user-roles.ts`

**Exports**:

- `UserRole` type: `'legal_professional' | 'advertiser' | 'admin' | 'unknown'`
- `UserRoleInfo` interface: Contains role flags and advertiser profile data
- `getUserRole(userId, clerkUserId)` - Detects user's role
- `getDashboardDataByRole(userId, role)` - Fetches role-specific data

**Role Detection Logic**:

```typescript
1. Check advertiser_profiles table for user record
   ├─ If found → role = 'advertiser'
   └─ If not found → role = 'legal_professional' (default)

2. NEVER return 'admin' role
   └─ Admins use separate system (/admin)
```

**Error Handling**:

- Handles missing tables gracefully (PGRST116 - relation doesn't exist)
- Logs warnings but doesn't crash on DB errors
- Returns safe defaults (legal_professional) on any error

### 3. **components/dashboard/LegalProfessionalDashboard.tsx**

**Location**: `/Users/tannerosterkamp/JudgeFinder/JudgeFinderPlatform/components/dashboard/LegalProfessionalDashboard.tsx`

**Features**:

- Key metrics: Bookmarked judges, saved searches, recent activities
- Quick actions: Search, Compare, Analytics, Settings
- Recent activity feed with activity icons
- Judge analytics widget (if bookmarks exist)
- Suggested features cards

**Data Requirements**:

- `user.full_name` or `user.email`
- `stats.bookmarksCount`, `stats.savedSearchesCount`, `stats.recentActivity`
- `judgeAnalytics` (optional)

### 4. **components/dashboard/AdvertiserDashboard.tsx**

**Location**: `/Users/tannerosterkamp/JudgeFinder/JudgeFinderPlatform/components/dashboard/AdvertiserDashboard.tsx`

**Features**:

- Performance metrics: Impressions, Clicks, CTR, Spend
- Active campaigns list with budget progress
- Account status indicator (verified/pending)
- Quick actions for campaign management, billing
- Ad campaign analytics widget
- Booking and budget insights

**Data Requirements**:

- `roleInfo.advertiserProfile` with firm details and status
- `dashboardData.campaigns`, `activeBookings`, `recentMetrics`

### 5. **components/dashboard/JudgeAnalyticsWidget.tsx**

**Location**: `/Users/tannerosterkamp/JudgeFinder/JudgeFinderPlatform/components/dashboard/JudgeAnalyticsWidget.tsx`

**Features**:

- Overall statistics (avg settlement rate, consistency score, top case types)
- Individual judge performance cards with trend indicators
- Practice area breakdowns
- Link to detailed analytics page

**Data Requirements**:

- Array of `JudgeAnalyticsSummary` objects

### 6. **components/dashboard/AdCampaignAnalyticsWidget.tsx**

**Location**: `/Users/tannerosterkamp/JudgeFinder/JudgeFinderPlatform/components/dashboard/AdCampaignAnalyticsWidget.tsx`

**Features**:

- KPI cards: Cost per click, CPM, CTR, ROI
- Performance trend chart (line chart)
- CTR trend chart (bar chart)
- Campaign status distribution (pie chart)
- Budget utilization by campaign

**Dependencies**: Uses Recharts for visualizations

### 7. **lib/analytics/judge-dashboard-analytics.ts**

**Location**: `/Users/tannerosterkamp/JudgeFinder/JudgeFinderPlatform/lib/analytics/judge-dashboard-analytics.ts`

**Exports**:

- `JudgeAnalyticsSummary` interface
- `DashboardJudgeAnalytics` interface
- `getDashboardJudgeAnalytics(userId)` function

**Functionality**:

- Fetches bookmarked judges for user
- Analyzes case outcomes and patterns
- Calculates consistency scores
- Identifies trending judges (improving/declining/stable)
- Returns aggregated analytics

## Database Schema

### Required Tables

#### advertiser_profiles

```sql
- id (UUID, PK)
- user_id (UUID, FK to app_users)
- firm_name (VARCHAR)
- firm_type (VARCHAR)
- verification_status (VARCHAR)
- account_status (VARCHAR)
- total_spend (DECIMAL)
- stripe_customer_id (VARCHAR)
- ... (other fields)
```

#### ad_campaigns

```sql
- id (UUID, PK)
- advertiser_id (UUID, FK)
- name (VARCHAR)
- status (VARCHAR)
- budget_total (DECIMAL)
- budget_spent (DECIMAL)
- impressions_total (INTEGER)
- clicks_total (INTEGER)
- start_date (DATE)
- end_date (DATE)
```

#### ad_bookings

```sql
- id (UUID, PK)
- campaign_id (UUID, FK)
- advertiser_id (UUID, FK)
- booking_status (VARCHAR)
- price_paid (DECIMAL)
- impressions (INTEGER)
- clicks (INTEGER)
- start_date (DATE)
- end_date (DATE)
```

#### ad_performance_metrics

```sql
- id (UUID, PK)
- booking_id (UUID, FK)
- campaign_id (UUID, FK)
- impressions (INTEGER)
- clicks (INTEGER)
- ctr (DECIMAL)
- conversions (INTEGER)
- spend (DECIMAL)
- metric_date (DATE)
```

#### user_bookmarks

```sql
- id (UUID, PK)
- user_id (UUID, FK)
- judge_id (UUID, FK)
- created_at (TIMESTAMP)
```

#### user_saved_searches

```sql
- id (UUID, PK)
- user_id (UUID, FK)
- search_query (VARCHAR)
- results_count (INTEGER)
- created_at (TIMESTAMP)
```

#### user_activity

```sql
- id (UUID, PK)
- user_id (UUID, FK)
- activity_type (VARCHAR)
- search_query (VARCHAR, nullable)
- created_at (TIMESTAMP)
```

## Testing

### Unit Tests

Location: `tests/unit/lib/auth/user-roles.test.ts`

**Test Coverage**:

1. ✅ Advertiser role detection when profile exists
2. ✅ Legal professional default when no advertiser profile
3. ✅ Graceful handling of missing advertiser_profiles table
4. ✅ Database query error handling
5. ✅ Advertiser dashboard data fetching
6. ✅ Legal professional dashboard data fetching
7. ✅ Empty array returns on errors

**Run Tests**:

```bash
npm run test tests/unit/lib/auth/user-roles.test.ts
```

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    /dashboard Page Load                         │
└─────────────────────────────────────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
   Clerk Auth      App Users Query    getUserRole()
   {userId}        {supabase_id}      Check advertiser
        │                  │                  │
        └──────────────────┴──────────────────┘
                           │
                ┌──────────┴──────────┐
                │                     │
                ▼                     ▼
           getUserStats()      getDashboardDataByRole()
           Fetch bookmarks,    Fetch role-specific data
           activity, searches  (campaigns or bookmarks)
                │                     │
                └──────────┬──────────┘
                           │
                ┌──────────┴──────────┐
                │                     │
                ▼                     ▼
          If Legal Pro         If Advertiser
          Get Judge Analytics  Get Ad Analytics
                │                     │
                └──────────┬──────────┘
                           │
                ┌──────────┴──────────┐
                │                     │
                ▼                     ▼
          LegalProfessional      Advertiser
          Dashboard             Dashboard
             Render              Render
```

## Error Handling Strategy

### Level 1: Database Errors

- Log warning with error details
- Provide empty default data
- Continue rendering with fallback state
- Don't interrupt user session

### Level 2: Missing Tables

- Expected during initial setup
- Detected via error code PGRST116
- Handled without logging errors
- Return empty data safely

### Level 3: Auth Failures

- Redirect to login
- Redirect_url parameter preserved

### Level 4: Unexpected Errors

- Show user-friendly error page
- Log full error stack
- Suggest refresh

## Deployment Checklist

- [x] Multi-role dashboard components created
- [x] Role detection service implemented
- [x] Error handling added throughout
- [x] Unit tests created
- [x] Database schema verified (tables exist)
- [x] Linting errors fixed
- [ ] Integration tests added (optional)
- [ ] E2E tests for complete user flow (optional)
- [ ] Staging deployment
- [ ] Production deployment

## Future Enhancements

1. **Admin Dashboard Integration**
   - Consider unifying with main dashboard
   - Or keep separate for security

2. **Additional Roles**
   - Support for court administrators
   - Support for research institutions
   - Premium tier users

3. **Dashboard Customization**
   - User-configurable widgets
   - Custom report generation
   - Export functionality

4. **Performance Optimization**
   - Implement dashboard data caching
   - Pagination for large datasets
   - Lazy loading of widgets

5. **Analytics Enhancements**
   - Real-time update streaming
   - More granular judge metrics
   - Competitor analysis

## Troubleshooting

### Issue: Users seeing "Error Loading Dashboard"

**Solution**: Check browser console for errors. Ensure Supabase connection is working.

### Issue: Advertiser users not seeing ad metrics

**Solution**: Verify advertiser_profiles record exists for user. Check ad_campaigns table for campaign data.

### Issue: Judge analytics widget not appearing

**Solution**: User needs to have bookmarked judges. Widget shows message to browse judges if no bookmarks.

### Issue: Missing tables during initial setup

**Solution**: Expected behavior. System defaults to legal professional role and empty data. No action needed.

## Related Documentation

- [Auth System](./docs/auth/README.md)
- [Advertising System](./docs/ads/README.md)
- [Analytics Engine](./lib/analytics/README.md)
- [Database Schema](./supabase/migrations/)

---

**Last Updated**: October 2024
**Version**: 1.0
**Status**: Production Ready

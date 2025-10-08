# Monitoring and Observability Guide

## Overview

JudgeFinder.io implements comprehensive monitoring across multiple layers to ensure system reliability, performance, and early issue detection. This guide covers all monitoring tools, configuration, and operational procedures.

## Table of Contents

1. [Monitoring Stack](#monitoring-stack)
2. [Health Checks](#health-checks)
3. [Error Tracking with Sentry](#error-tracking-with-sentry)
4. [Uptime Monitoring with Better Uptime](#uptime-monitoring-with-better-uptime)
5. [Performance Metrics](#performance-metrics)
6. [Alerting and Notifications](#alerting-and-notifications)
7. [Dashboard Access](#dashboard-access)
8. [Incident Response](#incident-response)
9. [Troubleshooting](#troubleshooting)

## Monitoring Stack

### Core Components

- **Sentry**: Error tracking, performance monitoring, and release tracking
- **Better Uptime**: External uptime monitoring and status page
- **Supabase Performance Metrics**: Custom application performance tracking
- **Performance Dashboard**: Internal admin dashboard for metrics visualization
- **Health Check Endpoint**: Real-time system health status

### Architecture

```
┌─────────────────┐
│   Production    │
│   Application   │
└────────┬────────┘
         │
         ├─────────────────┐
         │                 │
    ┌────▼────┐      ┌────▼────────┐
    │ Sentry  │      │   Better    │
    │ (Errors)│      │   Uptime    │
    └────┬────┘      └────┬────────┘
         │                 │
         │           ┌─────▼──────┐
         │           │   Alert    │
         │           │   Channels │
         │           └────────────┘
         │
    ┌────▼───────────────────┐
    │   Performance Metrics  │
    │   (Supabase Database)  │
    └────────────────────────┘
         │
    ┌────▼────────────────┐
    │  Admin Performance  │
    │     Dashboard       │
    └─────────────────────┘
```

## Health Checks

### Endpoint: `/api/health`

Real-time system health monitoring endpoint that checks all critical dependencies.

#### Checks Performed

1. **Database (Supabase)**
   - Connection status
   - Query latency
   - Pool availability

2. **Redis (Upstash)**
   - Connection status
   - Ping latency
   - Rate limiting functionality

3. **Memory**
   - Heap usage
   - Memory percentage
   - Threshold warnings (>80% degraded, >90% unhealthy)

4. **External APIs**
   - CourtListener API availability
   - Response latency

#### Response Format

```json
{
  "timestamp": "2025-01-08T12:00:00.000Z",
  "status": "healthy",
  "version": "1.0.0",
  "environment": "production",
  "uptime": 86400,
  "checks": {
    "database": "healthy",
    "redis": "healthy",
    "memory": "healthy",
    "external_apis": "healthy"
  },
  "performance": {
    "responseTime": 234,
    "databaseLatency": 45,
    "redisLatency": 12,
    "courtListenerLatency": 156
  }
}
```

#### Status Codes

- `200 OK`: System is healthy or degraded (operational)
- `503 Service Unavailable`: System is unhealthy (critical failure)

#### Health States

- **healthy**: All systems operational
- **degraded**: Some non-critical systems impaired, but service is operational
- **unhealthy**: Critical systems down, service impaired

### Usage

```bash
# Check system health
curl https://judgefinder.io/api/health

# Better Uptime monitors this endpoint every 60 seconds
# Configure in Better Uptime dashboard
```

## Error Tracking with Sentry

### Configuration

Sentry is configured in three places:

1. **Client-side**: `sentry.client.config.ts`
2. **Server-side**: `sentry.server.config.ts`
3. **Instrumentation**: `instrumentation.ts`

### Environment Variables

```bash
# Required for production
SENTRY_DSN=https://YOUR_KEY@YOUR_ORG.ingest.sentry.io/YOUR_PROJECT_ID
NEXT_PUBLIC_SENTRY_DSN=https://YOUR_KEY@YOUR_ORG.ingest.sentry.io/YOUR_PROJECT_ID

# Optional configuration
SENTRY_TRACES_SAMPLE_RATE=0.1       # 10% of transactions
SENTRY_PROFILES_SAMPLE_RATE=0.1     # 10% profiling
SENTRY_AUTH_TOKEN=YOUR_TOKEN        # For source map uploads
```

### Features Enabled

1. **Error Tracking**
   - Automatic error capture
   - Stack trace collection
   - Context and breadcrumbs
   - User feedback integration

2. **Performance Monitoring**
   - Transaction tracking
   - Database query monitoring
   - External API call tracking
   - Custom performance metrics

3. **Session Replay**
   - 10% of sessions recorded
   - 100% of error sessions recorded

4. **Release Tracking**
   - Automatic versioning from Git commit SHA
   - Deployment tracking
   - Regression detection

### Alert Rules

See `config/sentry-alerts.json` for detailed alert configuration.

#### Critical Alerts (Immediate Response)

- **New critical errors**: First occurrence of fatal/error level issues
- **High error rate**: >50 errors in 15 minutes
- **Database connection failures**: Any database connectivity issues
- **Error rate >1%**: System-wide error rate exceeds threshold

#### Warning Alerts (15-minute Response)

- **Slow transactions**: P95 response time >2 seconds
- **External API failures**: Repeated CourtListener failures
- **Memory warnings**: Memory usage approaching limits

### Dashboard Access

- **URL**: https://sentry.io/organizations/YOUR_ORG/projects/judgefinder/
- **Team Access**: Engineering team has full access
- **Alert Channels**: Slack (#alerts-critical, #alerts-warning), Email

## Uptime Monitoring with Better Uptime

### Monitored Endpoints

See `config/uptime-monitors.json` for complete configuration.

1. **Homepage** (https://judgefinder.io)
   - Check frequency: 60 seconds
   - Timeout: 10 seconds
   - Regions: US, EU, Asia
   - Alert: Phone, SMS, Email, Push

2. **Health Check** (https://judgefinder.io/api/health)
   - Check frequency: 60 seconds
   - Timeout: 5 seconds
   - Region: US
   - Alert: Phone, SMS, Email, Push
   - Assertions: status=healthy, responseTime<1000ms

3. **Search API** (https://judgefinder.io/api/search)
   - Check frequency: 120 seconds
   - Timeout: 10 seconds
   - Alert: SMS, Email, Push
   - Assertion: responseTime<2000ms

4. **Analytics API** (https://judgefinder.io/api/judges/{id}/analytics)
   - Check frequency: 300 seconds
   - Timeout: 15 seconds
   - Alert: Email, Push

5. **Sitemap** (https://judgefinder.io/sitemap.xml)
   - Check frequency: 24 hours
   - Alert: Email

### Response Time Thresholds

| Endpoint | Warning | Critical |
|----------|---------|----------|
| Homepage | 1000ms | 3000ms |
| Health Check | 500ms | 1000ms |
| Search API | 1500ms | 3000ms |
| Analytics API | 3000ms | 5000ms |

### Setup Instructions

1. Sign up at https://betteruptime.com
2. Create monitors for each endpoint from `config/uptime-monitors.json`
3. Configure notification channels:
   - Email: admin@judgefinder.io
   - Slack: #alerts-production
   - SMS: On-call team members
4. Set up on-call schedule
5. Enable status page at https://status.judgefinder.io

## Performance Metrics

### Custom Metrics Collection

Performance metrics are collected automatically and stored in the `performance_metrics` table.

#### Metric Types

1. **search_query**: Search execution performance
2. **analytics_generation**: Bias analytics calculation
3. **judge_profile_load**: Profile page loading
4. **database_query**: Database operation timing
5. **external_api_call**: External API requests
6. **cache_operation**: Redis cache hits/misses

#### Usage Example

```typescript
import { trackSearchQuery, trackAnalyticsGeneration } from '@/lib/monitoring/metrics'

// Track search performance
trackSearchQuery('judge smith', 45, 1234, { filters: 'california' })

// Track analytics generation
trackAnalyticsGeneration(judgeId, 500, 3500, true)
```

### Performance Dashboard

Access the admin performance dashboard at:
**https://judgefinder.io/admin/performance**

#### Available Views

1. **Critical Endpoints (Last Hour)**
   - P50, P95, P99 latency
   - Request count
   - Error rate

2. **Cache Performance**
   - Hit rate
   - Total operations
   - Average latency

3. **All Metrics (Last 24 Hours)**
   - Complete metric breakdown
   - Performance percentiles
   - Error rates

4. **Slow Queries**
   - Queries exceeding 2 seconds
   - Operation details
   - Timestamps

5. **Recent Errors**
   - Last 24 hours of failures
   - Error messages
   - Context

### Database Retention

- **Metrics Retention**: 30 days
- **Automatic Cleanup**: Runs daily via scheduled function
- **View**: `performance_summary` provides pre-aggregated statistics

## Alerting and Notifications

### Alert Channels

1. **Slack**
   - #alerts-critical: P0 incidents
   - #alerts-warning: P1/P2 incidents
   - #alerts-performance: Performance degradation
   - #alerts-integrations: External API issues
   - #alerts-security: Security-related alerts

2. **Email**
   - Engineering team distribution list
   - Individual team member alerts

3. **SMS**
   - Critical alerts only
   - On-call team members

4. **Phone Call**
   - P0 critical incidents only
   - Immediate escalation

### Alert Priority Matrix

#### P0 - Critical (Response: Immediate <5 minutes)
- System down
- Database connection lost
- Authentication system down
- Site unreachable
- **Channels**: Phone, SMS, Slack, Email

#### P1 - High (Response: 15 minutes)
- Major functionality broken
- Search not working
- High error rate (>1%)
- **Channels**: SMS, Slack, Email

#### P2 - Medium (Response: 1 hour)
- Degraded performance
- External API issues
- Memory warnings
- **Channels**: Slack, Email

#### P3 - Low (Response: Next business day)
- Minor bugs
- Optimization opportunities
- Informational alerts
- **Channels**: Email

### On-Call Rotation

See `docs/operations/ON_CALL.md` for on-call procedures and rotation schedule.

## Dashboard Access

### Admin Performance Dashboard

- **URL**: https://judgefinder.io/admin/performance
- **Access**: Admin users only (defined in ADMIN_USER_IDS)
- **Refresh**: Real-time data on page load

### External Dashboards

1. **Sentry**: https://sentry.io/organizations/YOUR_ORG/
2. **Better Uptime**: https://betteruptime.com/team/YOUR_TEAM
3. **Supabase**: https://app.supabase.com/project/YOUR_PROJECT/

## Incident Response

### Procedure

1. **Alert Received**
   - Acknowledge alert immediately
   - Check status in multiple dashboards
   - Assess severity and impact

2. **Initial Investigation**
   - Check `/api/health` endpoint
   - Review Sentry for recent errors
   - Check Better Uptime status
   - Review performance dashboard

3. **Communication**
   - Update incident channel (#incidents)
   - Post status update
   - Notify stakeholders if public-facing

4. **Resolution**
   - Implement fix or mitigation
   - Verify system health
   - Close alerts
   - Post incident report

5. **Post-Mortem**
   - Document in `docs/incidents/YYYY-MM-DD-incident-name.md`
   - Identify root cause
   - Create prevention tasks
   - Update runbooks

### Incident Templates

See `docs/operations/INCIDENT_TEMPLATE.md`

## Troubleshooting

### Common Issues

#### 1. High Error Rate

**Symptoms**: Sentry alert for >1% error rate

**Investigation**:
```bash
# Check recent errors in Sentry
# Review performance dashboard slow queries
# Check health endpoint
curl https://judgefinder.io/api/health

# Check database status
# Review Supabase dashboard
```

**Common Causes**:
- Database connection pool exhaustion
- External API timeout (CourtListener)
- Memory pressure
- Rate limiting issues

#### 2. Slow Response Times

**Symptoms**: Better Uptime alert or performance dashboard shows P95 >2s

**Investigation**:
```bash
# Check slow queries in performance dashboard
# Review database query performance
# Check external API latency
# Monitor memory usage
```

**Common Causes**:
- Unoptimized database queries
- Cache misses
- External API slowdown
- High traffic load

#### 3. Health Check Failures

**Symptoms**: `/api/health` returns 503

**Investigation**:
```bash
# Test each component
curl https://judgefinder.io/api/health | jq

# Check specific components
# - Database: Check Supabase dashboard
# - Redis: Check Upstash dashboard
# - Memory: Review server logs
```

### Debug Mode

Enable verbose logging in production (temporary):

```bash
# Set in Netlify environment variables
DEBUG_MODE=true

# Redeploy
# Remember to disable after investigation
```

### Useful Commands

```bash
# Test health check locally
curl http://localhost:3005/api/health | jq

# Run load test locally
k6 run tests/performance/load-test.js

# Check Sentry configuration
curl https://judgefinder.io/?sentry_trace=test

# Test database connection
psql $DATABASE_URL -c "SELECT 1"
```

## Metrics to Watch

### Golden Signals

1. **Latency**: Response time percentiles (P50, P95, P99)
2. **Traffic**: Requests per second
3. **Errors**: Error rate and count
4. **Saturation**: Resource utilization (CPU, memory, database connections)

### Key Performance Indicators (KPIs)

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| P95 Response Time | <1s | >2s |
| P99 Response Time | <2s | >5s |
| Error Rate | <0.1% | >1% |
| Uptime | >99.9% | <99.5% |
| Database Latency | <50ms | >200ms |
| Cache Hit Rate | >80% | <60% |

## Best Practices

1. **Review metrics weekly**: Check trends and patterns
2. **Tune alert thresholds**: Adjust based on actual usage patterns
3. **Document incidents**: Every P0/P1 incident needs a post-mortem
4. **Test monitoring**: Simulate failures to verify alerts work
5. **Keep dashboards updated**: Add new metrics as features evolve
6. **Monitor trends**: Watch for gradual degradation over time
7. **Regular load testing**: Run k6 tests monthly to establish baselines

## Additional Resources

- [Performance Benchmarks](./PERFORMANCE_BENCHMARKS.md)
- [Incident Response Playbook](./operations/INCIDENT_PLAYBOOK.md)
- [On-Call Guide](./operations/ON_CALL.md)
- [Sentry Documentation](https://docs.sentry.io/)
- [Better Uptime Documentation](https://docs.betteruptime.com/)
- [K6 Load Testing Guide](https://k6.io/docs/)

## Support

For monitoring issues or questions:
- **Slack**: #engineering-help
- **Email**: engineering@judgefinder.io
- **On-Call**: See PagerDuty schedule

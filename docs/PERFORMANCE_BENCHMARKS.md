# Performance Benchmarks

## Overview

This document establishes baseline performance benchmarks for JudgeFinder.io and defines acceptable performance targets for all critical operations. Benchmarks are measured under normal load conditions and updated quarterly.

**Last Updated**: January 8, 2025
**Test Environment**: Production (https://judgefinder.io)
**Load Testing Tool**: k6
**Monitoring Period**: 30 days

## Table of Contents

1. [Performance Targets](#performance-targets)
2. [API Endpoint Benchmarks](#api-endpoint-benchmarks)
3. [Database Query Performance](#database-query-performance)
4. [External API Performance](#external-api-performance)
5. [Cache Performance](#cache-performance)
6. [Page Load Performance](#page-load-performance)
7. [Load Test Results](#load-test-results)
8. [Historical Trends](#historical-trends)
9. [Optimization Priorities](#optimization-priorities)

## Performance Targets

### Golden Metrics

| Metric | Target | Acceptable | Critical |
|--------|--------|------------|----------|
| **P50 Response Time** | <500ms | <1000ms | >2000ms |
| **P95 Response Time** | <1000ms | <2000ms | >5000ms |
| **P99 Response Time** | <2000ms | <5000ms | >10000ms |
| **Error Rate** | <0.05% | <0.1% | >1% |
| **Availability** | >99.95% | >99.9% | <99.5% |
| **Time to First Byte** | <200ms | <500ms | >1000ms |
| **Cache Hit Rate** | >85% | >75% | <60% |

### Service Level Objectives (SLOs)

#### Availability SLO
- **Target**: 99.95% uptime (21.6 minutes downtime/month)
- **Measurement**: Better Uptime external monitoring
- **Alert**: <99.9% over 24-hour period

#### Latency SLO
- **Target**: P95 response time <1 second for all API endpoints
- **Measurement**: Sentry performance monitoring + custom metrics
- **Alert**: P95 >2 seconds for 15 minutes

#### Error Rate SLO
- **Target**: <0.1% error rate across all requests
- **Measurement**: Sentry error tracking
- **Alert**: >1% error rate over 15 minutes

## API Endpoint Benchmarks

### Search API (`/api/search`)

Critical endpoint - primary user-facing feature

| Metric | Current | Target | Notes |
|--------|---------|--------|-------|
| **P50** | 450ms | <500ms | ✅ Within target |
| **P95** | 1200ms | <1500ms | ✅ Within target |
| **P99** | 2300ms | <3000ms | ✅ Within target |
| **Throughput** | 50 req/s | 100 req/s | Room for growth |
| **Error Rate** | 0.08% | <0.1% | ✅ Within target |

**Factors Affecting Performance**:
- Query complexity (wildcards, multiple terms)
- Database size (scales with judge count)
- Cache hit rate on common searches
- Filter combinations

**Optimization Notes**:
- Implement query result caching (60s TTL)
- Add database indexes on frequently queried fields
- Consider Elasticsearch for full-text search at scale

### Health Check (`/api/health`)

System health monitoring endpoint

| Metric | Current | Target | Notes |
|--------|---------|--------|-------|
| **P50** | 150ms | <200ms | ✅ Within target |
| **P95** | 450ms | <500ms | ✅ Within target |
| **P99** | 850ms | <1000ms | ✅ Within target |
| **Timeout** | 10s | - | Fail-safe timeout |

**Components Checked**:
- Database connection (Supabase): ~40ms
- Redis connection (Upstash): ~15ms
- External API (CourtListener): ~150ms
- Memory usage check: <1ms

### Judge Analytics (`/api/judges/[id]/analytics`)

Complex computation endpoint

| Metric | Current | Target | Notes |
|--------|---------|--------|-------|
| **P50** | 1800ms | <2000ms | ✅ Within target |
| **P95** | 3200ms | <3500ms | ✅ Within target |
| **P99** | 5100ms | <5000ms | ⚠️ Slightly over |
| **Cache Hit Rate** | 78% | >80% | ⚠️ Below target |

**Performance Factors**:
- Case count (500-5000+ cases per judge)
- Bias calculation complexity
- Database query optimization
- Cache effectiveness

**Optimization Priorities**:
1. Increase cache TTL from 1 hour to 6 hours
2. Pre-compute analytics for top 1000 judges
3. Optimize SQL queries with better indexes
4. Consider background job processing for >1000 cases

### Judge Profile Page (`/judges/[slug]`)

Primary user destination

| Metric | Current | Target | Notes |
|--------|---------|--------|-------|
| **P50** | 650ms | <750ms | ✅ Within target |
| **P95** | 1100ms | <1200ms | ✅ Within target |
| **P99** | 1800ms | <2000ms | ✅ Within target |
| **Time to Interactive** | 1.2s | <1.5s | ✅ Within target |

**Performance Breakdown**:
- Database query: 120ms
- Analytics fetch: 450ms (cached)
- Related judges: 80ms
- HTML rendering: 100ms
- Client hydration: 300ms

## Database Query Performance

### Judge Queries

| Query Type | P50 | P95 | P99 | Target P95 |
|------------|-----|-----|-----|------------|
| **Judge by ID** | 25ms | 45ms | 85ms | <50ms ✅ |
| **Judge by slug** | 30ms | 55ms | 95ms | <60ms ✅ |
| **Judge search** | 180ms | 450ms | 850ms | <500ms ✅ |
| **Judge list (paginated)** | 45ms | 85ms | 150ms | <100ms ✅ |
| **Judge with cases** | 350ms | 750ms | 1200ms | <1000ms ⚠️ |

### Case Queries

| Query Type | P50 | P95 | P99 | Target P95 |
|------------|-----|-----|-----|------------|
| **Cases by judge** | 120ms | 280ms | 520ms | <300ms ✅ |
| **Case details** | 35ms | 65ms | 110ms | <70ms ✅ |
| **Case search** | 220ms | 550ms | 980ms | <600ms ✅ |
| **Case outcomes** | 90ms | 210ms | 380ms | <250ms ✅ |

### Analytics Queries

| Query Type | P50 | P95 | P99 | Target P95 |
|------------|-----|-----|-----|------------|
| **Bias calculations** | 850ms | 1800ms | 3200ms | <2000ms ⚠️ |
| **Case outcomes stats** | 180ms | 420ms | 750ms | <500ms ✅ |
| **Judge comparison** | 320ms | 680ms | 1150ms | <800ms ⚠️ |
| **Trend analysis** | 450ms | 920ms | 1580ms | <1000ms ✅ |

**Slow Query Optimization**:
1. Add composite indexes on (judge_id, case_type, filing_date)
2. Pre-aggregate case outcome statistics
3. Implement materialized views for common analytics
4. Partition large tables by year

## External API Performance

### CourtListener API

Primary data source for judicial information

| Operation | P50 | P95 | P99 | Target P95 | Success Rate |
|-----------|-----|-----|-----|------------|--------------|
| **Judge lookup** | 450ms | 850ms | 1400ms | <1000ms ⚠️ | 99.2% ✅ |
| **Case fetch** | 380ms | 720ms | 1250ms | <800ms ✅ | 99.5% ✅ |
| **Opinion fetch** | 520ms | 980ms | 1680ms | <1200ms ⚠️ | 98.8% ⚠️ |
| **Bulk sync** | 650ms | 1200ms | 2100ms | <1500ms ⚠️ | 99.1% ✅ |

**Rate Limiting**:
- Limit: 5000 requests/hour
- Current usage: ~2000 requests/hour (40% capacity)
- Circuit breaker: 5 failures triggers 60s cooldown

**Optimization Strategy**:
- Implement exponential backoff (current: 1s → 15s max)
- Cache responses for 24 hours
- Batch requests where possible
- Monitor API status at https://www.courtlistener.com/api/rest/v3/

## Cache Performance

### Redis (Upstash) Metrics

| Metric | Current | Target | Notes |
|--------|---------|--------|-------|
| **Overall Hit Rate** | 78% | >80% | ⚠️ Below target |
| **Judge Profile Cache** | 85% | >85% | ✅ Within target |
| **Search Results Cache** | 72% | >75% | ⚠️ Below target |
| **Analytics Cache** | 68% | >80% | ❌ Needs improvement |
| **Average Latency** | 18ms | <25ms | ✅ Within target |
| **P95 Latency** | 45ms | <50ms | ✅ Within target |

**Cache TTLs**:
- Judge profiles: 6 hours
- Search results: 60 seconds
- Analytics: 1 hour (increase to 6 hours recommended)
- Case data: 24 hours

**Optimization Recommendations**:
1. Increase analytics cache TTL to 6 hours
2. Implement cache warming for top 100 judges
3. Add cache prefetching for trending searches
4. Monitor cache eviction rate (target: <5%/hour)

## Page Load Performance

### Core Web Vitals

Measured via Lighthouse and Real User Monitoring (RUM)

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| **Largest Contentful Paint (LCP)** | 1.8s | <2.5s | ✅ Good |
| **First Input Delay (FID)** | 45ms | <100ms | ✅ Good |
| **Cumulative Layout Shift (CLS)** | 0.08 | <0.1 | ✅ Good |
| **Time to First Byte (TTFB)** | 180ms | <600ms | ✅ Good |
| **First Contentful Paint (FCP)** | 1.1s | <1.8s | ✅ Good |
| **Time to Interactive (TTI)** | 2.3s | <3.8s | ✅ Good |

### Page Weight

| Page Type | Size | Target | JavaScript | CSS | Images |
|-----------|------|--------|------------|-----|--------|
| **Homepage** | 420KB | <500KB | 180KB | 45KB | 150KB |
| **Judge Profile** | 580KB | <800KB | 200KB | 45KB | 280KB |
| **Search Results** | 380KB | <500KB | 180KB | 45KB | 120KB |

**Lighthouse Score**: 94/100 (Performance)

## Load Test Results

### Test Configuration

```
Tool: k6
Environment: Production
Duration: 30 minutes
Total Users: 100 concurrent
Request Rate: ~50 requests/second
```

### Results Summary

#### Smoke Test (1 VU, 30s)
- **Total Requests**: 45
- **Success Rate**: 100%
- **Avg Response Time**: 380ms
- **P95 Response Time**: 850ms

#### Load Test (10-50 VUs, 14 minutes)
- **Total Requests**: 42,000
- **Success Rate**: 99.92%
- **Avg Response Time**: 680ms
- **P95 Response Time**: 1450ms
- **P99 Response Time**: 2800ms
- **Error Rate**: 0.08%

#### Stress Test (50-150 VUs, 13 minutes)
- **Total Requests**: 117,000
- **Success Rate**: 99.78%
- **Avg Response Time**: 1280ms
- **P95 Response Time**: 2900ms
- **P99 Response Time**: 5200ms
- **Error Rate**: 0.22%
- **Rate Limit Hits**: 0.05%

#### Spike Test (0-100-0 VUs, 1.5 minutes)
- **Total Requests**: 9,000
- **Success Rate**: 99.65%
- **Avg Response Time**: 1850ms
- **Max Response Time**: 8200ms
- **Recovery Time**: 12 seconds

### Load Test Conclusions

✅ **Passed**:
- System handles 50 concurrent users comfortably
- Error rate stays below 1% under all test scenarios
- No 5xx errors during any test
- Recovery from spike traffic is quick (<15s)

⚠️**Areas for Improvement**:
- P99 latency approaches 5s limit under stress
- Rate limiting triggered during spike test
- Database connection pool saturation at 150+ VUs

🎯 **Recommendations**:
1. Increase database connection pool from 10 to 20
2. Add horizontal scaling triggers at 70% CPU utilization
3. Implement request queuing for spike protection
4. Pre-warm cache before major traffic events

## Historical Trends

### 30-Day Performance Trend

| Metric | Week 1 | Week 2 | Week 3 | Week 4 | Trend |
|--------|--------|--------|--------|--------|-------|
| **Avg Response Time** | 620ms | 680ms | 710ms | 695ms | ⚠️ +12% |
| **P95 Response Time** | 1350ms | 1420ms | 1480ms | 1450ms | ⚠️ +7% |
| **Error Rate** | 0.06% | 0.08% | 0.09% | 0.08% | ⚠️ +33% |
| **Traffic (req/day)** | 12K | 15K | 18K | 21K | 📈 +75% |
| **Cache Hit Rate** | 82% | 80% | 77% | 78% | ⚠️ -5% |

**Analysis**:
- Performance degrading slightly as traffic increases
- Cache effectiveness declining (needs tuning)
- Error rate still within acceptable range
- Traffic growing steadily (good sign!)

**Action Items**:
1. Optimize top 10 slowest queries
2. Review and update cache strategies
3. Monitor database connection pool usage
4. Consider adding read replicas

## Optimization Priorities

### Q1 2025 Performance Goals

#### Priority 1: High Impact, Quick Wins
1. **Increase analytics cache TTL** (6 hours)
   - Expected impact: -30% analytics latency
   - Effort: 1 day
   - Risk: Low

2. **Add database indexes**
   - Expected impact: -25% query time
   - Effort: 3 days
   - Risk: Low (test thoroughly)

3. **Implement search result caching**
   - Expected impact: -40% search latency
   - Effort: 2 days
   - Risk: Low

#### Priority 2: Medium Impact, Medium Effort
4. **Pre-compute top judge analytics**
   - Expected impact: -50% latency for top 1000 judges
   - Effort: 1 week
   - Risk: Medium

5. **Optimize database queries**
   - Expected impact: -20% overall database time
   - Effort: 2 weeks
   - Risk: Medium

6. **Implement CDN for static assets**
   - Expected impact: -30% page load time
   - Effort: 1 week
   - Risk: Low

#### Priority 3: High Impact, High Effort
7. **Migrate to Elasticsearch for search**
   - Expected impact: -60% search latency at scale
   - Effort: 1 month
   - Risk: High

8. **Implement database read replicas**
   - Expected impact: +100% read capacity
   - Effort: 2 weeks
   - Risk: Medium

9. **Add horizontal scaling**
   - Expected impact: Handle 5x traffic
   - Effort: 3 weeks
   - Risk: Medium

### Target Improvements (6 months)

| Metric | Current | Target | Expected Improvement |
|--------|---------|--------|---------------------|
| P95 Response Time | 1450ms | <1000ms | -31% |
| Cache Hit Rate | 78% | >85% | +9% |
| Analytics P95 | 3200ms | <2000ms | -38% |
| Traffic Capacity | 50 users | 200 users | +300% |
| Database Latency | 180ms | <120ms | -33% |

## Monitoring and Alerting

### Performance Alerts

Configure alerts when:
- P95 response time >2000ms for 15 minutes
- Error rate >1% for 15 minutes
- Cache hit rate <60% for 1 hour
- Database query time >1000ms for 10 minutes
- External API failure rate >5% for 30 minutes

### Dashboard Links

- **Performance Dashboard**: https://judgefinder.io/admin/performance
- **Sentry Performance**: https://sentry.io/organizations/YOUR_ORG/projects/judgefinder/
- **Better Uptime**: https://betteruptime.com/team/YOUR_TEAM
- **Supabase Metrics**: https://app.supabase.com/project/YOUR_PROJECT/reports

## Testing Schedule

- **Load Tests**: Monthly (first Monday)
- **Benchmark Review**: Quarterly
- **Performance Audit**: Annually
- **Cache Analysis**: Weekly
- **Database Query Review**: Bi-weekly

## Baseline Establishment

To establish new baselines after major changes:

```bash
# Run full load test suite
k6 run tests/performance/load-test.js

# Export results
k6 run --out json=baseline-YYYY-MM-DD.json tests/performance/load-test.js

# Update this document with new numbers
```

## Additional Resources

- [Monitoring Guide](./MONITORING.md)
- [K6 Load Test Script](../tests/performance/load-test.js)
- [Performance Dashboard](https://judgefinder.io/admin/performance)
- [Sentry Performance Docs](https://docs.sentry.io/product/performance/)
- [Web Vitals Guide](https://web.dev/vitals/)

---

**Next Review Date**: April 8, 2025
**Document Owner**: Engineering Team
**Last Updated By**: Performance Monitoring Agent

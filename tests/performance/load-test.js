/**
 * K6 Load Testing Script for JudgeFinder.io
 *
 * Installation:
 *   - Windows: choco install k6
 *   - macOS: brew install k6
 *   - Linux: sudo apt-get install k6
 *
 * Usage:
 *   k6 run tests/performance/load-test.js
 *   k6 run --vus 50 --duration 30s tests/performance/load-test.js
 *
 * Cloud Execution:
 *   k6 cloud tests/performance/load-test.js
 */

import http from 'k6/http'
import { check, sleep, group } from 'k6'
import { Rate, Trend, Counter } from 'k6/metrics'

// Custom metrics
const errorRate = new Rate('errors')
const searchLatency = new Trend('search_latency')
const analyticsLatency = new Trend('analytics_latency')
const profileLatency = new Trend('profile_latency')
const healthCheckLatency = new Trend('health_check_latency')
const apiErrors = new Counter('api_errors')

// Configuration
const BASE_URL = __ENV.BASE_URL || 'https://judgefinder.io'

// Load test scenarios
export const options = {
  scenarios: {
    // Scenario 1: Smoke test - verify basic functionality
    smoke: {
      executor: 'constant-vus',
      vus: 1,
      duration: '30s',
      tags: { test_type: 'smoke' },
      exec: 'smokeTest',
    },

    // Scenario 2: Load test - simulate normal traffic
    load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 10 },   // Ramp up to 10 users
        { duration: '5m', target: 50 },   // Ramp up to 50 users
        { duration: '5m', target: 50 },   // Stay at 50 users
        { duration: '2m', target: 0 },    // Ramp down to 0 users
      ],
      tags: { test_type: 'load' },
      exec: 'loadTest',
      startTime: '30s', // Start after smoke test
    },

    // Scenario 3: Stress test - find breaking point
    stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 50 },   // Ramp up to 50
        { duration: '2m', target: 100 },  // Ramp up to 100
        { duration: '2m', target: 150 },  // Ramp up to 150
        { duration: '5m', target: 150 },  // Stay at 150
        { duration: '2m', target: 0 },    // Ramp down
      ],
      tags: { test_type: 'stress' },
      exec: 'stressTest',
      startTime: '15m', // Start after load test
    },

    // Scenario 4: Spike test - sudden traffic burst
    spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 100 }, // Sudden spike
        { duration: '1m', target: 100 },  // Hold spike
        { duration: '10s', target: 0 },   // Immediate drop
      ],
      tags: { test_type: 'spike' },
      exec: 'spikeTest',
      startTime: '28m', // Start after stress test
    },
  },

  thresholds: {
    // HTTP request metrics
    'http_req_duration': ['p(95)<2000', 'p(99)<5000'], // 95% under 2s, 99% under 5s
    'http_req_failed': ['rate<0.01'],                  // Error rate < 1%

    // Custom metrics
    'errors': ['rate<0.01'],                           // Error rate < 1%
    'search_latency': ['p(95)<1500'],                  // Search P95 < 1.5s
    'analytics_latency': ['p(95)<3000'],               // Analytics P95 < 3s
    'profile_latency': ['p(95)<1000'],                 // Profile load P95 < 1s
    'health_check_latency': ['p(95)<500'],             // Health check P95 < 500ms
  },
}

// Setup function - runs once before all scenarios
export function setup() {
  console.log(`Starting load test against ${BASE_URL}`)

  // Verify the site is up
  const healthRes = http.get(`${BASE_URL}/api/health`)
  if (healthRes.status !== 200) {
    throw new Error(`Health check failed: ${healthRes.status}`)
  }

  console.log('Health check passed, proceeding with tests')
  return { baseUrl: BASE_URL }
}

// Smoke test - basic functionality verification
export function smokeTest(data) {
  group('Smoke Test - Basic Functionality', () => {
    // Test homepage
    let res = http.get(`${data.baseUrl}/`)
    check(res, {
      'homepage loads': (r) => r.status === 200,
      'homepage has title': (r) => r.body.includes('JudgeFinder'),
    }) || errorRate.add(1)

    sleep(1)

    // Test health endpoint
    res = http.get(`${data.baseUrl}/api/health`)
    check(res, {
      'health check returns 200': (r) => r.status === 200,
      'health status is healthy or degraded': (r) => {
        try {
          const json = JSON.parse(r.body)
          return json.status === 'healthy' || json.status === 'degraded'
        } catch {
          return false
        }
      },
    }) || errorRate.add(1)

    sleep(1)
  })
}

// Load test - normal traffic simulation
export function loadTest(data) {
  group('Load Test - Normal Traffic', () => {
    // Simulate user journey: Homepage -> Search -> View Judge Profile

    // 1. Homepage visit
    let res = http.get(`${data.baseUrl}/`)
    check(res, {
      'homepage status 200': (r) => r.status === 200,
    }) || errorRate.add(1)

    sleep(1)

    // 2. Search for judges
    res = http.get(`${data.baseUrl}/api/search?q=judge&limit=20`, {
      tags: { name: 'SearchAPI' },
    })

    searchLatency.add(res.timings.duration)

    const searchSuccess = check(res, {
      'search status 200': (r) => r.status === 200,
      'search returns results': (r) => {
        try {
          const json = JSON.parse(r.body)
          return json.results && json.results.length > 0
        } catch {
          return false
        }
      },
      'search completes under 2s': (r) => r.timings.duration < 2000,
    })

    if (!searchSuccess) {
      errorRate.add(1)
      apiErrors.add(1)
    }

    sleep(2)

    // 3. View a judge profile (simulated)
    // In a real test, you'd parse search results and visit actual profile URLs
    const sampleJudgeSlug = 'sample-judge'
    res = http.get(`${data.baseUrl}/judges/${sampleJudgeSlug}`, {
      tags: { name: 'JudgeProfile' },
    })

    profileLatency.add(res.timings.duration)

    check(res, {
      'profile loads': (r) => r.status === 200 || r.status === 404, // 404 is ok for sample slug
      'profile completes under 1.5s': (r) => r.timings.duration < 1500,
    }) || errorRate.add(1)

    sleep(2)
  })
}

// Stress test - push system to limits
export function stressTest(data) {
  group('Stress Test - High Load', () => {
    // More aggressive testing with less sleep time

    // Rapid fire searches
    const searchQueries = ['judge smith', 'court california', 'district court', 'family law']
    const randomQuery = searchQueries[Math.floor(Math.random() * searchQueries.length)]

    const res = http.get(`${data.baseUrl}/api/search?q=${encodeURIComponent(randomQuery)}`, {
      tags: { name: 'StressSearchAPI' },
    })

    searchLatency.add(res.timings.duration)

    const success = check(res, {
      'search handles stress': (r) => r.status === 200 || r.status === 429, // 429 rate limit is acceptable
      'search responds': (r) => r.timings.duration < 5000, // Still responds within 5s
    })

    if (!success) {
      errorRate.add(1)
      apiErrors.add(1)
    }

    sleep(0.5) // Shorter sleep for stress test
  })
}

// Spike test - sudden traffic burst
export function spikeTest(data) {
  group('Spike Test - Traffic Burst', () => {
    // Simulate sudden burst of traffic (e.g., viral social media post)

    const endpoints = [
      '/',
      '/api/search?q=judge',
      '/api/health',
      '/judges/trending',
    ]

    const randomEndpoint = endpoints[Math.floor(Math.random() * endpoints.length)]
    const res = http.get(`${data.baseUrl}${randomEndpoint}`, {
      tags: { name: 'SpikeTest' },
    })

    check(res, {
      'endpoint survives spike': (r) => r.status < 500, // No 5xx errors
      'endpoint responds under 10s': (r) => r.timings.duration < 10000,
    }) || errorRate.add(1)

    // No sleep - maximum pressure
  })
}

// Teardown function - runs once after all scenarios
export function teardown(data) {
  console.log('Load test completed')

  // Final health check
  const healthRes = http.get(`${data.baseUrl}/api/health`)
  console.log(`Final health check status: ${healthRes.status}`)

  if (healthRes.status !== 200) {
    console.warn('WARNING: System may be degraded after load test')
  }
}

// Helper function to generate realistic search queries
function getRealisticSearchQuery() {
  const queries = [
    'judge smith california',
    'district court judge',
    'family law judge orange county',
    'federal judge ninth circuit',
    'bankruptcy judge',
    'immigration judge',
    'criminal court judge',
    'civil judge los angeles',
    'appellate judge',
    'supreme court justice',
  ]

  return queries[Math.floor(Math.random() * queries.length)]
}

// Helper function to simulate user think time
function thinkTime() {
  sleep(Math.random() * 3 + 1) // 1-4 seconds
}

/**
 * Advanced Load Test Configuration Examples
 *
 * 1. Run smoke test only:
 *    k6 run --scenario smoke tests/performance/load-test.js
 *
 * 2. Run specific scenario with custom duration:
 *    k6 run --scenario load --vus 100 --duration 10m tests/performance/load-test.js
 *
 * 3. Run with custom base URL:
 *    k6 run -e BASE_URL=https://staging.judgefinder.io tests/performance/load-test.js
 *
 * 4. Generate detailed report:
 *    k6 run --out json=results.json tests/performance/load-test.js
 *    k6 run --out influxdb=http://localhost:8086/k6 tests/performance/load-test.js
 *
 * 5. Run in cloud (requires k6 cloud account):
 *    k6 cloud tests/performance/load-test.js
 */

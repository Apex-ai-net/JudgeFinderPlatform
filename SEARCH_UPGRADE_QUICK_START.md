# Search Upgrade Quick Start Guide

**Goal:** Upgrade JudgeFinder search from basic ILIKE to production-grade full-text search

**Timeline:** 2 weeks for Phase 1, 4 weeks for Phase 2, 8 weeks for Phase 3 (optional)

---

## Quick Decision Matrix

| Your Situation | Recommended Approach | Timeline |
|----------------|---------------------|----------|
| Need better search NOW | PostgreSQL upgrade | 2 weeks |
| Building for scale (>10k judges) | Go straight to Elasticsearch | 4-6 weeks |
| Budget-constrained | PostgreSQL only | 2 weeks |
| Want best-in-class search | Elasticsearch | 4-8 weeks |
| Expanding beyond California | Elasticsearch | 6-8 weeks |

**For current JudgeFinder (3,000 CA judges, pre-launch):**
**→ Start with PostgreSQL optimization, plan Elasticsearch for nationwide expansion**

---

## Phase 1: PostgreSQL Upgrade (2 weeks)

### Step 1: Run Migrations (Day 1)

```bash
# Connect to Supabase
cd /Users/tannerosterkamp/JudgeFinderPlatform-1

# Run these SQL scripts in Supabase SQL Editor:
```

**Migration 1: Enable Extensions**
```sql
-- Enable pg_trgm for fuzzy search
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS btree_gin;

-- Create trigram indexes
CREATE INDEX idx_judges_name_trgm ON judges USING GIN (name gin_trgm_ops);
CREATE INDEX idx_judges_court_trgm ON judges USING GIN (court_name gin_trgm_ops);

-- Full-text search index
CREATE INDEX idx_judges_fulltext ON judges USING GIN (
  to_tsvector('english',
    name || ' ' || COALESCE(court_name, '') || ' ' ||
    COALESCE(jurisdiction, '') || ' ' || COALESCE(position_type, '')
  )
);

ANALYZE judges;
```

**Migration 2: Create Statistics View**
```sql
-- See SEARCH_COMPARISON_ANALYSIS.md Script 2 for full definition
-- This creates judge_statistics materialized view
-- Copy from the analysis document
```

**Migration 3: Add Case Indexes**
```sql
CREATE INDEX idx_cases_judge_type ON cases(judge_id, case_type) WHERE judge_id IS NOT NULL;
CREATE INDEX idx_cases_judge_outcome ON cases(judge_id, outcome) WHERE judge_id IS NOT NULL;
CREATE INDEX idx_cases_judge_dates ON cases(judge_id, filing_date, decision_date) WHERE judge_id IS NOT NULL;

ANALYZE cases;
```

### Step 2: Create Search Functions (Day 2)

Copy from **SEARCH_COMPARISON_ANALYSIS.md Script 4 & 5**:
- `search_judges_ranked()` - Main search with relevance scoring
- `autocomplete_judges()` - Typeahead suggestions

### Step 3: Update API Routes (Day 3-4)

**File: `/app/api/judges/search/route.ts`**

Replace ILIKE query with:

```typescript
// Use the new search function
const { data: judges, error } = await supabase
  .rpc('search_judges_ranked', {
    search_query: normalizedQuery,
    filter_jurisdiction: jurisdiction,
    filter_court_type: courtType,
    limit_count: limit,
    offset_count: offset
  })

if (error) throw error

const results = judges.map((judge: any) => ({
  id: judge.id,
  type: 'judge' as const,
  title: judge.name,
  subtitle: judge.court_name || '',
  description: `${judge.jurisdiction} • ${judge.total_cases} cases`,
  url: `/judges/${judge.slug || judge.id}`,
  relevance_score: judge.relevance_score,
  match_type: judge.match_type
}))
```

### Step 4: Add Autocomplete Endpoint (Day 4)

**New file: `/app/api/judges/autocomplete/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q') || ''

  if (query.length < 2) {
    return NextResponse.json({ suggestions: [] })
  }

  const supabase = await createServerClient()

  const { data: suggestions, error } = await supabase
    .rpc('autocomplete_judges', {
      prefix_query: query,
      limit_count: 10
    })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    suggestions: suggestions.map((j: any) => ({
      id: j.id,
      name: j.name,
      court: j.court_name,
      jurisdiction: j.jurisdiction,
      url: `/judges/${j.slug}`
    }))
  })
}
```

### Step 5: Update Frontend (Day 5)

Add autocomplete to search component:

```typescript
// components/judges/EnhancedJudgeSearch.tsx

const [suggestions, setSuggestions] = useState([])

const handleInputChange = async (value: string) => {
  if (value.length < 2) {
    setSuggestions([])
    return
  }

  const res = await fetch(`/api/judges/autocomplete?q=${encodeURIComponent(value)}`)
  const data = await res.json()
  setSuggestions(data.suggestions || [])
}

// Render autocomplete dropdown
{suggestions.length > 0 && (
  <div className="absolute z-50 w-full bg-white shadow-lg rounded-md mt-1">
    {suggestions.map(s => (
      <Link
        key={s.id}
        href={s.url}
        className="block px-4 py-2 hover:bg-gray-100"
      >
        <div className="font-medium">{s.name}</div>
        <div className="text-sm text-gray-600">{s.court}</div>
      </Link>
    ))}
  </div>
)}
```

### Step 6: Testing (Day 6-7)

**Test Cases:**
```bash
# Test exact match
curl "http://localhost:3005/api/judges/search?q=John+Smith"

# Test partial match
curl "http://localhost:3005/api/judges/search?q=Smit"

# Test autocomplete
curl "http://localhost:3005/api/judges/autocomplete?q=Joh"

# Test fuzzy match
curl "http://localhost:3005/api/judges/search?q=Jonh+Smth"

# Test with filters
curl "http://localhost:3005/api/judges/search?q=Smith&jurisdiction=CA&court_type=Superior"
```

**Performance Testing:**
```typescript
// scripts/test-search-performance.ts
const start = Date.now()
const res = await fetch('http://localhost:3005/api/judges/search?q=Smith')
const duration = Date.now() - start
console.log(`Search took ${duration}ms`)
// Target: < 200ms
```

### Step 7: Monitoring Setup (Day 8-10)

Add search analytics:

```typescript
// lib/analytics/search-tracking.ts
export async function trackSearch(query: string, resultsCount: number, latency: number) {
  await supabase
    .from('search_analytics')
    .insert({
      query,
      results_count: resultsCount,
      latency_ms: latency,
      timestamp: new Date().toISOString()
    })
}
```

Create dashboard queries:
```sql
-- Top searches
SELECT query, COUNT(*) as count
FROM search_analytics
WHERE timestamp > NOW() - INTERVAL '7 days'
GROUP BY query
ORDER BY count DESC
LIMIT 20;

-- Zero-result searches (needs attention)
SELECT query, COUNT(*) as count
FROM search_analytics
WHERE results_count = 0
  AND timestamp > NOW() - INTERVAL '7 days'
GROUP BY query
ORDER BY count DESC;

-- Performance metrics
SELECT
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY latency_ms) as p50,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency_ms) as p95,
  PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY latency_ms) as p99,
  AVG(latency_ms) as avg
FROM search_analytics
WHERE timestamp > NOW() - INTERVAL '24 hours';
```

---

## Phase 2: Advanced Features (Weeks 3-4)

### Week 3: Faceted Search

**Goal:** Add filter counts and dynamic filtering

```typescript
// New endpoint: /api/judges/facets
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q') || ''

  const supabase = await createServerClient()

  // Get counts for each facet
  const [jurisdictionFacets, courtTypeFacets, experienceFacets] = await Promise.all([
    supabase
      .from('judges')
      .select('jurisdiction')
      .like('name', `%${query}%`)
      .group('jurisdiction')
      .count(),

    supabase
      .from('judges')
      .select('court_type')
      .like('name', `%${query}%`)
      .group('court_type')
      .count(),

    // Experience buckets
    supabase.rpc('get_experience_distribution', { search_query: query })
  ])

  return NextResponse.json({
    jurisdictions: jurisdictionFacets,
    court_types: courtTypeFacets,
    experience: experienceFacets
  })
}
```

### Week 4: Search Quality Improvements

1. **Did You Mean? Suggestions**
```sql
CREATE OR REPLACE FUNCTION suggest_corrections(search_query TEXT)
RETURNS TABLE (suggestion TEXT, similarity_score FLOAT) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT name, similarity(name, search_query) as score
  FROM judges
  WHERE similarity(name, search_query) > 0.3
  ORDER BY score DESC
  LIMIT 5;
END;
$$ LANGUAGE plpgsql;
```

2. **Related Searches**
```typescript
// Track what users searched after initial search
// Show "People also searched for: ..."
```

3. **Search Analytics Dashboard**
```typescript
// Admin view showing:
// - Most popular searches
// - Zero-result searches
// - Average latency
// - User search patterns
```

---

## Phase 3: Elasticsearch Migration (Weeks 5-12, Optional)

### When to Consider Elasticsearch

**Triggers:**
- Expanding beyond California (>10,000 judges)
- Search traffic >500 queries/minute
- Need sub-50ms response times
- Want advanced features (semantic search, ML ranking)
- Venture-backed with growth targets

### Quick Elasticsearch Setup

**Option A: Elastic Cloud (Recommended)**
```bash
# Sign up at https://cloud.elastic.co
# Create deployment (2GB RAM, $95/month)
# Get API key from console
```

**Option B: Bonsai (Budget Option)**
```bash
# Sign up at https://bonsai.io
# Choose Standard plan ($48/month)
# Get cluster URL
```

### Environment Setup

```bash
# .env.production
ELASTICSEARCH_URL=https://your-cluster.es.us-west1.gcp.cloud.es.io
ELASTICSEARCH_API_KEY=your-api-key-here
```

### Install Dependencies

```bash
npm install @elastic/elasticsearch
```

### Create Index

```typescript
// lib/elasticsearch/setup.ts
import { Client } from '@elastic/elasticsearch'

const client = new Client({
  node: process.env.ELASTICSEARCH_URL,
  auth: { apiKey: process.env.ELASTICSEARCH_API_KEY }
})

export async function createJudgesIndex() {
  await client.indices.create({
    index: 'judges',
    body: {
      settings: {
        number_of_shards: 2,
        number_of_replicas: 1,
        analysis: {
          analyzer: {
            autocomplete: {
              type: 'custom',
              tokenizer: 'standard',
              filter: ['lowercase', 'autocomplete_filter']
            }
          },
          filter: {
            autocomplete_filter: {
              type: 'edge_ngram',
              min_gram: 2,
              max_gram: 20
            }
          }
        }
      },
      mappings: {
        properties: {
          name: {
            type: 'text',
            fields: {
              exact: { type: 'keyword' },
              autocomplete: { type: 'text', analyzer: 'autocomplete' }
            }
          },
          court_name: { type: 'text', fields: { exact: { type: 'keyword' } } },
          jurisdiction: { type: 'keyword' },
          court_type: { type: 'keyword' },
          appointed_date: { type: 'date' },
          total_cases: { type: 'integer' },
          slug: { type: 'keyword' }
        }
      }
    }
  })
}
```

### Sync Data

```typescript
// scripts/sync-to-elasticsearch.ts
import { Client } from '@elastic/elasticsearch'
import { createServerClient } from '@/lib/supabase/server'

const esClient = new Client({
  node: process.env.ELASTICSEARCH_URL!,
  auth: { apiKey: process.env.ELASTICSEARCH_API_KEY! }
})

async function syncAllJudges() {
  const supabase = await createServerClient()

  const { data: judges } = await supabase
    .from('judges')
    .select('*')

  if (!judges) return

  // Bulk index
  const operations = judges.flatMap(judge => [
    { index: { _index: 'judges', _id: judge.id } },
    {
      name: judge.name,
      court_name: judge.court_name,
      jurisdiction: judge.jurisdiction,
      court_type: judge.court_type,
      appointed_date: judge.appointed_date,
      total_cases: judge.total_cases,
      slug: judge.slug
    }
  ])

  const result = await esClient.bulk({ operations })
  console.log(`Indexed ${judges.length} judges`)

  if (result.errors) {
    console.error('Errors:', result.items.filter(i => i.index?.error))
  }
}

syncAllJudges()
```

### Update Search API

```typescript
// app/api/judges/search/route.ts (Elasticsearch version)
import { Client } from '@elastic/elasticsearch'

const esClient = new Client({
  node: process.env.ELASTICSEARCH_URL!,
  auth: { apiKey: process.env.ELASTICSEARCH_API_KEY! }
})

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q') || ''
  const limit = parseInt(searchParams.get('limit') || '20')
  const page = parseInt(searchParams.get('page') || '1')

  const result = await esClient.search({
    index: 'judges',
    from: (page - 1) * limit,
    size: limit,
    query: {
      bool: {
        should: [
          { match: { 'name.exact': { query, boost: 5 } } },
          { match: { name: { query, fuzziness: 'AUTO', boost: 3 } } },
          { match: { court_name: { query, boost: 2 } } }
        ],
        minimum_should_match: 1
      }
    },
    highlight: {
      fields: { name: {}, court_name: {} }
    },
    sort: ['_score', { total_cases: 'desc' }]
  })

  return NextResponse.json({
    results: result.hits.hits.map(hit => ({
      ...hit._source,
      score: hit._score,
      highlights: hit.highlight
    })),
    total_count: result.hits.total.value,
    took_ms: result.took
  })
}
```

---

## Performance Benchmarks

| Phase | Search Latency | Relevance | Features |
|-------|---------------|-----------|----------|
| **Current (ILIKE)** | 300-500ms | Poor | Basic |
| **Phase 1 (PostgreSQL FTS)** | 50-150ms | Good | Autocomplete, fuzzy |
| **Phase 2 (+ Features)** | 50-150ms | Great | Facets, suggestions |
| **Phase 3 (Elasticsearch)** | 10-50ms | Excellent | All features |

---

## Success Metrics

**Week 1:**
- [ ] All migrations run successfully
- [ ] Search functions created
- [ ] Basic tests passing

**Week 2:**
- [ ] Search API updated
- [ ] Autocomplete working
- [ ] Search latency < 200ms
- [ ] Relevant results ranked first

**Week 4:**
- [ ] Faceted search implemented
- [ ] Zero-result rate < 5%
- [ ] User CTR > 60%

**Week 12 (if Elasticsearch):**
- [ ] All data synced to ES
- [ ] Search latency < 100ms
- [ ] All advanced features working
- [ ] 99th percentile latency < 150ms

---

## Troubleshooting

**Slow Queries After Migration:**
```sql
-- Check if indexes are being used
EXPLAIN ANALYZE
SELECT * FROM search_judges_ranked('Smith', NULL, NULL, 20, 0);

-- If not using index, rebuild
REINDEX INDEX idx_judges_name_trgm;
ANALYZE judges;
```

**Materialized View Not Refreshing:**
```sql
-- Set up daily refresh
CREATE OR REPLACE FUNCTION refresh_judge_stats_daily()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY judge_statistics;
END;
$$ LANGUAGE plpgsql;

-- Schedule via pg_cron or external cron job
SELECT cron.schedule('refresh-judge-stats', '0 2 * * *', 'SELECT refresh_judge_stats_daily()');
```

**Elasticsearch Sync Issues:**
```typescript
// Add error handling and retry logic
async function syncWithRetry(judge: Judge, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      await esClient.index({
        index: 'judges',
        id: judge.id,
        document: judge
      })
      return
    } catch (error) {
      if (i === retries - 1) throw error
      await new Promise(r => setTimeout(r, 1000 * (i + 1)))
    }
  }
}
```

---

## Cost Summary

**Phase 1 (PostgreSQL):**
- Infrastructure: $0 (existing Supabase)
- Development: 2 weeks
- Total: 2 weeks dev time

**Phase 2 (Features):**
- Infrastructure: $0
- Development: 2 weeks
- Total: 2 weeks dev time

**Phase 3 (Elasticsearch):**
- Infrastructure: $50-100/month
- Development: 6-8 weeks
- Total: 6-8 weeks + $50-100/month

**Recommended for JudgeFinder:**
- Start with Phase 1-2 (4 weeks total)
- Evaluate Elasticsearch when expanding nationwide
- Total immediate cost: $0 infrastructure, 4 weeks development

---

## Next Steps

1. **Today:** Review full analysis in `SEARCH_COMPARISON_ANALYSIS.md`
2. **This Week:** Run Phase 1 migrations and test
3. **Week 2:** Deploy updated search API
4. **Week 3-4:** Add advanced features
5. **Month 2-3:** Evaluate Elasticsearch based on growth

**Questions?** Refer to the comprehensive analysis document for detailed explanations, SQL scripts, and implementation guides.

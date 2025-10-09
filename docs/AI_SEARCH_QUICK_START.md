# AI Search Quick Start Guide

## Overview

The AI search system automatically enhances user queries with intelligent intent detection, entity extraction, and multi-factor ranking.

## Basic Usage

### Making a Search Request

```typescript
// Client-side search
const response = await fetch('/api/search?q=divorce+judge+los+angeles')
const data = await response.json()

console.log(data)
// {
//   results: [...],
//   ai_insights: {
//     intent: "judge",
//     searchType: "name",
//     confidence: 0.85,
//     suggestedFilters: {
//       locations: ["Los Angeles"],
//       caseTypes: ["family"]
//     }
//   }
// }
```

### Understanding AI Insights

```typescript
interface AIInsights {
  intent?: string // "judge" | "court" | "jurisdiction" | "mixed"
  searchType?: string // "name" | "characteristic" | "location" | "case_type"
  confidence?: number // 0.0 to 1.0
  suggestedFilters?: {
    locations?: string[] // Detected locations
    caseTypes?: string[] // Detected practice areas
  }
  expandedTerms?: string[] // Related search terms
}
```

## Query Examples

### 1. Judge by Name + Location

```
Query: "judge smith los angeles"

AI Detection:
  - Intent: judge
  - Type: name
  - Location: Los Angeles
  - Confidence: 0.95

Auto-Applied Filters:
  - Jurisdiction: Los Angeles
  - Boost LA judges 1.5x
```

### 2. Practice Area Search

```
Query: "divorce lawyers orange county"

AI Detection:
  - Intent: judge
  - Type: case_type
  - Location: Orange County
  - Case Type: family
  - Confidence: 0.88

Auto-Applied Filters:
  - Jurisdiction: Orange County
  - Boost family law specialists 1.8x
```

### 3. Court Search

```
Query: "superior court san diego"

AI Detection:
  - Intent: court
  - Type: location
  - Location: San Diego
  - Confidence: 0.92

Auto-Applied Filters:
  - Court type: Superior
  - Location: San Diego
```

## Ranking Factors

Results are ranked using multi-factor scoring:

```typescript
Final Score = (
  Text Relevance      × 40% +
  Case Volume        × 30% +
  Specialization     × 20% +
  Recency           × 10%
) × Intent Boost
```

### Intent Boosts

- **Exact name match**: 2.0x
- **Case type match**: 1.8x
- **Location match**: 1.5x
- **Characteristic match**: 1.3x

## Using with Frontend

### Display AI-Suggested Filters

```tsx
function SearchResults({ data }: { data: SearchResponse }) {
  const { results, ai_insights } = data

  return (
    <div>
      {/* Show AI-detected filters */}
      {ai_insights?.suggestedFilters && (
        <div className="filter-suggestions">
          <h3>Suggested Filters</h3>

          {ai_insights.suggestedFilters.locations?.map((loc) => (
            <FilterChip key={loc} label={`Location: ${loc}`} />
          ))}

          {ai_insights.suggestedFilters.caseTypes?.map((type) => (
            <FilterChip key={type} label={`Practice: ${type}`} />
          ))}
        </div>
      )}

      {/* Display results with ranking metadata */}
      {results.map((result) => (
        <ResultCard key={result.id} result={result} score={result.relevanceScore} />
      ))}
    </div>
  )
}
```

### Show Related Searches

```tsx
function RelatedSearches({ expandedTerms }: { expandedTerms: string[] }) {
  return (
    <div className="related-searches">
      <h4>Related Searches</h4>
      {expandedTerms.map((term) => (
        <a key={term} href={`/search?q=${term}`}>
          {term}
        </a>
      ))}
    </div>
  )
}
```

## Analytics & Tracking

### Track Search Metrics

```typescript
import { trackAISearchMetrics } from '@/lib/analytics/ai-search-metrics'

// Automatically tracked by search API
await trackAISearchMetrics({
  query: "divorce judge",
  aiIntent: enhancedQuery.searchIntent,
  resultsCount: 15,
  topResults: [...],
  processingTimeMs: 120
})
```

### Track User Clicks

```typescript
import { trackSearchClick } from '@/lib/analytics/ai-search-metrics'

// Track when user clicks a result
function handleResultClick(result: SearchResult, position: number) {
  trackSearchClick({
    searchQuery: currentQuery,
    resultId: result.id,
    resultType: result.type,
    resultTitle: result.title,
    resultPosition: position,
    aiProcessed: !!aiInsights,
  })
}
```

### View Analytics

```sql
-- Get CTR comparison
SELECT * FROM get_ai_search_ctr();

-- Top search patterns
SELECT * FROM get_top_search_patterns(20);

-- Real-time dashboard
SELECT * FROM ai_search_performance_dashboard;
```

## Practice Area Classification

### Offline Classification (No AI API Calls)

```typescript
import { classifyLegalQuery } from '@/lib/ai/legal-query-classifier'

const classification = classifyLegalQuery('divorce and custody dispute')

console.log(classification)
// {
//   queryClass: "judge-research",
//   practiceAreas: ["family"],
//   confidence: 0.85,
//   indicators: ["divorce", "custody"]
// }
```

### Supported Practice Areas

- Criminal
- Civil
- Family (divorce, custody)
- Probate (estate, trust)
- Juvenile
- Traffic
- Small Claims
- Bankruptcy
- Real Estate
- Employment
- Personal Injury
- Business
- Immigration
- Appellate

## Location Normalization

```typescript
import { normalizeLocation } from '@/lib/search/ranking-engine'

// Handles aliases automatically
normalizeLocation('LA') // → "Los Angeles"
normalizeLocation('OC') // → "Orange County"
normalizeLocation('SF') // → "San Francisco"
normalizeLocation('San Diego') // → "San Diego"
```

## Case Type Mapping

```typescript
import { getMappedCaseTypes } from '@/lib/search/ranking-engine'

// Maps practice areas to database case types
getMappedCaseTypes('criminal')
// → ["criminal", "felony", "misdemeanor"]

getMappedCaseTypes('family')
// → ["family", "divorce", "custody", "domestic"]

getMappedCaseTypes('personal injury')
// → ["personal injury", "tort", "pi"]
```

## Performance Monitoring

### Check AI Processing Rate

```sql
SELECT
  COUNT(*) FILTER (WHERE ai_processed) * 100.0 / COUNT(*) AS ai_rate,
  AVG(processing_time_ms) AS avg_time,
  AVG(confidence) AS avg_confidence
FROM ai_search_metrics
WHERE created_at > NOW() - INTERVAL '24 hours';
```

### Identify Slow Queries

```sql
SELECT query, processing_time_ms, results_count
FROM ai_search_metrics
WHERE processing_time_ms > 500
ORDER BY processing_time_ms DESC
LIMIT 10;
```

### Monitor Intent Detection

```sql
SELECT
  intent_type,
  COUNT(*) AS count,
  AVG(confidence) AS avg_confidence,
  AVG(results_count) AS avg_results
FROM ai_search_metrics
WHERE ai_processed = true
GROUP BY intent_type
ORDER BY count DESC;
```

## Error Handling

### AI Processing Failure

```typescript
// System automatically falls back to basic search
try {
  enhancedQuery = await processNaturalLanguageQuery(query)
} catch (error) {
  logger.warn('AI processing failed, falling back to basic search')
  // Basic search continues without AI features
  // No user-facing error
}
```

### Graceful Degradation

```typescript
// All AI features are optional
const rankedResults = rankSearchResults(
  results,
  query,
  aiIntent  // Can be undefined - ranking still works
)

// Response always includes results
// AI insights only present if successful
{
  results: [...],           // Always present
  ai_insights: {...}        // Optional
}
```

## Best Practices

### 1. Show AI Confidence

```tsx
{
  ai_insights?.confidence && ai_insights.confidence < 0.6 && (
    <div className="low-confidence-warning">Try being more specific for better results</div>
  )
}
```

### 2. Handle Missing AI Insights

```tsx
const filters = ai_insights?.suggestedFilters || {}
const hasFilters = filters.locations?.length || filters.caseTypes?.length

{
  hasFilters && <FilterSuggestions filters={filters} />
}
```

### 3. Track User Engagement

```typescript
// Always track clicks to improve ranking
onClick={() => {
  trackSearchClick({...})
  navigateToResult(result.url)
}}
```

### 4. Monitor Performance

```typescript
// Log slow searches
if (took_ms > 500) {
  logger.warn('Slow search detected', { query, took_ms })
}
```

## Testing

### Unit Test Example

```typescript
import { calculateEnhancedRank } from '@/lib/search/ranking-engine'

test('boosts location matches', () => {
  const result = {
    id: '123',
    type: 'judge',
    title: 'Judge Smith',
    jurisdiction: 'Los Angeles',
  }

  const aiIntent = {
    extractedEntities: {
      locations: ['Los Angeles'],
    },
  }

  const ranked = calculateEnhancedRank(result, 'judge smith', aiIntent)

  expect(ranked.aiMetadata?.matchedLocation).toBe(true)
  expect(ranked.aiMetadata?.boostApplied).toBeGreaterThan(1.0)
})
```

### Integration Test Example

```typescript
test('search API integrates AI insights', async () => {
  const response = await fetch('/api/search?q=divorce+judge+LA')
  const data = await response.json()

  expect(data.ai_insights).toBeDefined()
  expect(data.ai_insights.intent).toBe('judge')
  expect(data.ai_insights.suggestedFilters.locations).toContain('Los Angeles')
  expect(data.ai_insights.suggestedFilters.caseTypes).toContain('family')
})
```

## Troubleshooting

### AI Insights Missing

1. Check `GOOGLE_AI_API_KEY` environment variable
2. Check API error logs
3. Verify AI service is responding
4. Check rate limits

### Low Confidence Scores

1. Query may be too vague
2. Check AI prompt in `search-intelligence.ts`
3. Review confidence calculation logic
4. Consider query expansion

### Performance Issues

1. Check database indexes
2. Review AI processing time
3. Monitor cache hit rate
4. Analyze slow query patterns

---

**Need Help?** Check the full [AI Search Integration Report](../AI_SEARCH_INTEGRATION_REPORT.md) for detailed implementation details.

# Elections API Quick Reference

## Endpoints Overview

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/judges/{id}/elections` | GET | Get election history for a specific judge |
| `/api/v1/elections/upcoming` | GET | Get judges with upcoming elections |
| `/api/v1/elections/statistics` | GET | Get aggregated election statistics |

## Quick Examples

### 1. Get Judge Election History

```bash
# Basic request
curl https://yourdomain.com/api/v1/judges/{judge-id}/elections

# With filters
curl "https://yourdomain.com/api/v1/judges/{judge-id}/elections?type=retention&limit=10"
```

**Response:**
```json
{
  "judge_id": "uuid",
  "judge_name": "John Doe",
  "total_elections": 3,
  "win_rate": 1.0,
  "average_vote_percentage": 65.3,
  "elections": [...]
}
```

### 2. Get Upcoming Elections

```bash
# All upcoming elections
curl https://yourdomain.com/api/v1/elections/upcoming

# By jurisdiction
curl "https://yourdomain.com/api/v1/elections/upcoming?jurisdiction=California"

# With date range
curl "https://yourdomain.com/api/v1/elections/upcoming?start_date=2024-01-01&end_date=2024-12-31"
```

**Response:**
```json
{
  "total_count": 15,
  "next_30_days": 5,
  "next_90_days": 10,
  "next_180_days": 15,
  "elections": [...]
}
```

### 3. Get Election Statistics

```bash
# By jurisdiction
curl "https://yourdomain.com/api/v1/elections/statistics?jurisdiction=California"

# With custom date range
curl "https://yourdomain.com/api/v1/elections/statistics?start_date=2020-01-01&end_date=2024-01-01"

# Filter by court type
curl "https://yourdomain.com/api/v1/elections/statistics?court_type=Superior%20Court"
```

**Response:**
```json
{
  "jurisdiction": "California",
  "time_period": {
    "start_date": "2014-01-01",
    "end_date": "2024-01-01"
  },
  "total_elections": 150,
  "by_election_type": {
    "retention": 80,
    "competitive": 50
  },
  "incumbent_win_rate": 0.92,
  "average_winner_percentage": 68.3
}
```

## Common Query Parameters

| Parameter | Type | Default | Max | Description |
|-----------|------|---------|-----|-------------|
| `limit` | int | 50 | 100/200 | Results per page |
| `offset` | int | 0 | - | Pagination offset |
| `start_date` | string | varies | - | ISO 8601 date (YYYY-MM-DD) |
| `end_date` | string | varies | - | ISO 8601 date (YYYY-MM-DD) |
| `jurisdiction` | string | - | - | State or county name |
| `election_type` | string | - | - | Election type filter |

## Election Types

- `initial_election` - First election to position
- `retention` - Yes/no retention vote
- `competitive` - Multi-candidate race
- `general` - General election
- `primary` - Primary election
- `recall` - Recall election
- `special` - Special election
- `reelection` - Standard reelection

## Authentication

Optional via `x-api-key` header (required if `REQUIRE_API_KEY_FOR_V1=true`):

```bash
curl -H "x-api-key: your-key" \
  https://yourdomain.com/api/v1/elections/upcoming
```

## Rate Limits

- **Default:** 60 requests/minute
- **Headers:** `RateLimit-Remaining`, `RateLimit-Reset`
- **Status:** 429 when exceeded

## HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 400 | Bad request (invalid parameters) |
| 401 | Unauthorized (invalid/missing API key) |
| 404 | Resource not found |
| 429 | Rate limit exceeded |
| 500 | Internal server error |

## Caching

| Endpoint | Cache Duration |
|----------|----------------|
| Election History | 5 minutes |
| Upcoming Elections | 1 hour |
| Statistics | 1 hour |

All endpoints support `stale-while-revalidate`.

## TypeScript Usage

```typescript
import type {
  ElectionHistoryResponse,
  UpcomingElectionResponse,
  ElectionStatisticsResponse
} from '@/types/elections'

// Fetch with type safety
const response = await fetch(
  `https://yourdomain.com/api/v1/judges/${judgeId}/elections`
)
const data: ElectionHistoryResponse = await response.json()
```

## Error Handling

```typescript
try {
  const response = await fetch(url)

  if (!response.ok) {
    if (response.status === 429) {
      // Handle rate limit
      const resetTime = response.headers.get('RateLimit-Reset')
      console.log('Rate limited until:', new Date(Number(resetTime) * 1000))
    } else if (response.status === 404) {
      console.error('Judge not found')
    } else {
      console.error('API error:', await response.json())
    }
    return
  }

  const data = await response.json()
  // Process data...
} catch (error) {
  console.error('Network error:', error)
}
```

## Best Practices

1. **Cache responses** - Respect cache headers
2. **Handle rate limits** - Implement exponential backoff
3. **Validate dates** - Use ISO 8601 format
4. **Paginate large datasets** - Use limit/offset
5. **Filter server-side** - Don't fetch everything then filter
6. **Check verified flag** - Use verified data when critical

## Need More Info?

See full documentation: [ELECTIONS_API.md](./ELECTIONS_API.md)

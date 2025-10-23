# Elections API Documentation

## Overview

The Elections API provides comprehensive access to judicial election data, including election history, upcoming elections, and aggregated statistics. These endpoints are part of the v1 API and follow RESTful conventions.

## Base URL

```
https://yourdomain.com/api/v1
```

## Authentication

All endpoints support optional API key authentication via the `x-api-key` header. If `REQUIRE_API_KEY_FOR_V1` environment variable is set to `true`, API keys are required.

```bash
curl -H "x-api-key: your-api-key-here" \
  https://yourdomain.com/api/v1/elections/upcoming
```

## Rate Limiting

All endpoints are rate-limited to prevent abuse:
- Default: 60 requests per minute per client
- Rate limit headers are included in responses:
  - `RateLimit-Remaining`: Remaining requests in current window
  - `RateLimit-Reset`: Unix timestamp when rate limit resets

## Endpoints

### 1. Get Judge Election History

Retrieves complete election history for a specific judge, including opponents and voting results.

**Endpoint:** `GET /api/v1/judges/{id}/elections`

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | UUID | Yes | Judge's unique identifier |

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `type` | string | No | - | Filter by election type (see Election Types) |
| `limit` | integer | No | 50 | Number of elections to return (max: 100) |
| `offset` | integer | No | 0 | Pagination offset |
| `include_opponents` | boolean | No | true | Include opponent information |

#### Election Types

- `initial_election` - First election to the position
- `retention` - Retention election (yes/no vote)
- `competitive` - Contested election with multiple candidates
- `general` - General election
- `primary` - Primary election
- `recall` - Recall election
- `special` - Special election to fill vacancy
- `reelection` - Standard reelection campaign

#### Response Format

```json
{
  "judge_id": "550e8400-e29b-41d4-a716-446655440000",
  "judge_name": "John Doe",
  "total_elections": 3,
  "win_rate": 1.0,
  "average_vote_percentage": 65.3,
  "total_votes_received": 500000,
  "elections": [
    {
      "id": "uuid",
      "judge_id": "uuid",
      "election_date": "2022-11-08",
      "election_type": "retention",
      "election_name": "2022 General Election",
      "jurisdiction": "California",
      "district": "District 2",
      "won": true,
      "vote_count": 4567890,
      "vote_percentage": 66.12,
      "total_votes_cast": 6908654,
      "yes_votes": 4567890,
      "no_votes": 2340764,
      "retention_threshold": 50.0,
      "term_start_date": "2023-01-01",
      "term_end_date": "2035-01-01",
      "term_length_years": 12,
      "is_incumbent": true,
      "is_contested": false,
      "opponent_count": 0,
      "source_name": "California Secretary of State",
      "source_url": "https://elections.cdn.sos.ca.gov/...",
      "verified": true,
      "opponents": []
    }
  ]
}
```

#### Example Requests

```bash
# Get all elections for a judge
curl https://yourdomain.com/api/v1/judges/550e8400-e29b-41d4-a716-446655440000/elections

# Get only retention elections
curl "https://yourdomain.com/api/v1/judges/550e8400-e29b-41d4-a716-446655440000/elections?type=retention"

# Get elections without opponent details
curl "https://yourdomain.com/api/v1/judges/550e8400-e29b-41d4-a716-446655440000/elections?include_opponents=false"

# Paginate results
curl "https://yourdomain.com/api/v1/judges/550e8400-e29b-41d4-a716-446655440000/elections?limit=10&offset=10"
```

#### Status Codes

- `200` - Success
- `401` - Unauthorized (API key required but not provided/invalid)
- `404` - Judge not found
- `429` - Rate limit exceeded
- `500` - Internal server error

---

### 2. Get Upcoming Elections

Returns judges with upcoming elections within a specified date range.

**Endpoint:** `GET /api/v1/elections/upcoming`

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `jurisdiction` | string | No | - | Filter by jurisdiction (e.g., "California", "Los Angeles County") |
| `start_date` | string | No | today | Start of date range (ISO 8601: YYYY-MM-DD) |
| `end_date` | string | No | 1 year from now | End of date range (ISO 8601: YYYY-MM-DD) |
| `election_type` | string | No | - | Filter by election type |
| `limit` | integer | No | 50 | Number of results to return (max: 200) |
| `offset` | integer | No | 0 | Pagination offset |
| `sort` | string | No | date_asc | Sort order: `date_asc` or `date_desc` |

#### Response Format

```json
{
  "total_count": 15,
  "next_30_days": 5,
  "next_90_days": 10,
  "next_180_days": 15,
  "elections": [
    {
      "id": "uuid",
      "judge_id": "uuid",
      "judge_name": "Jane Smith",
      "court_name": "Superior Court of California, County of Los Angeles",
      "election_date": "2024-11-05",
      "election_type": "retention",
      "election_name": "2024 General Election",
      "jurisdiction": "California",
      "district": "District 4",
      "is_incumbent": true,
      "is_contested": false,
      "opponent_count": 0,
      "term_start_date": "2025-01-01",
      "term_end_date": "2037-01-01",
      "term_length_years": 12,
      "source_name": "California Secretary of State",
      "source_url": "https://example.com/elections",
      "verified": true,
      "days_until_election": 45
    }
  ]
}
```

#### Example Requests

```bash
# Get all upcoming elections in California
curl "https://yourdomain.com/api/v1/elections/upcoming?jurisdiction=California"

# Get upcoming elections in the next 6 months
curl "https://yourdomain.com/api/v1/elections/upcoming?start_date=2024-01-01&end_date=2024-06-30"

# Get only retention elections
curl "https://yourdomain.com/api/v1/elections/upcoming?election_type=retention"

# Get upcoming elections sorted by date (descending)
curl "https://yourdomain.com/api/v1/elections/upcoming?sort=date_desc"

# Combine filters
curl "https://yourdomain.com/api/v1/elections/upcoming?jurisdiction=California&election_type=retention&limit=20"
```

#### Status Codes

- `200` - Success
- `400` - Bad request (invalid date format or date range)
- `401` - Unauthorized
- `429` - Rate limit exceeded
- `500` - Internal server error

---

### 3. Get Election Statistics

Returns aggregated statistics about judicial elections in a jurisdiction.

**Endpoint:** `GET /api/v1/elections/statistics`

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `jurisdiction` | string | No | All Jurisdictions | Filter by jurisdiction |
| `court_type` | string | No | - | Filter by court type (e.g., "Superior Court", "Supreme Court") |
| `start_date` | string | No | 10 years ago | Start of date range (ISO 8601: YYYY-MM-DD) |
| `end_date` | string | No | today | End of date range (ISO 8601: YYYY-MM-DD) |
| `election_type` | string | No | - | Filter by specific election type |

#### Response Format

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
    "competitive": 50,
    "initial_election": 20
  },
  "average_turnout": 1250000,
  "incumbent_win_rate": 0.92,
  "average_winner_percentage": 68.3,
  "unopposed_count": 25,
  "retention_pass_rate": 0.98
}
```

#### Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `jurisdiction` | string | Jurisdiction name or "All Jurisdictions" |
| `time_period` | object | Start and end dates for statistics |
| `total_elections` | integer | Total number of elections in period |
| `by_election_type` | object | Count of elections by type |
| `average_turnout` | integer/null | Average total votes cast per election |
| `incumbent_win_rate` | float/null | Percentage of incumbents who won (0.0-1.0) |
| `average_winner_percentage` | float/null | Average vote percentage for winners |
| `unopposed_count` | integer | Number of unopposed elections |
| `retention_pass_rate` | float/null | Percentage of retention elections that passed |

#### Example Requests

```bash
# Get California statistics for the last 10 years
curl "https://yourdomain.com/api/v1/elections/statistics?jurisdiction=California"

# Get statistics for a specific time period
curl "https://yourdomain.com/api/v1/elections/statistics?start_date=2020-01-01&end_date=2023-12-31"

# Get statistics for Superior Court elections only
curl "https://yourdomain.com/api/v1/elections/statistics?court_type=Superior%20Court"

# Get statistics for retention elections specifically
curl "https://yourdomain.com/api/v1/elections/statistics?election_type=retention"

# Combine filters
curl "https://yourdomain.com/api/v1/elections/statistics?jurisdiction=California&court_type=Supreme%20Court&start_date=2010-01-01"
```

#### Status Codes

- `200` - Success
- `400` - Bad request (invalid date format or date range)
- `401` - Unauthorized
- `429` - Rate limit exceeded
- `500` - Internal server error

---

## Caching

All endpoints implement HTTP caching with appropriate `Cache-Control` headers:

- **Election History**: Cached for 5 minutes (`s-maxage=300`)
- **Upcoming Elections**: Cached for 1 hour (`s-maxage=3600`)
- **Statistics**: Cached for 1 hour (`s-maxage=3600`)

All endpoints support `stale-while-revalidate` for improved performance.

## Error Handling

All endpoints return consistent error responses:

```json
{
  "error": "Error message description"
}
```

### Common Error Messages

| Error | Status | Description |
|-------|--------|-------------|
| `Unauthorized` | 401 | API key required but not provided or invalid |
| `Judge not found` | 404 | Judge with specified ID does not exist |
| `Rate limit exceeded` | 429 | Too many requests in time window |
| `Invalid date format` | 400 | Date must be in ISO 8601 format (YYYY-MM-DD) |
| `start_date must be before or equal to end_date` | 400 | Invalid date range |
| `Internal server error` | 500 | Unexpected server error |

## TypeScript Types

All response types are available in `/types/elections.ts`:

```typescript
import type {
  ElectionHistoryResponse,
  UpcomingElectionResponse,
  ElectionStatisticsResponse,
  JudgeElection,
  ElectionOpponent,
  ElectionType,
  ElectionResult
} from '@/types/elections'
```

## Best Practices

1. **Use appropriate caching**: Leverage HTTP caching headers to reduce API calls
2. **Handle rate limits**: Implement exponential backoff when rate limited
3. **Validate dates**: Always use ISO 8601 format (YYYY-MM-DD) for dates
4. **Paginate large results**: Use `limit` and `offset` for large datasets
5. **Filter server-side**: Apply filters via query parameters rather than client-side
6. **Check verification status**: Use the `verified` field to filter for verified data

## Examples

### JavaScript/TypeScript

```typescript
// Fetch judge election history
async function getJudgeElections(judgeId: string) {
  const response = await fetch(
    `https://yourdomain.com/api/v1/judges/${judgeId}/elections`,
    {
      headers: {
        'x-api-key': process.env.API_KEY
      }
    }
  )

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`)
  }

  const data: ElectionHistoryResponse = await response.json()
  return data
}

// Fetch upcoming elections
async function getUpcomingElections(jurisdiction?: string) {
  const params = new URLSearchParams()
  if (jurisdiction) params.set('jurisdiction', jurisdiction)

  const response = await fetch(
    `https://yourdomain.com/api/v1/elections/upcoming?${params}`,
    {
      headers: {
        'x-api-key': process.env.API_KEY
      }
    }
  )

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }

  const data: UpcomingElectionResponse = await response.json()
  return data
}

// Fetch election statistics
async function getElectionStatistics(
  jurisdiction: string,
  startDate: string,
  endDate: string
) {
  const params = new URLSearchParams({
    jurisdiction,
    start_date: startDate,
    end_date: endDate
  })

  const response = await fetch(
    `https://yourdomain.com/api/v1/elections/statistics?${params}`,
    {
      headers: {
        'x-api-key': process.env.API_KEY
      }
    }
  )

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }

  const data: ElectionStatisticsResponse = await response.json()
  return data
}
```

### Python

```python
import requests
from typing import Dict, Any, Optional

class ElectionsAPI:
    def __init__(self, base_url: str, api_key: str):
        self.base_url = base_url
        self.headers = {"x-api-key": api_key}

    def get_judge_elections(
        self,
        judge_id: str,
        election_type: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> Dict[str, Any]:
        """Get election history for a judge."""
        params = {"limit": limit, "offset": offset}
        if election_type:
            params["type"] = election_type

        url = f"{self.base_url}/judges/{judge_id}/elections"
        response = requests.get(url, headers=self.headers, params=params)
        response.raise_for_status()
        return response.json()

    def get_upcoming_elections(
        self,
        jurisdiction: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        limit: int = 50
    ) -> Dict[str, Any]:
        """Get upcoming elections."""
        params = {"limit": limit}
        if jurisdiction:
            params["jurisdiction"] = jurisdiction
        if start_date:
            params["start_date"] = start_date
        if end_date:
            params["end_date"] = end_date

        url = f"{self.base_url}/elections/upcoming"
        response = requests.get(url, headers=self.headers, params=params)
        response.raise_for_status()
        return response.json()

    def get_election_statistics(
        self,
        jurisdiction: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None
    ) -> Dict[str, Any]:
        """Get election statistics."""
        params = {}
        if jurisdiction:
            params["jurisdiction"] = jurisdiction
        if start_date:
            params["start_date"] = start_date
        if end_date:
            params["end_date"] = end_date

        url = f"{self.base_url}/elections/statistics"
        response = requests.get(url, headers=self.headers, params=params)
        response.raise_for_status()
        return response.json()

# Usage
api = ElectionsAPI(
    base_url="https://yourdomain.com/api/v1",
    api_key="your-api-key"
)

# Get judge elections
elections = api.get_judge_elections(
    judge_id="550e8400-e29b-41d4-a716-446655440000",
    election_type="retention"
)

# Get upcoming elections
upcoming = api.get_upcoming_elections(
    jurisdiction="California",
    limit=20
)

# Get statistics
stats = api.get_election_statistics(
    jurisdiction="California",
    start_date="2020-01-01",
    end_date="2024-01-01"
)
```

## Support

For issues or questions about the Elections API, please:
1. Check this documentation
2. Review the TypeScript types in `/types/elections.ts`
3. Check the database schema in `/supabase/migrations/20250122_001_add_election_tables.sql`
4. Contact the development team

## Changelog

### Version 1.0.0 (2024)
- Initial release
- Three core endpoints for election data
- Support for pagination, filtering, and sorting
- Comprehensive election statistics
- Rate limiting and caching support

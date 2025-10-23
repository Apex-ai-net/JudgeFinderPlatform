# Judicial Elections - Data Sources Documentation

**Version**: 1.0.0
**Last Updated**: 2025-10-22
**Audience**: Data Engineers, Developers, Researchers

---

## Table of Contents

1. [Overview](#overview)
2. [CourtListener Political Affiliations API](#courtlistener-political-affiliations-api)
3. [California Secretary of State](#california-secretary-of-state)
4. [Ballotpedia API](#ballotpedia-api-future)
5. [Data Quality Considerations](#data-quality-considerations)
6. [Update Frequency & Sync Schedule](#update-frequency--sync-schedule)
7. [Data Accuracy & Verification](#data-accuracy--verification)
8. [Data Source Comparison](#data-source-comparison)

---

## Overview

The Judicial Elections feature aggregates data from multiple authoritative sources to provide comprehensive election information for California judges. This document details each data source, integration methods, and data quality considerations.

### Primary Data Sources

| Source | Status | Data Provided | Update Frequency |
|--------|--------|---------------|------------------|
| **CourtListener** | ✅ Active | Political affiliations, appointments, confirmation votes | Real-time API |
| **CA Secretary of State** | 📋 Planned | Official election results, candidate statements | Post-election |
| **Ballotpedia** | 🔮 Future | Campaign finance, endorsements, biographical data | Real-time API |
| **Manual Entry** | ✅ Active | Historical elections, retention votes | Ad-hoc |

---

## CourtListener Political Affiliations API

### Overview

CourtListener is a comprehensive legal database maintained by the Free Law Project, a 501(c)(3) nonprofit. Their API provides detailed political affiliation and appointment data for federal and state judges.

**Website**: https://www.courtlistener.com
**API Docs**: https://www.courtlistener.com/api/rest-info/
**License**: CC BY-NC-SA 4.0 (Attribution-NonCommercial-ShareAlike)

### Authentication

```bash
# API Key required (free with account)
# Register at: https://www.courtlistener.com/sign-in/register/

# Header format
Authorization: Token YOUR_API_KEY_HERE
```

### Endpoints Used

#### 1. Political Affiliations Endpoint

**URL**: `GET /api/rest/v4/political-affiliations/`

**Query Parameters**:
- `person` (required): Person ID from CourtListener
- `ordering`: Sort order (default: `-date_start`)

**Example Request**:
```bash
curl -H "Authorization: Token YOUR_KEY" \
  "https://www.courtlistener.com/api/rest/v4/political-affiliations/?person=2"
```

**Example Response**:
```json
{
  "count": 2,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 123,
      "person": 2,
      "political_party": "Republican Party",
      "political_party_id": "r",
      "date_start": "2018-10-06",
      "date_end": null,
      "source": "Appointment by President",
      "appointer": {
        "id": 456,
        "name": "Donald J. Trump",
        "person_id": 789
      },
      "how_selected": "a_pres",
      "nomination_process": "Senate Confirmation",
      "date_nominated": "2018-07-09",
      "date_confirmed": "2018-10-06",
      "date_seated": "2018-10-09",
      "vote_type": "s",
      "voice_vote": false,
      "votes_yes": 50,
      "votes_no": 48,
      "votes_yes_percent": 51.0,
      "votes_no_percent": 49.0,
      "aba_rating": "wq",
      "judicial_committee_action": "reported_favorably",
      "retention_type": null
    },
    {
      "id": 124,
      "person": 2,
      "political_party": "Republican Party",
      "political_party_id": "r",
      "date_start": "2003-06-02",
      "date_end": "2018-10-06",
      "source": "Previous appointment",
      "appointer": {
        "id": 457,
        "name": "George W. Bush",
        "person_id": 790
      },
      "how_selected": "a_pres",
      "votes_yes": 55,
      "votes_no": 43
    }
  ]
}
```

### Field Definitions

#### Political Party Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `political_party` | String | Full party name | "Republican Party" |
| `political_party_id` | String (enum) | Party abbreviation | "r" (Republican) |
| `date_start` | ISO Date | Affiliation start date | "2018-10-06" |
| `date_end` | ISO Date or null | Affiliation end date (null = current) | null |

**Party ID Values**:
- `d` - Democratic Party
- `r` - Republican Party
- `i` - Independent
- `g` - Green Party
- `l` - Libertarian Party
- `f` - Federalist (historical)
- `w` - Whig (historical)
- `dr` - Democratic-Republican (historical)
- `n` - Non-partisan

#### Appointment Fields

| Field | Type | Description |
|-------|------|-------------|
| `appointer.name` | String | Name of appointing official |
| `how_selected` | String (enum) | Selection method code |
| `date_nominated` | ISO Date | Nomination date |
| `date_confirmed` | ISO Date | Senate confirmation date |
| `date_seated` | ISO Date | Date took office |

**Selection Method Codes**:
- `a_pres` - Appointed by President
- `a_gov` - Appointed by Governor
- `a_legis` - Appointed by Legislature
- `e_partisan` - Elected (partisan)
- `e_non_partisan` - Elected (non-partisan)
- `m_selection` - Merit selection

#### Confirmation Vote Fields

| Field | Type | Description |
|-------|------|-------------|
| `vote_type` | String | Type of vote |
| `voice_vote` | Boolean | Whether voice vote used |
| `votes_yes` | Integer | Yes votes |
| `votes_no` | Integer | No votes |
| `votes_yes_percent` | Float | Percentage yes |
| `votes_no_percent` | Float | Percentage no |
| `aba_rating` | String | ABA rating code |

**ABA Rating Codes**:
- `ewq` - Exceptionally Well Qualified
- `wq` - Well Qualified
- `q` - Qualified
- `nq` - Not Qualified

### Rate Limits

**Free Tier**:
- **5,000 requests per hour**
- **50,000 requests per day**
- Resets hourly at :00

**Best Practices**:
- Use delays between requests (1.5s recommended)
- Batch processing: 10 judges per batch
- Expected rate: ~24 judges/minute = 1,440/hour (well under limit)

**Rate Limit Headers**:
```
X-RateLimit-Limit: 5000
X-RateLimit-Remaining: 4999
X-RateLimit-Reset: 1698012000
```

### Data Coverage

**Strong Coverage**:
- ✅ Federal judges (Article III courts)
- ✅ Federal appellate judges
- ✅ Federal district judges
- ✅ Supreme Court justices
- ✅ State supreme court justices (many states)
- ✅ State appellate judges (many states)

**Limited Coverage**:
- ⚠️ State trial court judges (varies by state)
- ⚠️ Magistrate judges
- ⚠️ Special court judges
- ⚠️ Historical judges (pre-1950)

**California-Specific**:
- ✅ CA Supreme Court: Excellent coverage
- ✅ CA Courts of Appeal: Good coverage
- ⚠️ CA Superior Courts: Limited coverage (many judges lack data)

### Our Integration

**Sync Manager**: `/lib/courtlistener/political-affiliation-sync.ts`

**Data Flow**:
1. Query judges with `courtlistener_id` from our database
2. For each judge, fetch political affiliations from CourtListener
3. Format affiliation text: `"Republican Party (2018-present, appointed by Trump)"`
4. Store in `judges.political_affiliation` column
5. Optionally store full JSON in `judges.courtlistener_data` JSONB field

**Formatting Logic**:
```typescript
// Simple format (default):
"Republican Party (2018-present, appointed by Trump)"

// With history (--history flag):
"Republican Party (2018-present, Trump); Republican Party (2003-2018, Bush)"
```

**Error Handling**:
- Missing affiliation data: Skip judge (common for state trial judges)
- API errors: Log and continue to next judge
- Rate limit exceeded: Wait for hourly reset
- Invalid response: Log error details and skip judge

### Example Usage

**Sync Script**:
```bash
# Sync political affiliations for all judges missing data
npm run sync:political

# Force re-sync all judges (catch party changes)
npm run sync:political -- --all

# Test with limited batch
npm run sync:political -- --limit=50

# Include full historical affiliations in JSONB field
npm run sync:political -- --history
```

**Direct API Call**:
```typescript
import { CourtListenerClient } from '@/lib/courtlistener/client'

const client = new CourtListenerClient()
const affiliations = await client.getPoliticalAffiliations('12345')

console.log(affiliations)
// PoliticalAffiliationResponse with results array
```

---

## California Secretary of State

### Overview

The California Secretary of State oversees all elections in California and publishes official election results, candidate information, and campaign finance data.

**Website**: https://www.sos.ca.gov/elections
**Status**: Planned integration (Phase 2)

### Available Data

#### 1. Election Results

**Format**: CSV, PDF, HTML
**Availability**: Post-election (typically within 1 week for preliminary, 30 days for certified)

**Data Includes**:
- Candidate names
- Total votes received
- Vote percentage
- Geographic breakdown (by county)
- Ballot measures related to judicial races

**URL Pattern**:
```
https://elections.cdn.sos.ca.gov/sov/[YEAR]-[ELECTION]/[COUNTY]-sov.pdf
```

**Example**:
```
https://elections.cdn.sos.ca.gov/sov/2022-general/los-angeles-sov.pdf
```

#### 2. Candidate Statements

**Format**: PDF
**Availability**: Pre-election (60 days before election)

**Data Includes**:
- Biographical information
- Educational background
- Professional experience
- Candidate's statement (up to 400 words)

**URL Pattern**:
```
https://voterguide.sos.ca.gov/[YEAR]/[ELECTION]/pdf/candidate-statements/[POSITION].pdf
```

#### 3. Campaign Finance (Form 460)

**Format**: PDF, searchable database
**Availability**: Quarterly filings

**Data Includes**:
- Total contributions received
- Total expenditures
- Major donors (over $100)
- Independent expenditures

**Database**: http://cal-access.sos.ca.gov/

### Integration Plan (Phase 2)

**Timeline**: Q2 2026 (before November 2026 elections)

**Approach**:
1. **Manual Import**: Initial historical data entry
   - Scrape PDFs for past election results (2020, 2022, 2024)
   - OCR and validate data
   - Import into `judge_elections` table

2. **Automated Import**: Post-election results
   - Monitor SOS website for new election data
   - Parse CSV files when available
   - Validate against existing records
   - Automatically populate `judge_elections` table

3. **Real-time API** (if available):
   - Investigate if SOS offers real-time election night API
   - If yes, integrate for live results
   - If no, continue with post-election CSV parsing

**Data Mapping**:

| SOS Field | JudgeFinder Field |
|-----------|-------------------|
| Candidate Name | `judge_id` (lookup) |
| Office | `position_sought` |
| Votes Received | `vote_count` |
| Percent of Votes | `vote_percentage` |
| Election Date | `election_date` |
| County | `jurisdiction` |

**Challenges**:
- No standardized API (manual parsing required)
- PDF formats vary by county
- Candidate name matching (need fuzzy matching)
- Historical data requires manual data entry
- Budget: ~60 hours of development time

---

## Ballotpedia API (Future)

### Overview

Ballotpedia is a nonprofit encyclopedia of American politics, providing comprehensive data on elections, candidates, and elected officials.

**Website**: https://ballotpedia.org
**API Docs**: https://ballotpedia.org/Ballotpedia_API
**Status**: Future integration (Phase 3)
**Access**: Requires partnership agreement (nonprofit rate)

### Available Data

#### 1. Judicial Elections

**Endpoint**: `/elections/judicial`

**Data Includes**:
- Election dates
- Candidate profiles
- Polling data (if available)
- News coverage links
- Historical election results

#### 2. Campaign Finance

**Data Includes**:
- Total fundraising
- Major donors
- Independent expenditure committees
- PAC contributions

#### 3. Endorsements

**Data Includes**:
- Organizational endorsements
- Political party endorsements
- Newspaper endorsements

#### 4. Biographical Data

**Data Includes**:
- Education history
- Professional background
- Previous political experience
- Family information
- Published writings

### Integration Plan (Phase 3)

**Timeline**: TBD (2027 or later)

**Prerequisites**:
- Establish partnership with Ballotpedia
- Negotiate API access terms
- Secure nonprofit rate or sponsorship

**Use Cases**:
1. **Pre-election Intelligence**:
   - Campaign finance tracking for competitive races
   - Endorsement aggregation
   - Polling data for prediction modeling

2. **Biographical Enrichment**:
   - Expand judge profiles with detailed background
   - Add education history beyond law school
   - Professional career timeline

3. **News & Media Monitoring**:
   - Aggregate news coverage of judges
   - Track judicial controversies
   - Monitor retention election campaigns

**Estimated Cost**:
- API access: $500-$2,000/year (nonprofit rate)
- Development: 40 hours
- Ongoing maintenance: 10 hours/year

---

## Data Quality Considerations

### Data Completeness

**CourtListener Coverage by Court Level**:

| Court Level | Data Completeness | Notes |
|-------------|-------------------|-------|
| US Supreme Court | 100% | Complete historical data |
| Federal Appellate | 95% | Nearly complete |
| Federal District | 90% | Very good coverage |
| State Supreme Court | 80% | Good for major states |
| State Appellate | 60% | Varies significantly by state |
| State Trial Court | 30% | **Limited coverage** |

**California-Specific**:
- CA Supreme Court: 100% (all justices have affiliation data)
- CA Courts of Appeal: 85% (most justices covered)
- CA Superior Courts: **25%** (many judges lack data)

**Implication for JudgeFinder**:
- Expect ~75% of judges to have political affiliation data
- ~25% will show "Unknown" or "No affiliation data available"
- This is normal and expected

### Data Accuracy

**CourtListener Data Quality**:
- ✅ **High accuracy** for federal judges (sourced from Senate records)
- ✅ **High accuracy** for appointment data (official records)
- ⚠️ **Medium accuracy** for state judges (varies by state)
- ⚠️ **Low accuracy** for historical data pre-1950

**Common Data Issues**:
1. **Stale Data**: Judges may have changed party affiliation
   - Solution: Monthly re-sync
2. **Missing End Dates**: Some historical affiliations lack end dates
   - Solution: Mark as "historical" if start_date > 20 years ago
3. **Duplicate Records**: Multiple affiliation records for same period
   - Solution: De-duplicate by preferring most recent record

### Data Consistency

**Cross-Source Validation**:

When California SOS data becomes available, validate CourtListener data:

```sql
-- Flag inconsistencies for manual review
SELECT
  je.judge_id,
  j.name,
  je.election_date,
  je.source_name,
  j.political_affiliation as cl_affiliation,
  je.notes as sos_notes
FROM judge_elections je
JOIN judges j ON j.id = je.judge_id
WHERE je.source_name = 'CA Secretary of State'
  AND j.political_affiliation IS NOT NULL
  AND j.political_affiliation NOT ILIKE '%' || je.election_type || '%'
```

**Conflict Resolution Policy**:
1. Official government sources (SOS) take precedence over CourtListener
2. Most recent data preferred
3. Flag conflicts for manual review
4. Document source in `source_name` field

---

## Update Frequency & Sync Schedule

### Political Affiliation Data

**Source**: CourtListener API

**Sync Schedule**:
- **Initial Sync**: One-time bulk import (~1,600 judges, 90 minutes)
- **Weekly Incremental**: New judges only (Sunday 2 AM PT)
- **Monthly Full Re-sync**: All judges to catch party changes (1st Sunday, 3 AM PT)

**Cron Job**:
```bash
# Weekly incremental (new judges)
0 2 * * 0 npm run sync:political >> /var/log/political-sync.log 2>&1

# Monthly full re-sync
0 3 1-7 * 0 npm run sync:political -- --all >> /var/log/political-resync.log 2>&1
```

### Election Results Data

**Source**: CA Secretary of State (future)

**Sync Schedule**:
- **Post-Election**: Manually import certified results (within 30 days)
- **Historical**: Annual refresh of past election data
- **Real-time** (if API available): Election night results every 15 minutes

### Manual Data Entry

**Process**:
1. Research judge on official sources
2. Validate information with at least 2 sources
3. Enter data via admin interface
4. Mark as `verified = TRUE`
5. Document sources in `source_name` and `source_url` fields

**Quality Control**:
- All manual entries require peer review
- Mark with `source_name = 'Manual Entry - [Name]'`
- Include link to source document in `source_url`

---

## Data Accuracy & Verification

### Verification Levels

We use a 3-tier verification system:

#### Tier 1: Verified ✅

**Criteria**:
- Data from official government source (SOS, FEC, Senate)
- Manually reviewed and confirmed
- Multiple source agreement
- Recent (within 2 years)

**Database Field**: `verified = TRUE`

**Display**: Show verification badge

#### Tier 2: Sourced 📋

**Criteria**:
- Data from reputable third-party (CourtListener, Ballotpedia)
- Automated sync
- Single source
- Date unknown

**Database Field**: `verified = FALSE`, `source_name` populated

**Display**: Show source attribution

#### Tier 3: Unverified ⚠️

**Criteria**:
- Data completeness < 50%
- Source questionable or missing
- Conflicts between sources
- Very old data (> 20 years)

**Database Field**: `verified = FALSE`, `source_name = NULL`

**Display**: Show disclaimer "Unverified data"

### Verification Workflow

```sql
-- Weekly verification audit
SELECT
  COUNT(*) FILTER (WHERE verified = TRUE) as verified_count,
  COUNT(*) FILTER (WHERE verified = FALSE AND source_name IS NOT NULL) as sourced_count,
  COUNT(*) FILTER (WHERE source_name IS NULL) as unverified_count,
  ROUND(100.0 * COUNT(*) FILTER (WHERE verified = TRUE) / COUNT(*), 2) as verified_percentage
FROM judge_elections;

-- Flag old unverified data for review
SELECT id, judge_id, election_date, source_name
FROM judge_elections
WHERE verified = FALSE
  AND election_date < CURRENT_DATE - INTERVAL '5 years'
ORDER BY election_date DESC;
```

### User-Facing Verification Indicators

**Component**: `ElectionInformation.tsx`

```typescript
// Show verification badge for verified elections
{election.verified && (
  <Badge variant="success">
    <CheckCircle className="h-3 w-3" />
    Verified
  </Badge>
)}

// Show source for sourced data
{!election.verified && election.source_name && (
  <span className="text-xs text-muted-foreground">
    Source: {election.source_name}
  </span>
)}

// Show disclaimer for unverified
{!election.verified && !election.source_name && (
  <Alert variant="warning">
    <AlertCircle className="h-4 w-4" />
    <AlertDescription>
      Unverified election data. Please verify with official sources.
    </AlertDescription>
  </Alert>
)}
```

---

## Data Source Comparison

### Summary Matrix

| Feature | CourtListener | CA SOS | Ballotpedia |
|---------|---------------|--------|-------------|
| **Political Affiliation** | ✅ Excellent | ❌ No | ⚠️ Limited |
| **Election Results** | ❌ No | ✅ Official | ✅ Good |
| **Appointment Data** | ✅ Excellent | ⚠️ Limited | ⚠️ Limited |
| **Confirmation Votes** | ✅ Yes (federal) | ❌ No | ❌ No |
| **Campaign Finance** | ❌ No | ✅ Yes (Cal-Access) | ✅ Excellent |
| **Biographical Data** | ⚠️ Basic | ❌ No | ✅ Comprehensive |
| **Historical Data** | ✅ Good | ⚠️ Archives | ✅ Good |
| **API Access** | ✅ Free | ❌ No API | 💰 Paid |
| **Update Frequency** | Real-time | Post-election | Real-time |
| **Coverage** | Federal + some state | CA only | All states |
| **Data Quality** | High | Official | High |

### Recommended Strategy

**Current** (Phase 1):
- Primary: CourtListener for political affiliations
- Fallback: Manual entry for missing data

**Near-term** (Phase 2):
- Primary: CourtListener (political affiliations)
- Secondary: CA SOS (official election results)
- Manual entry for gaps

**Long-term** (Phase 3):
- Primary: CourtListener (political affiliations)
- Secondary: CA SOS (election results)
- Tertiary: Ballotpedia (enrichment data)
- Manual entry for corrections

---

## Appendix: Data Source Contacts

### CourtListener Support

- **Email**: info@free.law
- **GitHub Issues**: https://github.com/freelawproject/courtlistener/issues
- **Slack Community**: https://free.law/slack/
- **Documentation**: https://www.courtlistener.com/help/api/

### California Secretary of State

- **Elections Division**: (916) 657-2166
- **Email**: elections@sos.ca.gov
- **Media Inquiries**: (916) 653-6575
- **Website**: https://www.sos.ca.gov/elections/contact

### Ballotpedia

- **Partnerships**: partnerships@ballotpedia.org
- **Support**: support@ballotpedia.org
- **Phone**: (608) 310-8300
- **Website**: https://ballotpedia.org/Contact_us

---

**Document Prepared By**: Claude (Technical Documentation Agent)
**Review Status**: Pending stakeholder review
**Version History**:
- v1.0.0 (2025-10-22): Initial documentation

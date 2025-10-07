# JudgeFinder SEO & AEO Strategy

## Overview
Comprehensive search engine and answer engine optimization strategy for judicial transparency platform.

## Core SEO Implementation

### 1. Sitemap Architecture
- **Primary Sitemap**: `/sitemap.xml` - Dynamic Next.js sitemap
- **Sitemap Index**: `/public/sitemap-index.xml` - Master index file
- **Coverage**: All judges, courts, jurisdictions, and static pages
- **Update Frequency**: Dynamic based on content type
- **Priority Scoring**: Dynamic 0.85-0.95 for judges based on case count

### 2. Robots.txt Configuration
- **Location**: `/app/robots.ts`
- **AI Crawler Support**: Explicit rules for GPTBot, Claude, Perplexity, etc.
- **Crawl Delay**: 0.5s for AI crawlers, 1s for traditional
- **Disallowed Paths**: API routes, admin, dashboard, auth pages
- **Social Crawlers**: Optimized for Facebook, Twitter, LinkedIn

### 3. Answer Engine Optimization (AEO)

#### Targeted AI Crawlers
- GPTBot (OpenAI ChatGPT)
- Claude-Web (Anthropic Claude)
- PerplexityBot
- Google-Extended (Bard/Gemini)
- CCBot (Common Crawl)
- anthropic-ai
- cohere-ai

#### AEO Strategy
1. **Semantic Structure**: Clear entity relationships (judge → court → case)
2. **Question Targeting**: Optimized for common queries
3. **Rich Snippets**: JSON-LD structured data on all pages
4. **Natural Language**: Content written for AI comprehension
5. **Fact Extraction**: Clear, concise data points for AI parsing

### 4. Structured Data (Schema.org)

#### Implemented Types
- **WebSite**: Homepage with SearchAction
- **Person**: Judge profiles with job title, organization
- **GovernmentOrganization**: Court pages
- **FAQPage**: Common questions about judicial bias
- **BreadcrumbList**: Navigation context
- **ProfilePage**: Individual judge pages

#### Dynamic Generation
- Endpoint: `/api/structured-data`
- Netlify Function: `generate-structured-data.mts`
- Cached: 1 hour for performance

### 5. Meta Tags Strategy

#### Essential Tags (All Pages)
```html
<title>Judge Name | California Court | JudgeFinder</title>
<meta name="description" content="AI-powered analysis of Judge Name..." />
<meta name="keywords" content="judge, California, court, bias..." />
<link rel="canonical" href="https://judgefinder.io/judges/judge-name" />
```

#### Open Graph (Social)
```html
<meta property="og:title" content="..." />
<meta property="og:description" content="..." />
<meta property="og:image" content="..." />
<meta property="og:type" content="website" />
```

#### Twitter Cards
```html
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="..." />
<meta name="twitter:description" content="..." />
```

### 6. Content Optimization

#### Judge Profiles
- **Title Format**: `{Judge Name} | {Court} | JudgeFinder`
- **Description**: 155-160 chars with key metrics
- **Keywords**: Judge name, court, jurisdiction, specialties
- **Content Structure**:
  - H1: Judge name
  - H2: Court assignment, bias analysis
  - H3: Specific metrics (settlement rate, decision time)

#### Court Pages
- **Title Format**: `{Court Name} | California Courts | JudgeFinder`
- **Description**: Court location, judges, case volume
- **Keywords**: Court name, jurisdiction, court type

#### Jurisdiction Pages
- **Title Format**: `{County} Courts & Judges | California | JudgeFinder`
- **Geographic Targeting**: City/county/region names
- **Local SEO**: Address, service area, local courts

### 7. Technical SEO

#### Performance
- **Core Web Vitals**: Target LCP < 2.5s, FID < 100ms, CLS < 0.1
- **Image Optimization**: WebP/AVIF formats, lazy loading
- **Code Splitting**: Dynamic imports for heavy components
- **Caching**: 1-hour cache for static content, 5-min for dynamic

#### Mobile Optimization
- **Responsive Design**: All pages mobile-first
- **Touch Targets**: Minimum 48x48px
- **Viewport**: Proper meta viewport tag
- **Font Sizes**: Readable without zoom

#### Security
- **HTTPS**: Enforced via middleware
- **Security Headers**: CSP, HSTS, X-Frame-Options
- **SSL Certificate**: Netlify-provided

### 8. Link Building Strategy

#### Internal Linking
- **Judge to Court**: Every judge links to their court
- **Court to Judges**: Court pages list all assigned judges
- **Jurisdiction Hubs**: County pages link to all local courts
- **Comparison Tool**: Links to all compared judges
- **Related Judges**: Based on court, jurisdiction, specialties

#### External Authority
- **CourtListener**: Official source citations
- **California Courts**: Links to official court websites
- **Legal Resources**: Bar associations, legal aid organizations

### 9. Local SEO

#### Geographic Coverage
- **All California Counties**: 58 county pages
- **Major Cities**: LA, SF, San Diego, Sacramento, San Jose
- **Court Locations**: Physical addresses and maps
- **Service Areas**: Coverage by jurisdiction

#### Google My Business
- Platform listing (if applicable)
- Service area definitions
- Regular updates

### 10. Monitoring & Analytics

#### Search Console
- Sitemap submission tracking
- Crawl error monitoring
- Search performance analysis
- Core Web Vitals tracking

#### Key Metrics
- **Organic Traffic**: Judge profile visits
- **Search Rankings**: Target keywords position
- **Click-Through Rate**: SERP performance
- **Bounce Rate**: Content engagement
- **Page Speed**: Load time monitoring

### 11. Automation

#### Sitemap Submission
- **Function**: `submit-sitemap.mts`
- **Schedule**: Weekly (Sundays midnight UTC)
- **Targets**: Google, Bing
- **Logging**: Submission results tracked

#### Content Updates
- **Daily Sync**: New judges, court updates
- **Weekly Refresh**: Comprehensive data update
- **Analytics Generation**: AI bias analysis updates

## Implementation Checklist

### Immediate Actions
- [x] Dynamic sitemap with case-count priority
- [x] Robots.txt with AI crawler support
- [x] Sitemap index file
- [x] Structured data generation endpoint
- [x] Weekly sitemap submission automation
- [ ] Meta tags review on all pages
- [ ] Schema.org markup on judge pages
- [ ] FAQ page with structured data
- [ ] Breadcrumb navigation
- [ ] Canonical URL validation

### Ongoing Optimization
- [ ] Monthly keyword research
- [ ] Content freshness updates
- [ ] Backlink monitoring
- [ ] Competitor analysis
- [ ] Search Console reviews
- [ ] Core Web Vitals monitoring
- [ ] Mobile usability testing
- [ ] Structured data validation

## Answer Engine Queries Optimization

### Target Questions
1. "How do I research a judge in California?"
2. "Is my judge biased?"
3. "What is the settlement rate for Judge [Name]?"
4. "Which judges handle [case type] in [county]?"
5. "How to compare judges?"
6. "What is judicial bias detection?"
7. "Find judges in [jurisdiction]"
8. "Judge [Name] case outcomes"
9. "Court transparency tools"
10. "Judge decision patterns"

### Content Optimization for AI
- **Clear Definitions**: Explain technical terms
- **Fact Statements**: Direct answers to common questions
- **Data Tables**: Structured comparison data
- **Lists**: Numbered steps, criteria, factors
- **Examples**: Real-world use cases
- **Citations**: Link to authoritative sources

## Success Metrics

### Short-term (3 months)
- 100% sitemap coverage of all judges
- Zero crawl errors in Search Console
- All pages indexed by Google/Bing
- Core Web Vitals passing
- Structured data validation passing

### Medium-term (6 months)
- Top 10 rankings for "[county] judges"
- Featured snippets for common questions
- 1000+ organic sessions/month
- 50+ AI crawler visits/week
- 5+ backlinks from legal sites

### Long-term (12 months)
- Top 3 for "California judge search"
- Answer box features in Google
- 10,000+ organic sessions/month
- Domain authority 30+
- Coverage in legal publications

## Resources

### Tools
- Google Search Console
- Bing Webmaster Tools
- Schema.org Validator
- Rich Results Test (Google)
- PageSpeed Insights
- Mobile-Friendly Test
- Lighthouse CI

### Documentation
- `/app/sitemap.ts` - Dynamic sitemap
- `/app/robots.ts` - Robots.txt
- `/netlify/functions/submit-sitemap.mts` - Automation
- `/netlify/functions/generate-structured-data.mts` - Schema.org
- `/app/seo-metadata.json` - SEO configuration

---

**Last Updated**: 2025-01-06
**Next Review**: 2025-02-06

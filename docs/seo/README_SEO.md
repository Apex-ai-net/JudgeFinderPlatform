# JudgeFinder SEO & AEO Implementation Guide

## Quick Start

### Test Locally
```bash
# Start dev server
npm run dev

# Test endpoints
curl http://localhost:3005/sitemap.xml
curl http://localhost:3005/robots.txt
curl http://localhost:3005/api/structured-data?type=website
```

### Deploy to Netlify
```bash
# Build and deploy
npm run build
netlify deploy --prod

# Or use continuous deployment (automatic on git push)
git push origin main
```

## What Was Created

### 1. Enhanced Sitemap (`/app/sitemap.ts`)
✅ Dynamic priority scoring (0.85-0.95) based on judge case count
✅ Ordered by recency and case volume for better crawling
✅ Complete coverage: judges, courts, jurisdictions
✅ Weekly update frequency for fresh content signals

### 2. AI-Optimized Robots.txt (`/app/robots.ts`)
✅ Explicit rules for AI crawlers (GPTBot, Claude, Perplexity, etc.)
✅ Faster crawl delay (0.5s) for answer engines
✅ Social media crawler optimization
✅ Protected routes (admin, API, auth)

### 3. Netlify Functions

#### Sitemap Submission (`/netlify/functions/submit-sitemap.mts`)
- **Schedule**: Weekly (Sundays midnight UTC)
- **Targets**: Google & Bing
- **Action**: Automatic sitemap submission
- **Logging**: Tracks submission results

#### Structured Data Generator (`/netlify/functions/generate-structured-data.mts`)
- **Endpoint**: `/api/structured-data`
- **Types**: website, judge, court, faq, breadcrumb
- **Cache**: 1 hour
- **Purpose**: JSON-LD for rich snippets

### 4. Documentation
- **SEO Strategy**: `/docs/SEO_STRATEGY.md` - Comprehensive guide
- **Metadata Config**: `/app/seo-metadata.json` - Centralized SEO data
- **This Guide**: Quick reference for implementation

### 5. Sitemap Index
- **File**: `/public/sitemap-index.xml`
- **Purpose**: Master sitemap for large sites
- **Points to**: Main dynamic sitemap

## Key Features

### Answer Engine Optimization (AEO)
Target AI assistants (ChatGPT, Claude, Perplexity) with:
- Semantic entity relationships
- Question-focused content
- Clear fact statements
- Structured data markup

### Dynamic Priority Scoring
Judges with more cases get higher sitemap priority:
```typescript
basePriority = 0.85
priorityBoost = min(0.1, (caseCount / 100) * 0.1)
finalPriority = 0.85 to 0.95
```

### Automated Maintenance
Weekly sitemap submission ensures search engines stay updated without manual intervention.

## Verification Steps

### 1. Google Search Console
```bash
# Submit sitemap
https://search.google.com/search-console
-> Sitemaps -> Add new sitemap
-> https://judgefinder.io/sitemap.xml
```

### 2. Bing Webmaster Tools
```bash
https://www.bing.com/webmasters
-> Sitemaps -> Submit sitemap
-> https://judgefinder.io/sitemap.xml
```

### 3. Validate Structured Data
```bash
# Google Rich Results Test
https://search.google.com/test/rich-results

# Schema.org Validator
https://validator.schema.org/
```

### 4. Check Robots.txt
```bash
# Test in Google Search Console
Search Console -> Settings -> Crawling -> robots.txt Tester
```

## Monitoring

### Search Console Metrics
- Crawl stats (pages crawled/day)
- Sitemap coverage (submitted vs indexed)
- Core Web Vitals (LCP, FID, CLS)
- Search appearance (rich results)

### Key Performance Indicators
- **Judge Pages Indexed**: Target 100%
- **Crawl Errors**: Target 0
- **Average Position**: Improve monthly
- **Click-Through Rate**: Target 3%+
- **AI Crawler Visits**: Track weekly

## Next Steps

### Immediate (Week 1)
- [ ] Submit sitemap to Google Search Console
- [ ] Submit sitemap to Bing Webmaster Tools
- [ ] Verify structured data with Google Rich Results Test
- [ ] Check robots.txt accessibility
- [ ] Monitor first crawl in Search Console

### Short-term (Month 1)
- [ ] Add schema.org markup to judge pages
- [ ] Implement FAQ page with structured data
- [ ] Add breadcrumb navigation
- [ ] Create OpenGraph images
- [ ] Set up Google Analytics

### Medium-term (Month 3)
- [ ] Optimize meta descriptions for top pages
- [ ] Build internal linking structure
- [ ] Create content for target keywords
- [ ] Monitor and fix crawl errors
- [ ] Analyze search query performance

## Troubleshooting

### Sitemap Not Updating
```bash
# Clear Next.js cache
rm -rf .next
npm run build
```

### Netlify Function Not Running
```bash
# Check function logs
netlify functions:log submit-sitemap

# Test locally
netlify dev
netlify functions:invoke submit-sitemap
```

### Robots.txt Not Working
- Verify file at `https://judgefinder.io/robots.txt`
- Check for caching issues (hard refresh)
- Use Google Search Console robots.txt tester

### Structured Data Errors
```bash
# Validate output
curl https://judgefinder.io/api/structured-data?type=website | jq
```

## Resources

### SEO Tools
- [Google Search Console](https://search.google.com/search-console)
- [Bing Webmaster Tools](https://www.bing.com/webmasters)
- [Schema.org Validator](https://validator.schema.org/)
- [Google Rich Results Test](https://search.google.com/test/rich-results)
- [PageSpeed Insights](https://pagespeed.web.dev/)

### Documentation
- [Next.js Sitemap](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap)
- [Next.js Robots.txt](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/robots)
- [Schema.org Documentation](https://schema.org/)
- [Netlify Functions](https://docs.netlify.com/functions/overview/)

### JudgeFinder Docs
- Main SEO Strategy: `/docs/SEO_STRATEGY.md`
- Sitemap Implementation: `/app/sitemap.ts`
- Robots Configuration: `/app/robots.ts`
- Structured Data: `/netlify/functions/generate-structured-data.mts`

---

**Created**: 2025-01-06
**Platform**: JudgeFinder - Judicial Transparency Platform
**Deployment**: Netlify + Next.js 15 + App Router

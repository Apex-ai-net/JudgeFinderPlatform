# Site Architecture Implementation Checklist

**Project:** JudgeFinder.io SEO & Navigation Improvements
**Goal:** Fix broken links, improve crawlability, enhance internal linking
**Timeline:** 4 weeks (broken into weekly sprints)

---

## Week 1: Critical Fixes (404 Errors)

### Priority 1A: Attorney Directory Pages

**Estimated Time:** 2-3 days

- [ ] Create `/app/attorneys/page.tsx` (main directory)
  - [ ] List all jurisdictions with attorney links
  - [ ] Add search/filter functionality
  - [ ] Include SEO metadata
  - [ ] Add structured data

- [ ] Create `/app/attorneys/[jurisdiction]/page.tsx`
  - [ ] Dynamic route for each county
  - [ ] Fetch attorneys by jurisdiction from database
  - [ ] Display attorney listings
  - [ ] Add filters (practice area, experience)
  - [ ] Include "Find attorneys before Judge X" links

- [ ] Update database schema if needed
  ```sql
  CREATE TABLE IF NOT EXISTS attorneys (
    id UUID PRIMARY KEY,
    name TEXT,
    jurisdiction TEXT,
    practice_areas TEXT[],
    experience_years INTEGER,
    judges_appeared_before UUID[],
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  ```

- [ ] Add to sitemap.ts
  ```typescript
  // Add attorney pages to sitemap
  const { data: jurisdictions } = await supabase
    .from('courts')
    .select('jurisdiction')
    .not('jurisdiction', 'is', null)

  const attorneyEntries = jurisdictions.map(j => ({
    url: `${siteUrl}/attorneys/${createCanonicalSlug(j.jurisdiction)}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.6
  }))
  ```

**Files to Create:**
- `/app/attorneys/page.tsx`
- `/app/attorneys/[jurisdiction]/page.tsx`
- `/lib/attorneys/service.ts` (data fetching)
- `/components/attorneys/AttorneyCard.tsx`
- `/components/attorneys/AttorneyFilters.tsx`

---

### Priority 1B: Case Analytics Pages

**Estimated Time:** 2-3 days

- [ ] Create `/app/case-analytics/page.tsx` (main hub)
  - [ ] Overview of analytics features
  - [ ] List of jurisdictions with analytics
  - [ ] Quick stats dashboard
  - [ ] SEO metadata

- [ ] Create `/app/case-analytics/[jurisdiction]/page.tsx`
  - [ ] Dynamic route for each county
  - [ ] Display case statistics by jurisdiction
  - [ ] Show outcome patterns
  - [ ] Include court performance metrics
  - [ ] Add time-based analytics

- [ ] Create analytics queries
  ```typescript
  // Fetch case statistics
  const { data: caseStats } = await supabase
    .rpc('get_case_analytics_by_jurisdiction', {
      jurisdiction_param: jurisdiction
    })
  ```

- [ ] Add visualizations
  - [ ] Outcome distribution charts
  - [ ] Case volume trends
  - [ ] Decision time averages
  - [ ] Settlement vs trial rates

- [ ] Add to sitemap.ts
  ```typescript
  const analyticsEntries = jurisdictions.map(j => ({
    url: `${siteUrl}/case-analytics/${createCanonicalSlug(j.jurisdiction)}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.65
  }))
  ```

**Files to Create:**
- `/app/case-analytics/page.tsx`
- `/app/case-analytics/[jurisdiction]/page.tsx`
- `/lib/analytics/case-statistics.ts`
- `/components/analytics/CaseDistributionChart.tsx`
- `/components/analytics/TrendAnalysis.tsx`

---

### Priority 1C: Research Tools Pages

**Estimated Time:** 1-2 days

- [ ] Create `/app/legal-research-tools/page.tsx`
  - [ ] Overview of research tools
  - [ ] Tool categories
  - [ ] Quick access to main features
  - [ ] User guide/tutorials

- [ ] Create `/app/judicial-analytics/page.tsx`
  - [ ] Platform-wide judicial analytics
  - [ ] Aggregate statistics
  - [ ] Comparison tools
  - [ ] Export functionality

- [ ] Add to sitemap.ts
  ```typescript
  {
    url: `${siteUrl}/legal-research-tools`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.7
  },
  {
    url: `${siteUrl}/judicial-analytics`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.75
  }
  ```

**Files to Create:**
- `/app/legal-research-tools/page.tsx`
- `/app/judicial-analytics/page.tsx`
- `/components/research/ToolsGrid.tsx`
- `/components/research/AnalyticsDashboard.tsx`

---

### Priority 1D: Update Related Content Component

**Estimated Time:** 1 day

- [ ] Update `/components/seo/RelatedContent.tsx`
  - [ ] Change attorney links to use real pages
    ```typescript
    // OLD: Points to 404
    href={`/attorneys/${jurisdiction.toLowerCase().replace(/\s+/g, '-')}`}

    // NEW: Points to real page (once created)
    href={`/attorneys/${createCanonicalSlug(jurisdiction)}`}
    ```

  - [ ] Update case analytics links
  - [ ] Update research tools links
  - [ ] Fix popular searches section
  - [ ] Add conditional rendering for new pages

- [ ] Test all links from judge pages
  - [ ] Verify attorney directory links work
  - [ ] Verify case analytics links work
  - [ ] Verify all footer links work
  - [ ] Check breadcrumbs

**Files to Modify:**
- `/components/seo/RelatedContent.tsx`
- Test: `/app/judges/[slug]/page.tsx`

---

### Week 1 Testing Checklist

- [ ] All attorney pages return 200 (not 404)
- [ ] All case analytics pages return 200
- [ ] Research tools pages accessible
- [ ] Links from judge pages work correctly
- [ ] Sitemap includes new pages
- [ ] Metadata is properly set on all new pages
- [ ] Mobile responsive on all new pages
- [ ] No console errors

**Week 1 Deliverable:** Zero 404 errors from judge page links

---

## Week 2: Court Type Categories

### Priority 2A: Court Type Filter Pages

**Estimated Time:** 3-4 days

- [ ] Create `/app/courts/type/page.tsx` (category hub)
  - [ ] List all court types
  - [ ] Quick stats per type
  - [ ] Links to each type page

- [ ] Create `/app/courts/type/[type]/page.tsx`
  - [ ] Dynamic route for court types
  - [ ] Support: superior, appellate, supreme, federal, municipal
  - [ ] List all courts of that type
  - [ ] Filter by jurisdiction
  - [ ] Sort options

- [ ] Add type validation
  ```typescript
  const validTypes = ['superior', 'appellate', 'supreme', 'federal', 'municipal']

  export async function generateStaticParams() {
    return validTypes.map(type => ({ type }))
  }
  ```

- [ ] Create queries
  ```typescript
  const { data: courts } = await supabase
    .from('courts')
    .select('*')
    .ilike('type', `%${courtType}%`)
    .order('jurisdiction', { ascending: true })
  ```

- [ ] Add to sitemap.ts
  ```typescript
  const courtTypeEntries = ['superior', 'appellate', 'supreme'].map(type => ({
    url: `${siteUrl}/courts/type/${type}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.65
  }))
  ```

**Files to Create:**
- `/app/courts/type/page.tsx`
- `/app/courts/type/[type]/page.tsx`
- `/lib/courts/types.ts`
- `/components/courts/TypeFilter.tsx`

---

### Priority 2B: Judge Filter Pages

**Estimated Time:** 3-4 days

- [ ] Create `/app/judges/veteran/page.tsx`
  - [ ] List judges with 15+ years experience
  - [ ] Calculate from appointed_date
  - [ ] Show experience stats
  - [ ] Add sorting options

  ```typescript
  const { data: veteranJudges } = await supabase
    .from('judges')
    .select('*')
    .not('appointed_date', 'is', null)
    .gte('appointed_date', new Date(new Date().getFullYear() - 15, 0, 1).toISOString())
    .order('appointed_date', { ascending: true })
  ```

- [ ] Create `/app/judges/recently-appointed/page.tsx`
  - [ ] List judges appointed in last 2 years
  - [ ] Show appointment dates
  - [ ] Highlight newest judges

  ```typescript
  const twoYearsAgo = new Date()
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2)

  const { data: recentJudges } = await supabase
    .from('judges')
    .select('*')
    .gte('appointed_date', twoYearsAgo.toISOString())
    .order('appointed_date', { ascending: false })
  ```

- [ ] Create `/app/judges/by-court-type/[type]/page.tsx`
  - [ ] Dynamic route for court types
  - [ ] Join with courts table
  - [ ] Filter judges by court type

  ```typescript
  const { data: judges } = await supabase
    .from('judges')
    .select('*, courts!inner(*)')
    .ilike('courts.type', `%${courtType}%`)
    .order('name')
  ```

- [ ] Create `/app/judges/by-county/page.tsx`
  - [ ] County selector/map
  - [ ] Quick links to all counties
  - [ ] Statistics per county

**Files to Create:**
- `/app/judges/veteran/page.tsx`
- `/app/judges/recently-appointed/page.tsx`
- `/app/judges/by-court-type/[type]/page.tsx`
- `/app/judges/by-county/page.tsx`
- `/components/judges/ExperienceFilter.tsx`

---

### Week 2 Testing Checklist

- [ ] Court type pages display correct courts
- [ ] Veteran judges page shows 15+ year judges only
- [ ] Recently appointed shows last 2 years only
- [ ] By-court-type pages filter correctly
- [ ] By-county page lists all counties
- [ ] All pages have proper metadata
- [ ] Sitemap includes all new pages
- [ ] Internal links updated to point to new pages

**Week 2 Deliverable:** Complete filter/category page system

---

## Week 3: Navigation Enhancements

### Priority 3A: Mega Menu Implementation

**Estimated Time:** 3-4 days

- [ ] Update `/components/ui/Header.tsx`
  - [ ] Add dropdown functionality
  - [ ] Create mega menu structure
  - [ ] Desktop version (hover)
  - [ ] Mobile version (accordion)

- [ ] Create Judges mega menu
  ```typescript
  const judgesMenu = [
    { label: 'All Judges', href: '/judges' },
    { label: 'Compare Judges', href: '/compare' },
    {
      label: 'By County',
      children: [
        { label: 'Los Angeles', href: '/jurisdictions/los-angeles-county' },
        { label: 'Orange County', href: '/jurisdictions/orange-county' },
        // ... more counties
      ]
    },
    {
      label: 'By Court Type',
      children: [
        { label: 'Superior Court', href: '/courts/type/superior' },
        { label: 'Appellate Court', href: '/courts/type/appellate' },
        { label: 'Supreme Court', href: '/courts/type/supreme' },
      ]
    },
    { label: 'Veteran Judges', href: '/judges/veteran' },
    { label: 'Recently Appointed', href: '/judges/recently-appointed' },
  ]
  ```

- [ ] Create Courts mega menu
  ```typescript
  const courtsMenu = [
    { label: 'All Courts', href: '/courts' },
    { label: 'Superior Courts', href: '/courts/type/superior' },
    { label: 'Appellate Courts', href: '/courts/type/appellate' },
    { label: 'Supreme Court', href: '/courts/type/supreme' },
    { label: 'By Jurisdiction', href: '/jurisdictions' },
  ]
  ```

- [ ] Implement mega menu component
  - [ ] `MegaMenu.tsx` - Main component
  - [ ] `MegaMenuItem.tsx` - Individual item
  - [ ] `MegaMenuSection.tsx` - Section with children
  - [ ] Accessibility (keyboard nav)
  - [ ] Mobile responsive

**Files to Create:**
- `/components/navigation/MegaMenu.tsx`
- `/components/navigation/MegaMenuItem.tsx`
- `/components/navigation/MegaMenuSection.tsx`
- `/components/navigation/mega-menu-config.ts`

**Files to Modify:**
- `/components/ui/Header.tsx`

---

### Priority 3B: Enhanced Related Content

**Estimated Time:** 2-3 days

- [ ] Update `/components/seo/RelatedContent.tsx`
  - [ ] Increase related judges from 5 to 8
  - [ ] Add "Frequently Compared" section
  - [ ] Add statistical comparison preview
  - [ ] Include practice area tags (if available)

- [ ] Create new component `/components/judges/FrequentlyCompared.tsx`
  ```typescript
  // Find judges frequently compared together
  const { data: comparedJudges } = await supabase
    .rpc('get_frequently_compared_judges', {
      judge_id: currentJudge.id,
      limit: 3
    })
  ```

- [ ] Add comparison statistics
  - [ ] Quick stat comparison (3-4 key metrics)
  - [ ] "Similar to" indicators
  - [ ] "Different from" highlights

- [ ] Improve layout
  - [ ] Card-based design
  - [ ] Hover effects
  - [ ] Better visual hierarchy

**Files to Create:**
- `/components/judges/FrequentlyCompared.tsx`
- `/components/judges/QuickComparison.tsx`
- `/lib/judges/comparison-analytics.ts`

**Files to Modify:**
- `/components/seo/RelatedContent.tsx`

---

### Priority 3C: Search Enhancements

**Estimated Time:** 2-3 days

- [ ] Update `/app/search/page.tsx`
  - [ ] Add autocomplete suggestions
  - [ ] Add recent searches (user-specific)
  - [ ] Add popular searches
  - [ ] Add "People also searched for"

- [ ] Create autocomplete API
  - [ ] `/api/search/autocomplete`
  - [ ] Match judges by name
  - [ ] Match courts by name
  - [ ] Match jurisdictions
  - [ ] Return top 10 results

- [ ] Add search history (client-side)
  - [ ] localStorage for recent searches
  - [ ] Display recent 5 searches
  - [ ] Clear history button

- [ ] Create popular searches component
  ```typescript
  const popularSearches = [
    'Judge John Doe',
    'Orange County Superior Court',
    'Los Angeles judges',
    'Veteran judges',
    'Recently appointed judges',
  ]
  ```

**Files to Create:**
- `/app/api/search/autocomplete/route.ts`
- `/components/search/Autocomplete.tsx`
- `/components/search/RecentSearches.tsx`
- `/components/search/PopularSearches.tsx`
- `/lib/search/search-history.ts`

**Files to Modify:**
- `/app/search/page.tsx`

---

### Week 3 Testing Checklist

- [ ] Mega menu displays correctly on desktop
- [ ] Mega menu works on mobile (accordion)
- [ ] All mega menu links are correct
- [ ] Related content shows 8 judges
- [ ] Frequently compared section works
- [ ] Search autocomplete responds quickly
- [ ] Recent searches stored correctly
- [ ] Popular searches display
- [ ] Keyboard navigation works

**Week 3 Deliverable:** Enhanced navigation and discovery

---

## Week 4: Advanced Features & Polish

### Priority 4A: Breadcrumb Enhancements

**Estimated Time:** 1-2 days

- [ ] Update `/components/seo/SEOBreadcrumbs.tsx`
  - [ ] Add more descriptive labels
  - [ ] Include jurisdiction in all breadcrumbs
  - [ ] Add court type context
  - [ ] Improve mobile display

- [ ] Update breadcrumb generation
  - [ ] Add jurisdiction to judge breadcrumbs
  - [ ] Add court type to court breadcrumbs
  - [ ] Include filters in category pages

- [ ] Enhance structured data
  - [ ] Add more detailed item properties
  - [ ] Include position numbers
  - [ ] Add item URLs

**Files to Modify:**
- `/components/seo/SEOBreadcrumbs.tsx`
- `/lib/seo/breadcrumbs.ts`

---

### Priority 4B: Footer Improvements

**Estimated Time:** 1-2 days

- [ ] Update `/components/ui/Footer.tsx`
  - [ ] Add "Popular Judges" section
  - [ ] Add "Top Courts" section
  - [ ] Add "Recent Updates" section
  - [ ] Include more counties

- [ ] Create dynamic footer content
  ```typescript
  // Fetch popular judges
  const { data: popularJudges } = await supabase
    .from('judges')
    .select('name, slug')
    .order('view_count', { ascending: false })
    .limit(5)

  // Fetch top courts
  const { data: topCourts } = await supabase
    .from('courts')
    .select('name, slug')
    .order('judge_count', { ascending: false })
    .limit(5)
  ```

- [ ] Add sections
  - [ ] Popular Judges (top 5)
  - [ ] Top Courts (top 5)
  - [ ] More Counties (expand from 3 to 10)
  - [ ] Recent Updates (last 5 changes)

**Files to Modify:**
- `/components/ui/Footer.tsx`

---

### Priority 4C: Additional Category Pages

**Estimated Time:** 2-3 days

- [ ] Create `/app/judges/by-experience/page.tsx`
  - [ ] Experience level selector
  - [ ] 0-5 years, 5-10 years, 10-15 years, 15+ years
  - [ ] Statistics per bracket

- [ ] Create regional aggregation pages
  - [ ] `/app/jurisdictions/southern-california/page.tsx`
  - [ ] `/app/jurisdictions/northern-california/page.tsx`
  - [ ] `/app/jurisdictions/central-california/page.tsx`
  - [ ] Aggregate stats by region

- [ ] Create practice area pages (if data available)
  - [ ] `/app/judges/practice-area/[area]/page.tsx`
  - [ ] Family, Criminal, Civil, etc.
  - [ ] Filter judges by specialization

**Files to Create:**
- `/app/judges/by-experience/page.tsx`
- `/app/jurisdictions/southern-california/page.tsx`
- `/app/jurisdictions/northern-california/page.tsx`
- `/app/jurisdictions/central-california/page.tsx`
- `/app/judges/practice-area/[area]/page.tsx`

---

### Priority 4D: Final Polish & Testing

**Estimated Time:** 2-3 days

- [ ] Run comprehensive link check
  - [ ] Use Screaming Frog or similar
  - [ ] Verify all internal links work
  - [ ] Check external links
  - [ ] Fix any broken links

- [ ] Verify sitemap
  - [ ] All pages included
  - [ ] Correct priorities
  - [ ] Proper change frequencies
  - [ ] No duplicate URLs

- [ ] Test all dynamic routes
  - [ ] All judge slugs work
  - [ ] All court slugs work
  - [ ] All jurisdiction slugs work
  - [ ] All filter pages work

- [ ] Performance testing
  - [ ] Lighthouse scores
  - [ ] Core Web Vitals
  - [ ] Page load times
  - [ ] Mobile performance

- [ ] SEO validation
  - [ ] All pages have unique titles
  - [ ] All pages have meta descriptions
  - [ ] Structured data validates
  - [ ] OpenGraph tags correct
  - [ ] Canonical URLs set

- [ ] Accessibility check
  - [ ] Keyboard navigation works
  - [ ] Screen reader friendly
  - [ ] ARIA labels correct
  - [ ] Color contrast passes

**Week 4 Deliverable:** Production-ready site with zero issues

---

## Post-Implementation Monitoring

### Week 5: Monitor & Optimize

- [ ] Set up monitoring
  - [ ] Google Search Console
  - [ ] Google Analytics
  - [ ] Uptime monitoring
  - [ ] Error tracking (Sentry)

- [ ] Track key metrics
  - [ ] Crawl stats (GSC)
  - [ ] Index coverage
  - [ ] Page performance
  - [ ] User engagement

- [ ] Create reports
  - [ ] Weekly crawl report
  - [ ] Monthly SEO report
  - [ ] Performance dashboard
  - [ ] User behavior analysis

### Ongoing Tasks

- [ ] Weekly link check
- [ ] Monthly sitemap validation
- [ ] Quarterly content audit
- [ ] Continuous optimization

---

## Database Requirements

### New Tables Needed

```sql
-- Attorney directory
CREATE TABLE IF NOT EXISTS attorneys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  jurisdiction TEXT NOT NULL,
  practice_areas TEXT[],
  experience_years INTEGER,
  bar_number TEXT,
  judges_appeared_before UUID[],
  contact_email TEXT,
  phone TEXT,
  website TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_attorneys_jurisdiction ON attorneys(jurisdiction);
CREATE INDEX idx_attorneys_practice_areas ON attorneys USING GIN(practice_areas);

-- Judge view tracking (for popular judges)
CREATE TABLE IF NOT EXISTS judge_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  judge_id UUID REFERENCES judges(id),
  view_date DATE DEFAULT CURRENT_DATE,
  view_count INTEGER DEFAULT 1,
  UNIQUE(judge_id, view_date)
);

CREATE INDEX idx_judge_views_judge_id ON judge_views(judge_id);
CREATE INDEX idx_judge_views_date ON judge_views(view_date);

-- Judge comparison tracking (for frequently compared)
CREATE TABLE IF NOT EXISTS judge_comparisons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  judge_id_1 UUID REFERENCES judges(id),
  judge_id_2 UUID REFERENCES judges(id),
  comparison_count INTEGER DEFAULT 1,
  last_compared_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(judge_id_1, judge_id_2)
);

CREATE INDEX idx_comparisons_judge1 ON judge_comparisons(judge_id_1);
CREATE INDEX idx_comparisons_judge2 ON judge_comparisons(judge_id_2);
```

### Database Functions Needed

```sql
-- Get frequently compared judges
CREATE OR REPLACE FUNCTION get_frequently_compared_judges(
  judge_id_param UUID,
  limit_param INTEGER DEFAULT 3
)
RETURNS TABLE (
  judge_id UUID,
  judge_name TEXT,
  comparison_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    CASE
      WHEN jc.judge_id_1 = judge_id_param THEN jc.judge_id_2
      ELSE jc.judge_id_1
    END as judge_id,
    j.name as judge_name,
    jc.comparison_count
  FROM judge_comparisons jc
  JOIN judges j ON (
    j.id = CASE
      WHEN jc.judge_id_1 = judge_id_param THEN jc.judge_id_2
      ELSE jc.judge_id_1
    END
  )
  WHERE jc.judge_id_1 = judge_id_param OR jc.judge_id_2 = judge_id_param
  ORDER BY jc.comparison_count DESC
  LIMIT limit_param;
END;
$$ LANGUAGE plpgsql;

-- Get case analytics by jurisdiction
CREATE OR REPLACE FUNCTION get_case_analytics_by_jurisdiction(
  jurisdiction_param TEXT
)
RETURNS TABLE (
  total_cases BIGINT,
  avg_decision_days NUMERIC,
  outcome_distribution JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) as total_cases,
    AVG(EXTRACT(DAY FROM (closed_date - filed_date))) as avg_decision_days,
    jsonb_object_agg(outcome, count) as outcome_distribution
  FROM (
    SELECT
      outcome,
      COUNT(*) as count
    FROM cases c
    JOIN judges j ON c.judge_id = j.id
    WHERE j.jurisdiction = jurisdiction_param
    GROUP BY outcome
  ) outcome_counts;
END;
$$ LANGUAGE plpgsql;
```

---

## Code Templates

### Template: Filter Page

```typescript
// /app/judges/[filter]/page.tsx
import { Metadata } from 'next'
import { createServerClient } from '@/lib/supabase/server'
import { JudgeCard } from '@/components/judges/JudgeCard'

export const metadata: Metadata = {
  title: '[Filter Name] Judges | JudgeFinder',
  description: 'Browse [filter description] judges in California',
  alternates: {
    canonical: '/judges/[filter]'
  }
}

export default async function FilterPage() {
  const supabase = await createServerClient()

  const { data: judges } = await supabase
    .from('judges')
    .select('*')
    // Add filter conditions here
    .order('name')

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">[Filter Name] Judges</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {judges?.map(judge => (
          <JudgeCard key={judge.id} judge={judge} />
        ))}
      </div>
    </div>
  )
}
```

### Template: Dynamic Category Page

```typescript
// /app/[category]/[slug]/page.tsx
import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params

  return {
    title: `${slug} | JudgeFinder`,
    description: `Information about ${slug}`,
    alternates: {
      canonical: `/category/${slug}`
    }
  }
}

export default async function CategoryPage({ params }: PageProps) {
  const { slug } = await params
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('table')
    .select('*')
    .eq('slug', slug)
    .single()

  if (error || !data) {
    notFound()
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Page content */}
    </div>
  )
}
```

---

## Testing Checklist

### Functionality Testing

- [ ] All new pages load without errors
- [ ] All internal links work (no 404s)
- [ ] Search functionality works
- [ ] Filters apply correctly
- [ ] Pagination works on all directory pages
- [ ] Related content displays correctly
- [ ] Breadcrumbs show proper hierarchy
- [ ] Mobile navigation works
- [ ] Forms submit correctly (if any)
- [ ] External links open correctly

### SEO Testing

- [ ] All pages have unique titles
- [ ] All pages have meta descriptions
- [ ] Canonical URLs are set
- [ ] OpenGraph tags present
- [ ] Twitter Card tags present
- [ ] Structured data validates (Google Rich Results Test)
- [ ] Sitemap includes all pages
- [ ] Robots.txt allows content pages
- [ ] No duplicate content
- [ ] Images have alt text

### Performance Testing

- [ ] Lighthouse Performance > 90
- [ ] Lighthouse Accessibility > 90
- [ ] Lighthouse Best Practices > 90
- [ ] Lighthouse SEO > 95
- [ ] Core Web Vitals pass
- [ ] Page load < 3 seconds
- [ ] Time to Interactive < 5 seconds
- [ ] Images optimized
- [ ] Code splitting working

### Accessibility Testing

- [ ] Keyboard navigation works
- [ ] Screen reader friendly
- [ ] ARIA labels correct
- [ ] Color contrast passes WCAG AA
- [ ] Focus indicators visible
- [ ] Semantic HTML used
- [ ] Skip links present
- [ ] Form labels correct

### Cross-Browser Testing

- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Mobile Chrome (Android)

---

## Success Metrics

### Week 1 Success Criteria
- ✅ Zero 404 errors from judge pages
- ✅ All attorney directory pages live
- ✅ All case analytics pages live
- ✅ Research tools pages accessible
- ✅ Sitemap updated with new pages

### Week 2 Success Criteria
- ✅ Court type filter pages working
- ✅ Judge filter pages (veteran, recent, etc.) live
- ✅ All filter queries return correct results
- ✅ Category pages in sitemap

### Week 3 Success Criteria
- ✅ Mega menu implemented
- ✅ Enhanced related content showing 8 judges
- ✅ Search autocomplete working
- ✅ Navigation improvements complete

### Week 4 Success Criteria
- ✅ All advanced features implemented
- ✅ Zero broken links
- ✅ All tests passing
- ✅ Site ready for production

### Final Success Criteria
- ✅ 2,500+ pages fully indexed
- ✅ Average click depth ≤ 3
- ✅ No orphaned pages
- ✅ Lighthouse scores > 90 across the board
- ✅ All internal links functional
- ✅ Complete sitemap with all pages

---

## Deployment Checklist

### Pre-Deployment

- [ ] All tests passing
- [ ] Database migrations applied
- [ ] Environment variables set
- [ ] Build succeeds locally
- [ ] No TypeScript errors
- [ ] No linting errors

### Deployment Steps

- [ ] Create backup of current production
- [ ] Deploy to staging environment
- [ ] Run smoke tests on staging
- [ ] Verify critical paths work
- [ ] Deploy to production
- [ ] Monitor for errors
- [ ] Submit sitemap to Google
- [ ] Submit sitemap to Bing
- [ ] Update Search Console

### Post-Deployment

- [ ] Verify all new pages accessible
- [ ] Check Google Search Console
- [ ] Monitor error logs
- [ ] Check performance metrics
- [ ] Verify sitemap crawlable
- [ ] Test major user flows
- [ ] Create deployment report

---

## Contact & Support

**Primary Developer:** Tanner Osterkamp
**Email:** tanner@thefiredev.com

**Documentation:**
- Main architecture: `/SITE-ARCHITECTURE.md`
- Visual sitemap: `/docs/SITE-MAP-VISUAL.md`
- This checklist: `/docs/IMPLEMENTATION-CHECKLIST.md`

**Resources:**
- Next.js Docs: https://nextjs.org/docs
- Supabase Docs: https://supabase.com/docs
- SEO Checklist: https://developers.google.com/search/docs

---

*Implementation checklist prepared by Claude Code Architecture Agent*
*Last updated: January 2025*

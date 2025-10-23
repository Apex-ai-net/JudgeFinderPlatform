# California Judicial Elections Guide

## Overview

The Elections landing page (`/elections`) serves as JudgeFinder's comprehensive voter guide for California judicial elections. It helps voters research judges on their ballot, understand the electoral process, and make informed decisions.

## Page Structure

```
/elections
├── page.tsx                    # Server component with metadata & SEO
├── ElectionsPageClient.tsx     # Main client component with all sections
├── ElectionsPageSkeleton.tsx   # Loading state component
└── README.md                   # This file
```

## Features

### 1. Hero Section
- **Compelling headline**: "Know Your Judges Before You Vote"
- **Typewriter animation** for dynamic text
- **CTA buttons** for viewing elections and searching judges
- **Real-time stats** showing upcoming elections (30/90/180 days)
- **Animated background** with grid pattern and gradients

### 2. Upcoming Elections Section
- **County filter** - Filter elections by jurisdiction
- **Sort options** - Sort by date or county
- **Election cards** displaying:
  - Judge name and position
  - Court and jurisdiction
  - Election date and type
  - Days until election
  - Link to judge profile
- **Empty state** when no elections found

### 3. Search by Address (Placeholder)
- **Future enhancement** for ballot-specific judge lookup
- **Coming soon** indicator
- Designed to accept voter address and show exact ballot judges

### 4. Educational Resources
- **Three educational cards**:
  1. How Judicial Elections Work in California
  2. What is a Retention Election?
  3. Why Judicial Independence Matters
- **External resource links**:
  - California Secretary of State
  - Voter registration check
  - California Courts judicial elections info
  - Polling place finder

### 5. Election Calendar
- **Important dates display**:
  - Voter registration deadline
  - Election day
- **Visual calendar cards** with date highlights
- **Color-coded by urgency** (warning for deadlines, primary for election day)

### 6. CTA Section
- Final call-to-action to explore judge directory
- Links to `/judges` page

## SEO Optimization

### Meta Tags
```typescript
title: 'California Judicial Elections Guide | Know Your Judges Before You Vote'
description: 'Research judges on your California ballot...'
keywords: 'california judicial elections, judge elections, ballot judges...'
```

### Open Graph
- Custom OG image for social sharing
- Optimized title and description for social platforms
- Twitter Card support

### Structured Data
The page includes comprehensive JSON-LD structured data:

1. **WebPage** schema
2. **BreadcrumbList** schema
3. **Guide** schema - Positions page as a voter guide
4. **FAQPage** schema with common questions:
   - How do judicial elections work in California?
   - What is a judicial retention election?
   - Are California judicial elections partisan?

## Design System

### Components Used
- `AnimatedCard` - Hover effects and micro-interactions
- `TypewriterText` - Animated text reveal
- `ScrollIndicator` - Animated scroll prompt
- Framer Motion animations - `fadeInUp`, `staggerContainer`

### Color Scheme
- **Primary**: Cyan/blue accents (from design system)
- **Background**: Dark theme
- **Muted**: Subtle grays for secondary content
- **Warning**: Amber for urgent dates

### Responsive Breakpoints
- Mobile-first approach
- `sm:` - 640px
- `md:` - 768px
- `lg:` - 1024px
- `xl:` - 1280px

## Data Integration

### API Endpoint (Future)
The page is designed to consume data from:
```
GET /api/elections/upcoming
```

Expected response structure:
```typescript
interface ElectionsData {
  total_count: number
  elections: UpcomingElection[]
  next_30_days: number
  next_90_days: number
  next_180_days: number
  counties?: string[]
}
```

### Current Implementation
- Uses mock data structure
- Ready for API integration
- Includes TODO comment for future API connection

## Accessibility (WCAG AA)

### Features
- **Semantic HTML**: Proper heading hierarchy (h1 → h2 → h3)
- **ARIA labels**: Descriptive labels for interactive elements
- **Keyboard navigation**: All interactive elements are keyboard accessible
- **Focus states**: Clear focus indicators on all interactive elements
- **Color contrast**: Meets WCAG AA standards
- **Screen reader support**: Meaningful alt text and labels

### Interactive Elements
- Filters have proper `<label>` associations
- Cards use semantic `<article>` or proper link structure
- Buttons have descriptive text
- External links indicate they open in new window

## Performance

### Optimization Strategies
1. **Dynamic imports**: Components lazy-loaded where appropriate
2. **Suspense boundaries**: Loading states with skeleton screens
3. **Revalidation**: 5-minute ISR revalidation (`revalidate = 300`)
4. **Force-dynamic**: Ensures fresh election data
5. **Framer Motion**: Optimized animations with `whileInView`

### Loading States
- Full-page skeleton (`ElectionsPageSkeleton`)
- Matches final layout to prevent layout shift
- Smooth transitions on data load

## Future Enhancements

### Phase 1 (Immediate)
- [ ] Connect to `/api/elections/upcoming` endpoint
- [ ] Add real election data from database
- [ ] Implement county filtering with real data

### Phase 2 (Short-term)
- [ ] Address-based ballot lookup
- [ ] Integration with Google Civic API
- [ ] Personalized election notifications
- [ ] Email alerts for upcoming elections

### Phase 3 (Long-term)
- [ ] Interactive election calendar view
- [ ] Voter guide PDF generation
- [ ] Sample ballot preview
- [ ] Judge comparison for ballot candidates
- [ ] Historical election results visualization

## Links to Related Features

- **Judge Profiles**: `/judges/[slug]` - Individual judge pages with election history
- **Election Information Component**: `/components/judges/ElectionInformation.tsx`
- **Election Types**: `/types/elections.ts` - TypeScript definitions
- **Judges Directory**: `/judges` - Full searchable directory

## Testing Checklist

### Functional Tests
- [ ] Page loads without errors
- [ ] Hero section displays correctly
- [ ] Filters work (county, sort)
- [ ] Empty state shows when no elections
- [ ] External links open in new tab
- [ ] CTAs navigate to correct pages

### Responsive Tests
- [ ] Mobile layout (320px - 640px)
- [ ] Tablet layout (640px - 1024px)
- [ ] Desktop layout (1024px+)
- [ ] Grid layouts adjust properly
- [ ] Text remains readable at all sizes

### Performance Tests
- [ ] Initial load < 3s
- [ ] Time to Interactive < 5s
- [ ] No layout shift (CLS < 0.1)
- [ ] Animations run at 60fps
- [ ] Images optimized

### SEO Tests
- [ ] Meta tags present
- [ ] Structured data validates (Google Rich Results Test)
- [ ] Canonical URL correct
- [ ] Open Graph tags present
- [ ] Sitemap includes `/elections`

### Accessibility Tests
- [ ] Keyboard navigation works
- [ ] Screen reader compatible
- [ ] Color contrast meets WCAG AA
- [ ] Focus indicators visible
- [ ] No accessibility violations (axe DevTools)

## Analytics Events

### Recommended Tracking
```typescript
// Track page view
analytics.track('Elections Page Viewed', {
  page: '/elections',
  timestamp: Date.now()
})

// Track filter usage
analytics.track('Election Filter Applied', {
  filter_type: 'county',
  filter_value: 'Los Angeles'
})

// Track CTA clicks
analytics.track('Elections CTA Clicked', {
  cta_text: 'View Upcoming Elections',
  destination: '#upcoming-elections'
})

// Track judge profile clicks from elections
analytics.track('Judge Profile Viewed from Elections', {
  judge_id: 'abc123',
  election_date: '2025-11-04'
})
```

## Maintenance

### Content Updates
- **Election dates**: Update calendar section as dates are announced
- **External links**: Verify quarterly that all external resources are active
- **Educational content**: Review annually for accuracy
- **Counties**: Update list as new jurisdictions are added

### Technical Debt
- Replace mock data with real API when endpoint is ready
- Optimize animation performance if needed
- Add more granular error handling
- Implement retry logic for failed API calls

## Related Documentation

- [Election Types Documentation](/types/elections.ts)
- [Election Information Component](/components/judges/ElectionInformation.README.md)
- [Design System Guide](/docs/DESIGN_SYSTEM.md)
- [SEO Strategy](/docs/SEO_STRATEGY.md)

---

**Last Updated**: 2025-10-22
**Version**: 1.0.0
**Maintained by**: JudgeFinder Team

# Onboarding System Guide

**Version:** 1.0
**Last Updated:** October 2025
**Status:** Production Ready

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Components](#components)
4. [Feature Discovery System](#feature-discovery-system)
5. [Analytics & Tracking](#analytics--tracking)
6. [Implementation Guide](#implementation-guide)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)

---

## Overview

The JudgeFinder onboarding system provides a comprehensive first-time user experience including:

- **Interactive Product Tours**: Step-by-step guided tours using react-joyride
- **Contextual Tooltips**: First-use tooltips with "Don't show again" options
- **Feature Discovery**: Progressive disclosure based on usage patterns
- **Help Center**: Comprehensive documentation hub with category pages
- **Analytics Tracking**: User behavior tracking for product optimization

### Key Features

- ✅ Profession-specific welcome pages with personalized content
- ✅ Interactive tours for dashboard, judge profiles, search, and comparison
- ✅ Enhanced tooltips with "Learn More" links to help articles
- ✅ Feature usage tracking with localStorage and Supabase
- ✅ Progressive feature disclosure based on user actions
- ✅ Comprehensive help center with searchable articles
- ✅ Onboarding analytics dashboard for product team

---

## Architecture

### Technology Stack

- **UI Framework**: Next.js 15+ with React Server Components
- **Tour Library**: react-joyride v2.9+
- **Storage**:
  - LocalStorage (client-side feature tracking)
  - Supabase (persistent analytics)
- **Styling**: TailwindCSS with custom components
- **Analytics**: Google Analytics + Custom tracking

### Data Flow

```
User Action → Feature Discovery System → LocalStorage + Supabase
                                      ↓
                           Analytics Dashboard
```

---

## Components

### 1. ProductTour Component

**Location:** `components/onboarding/ProductTour.tsx`

**Purpose:** Interactive step-by-step tours for key features

**Usage:**

```tsx
import { ProductTour } from '@/components/onboarding/ProductTour'

// In your page component
<ProductTour
  tourType="dashboard"
  autoStart={true}
  onComplete={() => console.log('Tour completed!')}
/>
```

**Tour Types:**
- `dashboard` - Main dashboard tour
- `judge-profile` - Judge profile page tour
- `search` - Search functionality tour
- `comparison` - Judge comparison tour

**Tour Storage:**
- Tours are marked as completed in localStorage
- Key: `judgefinder_tours_completed`
- Format: `{ dashboard: true, 'judge-profile': false, ... }`

**Customization:**

Edit tour steps in `components/onboarding/ProductTour.tsx`:

```tsx
const tourSteps: Record<string, Step[]> = {
  dashboard: [
    {
      target: '#search-bar',
      content: 'Your custom content here',
      title: 'Step Title',
      placement: 'bottom',
      disableBeacon: true,
    },
    // Add more steps...
  ],
}
```

### 2. InfoTooltip Component

**Location:** `components/ui/InfoTooltip.tsx`

**Purpose:** Enhanced tooltips with optional "Learn More" links

**Usage:**

```tsx
import { InfoTooltip } from '@/components/ui/InfoTooltip'

<InfoTooltip
  content="Reversal rate indicates how often a judge's decisions are overturned on appeal."
  learnMoreUrl="/help-center/features#reversal-rates"
  learnMoreText="Learn about reversal rates"
  position="top"
/>
```

**Props:**
- `content` (ReactNode) - Tooltip content
- `label` (string) - Accessibility label
- `position` ('top' | 'bottom' | 'left' | 'right') - Tooltip position
- `learnMoreUrl` (string, optional) - Link to help article
- `learnMoreText` (string, optional) - Link text (default: "Learn more")

### 3. FirstUseTooltip Component

**Location:** `components/onboarding/FirstUseTooltip.tsx`

**Purpose:** Dismissible tooltips that appear once for new features

**Usage:**

```tsx
import { FirstUseTooltip } from '@/components/onboarding/FirstUseTooltip'

<FirstUseTooltip
  id="bookmark-feature"
  title="Bookmark Judges"
  description="Save judges to your dashboard for quick access and receive updates."
  position="bottom"
  showDontShowAgain={true}
>
  <button id="bookmark-btn">Bookmark</button>
</FirstUseTooltip>
```

**Storage:**
- Dismissed tooltips stored in localStorage
- Key: `judgefinder_tooltips_dismissed`
- Format: Array of tooltip IDs

**Testing:**
```tsx
import { resetTooltips } from '@/components/onboarding/FirstUseTooltip'

// Reset all tooltips
resetTooltips()
```

### 4. Welcome Page

**Location:** `app/welcome/page.tsx`

**Features:**
- Dynamic greeting based on profession
- Personalized feature highlights
- Quick start checklist (3-5 items)
- Embedded tutorial video
- OnboardingWizard integration

**Profession-based Content:**
```tsx
const professionContent = {
  attorney: {
    greeting: 'Welcome to your competitive advantage',
    features: [...],
    videoId: 'xyz',
  },
  paralegal: { ... },
  litigant: { ... },
  default: { ... },
}
```

### 5. Help Center Pages

**Structure:**
```
app/help-center/
├── page.tsx                 # Main hub
├── getting-started/
│   └── page.tsx            # Basics & FAQs
├── features/
│   └── page.tsx            # Feature guides
├── for-attorneys/
│   └── page.tsx            # Attorney-specific
└── troubleshooting/
    └── page.tsx            # Common issues
```

**Adding New Articles:**

1. Create new page in appropriate directory
2. Follow existing structure with sections array
3. Add to main help center navigation
4. Include metadata for SEO

---

## Feature Discovery System

**Location:** `lib/onboarding/feature-discovery.ts`

### Key Functions

#### Track Feature Usage

```tsx
import { trackFeatureUsage } from '@/lib/onboarding/feature-discovery'

// When user performs an action
trackFeatureUsage('searches')
trackFeatureUsage('profileViews')
trackFeatureUsage('bookmarks')
trackFeatureUsage('comparisons')
trackFeatureUsage('exports')
trackFeatureUsage('advancedFilters')
```

#### Check Feature Status

```tsx
import {
  shouldShowNewBadge,
  hasCompletedBasicActions,
  shouldShowAdvancedFeatures,
  getUnusedFeatures
} from '@/lib/onboarding/feature-discovery'

// Show "New" badge on unused features
if (shouldShowNewBadge('comparisons')) {
  return <Badge>New</Badge>
}

// Progressive disclosure
if (shouldShowAdvancedFeatures()) {
  return <AdvancedFilterPanel />
}

// Get features user hasn't tried
const unused = getUnusedFeatures()
// Returns: ['comparison', 'exports', 'advancedFilters']
```

#### Get Suggested Actions

```tsx
import { getSuggestedNextAction } from '@/lib/onboarding/feature-discovery'

const suggestion = getSuggestedNextAction()
if (suggestion) {
  return (
    <SuggestionCard
      title={suggestion.title}
      description={suggestion.description}
      link={suggestion.link}
    />
  )
}
```

#### Onboarding Progress

```tsx
import { getOnboardingProgress } from '@/lib/onboarding/feature-discovery'

const progress = getOnboardingProgress()
// Returns: 60 (percentage)

<ProgressBar value={progress} />
```

### Progressive Disclosure Logic

Advanced features appear after:
- ≥3 searches completed
- ≥2 profile views
- ≥1 bookmark created

```tsx
// Automatically managed by shouldShowAdvancedFeatures()
const tracking = getFeatureTracking()
const showAdvanced =
  tracking.searches >= 3 &&
  tracking.profileViews >= 2 &&
  tracking.bookmarks >= 1
```

---

## Analytics & Tracking

### Database Schema

**Table:** `public.onboarding_analytics`

```sql
-- Key columns
user_id                    UUID (foreign key to app_users)
onboarding_started_at      TIMESTAMPTZ
onboarding_completed_at    TIMESTAMPTZ
first_search_at           TIMESTAMPTZ
first_profile_view_at     TIMESTAMPTZ
total_searches            INTEGER
dashboard_tour_completed  BOOLEAN
days_active              INTEGER
```

### Backend Functions

#### Track Feature Usage

```tsx
// Server-side (API route)
import { createServerClient } from '@/lib/supabase/server'

const supabase = await createServerClient()
await supabase.rpc('track_feature_usage', {
  p_user_id: userId,
  p_feature: 'search'
})
```

#### Get Completion Rate

```sql
SELECT * FROM public.get_onboarding_completion_rate();
-- Returns: total_users, completed_onboarding, completion_rate, avg_time_to_complete
```

#### Get Feature Adoption

```sql
SELECT * FROM public.get_feature_adoption_metrics();
-- Returns feature adoption rates and time-to-adoption
```

### Analytics Dashboard View

```sql
-- Available view for product team
SELECT * FROM public.onboarding_metrics_summary
ORDER BY date DESC
LIMIT 30;
```

### Google Analytics Events

Automatically tracked:
- `tour_completed` - Tour finished or skipped
- `feature_used` - Feature usage with count
- `milestone_reached` - Onboarding milestones
- `tooltip_dismissed` - Tooltip interactions

---

## Implementation Guide

### Adding a Product Tour to a New Page

**Step 1:** Add target IDs to your page elements

```tsx
// app/my-new-page/page.tsx
export default function MyPage() {
  return (
    <div>
      <div id="main-feature">Main Feature</div>
      <div id="secondary-feature">Secondary Feature</div>
    </div>
  )
}
```

**Step 2:** Define tour steps in ProductTour.tsx

```tsx
// components/onboarding/ProductTour.tsx
const tourSteps: Record<string, Step[]> = {
  // ...existing tours
  'my-new-page': [
    {
      target: '#main-feature',
      content: 'This is the main feature explanation.',
      title: 'Main Feature',
      placement: 'bottom',
      disableBeacon: true,
    },
    {
      target: '#secondary-feature',
      content: 'Learn about secondary features here.',
      title: 'Secondary Feature',
      placement: 'top',
    },
  ],
}
```

**Step 3:** Add ProductTour to your page

```tsx
// app/my-new-page/page.tsx
import { ProductTour } from '@/components/onboarding/ProductTour'

export default function MyPage() {
  return (
    <div>
      <ProductTour tourType="my-new-page" autoStart={true} />
      {/* Your page content */}
    </div>
  )
}
```

### Adding Feature Tracking

**Client-side:**

```tsx
'use client'

import { trackFeatureUsage } from '@/lib/onboarding/feature-discovery'

function MyFeatureButton() {
  const handleClick = () => {
    // Your feature logic
    doSomething()

    // Track usage
    trackFeatureUsage('myFeature')
  }

  return <button onClick={handleClick}>Use Feature</button>
}
```

**Server-side:**

```tsx
// app/api/my-feature/route.ts
import { createServerClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    await supabase.rpc('track_feature_usage', {
      p_user_id: user.id,
      p_feature: 'my_feature'
    })
  }

  // Your API logic
}
```

### Adding a New Help Article

**Step 1:** Create the page file

```tsx
// app/help-center/my-category/my-article/page.tsx
import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'My Article | Help Center',
  description: 'Learn about this feature',
}

export default function MyArticlePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-br from-enterprise-primary/20 to-background px-4 py-12">
        <div className="mx-auto max-w-4xl">
          <Link href="/help-center">← Back to Help Center</Link>
          <h1>My Article Title</h1>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-4xl px-4 py-12">
        <p>Article content here...</p>
      </div>
    </div>
  )
}
```

**Step 2:** Link from help center

```tsx
// app/help-center/page.tsx
const categories = [
  {
    title: 'My Category',
    articles: [
      'My new article',  // Add here
    ],
  },
]
```

---

## Best Practices

### Tour Design

1. **Keep tours short** - 3-5 steps maximum per tour
2. **Allow skipping** - Always include skip option
3. **Target existing elements** - Don't create fake targets
4. **Use clear language** - Avoid jargon
5. **Test on mobile** - Ensure responsive positioning

### Tooltip Guidelines

1. **First-use only** - Don't show repeatedly
2. **Respect dismissal** - Honor "Don't show again"
3. **Clear trigger** - User action should trigger tooltip
4. **Helpful content** - Answer "why does this matter?"
5. **Link to docs** - Include learnMoreUrl when possible

### Feature Discovery

1. **Track early** - Start tracking from first user action
2. **Progressive disclosure** - Show advanced features after basics
3. **New badges sparingly** - Only for genuinely new features
4. **Test tracking** - Verify localStorage and Supabase sync
5. **Respect privacy** - Don't track sensitive information

### Analytics

1. **Meaningful metrics** - Track actions that matter
2. **Regular review** - Check completion rates weekly
3. **A/B testing** - Test different onboarding flows
4. **User feedback** - Combine with qualitative data
5. **Performance** - Keep tracking lightweight

---

## Troubleshooting

### Tours Not Appearing

**Issue:** ProductTour doesn't show on page load

**Solutions:**
1. Check target element IDs match tour steps
2. Verify tour hasn't been completed (check localStorage)
3. Ensure autoStart is true
4. Wait for DOM to load (tours have 1s delay)

```tsx
// Reset tour for testing
import { useTourStatus } from '@/components/onboarding/ProductTour'

const { resetTour } = useTourStatus()
resetTour('dashboard')
```

### Tooltips Not Dismissing

**Issue:** FirstUseTooltip keeps reappearing

**Solutions:**
1. Check localStorage for dismissed tooltips
2. Verify unique tooltip ID
3. Clear localStorage for testing

```tsx
import { resetTooltips } from '@/components/onboarding/FirstUseTooltip'
resetTooltips()
```

### Feature Tracking Not Working

**Issue:** trackFeatureUsage not updating counts

**Solutions:**
1. Verify localStorage permissions
2. Check console for errors
3. Ensure function is called on correct event
4. Test with browser dev tools

```tsx
// Debug feature tracking
import { exportFeatureTrackingData } from '@/lib/onboarding/feature-discovery'
console.log(exportFeatureTrackingData())
```

### Analytics Not Syncing

**Issue:** Supabase analytics table not updating

**Solutions:**
1. Check RLS policies allow user access
2. Verify migration ran successfully
3. Test database function directly

```sql
-- Test in Supabase SQL editor
SELECT * FROM public.track_feature_usage(
  'user-uuid-here',
  'search'
);
```

### TypeScript Errors

**Issue:** Type errors in tour/tooltip components

**Solutions:**
1. Install @types/react-joyride: `npm i -D @types/react-joyride`
2. Check Next.js version compatibility
3. Verify imports match file locations

---

## Testing

### Manual Testing Checklist

- [ ] Complete onboarding wizard
- [ ] View all product tours
- [ ] Dismiss tooltips with "Don't show again"
- [ ] Test feature tracking (check localStorage)
- [ ] Verify help center navigation
- [ ] Test mobile responsiveness
- [ ] Check analytics dashboard updates

### Reset All Onboarding

```tsx
// For testing/development
import { resetTooltips } from '@/components/onboarding/FirstUseTooltip'
import { useTourStatus } from '@/components/onboarding/ProductTour'
import { resetFeatureTracking } from '@/lib/onboarding/feature-discovery'

const { resetAllTours } = useTourStatus()

// Reset everything
resetTooltips()
resetAllTours()
resetFeatureTracking()
localStorage.clear() // Nuclear option
```

---

## Future Enhancements

Planned improvements:
- [ ] Email drip campaigns based on onboarding status
- [ ] In-app notifications for feature announcements
- [ ] Personalized feature recommendations
- [ ] Video tutorials embedded in tours
- [ ] Multi-language support
- [ ] A/B testing framework for tours

---

## Support

For questions or issues:
- **Developer Docs:** `/docs`
- **Help Center:** `/help-center`
- **Support Email:** dev@judgefinder.io
- **Slack Channel:** #onboarding-dev

---

## Changelog

### v1.0 - October 2025
- Initial implementation
- ProductTour component with 4 tour types
- Enhanced InfoTooltip with Learn More links
- FirstUseTooltip component
- Feature discovery system
- Help center with 4 category pages
- Supabase analytics integration
- Welcome page personalization

---

**Document maintained by:** Product Engineering Team
**Last reviewed:** October 2025

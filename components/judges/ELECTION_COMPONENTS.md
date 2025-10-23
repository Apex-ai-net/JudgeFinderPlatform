# Election Status Badge Components

Comprehensive documentation for the judicial election status badge components in the JudgeFinder Platform.

## Overview

The election badge components provide a flexible, accessible, and visually consistent way to display judge selection methods and upcoming election information across the platform.

### Components

1. **ElectionBadge** - Core badge component with multiple variants
2. **ElectionStatusBadge** - Simplified wrapper that auto-detects election status
3. **ElectionInformation** - Comprehensive election history component (separate file)

---

## ElectionBadge Component

### Location
`/components/judges/ElectionBadge.tsx`

### Purpose
Display a judge's selection method (elected, appointed, retention, etc.) with optional upcoming election information.

### Features

- **6 Selection Methods Supported:**
  - Elected (green)
  - Appointed (blue)
  - Retention Election (orange)
  - Merit Selection (purple)
  - Legislative Appointment (indigo)
  - Commission Appointment (teal)

- **3 Display Variants:**
  - `minimal` - Icon only with tooltip
  - `compact` - Badge without election date
  - `detailed` - Badge with election date display

- **Accessibility Features:**
  - Screen reader text for icon-only displays
  - Keyboard navigation support
  - ARIA labels and descriptions
  - Hover and focus states

- **Animation Support:**
  - Respects `prefers-reduced-motion`
  - Smooth entrance animations
  - Pulse animation for imminent elections
  - Hover scale effects

### Props Interface

```typescript
interface ElectionBadgeProps {
  /** How the judge was selected */
  selectionMethod: SelectionMethod

  /** Date of next election (ISO format: "2026-11-03") */
  nextElectionDate?: string | null

  /** Whether judge is currently up for election */
  isUpForElection?: boolean

  /** Badge display variant */
  variant?: 'compact' | 'detailed' | 'minimal'

  /** Whether to show days until election in tooltip */
  showCountdown?: boolean

  /** Optional CSS class name */
  className?: string
}
```

### Basic Usage

```tsx
import { ElectionBadge } from '@/components/judges'
import { SelectionMethod } from '@/types/elections'

// Minimal variant - icon only
<ElectionBadge
  selectionMethod={SelectionMethod.ELECTED}
  variant="minimal"
/>

// Compact variant - badge without date
<ElectionBadge
  selectionMethod={SelectionMethod.APPOINTED}
  variant="compact"
/>

// Detailed variant - badge with election date
<ElectionBadge
  selectionMethod={SelectionMethod.RETENTION_ELECTION}
  nextElectionDate="2026-11-03"
  variant="detailed"
/>
```

### Advanced Usage

```tsx
// Judge currently up for election with countdown
<ElectionBadge
  selectionMethod={SelectionMethod.ELECTED}
  nextElectionDate="2025-11-05"
  isUpForElection={true}
  showCountdown={true}
  variant="detailed"
/>

// Custom styling
<ElectionBadge
  selectionMethod={SelectionMethod.MERIT_SELECTION}
  variant="compact"
  className="ml-2"
/>
```

---

## ElectionStatusBadge Component

### Purpose
Simplified wrapper that automatically detects if a judge is up for election (within 180 days) and applies appropriate styling.

### Props Interface

```typescript
interface ElectionStatusBadgeProps {
  selectionMethod: SelectionMethod
  nextElectionDate?: string | null
  variant?: 'compact' | 'detailed' | 'minimal'
  className?: string
}
```

### Usage

```tsx
import { ElectionStatusBadge } from '@/components/judges'

// Automatically detects if election is within 180 days
<ElectionStatusBadge
  selectionMethod={SelectionMethod.ELECTED}
  nextElectionDate="2025-11-05"
  variant="detailed"
/>
```

### Auto-Detection Logic

- **Within 180 days:** Shows "Up for Election" with pulse animation
- **Beyond 180 days:** Shows "Next Election" without special styling
- **No date provided:** Shows only selection method badge

---

## Integration Examples

### In JudgeHeader Component

```tsx
import { JudgeHeader } from '@/components/judges'
import { ElectionBadge } from '@/components/judges'
import { SelectionMethod } from '@/types/elections'

export function JudgeProfile({ judge }) {
  return (
    <div>
      <JudgeHeader judge={judge} {...otherProps} />

      <div className="mt-4 flex items-center gap-3">
        <ElectionBadge
          selectionMethod={judge.selection_method}
          nextElectionDate={judge.next_election_date}
          variant="compact"
        />
      </div>
    </div>
  )
}
```

### In Directory Grid Card

```tsx
import { ElectionBadge } from '@/components/judges'

export function JudgesDirectoryGridCard({ judge }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between">
        <h4 className="font-semibold">{judge.name}</h4>

        <ElectionBadge
          selectionMethod={judge.selection_method}
          nextElectionDate={judge.next_election_date}
          variant="compact"
        />
      </div>
      {/* Rest of card content */}
    </div>
  )
}
```

### In Search Results

```tsx
export function SearchResultItem({ judge }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h3>{judge.name}</h3>
        <p className="text-sm text-muted-foreground">{judge.court_name}</p>
      </div>

      <ElectionBadge
        selectionMethod={judge.selection_method}
        variant="minimal"
      />
    </div>
  )
}
```

### In Comparison View

```tsx
export function JudgeComparison({ judges }) {
  return (
    <div className="grid grid-cols-3 gap-4">
      {judges.map(judge => (
        <div key={judge.id} className="border rounded p-4">
          <h4>{judge.name}</h4>

          <div className="mt-2">
            <ElectionStatusBadge
              selectionMethod={judge.selection_method}
              nextElectionDate={judge.next_election_date}
              variant="compact"
            />
          </div>
        </div>
      ))}
    </div>
  )
}
```

---

## Selection Method Configuration

Each selection method has specific visual styling:

### Elected
- **Color:** Green (`green-500/green-600`)
- **Icon:** Vote (ballot box)
- **Description:** Judge was elected by voters
- **Usage:** Competitive elections

### Appointed
- **Color:** Blue (`blue-500/blue-600`)
- **Icon:** UserCheck
- **Description:** Appointed by executive authority
- **Usage:** Federal judges, some state judges

### Retention Election
- **Color:** Orange (`orange-500/orange-600`)
- **Icon:** Scale
- **Description:** Yes/no retention votes
- **Usage:** California and other states

### Merit Selection
- **Color:** Purple (`purple-500/purple-600`)
- **Icon:** Award
- **Description:** Missouri Plan selection
- **Usage:** Commission-based selection

### Legislative Appointment
- **Color:** Indigo (`indigo-500/indigo-600`)
- **Icon:** UserCheck
- **Description:** Appointed by legislature
- **Usage:** Some state systems

### Commission Appointment
- **Color:** Teal (`teal-500/teal-600`)
- **Icon:** Award
- **Description:** Appointed by judicial commission
- **Usage:** Various state systems

---

## Accessibility

### ARIA Labels
All badges include appropriate ARIA labels for screen readers:

```tsx
// Minimal variant
<span aria-label="Selection method: Elected">
  <Icon />
  <span className="sr-only">Elected</span>
</span>

// With election date
<span aria-describedby="election-tooltip">
  Next Election: Nov 2026
</span>
```

### Keyboard Navigation
- Tab to focus tooltip trigger
- Enter/Space to toggle tooltip
- Escape to close tooltip
- Focus returns to trigger on close

### Color Contrast
All badge colors meet WCAG AA standards:
- Sufficient contrast ratios (4.5:1 minimum)
- Both light and dark mode support
- Visible focus indicators

### Screen Reader Support
- Semantic HTML structure
- Hidden decorative elements (`aria-hidden`)
- Descriptive labels for icons
- Meaningful text alternatives

---

## Responsive Design

### Breakpoint Behavior

```tsx
// Mobile - use minimal variant
<div className="md:hidden">
  <ElectionBadge variant="minimal" {...props} />
</div>

// Desktop - use compact or detailed
<div className="hidden md:block">
  <ElectionBadge variant="compact" {...props} />
</div>
```

### Flexible Layouts

```tsx
// Stacks on mobile, inline on desktop
<div className="flex flex-col sm:flex-row sm:items-center gap-2">
  <ElectionBadge {...props} />
</div>
```

---

## Animation System

### Entrance Animations

```typescript
// Compact variant
initial={{ scale: 0, opacity: 0 }}
animate={{ scale: 1, opacity: 1 }}
transition={{ type: 'spring', stiffness: 500, damping: 25 }}

// Detailed variant
initial={{ opacity: 0, y: -5 }}
animate={{ opacity: 1, y: 0 }}
transition={{ type: 'spring', stiffness: 400, damping: 20 }}
```

### Hover Effects

```typescript
whileHover={{ scale: 1.05 }}
transition={{ duration: 0.2 }}
```

### Pulse Animation (Up for Election)

```typescript
animate={{
  scale: [1, 1.2, 1],
  opacity: [1, 0.8, 1],
}}
transition={{
  duration: 2,
  repeat: Infinity,
  ease: 'easeInOut',
}}
```

### Reduced Motion Support

Automatically detects `prefers-reduced-motion` and disables animations:

```typescript
const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

useEffect(() => {
  const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  setPrefersReducedMotion(mediaQuery.matches)
}, [])
```

---

## Testing

### Test File Location
`/components/judges/ElectionBadge.test.tsx`

### Test Coverage

```bash
# Run tests
npm test ElectionBadge

# Run with coverage
npm test -- --coverage ElectionBadge
```

### Key Test Cases

1. **Rendering:** All selection methods render correctly
2. **Variants:** Minimal, compact, and detailed variants work
3. **Date Formatting:** Election dates format properly
4. **Accessibility:** ARIA labels and keyboard navigation
5. **Tooltips:** Hover and focus interactions
6. **Animations:** Respect reduced motion preferences
7. **Edge Cases:** Invalid dates, missing data

---

## Examples

### Example File Location
`/components/judges/ElectionBadge.examples.tsx`

### Running Examples

```tsx
import { AllElectionBadgeExamples } from '@/components/judges/ElectionBadge.examples'

// In your development page
export default function ComponentShowcase() {
  return <AllElectionBadgeExamples />
}
```

### Available Examples

1. **BasicSelectionMethodBadges** - All selection methods
2. **DetailedBadgesWithElections** - With election dates
3. **UpForElectionBadges** - Imminent elections
4. **MinimalBadges** - Icon-only variants
5. **InJudgeHeaderContext** - Header integration
6. **InDirectoryGridCardContext** - Card integration
7. **MultipleJudgesComparison** - Comparison view
8. **ResponsiveBadgeLayout** - Responsive design

---

## Performance Considerations

### Rendering Optimization

```tsx
// Use useMemo for expensive calculations
const daysUntil = useMemo(() =>
  nextElectionDate ? getDaysUntilElection(nextElectionDate) : null,
  [nextElectionDate]
)
```

### Bundle Size

- Core component: ~3KB (minified + gzipped)
- Dependencies: framer-motion, lucide-react
- Tree-shakeable exports

### Lazy Loading

```tsx
// Lazy load for code splitting
const ElectionBadge = lazy(() =>
  import('@/components/judges').then(m => ({ default: m.ElectionBadge }))
)
```

---

## Browser Support

- **Modern Browsers:** Full support (Chrome, Firefox, Safari, Edge)
- **Mobile:** iOS Safari 12+, Chrome Android
- **Animations:** Graceful degradation for older browsers
- **JavaScript Required:** Yes (React component)

---

## Troubleshooting

### Badge Not Displaying

```tsx
// Check that SelectionMethod enum is imported correctly
import { SelectionMethod } from '@/types/elections'

// Verify the value matches enum
console.log(SelectionMethod.ELECTED) // 'elected'
```

### Tooltip Not Showing

```tsx
// Ensure InfoTooltip is imported
import { InfoTooltip } from '@/components/ui/InfoTooltip'

// Check z-index stacking context
<div className="relative z-50">
  <ElectionBadge {...props} />
</div>
```

### Animation Issues

```tsx
// Check framer-motion is installed
npm install framer-motion

// Verify prefers-reduced-motion isn't blocking
window.matchMedia('(prefers-reduced-motion: reduce)').matches
```

### Date Formatting Issues

```tsx
// Use ISO format dates
nextElectionDate="2026-11-03" // ✓ Correct
nextElectionDate="11/03/2026" // ✗ Incorrect

// Validate date format
const isValidDate = /^\d{4}-\d{2}-\d{2}$/.test(dateString)
```

---

## Future Enhancements

### Planned Features

1. **Custom Icons:** Support for custom selection method icons
2. **Localization:** Multi-language support for labels
3. **Theme Customization:** Custom color schemes
4. **Analytics Events:** Track badge interactions
5. **Export Component:** Share badge configurations
6. **Print Styles:** Optimized print CSS

### Contribution Guidelines

See main project CONTRIBUTING.md for:
- Code style guidelines
- Testing requirements
- Documentation standards
- Pull request process

---

## Related Components

- **ElectionInformation** - Full election history display
- **PoliticalAffiliationDisplay** - Party affiliation badges
- **ElectionTimeline** - Visual election timeline
- **QualityBadge** - Data quality indicators
- **AnimatedBadge** - Base animated badge component

---

## API Reference

### Helper Functions

#### formatElectionDate

Formats ISO date string to readable format.

```typescript
function formatElectionDate(dateString: string): string
// "2026-11-03" → "Nov 2026"
```

#### getDaysUntilElection

Calculates days remaining until election.

```typescript
function getDaysUntilElection(dateString: string): number | null
// Returns number of days, or null if past/invalid
```

### Type Definitions

See `/types/elections.ts` for complete type definitions:
- `SelectionMethod` enum
- `ElectionBadgeProps` interface
- `ElectionType` enum
- `JudgeElection` interface

---

## Support

For issues, questions, or contributions:
- GitHub Issues: [project-repo]/issues
- Documentation: [project-docs]
- Email: support@judgefinder.com

---

**Last Updated:** October 22, 2025
**Component Version:** 1.0.0
**Maintainer:** Design System Team

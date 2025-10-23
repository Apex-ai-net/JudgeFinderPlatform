# ElectionBadge Component Architecture

## Component Hierarchy

```
ElectionBadge (Main Component)
├── ElectionStatusBadge (Wrapper Component)
│   └── Auto-detects election status (within 180 days)
│
├── Variants
│   ├── Minimal Variant
│   │   ├── Icon only
│   │   ├── InfoTooltip
│   │   └── Screen reader text
│   │
│   ├── Compact Variant
│   │   ├── Badge (icon + text)
│   │   ├── InfoTooltip
│   │   └── Framer Motion wrapper (optional)
│   │
│   └── Detailed Variant
│       ├── Selection method badge
│       ├── Next election badge (conditional)
│       ├── Pulse animation (if up for election)
│       ├── InfoTooltip
│       └── Framer Motion wrapper (optional)
│
└── Configuration
    ├── SELECTION_METHOD_CONFIG
    │   ├── Elected (green, Vote icon)
    │   ├── Appointed (blue, UserCheck icon)
    │   ├── Retention (orange, Scale icon)
    │   ├── Merit Selection (purple, Award icon)
    │   ├── Legislative (indigo, UserCheck icon)
    │   └── Commission (teal, Award icon)
    │
    └── Helper Functions
        ├── formatElectionDate()
        └── getDaysUntilElection()
```

## Data Flow

```
Judge Data (from API/Database)
    ↓
{
  selection_method: SelectionMethod.ELECTED,
  next_election_date: "2026-11-03",
  ...
}
    ↓
ElectionBadge Component Props
    ↓
┌─────────────────────────────────────┐
│  ElectionBadge Component            │
│  ┌───────────────────────────────┐  │
│  │ 1. Selection Method Config    │  │
│  │    - Get icon, color, label   │  │
│  │    - Build description        │  │
│  └───────────────────────────────┘  │
│  ┌───────────────────────────────┐  │
│  │ 2. Date Processing            │  │
│  │    - Format: "Nov 2026"       │  │
│  │    - Calculate days until     │  │
│  └───────────────────────────────┘  │
│  ┌───────────────────────────────┐  │
│  │ 3. Tooltip Content Builder    │  │
│  │    - Description text         │  │
│  │    - Election date            │  │
│  │    - Days remaining           │  │
│  └───────────────────────────────┘  │
│  ┌───────────────────────────────┐  │
│  │ 4. Badge Rendering            │  │
│  │    - Choose variant           │  │
│  │    - Apply animations         │  │
│  │    - Attach tooltip           │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
    ↓
Rendered Badge Component
```

## State Management

```typescript
// Component-level state
const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
const [mounted, setMounted] = useState(false)

// Effects
useEffect(() => {
  // Detect reduced motion preference
  const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  setPrefersReducedMotion(mediaQuery.matches)

  // Listen for changes
  mediaQuery.addEventListener('change', handleChange)

  return () => mediaQuery.removeEventListener('change', handleChange)
}, [])

// Derived values (computed from props)
const config = SELECTION_METHOD_CONFIG[selectionMethod]
const daysUntil = getDaysUntilElection(nextElectionDate)
const formattedDate = formatElectionDate(nextElectionDate)
```

## Props Interface

```typescript
interface ElectionBadgeProps {
  // Required
  selectionMethod: SelectionMethod

  // Optional
  nextElectionDate?: string | null
  isUpForElection?: boolean
  variant?: 'compact' | 'detailed' | 'minimal'
  showCountdown?: boolean
  className?: string
}

// SelectionMethod Enum
enum SelectionMethod {
  ELECTED = 'elected',
  APPOINTED = 'appointed',
  RETENTION_ELECTION = 'retention_election',
  MERIT_SELECTION = 'merit_selection',
  LEGISLATIVE_APPOINTMENT = 'legislative_appointment',
  COMMISSION_APPOINTMENT = 'commission_appointment',
}
```

## Rendering Logic

```
┌─────────────────────────────────────────────┐
│ ElectionBadge Component Entry               │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│ Check variant prop                          │
├─────────────────────────────────────────────┤
│  variant === 'minimal'  ?  Render minimal   │
│  variant === 'compact'  ?  Render compact   │
│  variant === 'detailed' ?  Render detailed  │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│ Check animation preference                  │
├─────────────────────────────────────────────┤
│  prefersReducedMotion === true  ?           │
│    → Render without animations              │
│  prefersReducedMotion === false ?           │
│    → Render with Framer Motion              │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│ Attach InfoTooltip                          │
├─────────────────────────────────────────────┤
│  - Hover: Show tooltip                      │
│  - Focus: Show tooltip                      │
│  - Escape: Hide tooltip                     │
│  - Click outside: Hide tooltip              │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│ Return final JSX                            │
└─────────────────────────────────────────────┘
```

## Variant Comparison

| Feature | Minimal | Compact | Detailed |
|---------|---------|---------|----------|
| Size | 20px | Auto | Auto |
| Icon | ✓ | ✓ | ✓ |
| Label | - | ✓ | ✓ |
| Election Date | - | - | ✓ |
| Tooltip | ✓ | ✓ | ✓ |
| Animation | ✓ | ✓ | ✓ |
| Use Case | Lists | Cards | Headers |

## Selection Method Configuration Structure

```typescript
const SELECTION_METHOD_CONFIG = {
  [SelectionMethod.ELECTED]: {
    label: string,           // Display text
    icon: LucideIcon,        // Icon component
    description: string,     // Tooltip text
    badgeClass: string,      // Tailwind classes for badge
    iconClass: string,       // Tailwind classes for icon
  },
  // ... repeated for each method
}
```

## Animation System

```
Component Mount
    ↓
Check prefersReducedMotion
    ↓
    ├─── YES → Render static component
    │
    └─── NO  → Apply animations
             ↓
        ┌────────────────────┐
        │ Entrance Animation │
        │ - Scale: 0 → 1     │
        │ - Opacity: 0 → 1   │
        │ - Spring physics   │
        └────────────────────┘
             ↓
        ┌────────────────────┐
        │ Hover Animation    │
        │ - Scale: 1 → 1.05  │
        │ - Duration: 0.2s   │
        └────────────────────┘
             ↓
        ┌────────────────────┐
        │ Pulse (if active)  │
        │ - Scale: 1→1.2→1   │
        │ - Opacity: 1→0.8→1 │
        │ - Infinite loop    │
        └────────────────────┘
```

## Accessibility Tree

```
<span> (container)
└── <button> (tooltip trigger)
    ├── aria-label="Selection method: Elected"
    ├── aria-describedby="tooltip-id"
    ├── tabindex="0"
    │
    ├── <Icon> (visual indicator)
    │   └── aria-hidden="true"
    │
    ├── <span> (label text)
    │   └── "Elected"
    │
    └── <span> (sr-only, for minimal variant)
        └── "Elected"

<div role="tooltip" id="tooltip-id"> (shown on hover/focus)
├── <p> Description text
├── <p> Next Election: Nov 2026
└── <p> 45 days remaining
```

## CSS Class Structure

```css
/* Base badge */
.inline-flex.items-center.gap-1.5.rounded-full.border.px-2.5.py-1

/* Selection method colors */
.bg-{color}-500/10           /* Background */
.text-{color}-600            /* Text */
.border-{color}-500/30       /* Border */
.dark:text-{color}-400       /* Dark mode text */

/* Variants */
.h-5.w-5                     /* Minimal size */
.text-xs.font-medium         /* Compact/detailed text */

/* States */
.hover:scale-105             /* Hover state */
.focus-visible:ring-2        /* Focus state */
```

## Integration Pattern

```typescript
// Parent Component (e.g., JudgeHeader)
import { ElectionBadge } from '@/components/judges'

export function JudgeHeader({ judge }) {
  return (
    <header>
      {/* Header content */}

      {judge.selection_method && (
        <ElectionBadge
          selectionMethod={judge.selection_method}
          nextElectionDate={judge.next_election_date}
          variant="compact"
        />
      )}
    </header>
  )
}
```

## Error Handling

```typescript
// Invalid date handling
function formatElectionDate(dateString: string): string {
  try {
    const date = new Date(dateString)
    return `${month} ${year}`
  } catch {
    return dateString  // Fallback to raw string
  }
}

// Missing config handling
const config = SELECTION_METHOD_CONFIG[selectionMethod]
// If selectionMethod is invalid, component won't render

// Null safety
nextElectionDate ? formatElectionDate(nextElectionDate) : null
```

## Performance Optimizations

```typescript
// 1. Memoized calculations
const daysUntil = useMemo(() =>
  nextElectionDate ? getDaysUntilElection(nextElectionDate) : null,
  [nextElectionDate]
)

// 2. Conditional rendering
if (!selectionMethod) return null

// 3. Animation opt-out
if (prefersReducedMotion) {
  return <StaticBadge />
}

// 4. Tree-shaking
export { ElectionBadge, ElectionStatusBadge }
```

## Testing Strategy

```
Unit Tests
├── Rendering Tests
│   ├── All selection methods render
│   ├── All variants render
│   └── Conditional elements appear
│
├── Interaction Tests
│   ├── Tooltip shows on hover
│   ├── Tooltip shows on focus
│   ├── Keyboard navigation works
│   └── Escape closes tooltip
│
├── Accessibility Tests
│   ├── ARIA labels present
│   ├── Screen reader text works
│   ├── Tab order correct
│   └── Focus indicators visible
│
└── Edge Case Tests
    ├── Invalid dates handled
    ├── Missing data handled
    ├── Reduced motion respected
    └── Custom classes applied
```

## File Organization

```
/components/judges/
├── ElectionBadge.tsx           # Main component
├── ElectionBadge.test.tsx      # Test suite
├── ElectionBadge.examples.tsx  # Usage examples
├── ElectionBadge.README.md     # Quick reference
├── ElectionBadge.ARCHITECTURE.md  # This file
├── ELECTION_COMPONENTS.md      # Full documentation
└── INTEGRATION_GUIDE.md        # Integration instructions

/types/
└── elections.ts                # Type definitions
    ├── SelectionMethod enum
    ├── ElectionBadgeProps
    └── Related types
```

## Dependencies Graph

```
ElectionBadge.tsx
├── React (useState, useEffect)
├── framer-motion (motion)
│   └── Animation system
├── lucide-react
│   ├── Vote
│   ├── UserCheck
│   ├── Scale
│   ├── Award
│   └── Calendar
├── @/lib/utils
│   └── cn (className utility)
├── @/components/ui/InfoTooltip
│   └── Tooltip component
└── @/types/elections
    ├── SelectionMethod
    └── ElectionBadgeProps
```

## Component Lifecycle

```
1. Mount
   ├── Initialize state (prefersReducedMotion, mounted)
   └── Set up media query listener

2. Props Change
   ├── Recalculate derived values
   │   ├── daysUntil
   │   └── formattedDate
   └── Re-render badge

3. User Interaction
   ├── Hover → Show tooltip
   ├── Focus → Show tooltip
   ├── Escape → Hide tooltip
   └── Click outside → Hide tooltip

4. Unmount
   └── Clean up media query listener
```

## Extensibility Points

### Adding New Selection Methods

```typescript
// 1. Update enum in /types/elections.ts
export enum SelectionMethod {
  // ... existing methods
  NEW_METHOD = 'new_method',
}

// 2. Add config in ElectionBadge.tsx
const SELECTION_METHOD_CONFIG = {
  // ... existing configs
  [SelectionMethod.NEW_METHOD]: {
    label: 'New Method',
    icon: NewIcon,
    description: 'Description...',
    badgeClass: 'bg-custom-500/10 text-custom-600 border-custom-500/30',
    iconClass: 'text-custom-600',
  },
}
```

### Custom Variants

```typescript
// Add new variant to ElectionBadgeProps
interface ElectionBadgeProps {
  variant?: 'compact' | 'detailed' | 'minimal' | 'custom'
  // ...
}

// Add rendering logic
if (variant === 'custom') {
  return <CustomBadgeLayout {...props} />
}
```

### Theme Customization

```typescript
// Override colors via className
<ElectionBadge
  selectionMethod={SelectionMethod.ELECTED}
  className="bg-brand-green/10 text-brand-green border-brand-green/30"
/>
```

---

**Architecture Version:** 1.0.0
**Last Updated:** October 22, 2025
**Complexity:** Low-Medium (Simple component with clear structure)
**Maintainability:** High (Well-documented, modular design)

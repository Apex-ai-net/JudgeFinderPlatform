# ElectionInformation Component

A comprehensive React component for displaying judicial election and political affiliation data on judge profile pages.

## Location

`/Users/tanner-osterkamp/JudgeFinderPlatform/components/judges/ElectionInformation.tsx`

## Features

### Core Features
- **Current Term Information**: Displays term start, end date, and years remaining
- **Election History Timeline**: Shows all past elections with results and vote percentages
- **Political Affiliation**: Displays current political party affiliation
- **Voter Resources**: Links to sample ballots, voter guides, and registration
- **Educational Content**: Information about California retention elections and judicial selection
- **Responsive Design**: Fully responsive layout for mobile and desktop

### User Experience
- **Graceful Empty States**: Handles missing or incomplete data elegantly
- **Expandable History**: Shows first 3 elections with expand/collapse functionality
- **Animated Transitions**: Smooth Framer Motion animations
- **Interactive Elements**: Clickable election items with optional callbacks
- **Accessibility**: ARIA labels, semantic HTML, keyboard navigation

### Data Handling
- **Type Safety**: Full TypeScript support with comprehensive types from `types/elections.ts`
- **Date Calculations**: Automatic calculation of years remaining and days until election
- **Sorting**: Elections automatically sorted by date (most recent first)
- **Formatting**: Consistent date and percentage formatting

## Props

```typescript
interface ElectionInformationProps {
  /** Judge's unique identifier */
  judgeId: string

  /** How the judge was selected */
  selectionMethod: SelectionMethod

  /** When current term ends */
  currentTermEndDate: string | null

  /** Date of next election (if applicable) */
  nextElectionDate: string | null

  /** Array of past elections */
  electionHistory: JudgeElection[]

  /** Whether to show complete election history (default: false) */
  showFullHistory?: boolean

  /** Whether to show political affiliation (default: false) */
  showPoliticalAffiliation?: boolean

  /** Current political affiliation */
  currentAffiliation?: PoliticalParty | null

  /** Optional CSS class name */
  className?: string

  /** Optional callback when election is clicked */
  onElectionClick?: (election: JudgeElection) => void
}
```

## Usage Examples

### Basic Usage

```tsx
import { ElectionInformation } from '@/components/judges'
import { SelectionMethod } from '@/types/elections'

<ElectionInformation
  judgeId="judge-123"
  selectionMethod={SelectionMethod.ELECTED}
  currentTermEndDate="2028-12-31"
  nextElectionDate="2028-11-05"
  electionHistory={[]}
/>
```

### With Full Election History

```tsx
<ElectionInformation
  judgeId="judge-123"
  selectionMethod={SelectionMethod.ELECTED}
  currentTermEndDate="2028-12-31"
  nextElectionDate="2028-11-05"
  electionHistory={pastElections}
  showFullHistory={true}
/>
```

### With Political Affiliation

```tsx
<ElectionInformation
  judgeId="judge-123"
  selectionMethod={SelectionMethod.ELECTED}
  currentTermEndDate="2028-12-31"
  nextElectionDate="2028-11-05"
  electionHistory={pastElections}
  showPoliticalAffiliation={true}
  currentAffiliation={PoliticalParty.DEMOCRATIC}
/>
```

### With Click Handler

```tsx
const handleElectionClick = (election: JudgeElection) => {
  console.log('Election clicked:', election)
  // Open modal, navigate to detail page, etc.
}

<ElectionInformation
  judgeId="judge-123"
  selectionMethod={SelectionMethod.ELECTED}
  currentTermEndDate="2028-12-31"
  nextElectionDate="2028-11-05"
  electionHistory={pastElections}
  onElectionClick={handleElectionClick}
/>
```

## Component Architecture

### Main Component
- `ElectionInformation`: Primary component that orchestrates all sub-components

### Sub-Components
- `SelectionMethodBadge`: Displays how the judge was selected
- `ElectionHistoryItem`: Individual election card in the timeline
- `VoterResourceLink`: External link to voter resources
- `EducationalContent`: Expandable educational information about judicial elections

### Utility Functions
- `formatTermEndDate()`: Formats term end date
- `formatElectionDate()`: Formats election date
- `getSelectionMethodInfo()`: Returns display info for selection method
- `getElectionResultInfo()`: Returns styled info for election result
- `getElectionTypeLabel()`: Returns human-readable election type
- `formatPoliticalParty()`: Formats political party for display

## Styling

The component follows the existing design system with:

### Color Scheme
- **Background**: `bg-[hsl(var(--bg-2))]` and `bg-[hsl(var(--bg-1))]`
- **Text**: `text-[color:hsl(var(--text-1))]`, `text-[color:hsl(var(--text-2))]`, `text-[color:hsl(var(--text-3))]`
- **Accent**: `text-[color:hsl(var(--accent))]`
- **Border**: `border-border`

### Card Patterns
- Rounded corners: `rounded-xl`, `rounded-2xl`
- Border styles: `border border-border/60`
- Shadow effects: `shadow-md`

### Responsive Design
- Grid layouts: `grid gap-4 md:grid-cols-2`
- Flexible spacing: `space-y-6`
- Mobile-first approach

## Animations

Uses Framer Motion for smooth animations:

- **Election History Items**: Fade in and slide from left with staggered delays
- **Progress Bars**: Animated width transitions for vote percentages
- **Expandable Sections**: Smooth height transitions for collapsible content
- **Card Hovers**: Subtle hover effects from AnimatedCard component

## Accessibility

### ARIA Support
- `aria-label` on main section and icons
- `aria-expanded` on expandable buttons
- `aria-controls` linking buttons to content
- `aria-hidden` on decorative icons

### Keyboard Navigation
- All interactive elements are keyboard accessible
- Tab order follows logical flow
- Enter/Space keys trigger actions

### Semantic HTML
- Proper heading hierarchy (`<h2>`, `<h3>`, `<h4>`)
- Semantic elements (`<section>`, `<article>`, `<header>`)
- Descriptive link text

## Data Requirements

### Required Data
- `judgeId`: String identifier
- `selectionMethod`: Valid SelectionMethod enum value

### Optional Data
- `currentTermEndDate`: ISO date string (e.g., "2028-12-31")
- `nextElectionDate`: ISO date string
- `electionHistory`: Array of JudgeElection objects
- `currentAffiliation`: PoliticalParty enum value

### Election Object Structure

```typescript
interface JudgeElection {
  id: string
  judge_id: string
  election_date: string // ISO date
  election_type: ElectionType
  position_sought: string
  result: ElectionResult
  vote_percentage: number | null // 0-100
  total_votes: number | null
  total_turnout: number | null
  jurisdiction: string | null
  court_id: string | null
  is_incumbent: boolean
  endorsements: string[] | null
  campaign_finance_total: number | null
  data_source: string | null
  source_url: string | null
  metadata: Record<string, unknown> | null
  created_at: string
  updated_at: string
}
```

## Empty States

The component gracefully handles various empty states:

1. **No Data at All**: Shows informative message about missing election data
2. **Partial Data**: Displays available sections, hides missing ones
3. **No Elections**: Shows term info and voter resources only
4. **Appointed Judges**: Displays selection method without election details

## Performance Considerations

### Optimizations
- `useMemo` for expensive calculations (date calculations, sorting)
- Conditional rendering to avoid unnecessary DOM nodes
- Lazy loading of educational content (only rendered when expanded)
- Efficient re-renders with proper React keys

### Animation Performance
- Uses CSS transforms for animations (GPU-accelerated)
- Respects `prefers-reduced-motion` user preference
- Smooth transitions without layout thrashing

## Integration with Existing Components

### Follows Patterns From
- `JudgeProfile.tsx`: Metric tiles and card layouts
- `ProfessionalBackground.tsx`: Section structure and styling
- `JudgeHeader.tsx`: Header patterns and badge styles

### Uses Shared Components
- `AnimatedCard` from `components/micro-interactions`
- Date formatters from `lib/utils/date-formatters`
- Lucide React icons

### Design System Alignment
- Matches existing color variables
- Uses consistent spacing scale
- Follows typography hierarchy
- Maintains brand voice

## Testing Considerations

### Test Coverage Should Include
- Rendering with various data combinations
- Date calculations (years remaining, days until election)
- Election sorting (most recent first)
- Empty state handling
- Click handler invocation
- Expand/collapse functionality
- Accessibility features (ARIA attributes, keyboard nav)
- Responsive behavior

### Example Test Cases
```typescript
describe('ElectionInformation', () => {
  it('displays current term information when provided', () => {})
  it('calculates years remaining correctly', () => {})
  it('sorts elections by date descending', () => {})
  it('shows empty state when no data available', () => {})
  it('expands/collapses election history', () => {})
  it('calls onElectionClick when election is clicked', () => {})
  it('displays political affiliation when enabled', () => {})
})
```

## Future Enhancements

### Potential Features
1. **Opponent Information**: Display election opponents and their vote percentages
2. **Campaign Finance Visualization**: Charts showing campaign contributions
3. **Endorsement Details**: Expandable list of endorsing organizations
4. **Comparison Mode**: Compare election results across multiple judges
5. **Historical Trends**: Charts showing voting trends over time
6. **Interactive Timeline**: Visual timeline with zoom/pan capabilities
7. **Export Functionality**: Download election history as PDF/CSV
8. **Notifications**: Alert users about upcoming elections

### Integration Opportunities
1. **Voter Registration API**: Real-time voter registration status
2. **Sample Ballot Integration**: Direct links to specific ballot measures
3. **Election Reminders**: Calendar integration for election dates
4. **Social Sharing**: Share election information on social media
5. **Analytics Tracking**: Track user interactions with election data

## Related Files

- **Types**: `/Users/tanner-osterkamp/JudgeFinderPlatform/types/elections.ts`
- **Examples**: `/Users/tanner-osterkamp/JudgeFinderPlatform/components/judges/ElectionInformation.example.tsx`
- **Exports**: `/Users/tanner-osterkamp/JudgeFinderPlatform/components/judges/index.ts`
- **Similar Components**:
  - `ProfessionalBackground.tsx`
  - `JudgeProfile.tsx`
  - `JudgeHeader.tsx`

## Support & Documentation

For questions or issues:
1. Review the examples in `ElectionInformation.example.tsx`
2. Check the type definitions in `types/elections.ts`
3. Review the design system patterns in existing components
4. Consult the accessibility guidelines

## License

Part of the JudgeFinder Platform codebase.

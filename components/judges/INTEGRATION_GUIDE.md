# ElectionBadge Integration Guide

Quick start guide for integrating election status badges into your judge profile pages and directory listings.

## Quick Start

### 1. Import the Component

```tsx
import { ElectionBadge, ElectionStatusBadge } from '@/components/judges'
import { SelectionMethod } from '@/types/elections'
```

### 2. Add to Judge Header

Update `components/judges/JudgeHeader.tsx`:

```tsx
import { ElectionBadge } from '@/components/judges'
import { SelectionMethod } from '@/types/elections'

export function JudgeHeader({ judge, ... }: JudgeHeaderProps) {
  return (
    <header className="...">
      <div className="flex items-center justify-between">
        {/* Existing header content */}
        <div>
          <h1>{judge.name}</h1>
          <p>{judge.court_name}</p>
        </div>

        {/* Add election badge */}
        {judge.selection_method && (
          <ElectionBadge
            selectionMethod={judge.selection_method}
            nextElectionDate={judge.next_election_date}
            variant="compact"
          />
        )}
      </div>
    </header>
  )
}
```

### 3. Add to Directory Cards

Update `app/judges/components/JudgesDirectoryGridCard.tsx`:

```tsx
import { ElectionBadge } from '@/components/judges'

export function JudgesDirectoryGridCard({ judge }: Props) {
  return (
    <div className="...">
      {/* Existing card header */}
      <div className="flex items-start justify-between mb-4">
        <div className="w-12 h-12 rounded-full bg-primary/10">
          <Gavel className="h-6 w-6" />
        </div>

        <div className="flex flex-col items-end gap-1.5">
          {/* Existing badges */}
          <AnimatedBadge variant="info">
            {judge.jurisdiction || 'CA'}
          </AnimatedBadge>

          {/* Add election badge */}
          {judge.selection_method && (
            <ElectionBadge
              selectionMethod={judge.selection_method}
              variant="compact"
            />
          )}
        </div>
      </div>

      {/* Rest of card content */}
    </div>
  )
}
```

## Database Schema Requirements

Ensure your judge table includes these fields:

```sql
-- Add to judges table if not present
ALTER TABLE judges
ADD COLUMN IF NOT EXISTS selection_method TEXT,
ADD COLUMN IF NOT EXISTS next_election_date DATE,
ADD COLUMN IF NOT EXISTS current_term_end_date DATE,
ADD COLUMN IF NOT EXISTS is_elected BOOLEAN DEFAULT false;

-- Update existing records
UPDATE judges
SET selection_method = 'elected',
    is_elected = true
WHERE selection_method IS NULL
  AND appointed_date IS NOT NULL;
```

## TypeScript Types

Ensure your Judge type includes election fields:

```typescript
// types/index.ts or types/judge.ts
import { SelectionMethod } from '@/types/elections'

export interface Judge {
  id: string
  name: string
  court_name: string | null
  // ... other fields

  // Election-related fields
  selection_method: SelectionMethod | null
  next_election_date: string | null
  current_term_end_date: string | null
  is_elected: boolean
}
```

## Data Migration

If you need to populate selection method data:

```typescript
// scripts/migrate-election-data.ts
import { supabase } from '@/lib/supabase'
import { SelectionMethod } from '@/types/elections'

async function migrateElectionData() {
  // Example: Mark California Superior Court judges as elected
  const { data, error } = await supabase
    .from('judges')
    .update({
      selection_method: SelectionMethod.ELECTED,
      is_elected: true,
    })
    .eq('jurisdiction', 'California')
    .ilike('court_name', '%Superior Court%')
    .is('selection_method', null)

  console.log(`Updated ${data?.length} judges`)
}
```

## API Integration

Update your judge fetching queries to include election data:

```typescript
// lib/judges/queries.ts
export async function getJudgeById(id: string) {
  const { data, error } = await supabase
    .from('judges')
    .select(`
      *,
      selection_method,
      next_election_date,
      current_term_end_date,
      is_elected
    `)
    .eq('id', id)
    .single()

  return data
}
```

## Variant Selection Guide

Choose the appropriate variant based on context:

### Minimal Variant
**Use when:**
- Very limited space
- Displaying many judges in a list
- Mobile search results

```tsx
<ElectionBadge
  selectionMethod={judge.selection_method}
  variant="minimal"
/>
```

### Compact Variant
**Use when:**
- Directory cards
- Judge profile headers (mobile)
- Comparison tables

```tsx
<ElectionBadge
  selectionMethod={judge.selection_method}
  variant="compact"
/>
```

### Detailed Variant
**Use when:**
- Judge profile headers (desktop)
- Detailed information sections
- Election information tabs

```tsx
<ElectionBadge
  selectionMethod={judge.selection_method}
  nextElectionDate={judge.next_election_date}
  variant="detailed"
/>
```

## Responsive Example

Adapt badge variant to screen size:

```tsx
export function ResponsiveElectionBadge({ judge }) {
  return (
    <>
      {/* Mobile: minimal */}
      <div className="md:hidden">
        <ElectionBadge
          selectionMethod={judge.selection_method}
          variant="minimal"
        />
      </div>

      {/* Tablet: compact */}
      <div className="hidden md:block lg:hidden">
        <ElectionBadge
          selectionMethod={judge.selection_method}
          variant="compact"
        />
      </div>

      {/* Desktop: detailed */}
      <div className="hidden lg:block">
        <ElectionBadge
          selectionMethod={judge.selection_method}
          nextElectionDate={judge.next_election_date}
          variant="detailed"
        />
      </div>
    </>
  )
}
```

## Styling Customization

### Custom Colors

Override badge colors using Tailwind classes:

```tsx
<ElectionBadge
  selectionMethod={SelectionMethod.ELECTED}
  variant="compact"
  className="bg-custom-green/10 text-custom-green border-custom-green/30"
/>
```

### Custom Size

Adjust badge size:

```tsx
<ElectionBadge
  selectionMethod={SelectionMethod.APPOINTED}
  variant="compact"
  className="px-3 py-1.5 text-sm" // Larger
/>

<ElectionBadge
  selectionMethod={SelectionMethod.APPOINTED}
  variant="compact"
  className="px-2 py-0.5 text-xs" // Smaller
/>
```

## Common Patterns

### Pattern 1: Badge with Tooltip Enhancement

```tsx
<div className="flex items-center gap-2">
  <ElectionBadge
    selectionMethod={judge.selection_method}
    variant="compact"
  />

  {judge.is_elected && (
    <span className="text-xs text-muted-foreground">
      Elected {new Date(judge.elected_date).getFullYear()}
    </span>
  )}
</div>
```

### Pattern 2: Multiple Badges

```tsx
<div className="flex flex-wrap gap-2">
  <ElectionBadge
    selectionMethod={judge.selection_method}
    variant="compact"
  />

  {judge.political_affiliation && (
    <PoliticalAffiliationBadge
      affiliation={judge.political_affiliation}
    />
  )}
</div>
```

### Pattern 3: Conditional Rendering

```tsx
{judge.selection_method && (
  <ElectionStatusBadge
    selectionMethod={judge.selection_method}
    nextElectionDate={judge.next_election_date}
    variant="compact"
  />
)}
```

## Testing Integration

Test the integration in your components:

```tsx
// __tests__/JudgeHeader.test.tsx
import { render, screen } from '@testing-library/react'
import { JudgeHeader } from '@/components/judges/JudgeHeader'
import { SelectionMethod } from '@/types/elections'

describe('JudgeHeader with ElectionBadge', () => {
  it('displays election badge for elected judges', () => {
    const judge = {
      id: '1',
      name: 'Judge Smith',
      selection_method: SelectionMethod.ELECTED,
      next_election_date: '2026-11-03',
    }

    render(<JudgeHeader judge={judge} />)

    expect(screen.getByText('Elected')).toBeInTheDocument()
  })
})
```

## Performance Tips

### 1. Memoize Judge Data

```tsx
import { useMemo } from 'react'

export function JudgeCard({ judge }) {
  const electionProps = useMemo(() => ({
    selectionMethod: judge.selection_method,
    nextElectionDate: judge.next_election_date,
  }), [judge.selection_method, judge.next_election_date])

  return (
    <div>
      <ElectionBadge {...electionProps} variant="compact" />
    </div>
  )
}
```

### 2. Lazy Load for Large Lists

```tsx
import { lazy, Suspense } from 'react'

const ElectionBadge = lazy(() =>
  import('@/components/judges').then(m => ({ default: m.ElectionBadge }))
)

export function JudgeList({ judges }) {
  return (
    <Suspense fallback={<BadgeSkeleton />}>
      {judges.map(judge => (
        <ElectionBadge
          key={judge.id}
          selectionMethod={judge.selection_method}
          variant="minimal"
        />
      ))}
    </Suspense>
  )
}
```

## Troubleshooting

### Badge Not Appearing

**Issue:** Badge doesn't render
**Solution:** Check that `selection_method` is a valid enum value

```tsx
// Add console log for debugging
console.log('Selection method:', judge.selection_method)
console.log('Is valid:', Object.values(SelectionMethod).includes(judge.selection_method))
```

### Tooltip Not Working

**Issue:** Tooltip doesn't show on hover
**Solution:** Ensure parent has proper z-index

```tsx
<div className="relative z-10">
  <ElectionBadge {...props} />
</div>
```

### Styling Conflicts

**Issue:** Badge styling looks wrong
**Solution:** Check for CSS conflicts

```tsx
// Use more specific className
<ElectionBadge
  selectionMethod={judge.selection_method}
  variant="compact"
  className="!bg-green-500/10" // Use ! for important
/>
```

## Migration Checklist

- [ ] Add `selection_method` field to judge type
- [ ] Update database schema
- [ ] Migrate existing judge data
- [ ] Import ElectionBadge component
- [ ] Add to JudgeHeader component
- [ ] Add to directory grid cards
- [ ] Add to search results
- [ ] Test on mobile devices
- [ ] Test with keyboard navigation
- [ ] Test with screen reader
- [ ] Update API queries
- [ ] Write integration tests
- [ ] Document in project wiki

## Next Steps

1. **Review the main documentation:** See `ELECTION_COMPONENTS.md` for comprehensive details
2. **Check examples:** Review `ElectionBadge.examples.tsx` for more use cases
3. **Run tests:** Execute `npm test ElectionBadge` to verify functionality
4. **Deploy gradually:** Roll out to one page at a time
5. **Monitor analytics:** Track badge interaction metrics

## Support

Questions? Check:
- Main documentation: `ELECTION_COMPONENTS.md`
- Examples file: `ElectionBadge.examples.tsx`
- Test file: `ElectionBadge.test.tsx`
- Type definitions: `/types/elections.ts`

---

**Quick Reference Card:**

```tsx
// Basic usage
<ElectionBadge
  selectionMethod={SelectionMethod.ELECTED}
  variant="compact"
/>

// With election date
<ElectionBadge
  selectionMethod={SelectionMethod.RETENTION_ELECTION}
  nextElectionDate="2026-11-03"
  variant="detailed"
/>

// Auto-detect status
<ElectionStatusBadge
  selectionMethod={judge.selection_method}
  nextElectionDate={judge.next_election_date}
/>
```

---

**Last Updated:** October 22, 2025

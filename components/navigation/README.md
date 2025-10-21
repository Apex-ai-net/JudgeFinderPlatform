# Mega Menu Navigation System

A comprehensive, accessible mega menu navigation system for JudgeFinder.io that improves site discoverability and provides an enhanced user experience across desktop and mobile devices.

## Overview

The mega menu system consists of three main components:

1. **MegaMenu** - The main container component that handles desktop hover and mobile accordion behavior
2. **MegaMenuItem** - Individual menu items with optional descriptions and nested children
3. **mega-menu-config.ts** - Configuration file defining the menu structure

## Components

### MegaMenu (`MegaMenu.tsx`)

The primary navigation component that adapts to desktop and mobile contexts.

**Features:**

- Desktop: Hover-activated dropdown with smooth animations
- Mobile: Accordion-style expandable menu
- Keyboard accessible (Tab, Enter, Escape)
- Click-outside to close
- WCAG 2.2 Level AA compliant

**Props:**

```typescript
interface MegaMenuProps {
  type: 'judges' | 'courts' | 'resources' // Menu configuration type
  label: string // Display label
  isActive?: boolean // Active state indicator
  isMobile?: boolean // Mobile mode flag
}
```

**Usage:**

```tsx
<MegaMenu type="judges" label="Judges" isActive={isActive('/judges')} />
```

### MegaMenuItem (`MegaMenuItem.tsx`)

Individual menu items with optional descriptions and support for nested children.

**Features:**

- Smooth hover animations using Framer Motion
- Optional descriptions for additional context
- Support for nested menu items
- Keyboard navigation support
- Focus management

**Props:**

```typescript
interface MegaMenuItemProps {
  item: MegaMenuItem // Menu item configuration
  onItemClick?: () => void // Click handler
  isNested?: boolean // Nested item flag
}
```

### MegaMenuSection (`MegaMenuItem.tsx`)

Groups related menu items under a section heading.

**Props:**

```typescript
interface MegaMenuSectionProps {
  title: string // Section heading
  items: MegaMenuItem[] // Menu items
  onItemClick?: () => void // Click handler
}
```

## Configuration

Menu structure is defined in `mega-menu-config.ts`:

```typescript
export interface MegaMenuItem {
  label: string
  href: string
  description?: string
  children?: MegaMenuItem[]
}

export interface MegaMenuSection {
  id: string
  label: string
  items: MegaMenuItem[]
}
```

### Current Menus

#### Judges Menu

- Browse Judges (All, Compare, Advanced Search)
- By Category (Veteran, Recently Appointed)
- By Court Type (Superior, Appellate, Supreme)
- Top Counties (LA, Orange, San Diego, San Francisco)

#### Courts Menu

- Browse Courts (All, By Jurisdiction)
- Court Levels (Superior, Appellate, Supreme)

#### Resources Menu

- Research Tools (Legal Research, Judicial Analytics, Case Analytics)
- Directories (Attorney Directory, Help Center, Documentation)

### Adding New Menu Items

1. Edit `mega-menu-config.ts`
2. Add items to the appropriate section:

```typescript
export const judgesMenu: MegaMenuSection[] = [
  {
    id: 'browse',
    label: 'Browse Judges',
    items: [
      {
        label: 'New Feature',
        href: '/new-feature',
        description: 'Description of the feature',
      },
    ],
  },
]
```

## Accessibility Features

### Keyboard Navigation

- **Tab** - Navigate through menu items
- **Enter/Space** - Open/close menu
- **Escape** - Close menu and return focus to trigger button
- **Arrow keys** - Navigate between menu items (native browser behavior)

### ARIA Attributes

- `aria-expanded` - Indicates menu open/closed state
- `aria-haspopup` - Identifies dropdown trigger
- `aria-label` - Provides accessible names for menu items
- `aria-labelledby` - Associates sections with their headings
- `aria-controls` - Links accordion buttons to their panels (mobile)

### Semantic HTML

- `<nav>` - Main navigation container
- `<button>` - Interactive triggers
- `<ul>` / `<li>` - List structures for menu items
- `<h3>` - Section headings

### Focus Management

- Focus returns to trigger button on Escape
- Tab order follows visual layout
- Focus visible indicators for keyboard users
- No keyboard traps

## Responsive Design

### Desktop (md and above)

- Hover-activated dropdowns
- Multi-column grid layout (2-4 columns)
- Smooth animations
- Positioned absolutely below trigger
- Auto-closes on click outside

### Mobile (below md breakpoint)

- Accordion-style expandable sections
- Full-width layout
- Touch-optimized interactions
- Integrated with mobile menu

## Integration

### In Header Component

```tsx
import { MegaMenu } from '@/components/navigation/MegaMenu'

const NAV_LINKS = [
  { href: '/judges', label: 'Judges', hasMegaMenu: true, megaMenuType: 'judges' },
  { href: '/courts', label: 'Courts', hasMegaMenu: true, megaMenuType: 'courts' },
  { href: '/help', label: 'Resources', hasMegaMenu: true, megaMenuType: 'resources' },
]

// Desktop navigation
{
  NAV_LINKS.map((link) => {
    if (link.hasMegaMenu && link.megaMenuType) {
      return (
        <MegaMenu
          key={link.href}
          type={link.megaMenuType}
          label={link.label}
          isActive={isActive(link.href)}
        />
      )
    }
    return <Link href={link.href}>{link.label}</Link>
  })
}

// Mobile navigation
{
  NAV_LINKS.map((link) => {
    if (link.hasMegaMenu && link.megaMenuType) {
      return (
        <MegaMenu
          key={link.href}
          type={link.megaMenuType}
          label={link.label}
          isActive={isActive(link.href)}
          isMobile
        />
      )
    }
    return <Link href={link.href}>{link.label}</Link>
  })
}
```

## Testing

### Accessibility Tests

Comprehensive WCAG 2.2 Level AA compliance tests are located in:

```
/tests/a11y/mega-menu-accessibility.test.tsx
```

Run tests:

```bash
npm run test:a11y -- mega-menu
```

Test coverage includes:

- Axe accessibility violations
- Keyboard navigation
- Focus management
- ARIA attributes
- Semantic structure
- Desktop and mobile modes

### Route Verification

Verify all menu links point to valid pages:

```bash
node scripts/verify-mega-menu-routes.js
```

## Performance

- Lazy loading of menu content (not rendered until opened)
- Optimized animations using Framer Motion
- Minimal re-renders with proper React keys
- Efficient event listeners (mouseenter/mouseleave)

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile browsers (iOS Safari, Chrome Mobile)
- Keyboard navigation in all browsers
- Screen reader tested with NVDA, JAWS, VoiceOver

## Customization

### Animation Timing

Adjust animation duration in `MegaMenu.tsx`:

```tsx
transition={{ duration: 0.3, ease: 'easeInOut' }}
```

### Grid Layout

Modify column count in `MegaMenu.tsx`:

```tsx
className={cn(
  'grid gap-6 p-6',
  sections.length === 2 && 'grid-cols-2',
  sections.length === 3 && 'grid-cols-3',
  // Add custom layouts here
)}
```

### Styling

All components use Tailwind CSS with semantic design tokens:

- `text-foreground` - Primary text color
- `text-muted-foreground` - Secondary text color
- `bg-background` - Background color
- `bg-accent` - Highlight color
- `border-border` - Border color

## Future Enhancements

- [ ] Search within mega menu
- [ ] Featured/trending items
- [ ] Recently viewed pages
- [ ] Custom icons for menu items
- [ ] Analytics tracking for menu interactions
- [ ] A/B testing support

## Support

For issues or questions:

- File an issue in the project repository
- Contact the development team
- Refer to CLAUDE.md for development guidelines

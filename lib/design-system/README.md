# JudgeFinder Design System

## Overview

This design system provides a consistent, professional visual language for the JudgeFinder platform. All design tokens are centralized in a single source of truth to ensure consistency across the application.

## Architecture

```
lib/design-system/
├── tokens.ts          # Single source of truth for all design tokens
├── README.md          # This file - design system documentation
└── (future)
    ├── components/    # Reusable component patterns
    └── guidelines/    # Usage guidelines and best practices
```

## Core Principles

1. **Single Source of Truth**: All design values are defined in `tokens.ts`
2. **Semantic Naming**: Colors and tokens use meaningful names (e.g., `primary`, `success`, not `blue-500`)
3. **Accessibility First**: WCAG 2.1 Level AA compliance minimum
4. **Dark Mode Support**: All tokens have light and dark mode variants
5. **Consistency**: Use tokens instead of hardcoded values

## Color System

### Primary Brand Color

Our primary brand color is a professional cyan-blue (#2B9FE3) representing trust and clarity.

```typescript
import { colors } from '@/lib/design-system/tokens'

// Primary color scale
colors.primary.DEFAULT // Main brand color
colors.primary.hover // Hover state
colors.primary.active // Active/pressed state
colors.primary.subtle // Subtle backgrounds
colors.primary[50 - 900] // Full scale for granular control
```

### Semantic Colors

Use semantic colors for contextual meaning:

```typescript
colors.semantic.success // Green - positive actions, confirmations
colors.semantic.warning // Amber - warnings, cautions
colors.semantic.error // Red - errors, destructive actions
colors.semantic.info // Blue - informational messages
```

### Light/Dark Mode

Colors automatically adapt to theme:

```typescript
// Light mode
colors.light.background.page // Page background
colors.light.background.card // Card backgrounds
colors.light.text.primary // Primary text color

// Dark mode
colors.dark.background.page // Page background
colors.dark.background.card // Card backgrounds
colors.dark.text.primary // Primary text color
```

## Typography

### Font Families

```typescript
typography.fontFamily.sans // Inter - primary font
typography.fontFamily.mono // JetBrains Mono - code font
```

### Font Sizes

```typescript
// Type scale follows 8px grid
typography.fontSize.xs // 12px - Small labels, captions
typography.fontSize.sm // 14px - Secondary text
typography.fontSize.base // 16px - Body text (default)
typography.fontSize.lg // 18px - Large body text
typography.fontSize.xl // 20px - Small headings
typography.fontSize['2xl'] // 24px - Section headings
typography.fontSize['3xl'] // 30px - Page headings
typography.fontSize['4xl'] // 36px - Large headings
typography.fontSize['5xl'] // 48px - Display text
typography.fontSize['6xl'] // 60px - Hero text
```

### Font Weights

```typescript
typography.fontWeight.normal // 400 - Body text
typography.fontWeight.medium // 500 - Emphasis
typography.fontWeight.semibold // 600 - Headings
typography.fontWeight.bold // 700 - Strong emphasis
```

## Spacing

### 8px Grid System

All spacing follows an 8px grid for visual rhythm:

```typescript
spacing[1] // 4px  - Tight spacing
spacing[2] // 8px  - Base unit
spacing[4] // 16px - Standard spacing
spacing[6] // 24px - Medium spacing
spacing[8] // 32px - Large spacing
spacing[12] // 48px - XL spacing
spacing[16] // 64px - XXL spacing
```

### Component-Specific Spacing

```typescript
components.button.padding.md // 12px 24px
components.card.padding.md // 24px
components.modal.padding // 24px
```

## Component Tokens

### Buttons

```typescript
components.button.height.sm // 32px
components.button.height.md // 40px (default)
components.button.height.lg // 48px
components.button.height.xl // 56px

components.button.padding.sm // 8px 12px
components.button.padding.md // 12px 24px
components.button.padding.lg // 16px 32px
```

### Inputs

```typescript
components.input.height.sm // 32px
components.input.height.md // 40px (default)
components.input.height.lg // 48px
components.input.padding // 12px 16px
```

### Cards

```typescript
components.card.padding.sm // 16px
components.card.padding.md // 24px (default)
components.card.padding.lg // 32px
components.card.borderWidth // 1px
```

## Shadows

### Standard Shadows

```typescript
shadows.sm // Subtle depth
shadows.DEFAULT // Standard cards
shadows.md // Elevated elements
shadows.lg // Modals, popovers
shadows.xl // High elevation
shadows['2xl'] // Maximum elevation
```

### Dark Mode

Shadows automatically adjust for dark mode:

```typescript
shadowsDark.sm // Lighter shadow for visibility
// Use automatically via CSS variables
```

## Z-Index

Never use arbitrary z-index values. Use the predefined scale:

```typescript
zIndex.dropdown // 1000
zIndex.sticky // 1020
zIndex.fixed // 1030
zIndex.modalBackdrop // 1040
zIndex.modal // 1050
zIndex.popover // 1060
zIndex.tooltip // 1070
zIndex.notification // 1080
```

## Transitions

### Standard Durations

```typescript
transitions.duration.fast // 150ms - Quick feedback
transitions.duration.normal // 300ms - Standard transitions
transitions.duration.slow // 500ms - Dramatic effects
```

### Easing Curves

```typescript
transitions.easing.default // Ease-in-out (default)
transitions.easing.in // Ease-in
transitions.easing.out // Ease-out
transitions.easing.spring // Spring effect
```

### Convenience Properties

```typescript
transitions.fast // 150ms cubic-bezier(0.4, 0, 0.2, 1)
transitions.normal // 300ms cubic-bezier(0.4, 0, 0.2, 1)
transitions.slow // 500ms cubic-bezier(0.4, 0, 0.2, 1)
transitions.spring // 500ms cubic-bezier(0.34, 1.56, 0.64, 1)
```

## Accessibility

### Focus Rings

```typescript
a11y.focusRing.width // 2px
a11y.focusRing.offset // 2px
a11y.focusRing.color // Primary brand color
```

### Touch Targets

```typescript
a11y.minTouchTarget // 44px - WCAG 2.1 Level AAA
a11y.minClickTarget // 24px - Desktop minimum
```

## Usage Examples

### Using in TypeScript/React

```typescript
import { colors, spacing, components } from '@/lib/design-system/tokens'

// Component styles
const buttonStyle = {
  height: components.button.height.md,
  padding: components.button.padding.md,
  marginBottom: spacing[4],
}

// With utility functions
import { hsl, hsla } from '@/lib/design-system/tokens'

const backgroundColor = hsl(colors.primary.DEFAULT)
const overlayColor = hsla(colors.dark.background.page, 0.8)
```

### Using with Tailwind CSS

```tsx
// Use semantic token classes
<button className="bg-primary text-primary-foreground hover:bg-primary/90">
  Click Me
</button>

// Interactive states
<div className="bg-interactive hover:bg-interactive-hover active:bg-interactive-active">
  Interactive Element
</div>

// Semantic colors
<div className="text-success">Success message</div>
<div className="text-warning">Warning message</div>
<div className="text-error">Error message</div>

// Spacing with standard scale
<div className="p-6 mb-4 gap-4">
  <Card className="p-6">Content</Card>
</div>
```

### Using CSS Variables

```css
/* CSS variables are auto-generated from tokens */
.custom-component {
  background: hsl(var(--background));
  color: hsl(var(--foreground));
  border: 1px solid hsl(var(--border));
  border-radius: var(--radius);
}

/* Interactive states */
.button {
  background: hsl(var(--interactive-primary));
}

.button:hover {
  background: hsl(var(--interactive-hover));
}

.button:active {
  background: hsl(var(--interactive-active));
}
```

## Best Practices

### DO ✅

- Always import and use design tokens
- Use semantic color names (`primary`, `success`, `error`)
- Follow the 8px spacing grid
- Use component-specific tokens for standard components
- Test in both light and dark modes
- Ensure minimum touch target sizes (44px)
- Use standardized focus rings

### DON'T ❌

- Never use hardcoded colors, spacing, or other values
- Don't create custom z-index values outside the scale
- Don't use arbitrary font sizes outside the type scale
- Don't skip accessibility testing
- Don't use legacy color namespaces (`legal`, `enterprise`)

## Migration Guide

### Removing Legacy Colors

Replace legacy color usage:

```typescript
// ❌ Old (legacy)
className = 'bg-legal-navy text-legal-cream'
className = 'bg-enterprise-primary'

// ✅ New (token-based)
className = 'bg-primary text-foreground'
className = 'bg-interactive hover:bg-interactive-hover'
```

### Standardizing Spacing

Replace arbitrary spacing:

```typescript
// ❌ Old (arbitrary)
className="p-5 mb-7"
style={{ padding: '20px', marginBottom: '28px' }}

// ✅ New (token-based)
className="p-6 mb-8"  // Uses 24px and 32px from spacing scale
style={{ padding: spacing[6], marginBottom: spacing[8] }}
```

### Standardizing Shadows

Replace custom shadows:

```typescript
// ❌ Old (custom)
className = 'shadow-[0_4px_12px_rgba(0,0,0,0.15)]'

// ✅ New (token-based)
className = 'shadow-md' // or use .shadow-card, .shadow-elevated
```

## Future Enhancements

- [ ] Storybook integration for visual token reference
- [ ] Figma token sync for design-to-code workflow
- [ ] Component usage guidelines and examples
- [ ] Animation pattern library
- [ ] Icon system integration
- [ ] Responsive typography guidelines

## Questions?

For questions about the design system, refer to:

- This README for usage guidelines
- `tokens.ts` for all available tokens
- `globals.css` for CSS variable implementations
- `tailwind.config.js` for Tailwind integration

---

_Last updated: [Today's Date]_
_Version: 1.0.0_

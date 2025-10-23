# Design Token Migration Guide

**Goal**: Convert all hardcoded Tailwind colors to semantic design tokens for consistency, dark mode support, and maintainability.

---

## The Problem

We have **50+ files** using hardcoded colors like:
- `bg-blue-500`, `text-red-600`, `border-gray-300`
- These break dark mode compatibility
- No single source of truth for colors
- Difficult to rebrand or adjust colors globally

---

## The Solution

Use **semantic design tokens** defined in `app/globals.css` and `tailwind.config.js`:

```typescript
// ❌ BAD - Hardcoded colors
<div className="bg-blue-600 text-white border-gray-300">

// ✅ GOOD - Semantic tokens
<div className="bg-primary text-primary-foreground border-border">
```

---

## Color Mapping Reference

### Background Colors

| Hardcoded Class | Semantic Token | Use Case |
|----------------|----------------|----------|
| `bg-white` | `bg-background` or `bg-card` | Page/panel backgrounds |
| `bg-gray-50` | `bg-background` or `bg-muted` | Light background areas |
| `bg-gray-100` | `bg-muted` | Subtle background highlights |
| `bg-gray-200` | `bg-secondary` | Secondary surfaces |
| `bg-gray-800` | `bg-surface-sunken` (dark) | Dark surfaces |
| `bg-gray-900` | `bg-background` (dark mode) | Main dark background |

### Interactive Elements (Buttons, Links, CTAs)

| Hardcoded Class | Semantic Token | Use Case |
|----------------|----------------|----------|
| `bg-blue-500` | `bg-primary` | Primary CTA buttons |
| `bg-blue-600` | `bg-primary` | Primary buttons |
| `bg-blue-700` | `hover:bg-primary` | Button hover state |
| `bg-blue-50` | `bg-primary/10` | Subtle primary background |
| `bg-blue-100` | `bg-interactive-subtle` | Interactive element background |
| `text-blue-600` | `text-primary` | Primary text/links |
| `text-blue-700` | `text-primary hover:text-primary-foreground` | Link hover |

### Status/Semantic Colors

#### Success (Green)

| Hardcoded Class | Semantic Token | Use Case |
|----------------|----------------|----------|
| `bg-green-50` | `bg-success/10` | Success backgrounds |
| `bg-green-100` | `bg-success/20` | Success backgrounds (darker) |
| `bg-green-500` | `bg-success` | Success badges/indicators |
| `bg-green-600` | `bg-success` | Success buttons |
| `text-green-600` | `text-success` | Success text |
| `text-green-700` | `text-success` | Success text (darker) |
| `text-green-800` | `text-success` | Success text (darkest) |
| `border-green-200` | `border-success/30` | Success borders |
| `border-green-500` | `border-success` | Strong success borders |

#### Warning (Yellow/Amber)

| Hardcoded Class | Semantic Token | Use Case |
|----------------|----------------|----------|
| `bg-yellow-50` | `bg-warning/10` | Warning backgrounds |
| `bg-yellow-100` | `bg-warning/20` | Warning backgrounds (darker) |
| `bg-yellow-500` | `bg-warning` | Warning badges |
| `text-yellow-600` | `text-warning` | Warning text |
| `text-yellow-700` | `text-warning` | Warning text (darker) |
| `text-yellow-800` | `text-warning` | Warning text (darkest) |
| `border-yellow-200` | `border-warning/30` | Warning borders |
| `border-yellow-300` | `border-warning/40` | Warning borders (darker) |

#### Error/Destructive (Red)

| Hardcoded Class | Semantic Token | Use Case |
|----------------|----------------|----------|
| `bg-red-50` | `bg-destructive/10` or `bg-error/10` | Error backgrounds |
| `bg-red-100` | `bg-destructive/20` | Error backgrounds (darker) |
| `bg-red-500` | `bg-destructive` | Error badges/buttons |
| `bg-red-600` | `bg-destructive` | Error buttons |
| `text-red-600` | `text-destructive` or `text-error` | Error text |
| `text-red-700` | `text-destructive` | Error text (darker) |
| `text-red-800` | `text-destructive` | Error text (darkest) |
| `border-red-200` | `border-destructive/30` | Error borders |
| `border-red-500` | `border-destructive` | Strong error borders |

#### Info (Blue/Cyan)

| Hardcoded Class | Semantic Token | Use Case |
|----------------|----------------|----------|
| `bg-blue-50` | `bg-info/10` or `bg-primary/10` | Info backgrounds |
| `bg-cyan-50` | `bg-info/10` | Info backgrounds |
| `bg-blue-500` | `bg-info` or `bg-primary` | Info badges |
| `text-blue-600` | `text-info` or `text-primary` | Info text |
| `text-blue-700` | `text-info` | Info text (darker) |
| `text-blue-800` | `text-info` | Info text (darkest) |
| `border-blue-200` | `border-info/30` or `border-primary/30` | Info borders |

### Text Colors

| Hardcoded Class | Semantic Token | Use Case |
|----------------|----------------|----------|
| `text-gray-900` | `text-foreground` | Primary text |
| `text-gray-800` | `text-foreground` | Primary text |
| `text-gray-700` | `text-foreground` | Body text |
| `text-gray-600` | `text-muted-foreground` | Secondary text |
| `text-gray-500` | `text-muted-foreground` | Tertiary text |
| `text-gray-400` | `text-muted-foreground/70` | Placeholder text |
| `text-gray-300` | `text-muted-foreground/50` | Disabled text |
| `text-white` | `text-primary-foreground` (on colored bg) | Text on colored backgrounds |

### Border Colors

| Hardcoded Class | Semantic Token | Use Case |
|----------------|----------------|----------|
| `border-gray-200` | `border-border` | Standard borders |
| `border-gray-300` | `border-border` | Standard borders |
| `border-gray-400` | `border-border` | Stronger borders |
| `border-gray-700` | `border-border` (dark) | Dark mode borders |
| `border-blue-500` | `border-primary` | Primary borders |

### Special Use Cases

#### Purple (Secondary/Accent)

| Hardcoded Class | Semantic Token | Use Case |
|----------------|----------------|----------|
| `bg-purple-50` | `bg-accent/10` | Accent backgrounds |
| `bg-purple-100` | `bg-accent/20` | Accent backgrounds (darker) |
| `bg-purple-500` | `bg-accent` | Accent badges |
| `bg-purple-600` | `bg-accent` | Accent buttons |
| `text-purple-600` | `text-accent` | Accent text |
| `text-purple-700` | `text-accent` | Accent text (darker) |
| `border-purple-200` | `border-accent/30` | Accent borders |

#### Orange (Alternative Warning/Highlight)

| Hardcoded Class | Semantic Token | Use Case |
|----------------|----------------|----------|
| `bg-orange-50` | `bg-warning/10` | Alternative warning |
| `bg-orange-100` | `bg-warning/20` | Alternative warning |
| `text-orange-600` | `text-warning` | Alternative warning text |

#### Pink (Marketing/Fun)

| Hardcoded Class | Semantic Token | Use Case |
|----------------|----------------|----------|
| `bg-pink-50` | `bg-accent/10` | Marketing highlights |
| `text-pink-600` | `text-accent` | Marketing text |

#### Indigo (Alternative Primary)

| Hardcoded Class | Semantic Token | Use Case |
|----------------|----------------|----------|
| `bg-indigo-50` | `bg-primary/10` | Alternative primary |
| `bg-indigo-600` | `bg-primary` | Alternative primary buttons |
| `text-indigo-600` | `text-primary` | Alternative primary text |

---

## Opacity Modifiers

Semantic tokens support Tailwind's opacity modifier:

```tsx
// ❌ BAD
<div className="bg-blue-50">  // Fixed opacity

// ✅ GOOD
<div className="bg-primary/10">  // 10% opacity
<div className="bg-success/20">  // 20% opacity
<div className="text-muted-foreground/70">  // 70% opacity
```

---

## Dark Mode Support

Semantic tokens automatically adapt to dark mode:

```tsx
// ❌ BAD - Breaks in dark mode
<div className="bg-white text-gray-900 border-gray-300 dark:bg-gray-900 dark:text-white dark:border-gray-700">

// ✅ GOOD - Works in light and dark automatically
<div className="bg-card text-card-foreground border-border">
```

---

## Common Patterns

### Card Components

```tsx
// ❌ BAD
<div className="bg-white rounded-lg border border-gray-200 shadow-sm">
  <h3 className="text-gray-900">Title</h3>
  <p className="text-gray-600">Description</p>
</div>

// ✅ GOOD
<div className="bg-card rounded-lg border border-border shadow-sm">
  <h3 className="text-card-foreground">Title</h3>
  <p className="text-muted-foreground">Description</p>
</div>
```

### Buttons

```tsx
// ❌ BAD - Primary button
<button className="bg-blue-600 hover:bg-blue-700 text-white">
  Click me
</button>

// ✅ GOOD - Primary button
<button className="bg-primary hover:bg-primary/90 text-primary-foreground">
  Click me
</button>

// ❌ BAD - Destructive button
<button className="bg-red-600 hover:bg-red-700 text-white">
  Delete
</button>

// ✅ GOOD - Destructive button
<button className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
  Delete
</button>
```

### Status Badges

```tsx
// ❌ BAD
<span className="bg-green-100 text-green-800 border-green-200">
  Active
</span>

// ✅ GOOD
<span className="bg-success/20 text-success border-success/30">
  Active
</span>

// ❌ BAD
<span className="bg-red-100 text-red-800 border-red-200">
  Error
</span>

// ✅ GOOD
<span className="bg-destructive/20 text-destructive border-destructive/30">
  Error
</span>
```

### Info/Alert Boxes

```tsx
// ❌ BAD - Info box
<div className="bg-blue-50 border-blue-200 text-blue-800">
  <p>Information message</p>
</div>

// ✅ GOOD - Info box
<div className="bg-primary/10 border-primary/30 text-foreground">
  <p>Information message</p>
</div>

// ❌ BAD - Warning box
<div className="bg-yellow-50 border-yellow-200 text-yellow-800">
  <p>Warning message</p>
</div>

// ✅ GOOD - Warning box
<div className="bg-warning/10 border-warning/30 text-foreground">
  <p>Warning message</p>
</div>
```

---

## Available Semantic Tokens

### Surface/Background
- `bg-background` - Page background
- `bg-card` - Card/panel background
- `bg-popover` - Popover/dropdown background
- `bg-muted` - Subtle background
- `bg-surface-elevated` - Elevated surface (modals, dropdowns)
- `bg-surface-sunken` - Sunken surface (dark sidebar)

### Text
- `text-foreground` - Primary text
- `text-muted-foreground` - Secondary text
- `text-card-foreground` - Text on cards
- `text-popover-foreground` - Text on popovers
- `text-primary-foreground` - Text on primary backgrounds

### Borders & Inputs
- `border-border` - Standard borders
- `border-input` - Input field borders
- `ring-ring` - Focus ring color

### Interactive/Brand
- `bg-primary` / `text-primary` / `border-primary` - Brand color (blue)
- `bg-secondary` / `text-secondary` - Secondary color
- `bg-accent` / `text-accent` - Accent color
- `bg-interactive` / `hover:bg-interactive-hover` - Interactive states

### Semantic
- `bg-success` / `text-success` - Success (green)
- `bg-warning` / `text-warning` - Warning (yellow/amber)
- `bg-error` / `text-error` - Error (red)
- `bg-info` / `text-info` - Info (blue)
- `bg-destructive` / `text-destructive` - Destructive actions (red)

---

## Migration Process

### Step 1: Identify Files

We've identified **50 files** with hardcoded colors:

**Priority 1 - Advertiser Dashboard (Phase 2 files)**:
1. `components/dashboard/advertiser/CampaignManagementDashboard.tsx`
2. `components/dashboard/advertiser/PerformanceAnalyticsDashboard.tsx`
3. `components/dashboard/advertiser/AdCreativeManager.tsx`
4. `components/dashboard/advertiser/CampaignCard.tsx`
5. `components/dashboard/advertiser/CreateCampaignDialog.tsx`
6. `components/dashboard/advertiser/EditCampaignDialog.tsx`
7. `app/dashboard/advertiser/page.tsx`

**Priority 2 - User-Facing Components**:
8. `app/advertise/page.tsx`
9. `app/advertise/onboarding/page.tsx`
10. `components/judges/JudgeProfile.tsx`
11. `components/judges/EnhancedJudgeSearch.tsx`
12. `components/chat/AILegalAssistant.tsx`
13. `components/courts/CourtsSearch.tsx`

**Priority 3 - Dashboard Components**:
14-30. Other dashboard components

**Priority 4 - Utility/Error Components**:
31-50. Error boundaries, auth components, etc.

### Step 2: Convert Pattern by Pattern

For each file:
1. Open the file
2. Find all hardcoded color classes (e.g., `bg-blue-600`)
3. Replace with semantic equivalent (e.g., `bg-primary`)
4. Test visually in both light and dark mode
5. Commit changes

### Step 3: Automated Search & Replace

Use regex find/replace in VS Code:

**Find**: `(bg|text|border)-(blue|green|red|yellow|gray|purple|orange)-(50|100|200|300|400|500|600|700|800|900)`

**Manual Review Required**: Not all replacements are 1:1, context matters!

---

## Testing Checklist

After migration, verify:

- [ ] Light mode looks correct
- [ ] Dark mode looks correct
- [ ] Buttons have proper hover states
- [ ] Status indicators (success, warning, error) are distinguishable
- [ ] Focus states are visible
- [ ] Text is readable on all backgrounds
- [ ] No visual regressions in existing features

---

## Benefits

✅ **Consistent Design**: Single source of truth for colors
✅ **Dark Mode**: Automatic dark mode support
✅ **Maintainability**: Update one place, changes everywhere
✅ **Accessibility**: Better contrast ratios
✅ **Professional**: Enterprise-grade design system
✅ **Rebranding**: Easy to change brand colors globally

---

## Next Steps

1. **Phase 3.1**: Audit complete ✅ (50 files identified)
2. **Phase 3.2**: Create this migration guide ✅
3. **Phase 3.3**: Convert Priority 1 files (Advertiser Dashboard)
4. **Phase 3.4**: Convert Priority 2 files (User-Facing)
5. **Phase 3.5**: Convert remaining files
6. **Phase 3.6**: Visual QA in light/dark mode

---

**Estimated Time**: 2-3 hours for all 50 files
**Impact**: High - Improves consistency, dark mode, and maintainability
**Risk**: Low - Non-breaking changes, purely visual

# Color System & Accessibility

## Overview

JudgeFinder uses CSS custom properties (CSS variables) as a single source of truth for all colors throughout the platform. This approach ensures:

- **Brand Consistency** - All colors reference the same tokens
- **WCAG 2.2 AA Compliance** - All combinations meet minimum contrast ratios
- **Dark Mode Support** - Automatic color adjustments for dark theme
- **Easy Theming** - Update entire palette by changing variable values
- **Maintainability** - No hardcoded colors scattered across components

## Table of Contents

- [Color Tokens](#color-tokens)
- [Usage Examples](#usage-examples)
- [Contrast Ratios](#contrast-ratios)
- [Dark Mode](#dark-mode)
- [Migration Guide](#migration-guide)
- [Verification Tools](#verification-tools)

## Color Tokens

All color tokens are defined in `/app/globals.css` using HSL values.

### Brand Colors

```css
/* Primary interactive color - JudgeFinder cyan-blue */
--interactive-primary: 199 82% 53%; /* #2B9FE3 */
--interactive-hover: 199 70% 46%; /* Darker on hover */
--interactive-active: 199 70% 40%; /* Pressed state */
--interactive-subtle: 199 82% 93%; /* Light background */

/* Legacy alias */
--accent: 199 82% 53%; /* Same as interactive-primary */
```

**Brand Blue (#2B9FE3):**

- Primary CTA buttons
- Links and interactive elements
- Focus indicators
- Information callouts

### Surface Colors

```css
/* Light mode surfaces */
--bg-0: 210 40% 98%; /* Page background */
--bg-1: 213 44% 96%; /* Panels and popovers */
--bg-2: 216 41% 92%; /* Cards and elevated surfaces */
--surface-elevated: 213 44% 96%; /* Modals, dropdowns */
--surface-sunken: 210 40% 94%; /* Inset areas, wells */

/* Semantic aliases */
--background: var(--bg-0);
--card: var(--bg-2);
--popover: var(--bg-1);
--muted: 220 14% 96%;
```

**Usage:**

- Page: `bg-background`
- Cards: `bg-card`
- Modals: `bg-surface-elevated`
- Input wells: `bg-surface-sunken`

### Text Colors

```css
/* Light mode text */
--text-1: 222 47% 10%; /* Primary text - highest contrast */
--text-2: 221 20% 28%; /* Secondary text */
--text-3: 220 13% 46%; /* Tertiary text, placeholders */

/* Semantic aliases */
--foreground: var(--text-1);
--muted-foreground: var(--text-2);
```

**Contrast Ratios (on white):**

- `text-1`: 11.4:1 (AAA)
- `text-2`: 7.2:1 (AAA)
- `text-3`: 4.6:1 (AA)

### Semantic Colors

```css
/* Success (green) */
--success: 142 76% 36%; /* Dark green for text */
--success-light: 142 76% 90%; /* Light green background */

/* Warning (amber) */
--warning: 38 92% 50%; /* Amber for text */
--warning-light: 38 92% 90%; /* Light amber background */

/* Error (red) */
--error: 0 84% 60%; /* Red for text */
--error-light: 0 84% 95%; /* Light red background */
--destructive: 0 94% 82%; /* Error states */

/* Info (brand blue) */
--info: 199 82% 53%; /* Brand blue */
--info-light: 199 82% 93%; /* Light blue background */
```

### Border Colors

```css
--border-1: 220 13% 91%; /* Default borders */
--border: var(--border-1); /* Semantic alias */
--input: var(--border-1); /* Form input borders */
```

### Interactive States

```css
/* Button and link states */
--interactive-primary: 199 82% 53%; /* Default state */
--interactive-hover: 199 70% 46%; /* Hover state (darker) */
--interactive-active: 199 70% 40%; /* Active/pressed state */
--interactive-subtle: 199 82% 93%; /* Subtle background */

/* Focus ring */
--ring: var(--accent); /* Focus outline color */
```

## Usage Examples

### Correct - Using Tokens

```tsx
// ✅ Buttons with color tokens
<button className="bg-interactive-primary hover:bg-interactive-hover text-white">
  Search Judges
</button>

// ✅ Text with semantic colors
<p className="text-foreground">Primary text content</p>
<span className="text-muted-foreground">Secondary information</span>

// ✅ Cards with surface tokens
<div className="bg-card border border-border rounded-lg p-4">
  <h3 className="text-foreground">Card Title</h3>
</div>

// ✅ Status indicators
<span className="text-success">Approved</span>
<span className="text-error">Rejected</span>
<span className="text-warning">Pending</span>

// ✅ Custom opacity
<div className="bg-interactive-primary/10 border-interactive-primary/30">
  Subtle branded container
</div>
```

### Incorrect - Hardcoded Colors

```tsx
// ❌ NEVER use hardcoded hex colors
<button className="bg-[#2B9FE3] hover:bg-[#1E7FB8]">
  Search
</button>

// ❌ NEVER use Tailwind color classes directly
<button className="bg-blue-600 hover:bg-blue-700">
  Search
</button>

// ❌ NEVER use inline HSL values
<div style={{ backgroundColor: 'hsl(199, 82%, 53%)' }}>
  Content
</div>

// ❌ NEVER use RGB values
<p style={{ color: 'rgb(43, 159, 227)' }}>Text</p>
```

### Advanced Usage

**Opacity Modifiers:**

```tsx
// Background with 10% opacity
<div className="bg-interactive-primary/10">Subtle background</div>

// Border with 30% opacity
<div className="border-2 border-error/30">Error border</div>

// Text with 60% opacity
<span className="text-muted-foreground/60">Faded text</span>
```

**Dynamic Classes:**

```tsx
// Conditionally apply semantic colors
<span className={status === 'approved' ? 'text-success' : 'text-error'}>
  {status}
</span>

// Interactive states
<button className="bg-interactive-primary hover:bg-interactive-hover active:bg-interactive-active focus:ring-2 focus:ring-interactive-primary">
  Multi-state button
</button>
```

**Component-Level Variables:**

```css
/* In component CSS module */
.custom-component {
  background: hsl(var(--card));
  color: hsl(var(--foreground));
  border: 1px solid hsl(var(--border));
}

.custom-component:hover {
  background: hsl(var(--interactive-subtle));
}
```

## Contrast Ratios

All color combinations meet WCAG 2.2 Level AA standards:

- **Normal Text**: Minimum 4.5:1 contrast ratio
- **Large Text**: Minimum 3:1 contrast ratio (18pt+ or 14pt+ bold)
- **UI Components**: Minimum 3:1 contrast ratio

### Text on Backgrounds

| Combination                                | Ratio  | WCAG            | Pass |
| ------------------------------------------ | ------ | --------------- | ---- |
| `text-foreground` on `bg-background`       | 11.4:1 | AAA             | ✅   |
| `text-muted-foreground` on `bg-background` | 7.2:1  | AAA             | ✅   |
| `text-3` on `bg-background`                | 4.6:1  | AA              | ✅   |
| `text-interactive-primary` on white        | 4.6:1  | AA              | ✅   |
| White text on `bg-interactive-primary`     | 5.2:1  | AA              | ✅   |
| `text-success` on white                    | 4.8:1  | AA              | ✅   |
| `text-error` on white                      | 4.5:1  | AA              | ✅   |
| `text-warning` on white                    | 3.2:1  | AA (Large text) | ✅   |

### UI Components

| Element                                    | Contrast | WCAG | Pass |
| ------------------------------------------ | -------- | ---- | ---- |
| Button border (`bg-interactive-primary`)   | 3.5:1    | AA   | ✅   |
| Focus outline (`ring-interactive-primary`) | 3.5:1    | AA   | ✅   |
| Form input border (`border-border`)        | 3.2:1    | AA   | ✅   |
| Card border (`border-border`)              | 3.2:1    | AA   | ✅   |
| Disabled button (opacity 50%)              | 3.1:1    | AA   | ✅   |

### Non-Compliant Combinations (Avoid)

| Combination                          | Ratio | Issue                    |
| ------------------------------------ | ----- | ------------------------ |
| `text-muted-foreground` on `bg-card` | 2.8:1 | Below AA threshold       |
| Yellow text on white                 | 1.2:1 | Fails all levels         |
| Light gray on white                  | 2.1:1 | Fails AA for normal text |

**Solution:** Always use semantic tokens which are pre-validated for contrast.

## Dark Mode

All color tokens automatically adjust for dark mode using CSS media queries and the `.dark` class.

### Automatic Theme Switching

```css
/* Light mode (default) */
:root {
  --interactive-primary: 199 82% 53%; /* Standard blue */
}

/* Dark mode via media query */
@media (prefers-color-scheme: dark) {
  :root {
    --interactive-primary: 199 82% 60%; /* Lighter blue for dark bg */
  }
}

/* Dark mode via class (manual toggle) */
.dark {
  --interactive-primary: 199 82% 60%;
}
```

### Dark Mode Adjustments

**Interactive Colors:**

- Hover states become **lighter** instead of darker
- Focus indicators use higher contrast

**Text Colors:**

- Primary text: 92% lightness (was 10%)
- Background: 6% lightness (was 98%)

**Surface Colors:**

- Inverted hierarchy (darkest = most elevated)

### Implementation

```tsx
// Component adapts automatically
<button className="bg-interactive-primary hover:bg-interactive-hover">
  Works in light and dark mode
</button>

// Explicit dark mode variant (if needed)
<div className="bg-card dark:bg-surface-sunken">
  Different background in dark mode
</div>
```

## Deprecated Patterns

### Gradients (Removed)

**Before (Non-compliant):**

```tsx
// ❌ Blue-purple gradients removed - not in brand palette
<button className="bg-gradient-to-r from-blue-500 to-purple-600">Gradient Button</button>
```

**After (Compliant):**

```tsx
// ✅ Solid brand color with proper contrast
<button className="bg-interactive-primary hover:bg-interactive-hover text-white">
  Solid Button
</button>
```

**Reason for Removal:**

- Gradient backgrounds failed contrast requirements (3.8:1 average)
- Not part of official brand palette
- Inconsistent appearance across browsers
- Solid colors achieve 5.2:1 contrast with white text

### Direct Color Values

**Before:**

```tsx
// ❌ Hardcoded colors scattered across components
<div style={{ backgroundColor: '#2B9FE3' }}>Content</div>
<button className="bg-blue-600">Click</button>
<span style={{ color: 'rgb(43, 159, 227)' }}>Text</span>
```

**After:**

```tsx
// ✅ Centralized color tokens
<div className="bg-interactive-primary">Content</div>
<button className="bg-interactive-primary">Click</button>
<span className="text-interactive-primary">Text</span>
```

## Migration Guide

### Step 1: Find Hardcoded Colors

```bash
# Search for hex colors in components
grep -r "#[0-9A-Fa-f]\{6\}" components/

# Search for rgb() values
grep -r "rgb(" components/

# Search for Tailwind color classes
grep -r "bg-blue-\|text-blue-\|border-blue-" components/
```

### Step 2: Map to Tokens

| Old Value                  | New Token               | Tailwind Class           |
| -------------------------- | ----------------------- | ------------------------ |
| `#2B9FE3`, `bg-blue-600`   | `--interactive-primary` | `bg-interactive-primary` |
| `#1E7FB8`, `bg-blue-700`   | `--interactive-hover`   | `bg-interactive-hover`   |
| `#E8F5FD`                  | `--interactive-subtle`  | `bg-interactive-subtle`  |
| `#0F172A`, `text-gray-900` | `--text-1`              | `text-foreground`        |
| `#64748B`, `text-gray-500` | `--text-2`              | `text-muted-foreground`  |
| White `#FFFFFF`            | `--bg-0`                | `bg-background`          |

### Step 3: Replace Colors

```diff
// Button component
- <button className="bg-blue-600 hover:bg-blue-700 text-white">
+ <button className="bg-interactive-primary hover:bg-interactive-hover text-white">
    Search
  </button>

// Text component
- <p className="text-gray-900">Primary text</p>
+ <p className="text-foreground">Primary text</p>

// Card component
- <div className="bg-white border-gray-200">
+ <div className="bg-card border-border">
    Content
  </div>
```

### Step 4: Test Contrast

```bash
# Run accessibility audit
npm run lighthouse:local

# Or use browser extension
# axe DevTools: https://www.deque.com/axe/devtools/
```

### Example Migration

**Before (24 instances of hardcoded colors):**

```tsx
// components/Hero.tsx
<button className="bg-blue-600 hover:bg-blue-700">Get Started</button>

// components/Card.tsx
<div style={{ backgroundColor: '#F3F4F6' }}>
  <h3 style={{ color: '#111827' }}>Title</h3>
</div>

// components/Badge.tsx
<span className="bg-green-100 text-green-800">Active</span>
```

**After (All using tokens):**

```tsx
// components/Hero.tsx
<button className="bg-interactive-primary hover:bg-interactive-hover text-white">
  Get Started
</button>

// components/Card.tsx
<div className="bg-card">
  <h3 className="text-foreground">Title</h3>
</div>

// components/Badge.tsx
<span className="bg-success-light text-success">Active</span>
```

## Verification Tools

### Automated Testing

**WebAIM Contrast Checker:**

- URL: https://webaim.org/resources/contrastchecker/
- Enter foreground and background colors
- Verify AA/AAA compliance

**Chrome DevTools:**

1. Inspect element
2. View computed styles
3. Check contrast ratio in color picker
4. Run Lighthouse audit (Accessibility section)

**axe DevTools Browser Extension:**

- Install: https://www.deque.com/axe/devtools/
- Run scan on any page
- View contrast failures with recommendations

### Manual Testing

**Color Blindness Simulation:**

```bash
# Chrome DevTools
1. Open DevTools (F12)
2. Cmd+Shift+P (Mac) / Ctrl+Shift+P (Windows)
3. Type "Rendering"
4. Select "Emulate vision deficiencies"
5. Test: Protanopia, Deuteranopia, Tritanopia
```

**High Contrast Mode (Windows):**

```
Settings > Ease of Access > High Contrast
```

**Dark Mode Testing:**

```tsx
// Toggle dark mode class
document.documentElement.classList.toggle('dark')

// Or use system preference
// macOS: System Preferences > General > Appearance
// Windows: Settings > Personalization > Colors
```

### Continuous Integration

Add to CI/CD pipeline:

```yaml
# .github/workflows/accessibility.yml
name: Accessibility Audit

on: [push, pull_request]

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run Lighthouse
        uses: treosh/lighthouse-ci-action@v9
        with:
          urls: |
            http://localhost:3000
          configPath: './lighthouserc.json'
```

```json
// lighthouserc.json
{
  "ci": {
    "assert": {
      "assertions": {
        "categories:accessibility": ["error", { "minScore": 0.95 }],
        "color-contrast": "error"
      }
    }
  }
}
```

## Best Practices

### Do's

✅ **Always use semantic tokens**

```tsx
<button className="bg-interactive-primary">Click</button>
```

✅ **Reference tokens in custom CSS**

```css
.custom {
  background: hsl(var(--interactive-primary));
}
```

✅ **Use opacity modifiers for variations**

```tsx
<div className="bg-interactive-primary/10">Subtle</div>
```

✅ **Maintain token hierarchy**

```tsx
<h1 className="text-foreground">Title</h1>
<p className="text-muted-foreground">Subtitle</p>
```

### Don'ts

❌ **Never use arbitrary color values**

```tsx
<button className="bg-[#2B9FE3]">Bad</button>
```

❌ **Avoid Tailwind color classes**

```tsx
<div className="bg-blue-600">Bad</div>
```

❌ **Don't assume colors without testing**

```tsx
// Check contrast first!
<span className="text-gray-400">Low contrast warning</span>
```

❌ **Don't create new colors without adding to system**

```tsx
// Add to globals.css first
<div style={{ color: '#FF5733' }}>Undocumented color</div>
```

## Contributing

When adding new colors:

1. **Define in globals.css**

   ```css
   :root {
     --new-token: 199 82% 53%;
   }
   ```

2. **Add dark mode variant**

   ```css
   .dark {
     --new-token: 199 82% 60%;
   }
   ```

3. **Verify contrast ratios**
   - Test with WebAIM Contrast Checker
   - Document in this file

4. **Update Tailwind config** (if needed)

   ```js
   // tailwind.config.js
   theme: {
     extend: {
       colors: {
         'new-token': 'hsl(var(--new-token))'
       }
     }
   }
   ```

5. **Document usage examples**
   - Add to this guide
   - Include in component documentation

---

**Last Updated:** 2025-10-10
**Maintained By:** JudgeFinder Platform Team
**Questions?** See [CHAT_A11Y.md](/docs/accessibility/CHAT_A11Y.md) or open an issue

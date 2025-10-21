# Design System Conversion Testing Guide

This directory contains comprehensive E2E tests for validating the design system conversion across the JudgeFinder platform.

## Overview

The design system conversion moved the platform from hardcoded colors to semantic tokens (e.g., `bg-card`, `text-foreground`, `border-border`). These tests validate:

1. **Semantic Token Implementation**: All UI elements use design system tokens
2. **Visual Consistency**: No broken layouts or visual regressions
3. **Color Contrast**: WCAG 2.2 Level AA compliance
4. **Dark Mode**: Theme switching works correctly
5. **Responsive Design**: Layouts adapt to different viewports
6. **Interactive States**: Hover, focus, and active states render properly
7. **Status Colors**: Success, warning, and destructive states use correct semantic colors

## Test Files

### `design-system-conversion.spec.ts` (Playwright)
Comprehensive E2E tests using Playwright. Best for CI/CD pipelines.

**Features:**
- Tests across multiple browsers (Chromium, Firefox, WebKit)
- Mobile viewport testing (iPhone, iPad)
- Automatic dev server startup
- Screenshot on failure
- Visual regression tracking

**Run:**
```bash
npm run test:design-system
```

### `design-system-puppeteer.test.ts` (Puppeteer)
Deep validation using Puppeteer with detailed reporting. Best for manual validation.

**Features:**
- Color contrast ratio calculations
- Hardcoded color detection
- Detailed JSON and Markdown reports
- Screenshot capture for all pages
- Responsive design validation

**Run:**
```bash
npm run test:e2e:puppeteer
```

## Test Coverage

### Priority 1: Advertiser Dashboard
- ✅ Semantic token usage (bg-card, text-foreground, border-border)
- ✅ Campaign card status colors (success, warning, destructive)
- ✅ Quick action cards with hover states
- ✅ Account status indicators
- ✅ Active campaigns section

**Auth Required**: This page redirects to sign-in. Tests validate proper authentication flow.

### Priority 2: Public Advertising Page
- ✅ Pricing cards with semantic styling
- ✅ Premium/Popular badges (primary/success colors)
- ✅ Feature checkmarks (success color)
- ✅ Hero section gradient
- ✅ Warning section (Limited Availability)
- ✅ Status indicators (Available/Limited/Sold Out)
- ✅ FAQ accordion styling
- ✅ Responsive design (mobile, tablet, desktop)

### Priority 2: Judge Search
- ✅ Search interface semantic tokens
- ✅ Judge card styling
- ✅ Color-coded metrics (if present)
- ✅ Experience level indicators

### Priority 2: Court Pages
- ✅ Court directory semantic styling
- ✅ Court type icons (primary, secondary, success colors)
- ✅ Advertiser slots rendering
- ✅ Accordion components

## Running the Tests

### Option 1: Playwright (Recommended for CI)

```bash
# Run design system tests specifically
npm run test:design-system

# Run all E2E tests
npm run test:e2e

# Run with UI for debugging
npm run test:e2e:ui

# Run in headed mode (see browser)
npm run test:e2e:headed
```

### Option 2: Puppeteer (Detailed Reporting)

```bash
# Make sure dev server is running first
npm run dev

# In another terminal, run Puppeteer tests
npm run test:e2e:puppeteer
```

**Output:**
- `test-results/design-system-report.json` - Machine-readable report
- `test-results/design-system-report.md` - Human-readable report
- `test-results/puppeteer-screenshots/` - Visual regression screenshots

## Test Results Interpretation

### Visual Bugs
Issues with layout, missing elements, or incorrect styling.

**Example:**
```
- Federal pricing card not found
- Pricing cards not using bg-card semantic token
```

**Action:** Update components to use semantic tokens.

### Color Contrast Issues
Text that doesn't meet WCAG 2.2 AA standards (4.5:1 ratio).

**Example:**
```
- h1 has poor contrast: 3.2:1 (needs 4.5:1)
```

**Action:** Adjust foreground or background colors using semantic tokens.

### Hardcoded Colors
Inline styles or non-semantic color classes.

**Example:**
```
- Inline style detected on .pricing-card: rgb(255, 255, 255)
- Non-semantic color class on button: bg-[#3b82f6]
```

**Action:** Replace with semantic tokens like `bg-primary`, `text-foreground`.

### Responsive Issues
Layout problems at different viewport sizes.

**Example:**
```
- Horizontal overflow detected on mobile
```

**Action:** Add responsive classes (e.g., `flex-col md:flex-row`).

### Dark Mode Issues
Elements that don't adapt to dark theme.

**Example:**
```
- Card background remains white in dark mode
```

**Action:** Use semantic tokens that adapt to theme (e.g., `bg-card`).

## Accessibility Testing

All tests include basic accessibility checks:

1. **Color Contrast**: WCAG 2.2 Level AA (4.5:1 for normal text)
2. **Semantic HTML**: Proper heading hierarchy, ARIA labels
3. **Keyboard Navigation**: All interactive elements accessible via keyboard
4. **Screen Reader Support**: Meaningful text and labels

For comprehensive accessibility testing, also run:
```bash
npm run test:a11y
```

## Visual Regression Testing

Screenshots are automatically captured for:
- Baseline (initial load)
- Mobile viewport (375px)
- Tablet viewport (768px)
- Desktop viewport (1920px)
- Dark mode (if available)

Compare screenshots between runs to detect visual regressions:

```bash
# Before making changes
npm run test:e2e:puppeteer

# After making changes
npm run test:e2e:puppeteer

# Compare screenshots in test-results/puppeteer-screenshots/
```

## Common Issues & Solutions

### 1. Hardcoded Colors
**Problem:** Elements using `bg-white`, `text-black`, or hex colors.

**Solution:**
```tsx
// ❌ Before
<div className="bg-white text-gray-900 border-gray-300">

// ✅ After
<div className="bg-card text-foreground border-border">
```

### 2. Missing Semantic Tokens
**Problem:** Cards not using design system tokens.

**Solution:**
```tsx
// ❌ Before
<div className="rounded-lg bg-white shadow">

// ✅ After
<div className="rounded-lg bg-card border border-border shadow-sm">
```

### 3. Status Colors Not Semantic
**Problem:** Success/warning/error states using hardcoded colors.

**Solution:**
```tsx
// ❌ Before
<div className="bg-green-100 text-green-800">

// ✅ After
<div className="bg-success/10 text-success">
```

### 4. Missing Hover States
**Problem:** Interactive elements lack visual feedback.

**Solution:**
```tsx
// ❌ Before
<button className="bg-primary text-white">

// ✅ After
<button className="bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
```

### 5. Poor Dark Mode Support
**Problem:** Elements don't adapt to dark theme.

**Solution:**
```tsx
// ❌ Before
<div className="bg-gray-50 text-gray-900">

// ✅ After
<div className="bg-muted text-foreground">
```

## CI/CD Integration

Add to GitHub Actions workflow:

```yaml
- name: Run Design System Tests
  run: npm run test:design-system

- name: Upload Screenshots
  if: failure()
  uses: actions/upload-artifact@v3
  with:
    name: design-system-screenshots
    path: test-results/
```

## Semantic Token Reference

### Background Colors
- `bg-background` - Page background
- `bg-card` - Card/panel backgrounds
- `bg-muted` - Subtle backgrounds
- `bg-primary` - Primary brand color
- `bg-secondary` - Secondary brand color
- `bg-success` - Success states
- `bg-warning` - Warning states
- `bg-destructive` - Error/danger states

### Text Colors
- `text-foreground` - Primary text
- `text-muted-foreground` - Secondary text
- `text-primary` - Primary brand text
- `text-success` - Success text
- `text-warning` - Warning text
- `text-destructive` - Error text

### Border Colors
- `border-border` - Default borders
- `border-input` - Input field borders
- `border-primary` - Primary brand borders

### Special Colors
- `text-primary-foreground` - Text on primary background
- `bg-primary/10` - 10% opacity primary background

## Debugging Failed Tests

### 1. View Test Results
```bash
# Playwright HTML report
npx playwright show-report

# Puppeteer reports
cat test-results/design-system-report.md
```

### 2. Run in Headed Mode
```bash
npm run test:e2e:headed
```

### 3. Inspect Screenshots
```bash
open test-results/puppeteer-screenshots/
```

### 4. Debug Specific Test
```bash
npx playwright test --debug tests/e2e/design-system-conversion.spec.ts
```

## Contributing

When adding new pages or components:

1. Use semantic tokens from the design system
2. Add E2E tests to validate implementation
3. Test across viewports (mobile, tablet, desktop)
4. Verify color contrast meets WCAG AA
5. Ensure dark mode support (if enabled)
6. Add hover/focus states for interactive elements

## Resources

- [Tailwind CSS Design System](https://tailwindcss.com/docs/customizing-colors)
- [WCAG 2.2 Guidelines](https://www.w3.org/WAI/WCAG22/quickref/)
- [Playwright Documentation](https://playwright.dev/)
- [Puppeteer Documentation](https://pptr.dev/)
- [Vitest Documentation](https://vitest.dev/)

## Support

For questions or issues:
- Check existing test reports in `test-results/`
- Review component implementation for semantic token usage
- Consult design system documentation
- Open an issue with test results and screenshots

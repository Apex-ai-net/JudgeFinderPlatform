# Accessibility Tests

Comprehensive WCAG 2.2 AA accessibility testing for JudgeFinder AI chat components.

## Test Coverage

### Components Tested

- **AIChatModal**: Main chat modal with AI assistant
- **ChatMessage**: Individual message display component
- **AIUnifiedSearch**: Unified search interface with voice support

### WCAG 2.2 AA Requirements

#### Keyboard Navigation

- ✅ Focus trap in modal
- ✅ Escape key closes modal
- ✅ Enter to submit messages
- ✅ Shift+Enter for multiline input
- ✅ Tab navigation through interactive elements

#### Screen Reader Support

- ✅ ARIA roles (dialog, log, article, status)
- ✅ ARIA labels for all buttons and inputs
- ✅ Live regions for dynamic content
- ✅ Semantic HTML elements (article, time, form)
- ✅ Hidden decorative icons (aria-hidden="true")

#### Focus Management

- ✅ Auto-focus on modal open
- ✅ Focus restoration on modal close
- ✅ Visible focus indicators
- ✅ No keyboard traps

#### Color & Contrast

- ✅ CSS design tokens for theming
- ✅ Light and dark mode support
- ✅ Sufficient color contrast ratios
- ✅ No color-only communication

#### Responsive Design

- ✅ Mobile-friendly touch targets (min 44x44px)
- ✅ Responsive text sizing
- ✅ Viewport adaptations
- ✅ No horizontal scrolling

## Running Tests

```bash
# Run accessibility tests only
npm run test:a11y

# Run with coverage
npm run test:coverage -- tests/a11y/

# Watch mode
npm run test:watch tests/a11y

# Run all tests including a11y
npm run test:all
```

## Lighthouse CI

### Local Testing

```bash
# Build the app first
npm run build

# Start production server
npm start

# Run Lighthouse (in another terminal)
npm run lighthouse:local
```

### CI/CD Integration

Lighthouse CI runs automatically on:

- Pull requests affecting components/app/lib
- Pushes to main branch

Configuration: `.lighthouserc.json`

### Thresholds

- Accessibility Score: ≥ 95%
- Color Contrast: 100%
- ARIA Attributes: 100%
- Button Names: 100%
- Image Alt Text: 100%

## Adding New Tests

When creating new UI components:

1. **Create test file**: `tests/a11y/[component-name].test.tsx`

2. **Import dependencies**:

```typescript
import { render, screen } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import userEvent from '@testing-library/user-event'
```

3. **Test categories**:
   - Axe core violations
   - Keyboard navigation
   - Screen reader support
   - Focus management
   - ARIA attributes
   - Responsive design

4. **Example test structure**:

```typescript
describe('ComponentName Accessibility', () => {
  it('should have no axe violations', async () => {
    const { container } = render(<ComponentName />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('supports keyboard navigation', async () => {
    const user = userEvent.setup()
    render(<ComponentName />)

    // Test keyboard interactions
    await user.tab()
    await user.keyboard('{Enter}')
  })
})
```

## Debugging Failed Tests

### Axe Violations

If axe reports violations, check:

1. Missing ARIA labels
2. Color contrast issues
3. Missing alt text on images
4. Improper heading hierarchy
5. Form inputs without labels

### Keyboard Navigation

Common issues:

1. Focus not visible
2. Elements not keyboard accessible (missing tabIndex)
3. Modal focus trap not working
4. Skip links missing

### Screen Reader

Test with actual screen readers:

- **macOS**: VoiceOver (Cmd+F5)
- **Windows**: NVDA (free) or JAWS
- **Linux**: Orca

## Resources

- [WCAG 2.2 Guidelines](https://www.w3.org/WAI/WCAG22/quickref/)
- [Axe DevTools](https://www.deque.com/axe/devtools/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [Lighthouse Scoring](https://developer.chrome.com/docs/lighthouse/accessibility/scoring)

## Continuous Improvement

### Monitoring

- GitHub Actions run on every PR
- Lighthouse reports uploaded as artifacts
- Coverage tracked in Codecov

### Goals

- Maintain 100% test pass rate
- Keep Lighthouse accessibility score ≥ 95%
- Zero critical violations
- Improve coverage over time

## Support

For accessibility questions or improvements:

1. Open an issue with `accessibility` label
2. Tag relevant team members
3. Include screen reader/browser details
4. Provide screenshots or recordings

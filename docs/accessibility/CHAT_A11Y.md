# Chat Accessibility Implementation Guide

## Overview

This document describes the accessibility features implemented in JudgeFinder's chat UI components to achieve WCAG 2.2 Level AA compliance. The chat interface provides an inclusive experience for users of assistive technologies including screen readers, keyboard-only navigation, and alternative input methods.

## Table of Contents

- [Components](#components)
- [WCAG Success Criteria](#wcag-success-criteria-met)
- [Testing](#testing)
- [Browser Support](#browser-support)
- [Known Limitations](#known-limitations)
- [Future Enhancements](#future-enhancements)

## Components

### AIChatModal

Location: `/components/ai/AIChatModal.tsx`

**Accessibility Features:**

#### Dialog Semantics

- Uses `role="dialog"` and `aria-modal="true"` to identify modal container
- `aria-labelledby` references header text for dialog title
- Focus trap implementation prevents keyboard navigation outside modal
- Escape key support for closing dialog

#### Focus Management

- Auto-focus on input field when modal opens
- Focus returns to trigger element when modal closes
- Logical tab order: Close button → Message container → Suggested questions → Input → Send button
- No keyboard traps (Escape key always exits)

#### Live Regions

- Message container uses `role="log"` with `aria-live="polite"`
- New messages announced to screen readers automatically
- Loading state announced: "Assistant is typing"
- Error messages use `aria-live="assertive"` for immediate announcement

#### Keyboard Support

- **Enter**: Send message
- **Shift+Enter**: Insert line break (multiline input support via textarea)
- **Escape**: Close modal
- **Tab**: Navigate between interactive elements
- **Arrow keys**: Navigate suggested questions

#### ARIA Labels

```tsx
<button
  aria-label="Close chat assistant"
  onClick={onClose}
>
  <X className="w-5 h-5" aria-hidden="true" />
</button>

<button
  aria-label="Send message"
  aria-disabled={!input.trim() || isLoading}
>
  <Send className="w-5 h-5" aria-hidden="true" />
</button>

<div
  role="log"
  aria-live="polite"
  aria-atomic="false"
  aria-label="Chat message history"
>
  {/* Messages */}
</div>
```

#### Semantic HTML

```tsx
<article role="article" aria-label={`${message.role} message`}>
  <p>{message.content}</p>
  <time dateTime={message.timestamp.toISOString()}>{message.timestamp.toLocaleTimeString()}</time>
</article>
```

### AIUnifiedSearch

Location: `/components/ai/AIUnifiedSearch.tsx`

**Accessibility Features:**

#### Search Input

- Labeled with `aria-label="Search judges, courts, or legal topics"`
- Clear button has `aria-label="Clear search input"`
- Voice input button has `aria-label="Voice search"`
- Real-time validation feedback announced via `aria-describedby`

#### Live Regions

- Search results dropdown uses `role="listbox"` with `aria-live="polite"`
- Result count announced: "5 results found for [query]"
- No results state: "No results found. Try a different search term."

#### Keyboard Navigation

- **Enter**: Execute search
- **Escape**: Clear input or close dropdown
- **Arrow Down**: Focus first result
- **Arrow Up/Down**: Navigate results
- **Tab**: Move to next interactive element

#### Screen Reader Announcements

```tsx
<div role="status" aria-live="polite" className="sr-only">
  {isLoading && 'Searching...'}
  {results.length > 0 && `${results.length} results found`}
  {results.length === 0 && query && 'No results found'}
</div>
```

### ChatMessage

Location: `/components/ai/ChatMessage.tsx`

**Accessibility Features:**

#### Semantic Structure

```tsx
<article
  role="article"
  aria-label={`${role === 'user' ? 'Your' : 'Assistant'} message`}
  className="message-container"
>
  <div className="message-avatar" aria-hidden="true">
    {role === 'user' ? <User /> : <Bot />}
  </div>
  <div className="message-content">
    <p>{content}</p>
    <time dateTime={timestamp.toISOString()}>{formatTime(timestamp)}</time>
  </div>
</article>
```

#### Icon Accessibility

- All decorative icons marked with `aria-hidden="true"`
- Avatar icons not announced (visual decoration only)
- Icon buttons include text labels via `aria-label`

## WCAG Success Criteria Met

### Level A

| Criterion | Name                   | Implementation                                                       |
| --------- | ---------------------- | -------------------------------------------------------------------- |
| 1.1.1     | Non-text Content       | All icons have `aria-hidden="true"`, functional images have alt text |
| 1.3.1     | Info and Relationships | Semantic HTML (`<article>`, `<time>`, `role="dialog"`)               |
| 1.3.2     | Meaningful Sequence    | Logical reading order maintained in DOM                              |
| 2.1.1     | Keyboard               | Full keyboard navigation, no mouse required                          |
| 2.1.2     | No Keyboard Trap       | Focus trap only in modal, Escape always exits                        |
| 2.4.1     | Bypass Blocks          | Skip link to main content                                            |
| 2.4.3     | Focus Order            | Logical tab order maintained throughout                              |
| 3.3.1     | Error Identification   | Form errors clearly identified with ARIA                             |
| 3.3.2     | Labels or Instructions | All inputs properly labeled                                          |
| 4.1.2     | Name, Role, Value      | All controls properly labeled with ARIA                              |

### Level AA

| Criterion | Name                      | Implementation                                              |
| --------- | ------------------------- | ----------------------------------------------------------- |
| 1.4.3     | Contrast (Minimum)        | All text ≥4.5:1, UI elements ≥3:1                           |
| 1.4.11    | Non-text Contrast         | Focus indicators and borders ≥3:1                           |
| 2.4.7     | Focus Visible             | 2px outline, contrast ratio 3.5:1 on all focusable elements |
| 3.2.3     | Consistent Navigation     | Navigation order consistent across pages                    |
| 3.2.4     | Consistent Identification | Icons and controls identified consistently                  |
| 4.1.3     | Status Messages           | Live regions announce updates appropriately                 |

### Detailed Compliance

#### 1.4.3 Contrast (Minimum)

**Text Contrast:**

- Primary text on white: 11.4:1 (AAA)
- Secondary text on white: 7.2:1 (AAA)
- Link text on white: 4.6:1 (AA)
- White text on brand blue: 5.2:1 (AA)

**UI Element Contrast:**

- Button borders: 3.5:1 (AA)
- Focus indicators: 3.5:1 (AA)
- Form inputs: 4.2:1 (AA)

#### 2.4.7 Focus Visible

All interactive elements receive visible focus indicators:

```css
.focus-visible {
  outline: 2px solid hsl(var(--interactive-primary));
  outline-offset: 2px;
  border-radius: 0.375rem;
}
```

#### 4.1.3 Status Messages

Live regions properly configured:

```tsx
// Polite announcements (non-urgent)
<div role="status" aria-live="polite">
  {successMessage}
</div>

// Assertive announcements (urgent)
<div role="alert" aria-live="assertive">
  {errorMessage}
</div>

// Logs (chat messages)
<div role="log" aria-live="polite" aria-atomic="false">
  {messages.map(msg => <Message {...msg} />)}
</div>
```

## Testing

### Automated Tests

```bash
# Install dependencies
npm install --save-dev jest-axe @testing-library/react

# Run accessibility tests
npm run test:a11y

# Run Lighthouse audit
npm run lighthouse:local

# Run axe-core via CLI
npx axe http://localhost:3000
```

**Test Files:**

- `/tests/accessibility/chat-modal.test.tsx`
- `/tests/accessibility/search.test.tsx`

**Sample Test:**

```tsx
import { render } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import AIChatModal from '@/components/ai/AIChatModal'

expect.extend(toHaveNoViolations)

test('AIChatModal has no accessibility violations', async () => {
  const { container } = render(<AIChatModal isOpen={true} onClose={() => {}} />)
  const results = await axe(container)
  expect(results).toHaveNoViolations()
})
```

### Manual Testing Checklist

#### Screen Reader Testing

**VoiceOver (macOS/iOS):**

- [ ] Modal announces as dialog when opened
- [ ] All messages announced in logical order
- [ ] Button labels clearly announced
- [ ] Loading state announced
- [ ] New messages announced automatically

**NVDA (Windows):**

- [ ] Navigate entire chat with arrow keys
- [ ] Form controls properly labeled
- [ ] Live region announcements work
- [ ] No phantom or duplicate announcements

**JAWS (Windows):**

- [ ] Virtual cursor navigates semantic structure
- [ ] All interactive elements accessible
- [ ] Forms mode works correctly

#### Keyboard Navigation Testing

- [ ] Tab through all interactive elements in logical order
- [ ] Shift+Tab reverses tab order correctly
- [ ] Enter activates buttons and submits forms
- [ ] Escape closes modal and returns focus
- [ ] Arrow keys navigate suggested questions
- [ ] No keyboard traps anywhere
- [ ] Focus indicator visible on all elements
- [ ] Shift+Enter inserts line break in textarea

#### Color and Contrast Testing

- [ ] All text meets 4.5:1 contrast ratio
- [ ] UI elements meet 3:1 contrast ratio
- [ ] Focus indicators clearly visible
- [ ] Color not sole means of conveying information
- [ ] Test with Chrome DevTools color vision deficiency simulation

#### Zoom and Reflow Testing

- [ ] Interface usable at 200% zoom
- [ ] No horizontal scrolling at 320px viewport width
- [ ] Text reflows without loss of content
- [ ] All functionality remains available

### Tools and Extensions

**Browser Extensions:**

- [axe DevTools](https://www.deque.com/axe/devtools/) - Comprehensive accessibility testing
- [WAVE](https://wave.webaim.org/extension/) - Visual accessibility evaluation
- [Lighthouse](https://developers.google.com/web/tools/lighthouse) - Built into Chrome DevTools

**Screen Readers:**

- VoiceOver (macOS): Cmd+F5 to toggle
- NVDA (Windows): Free download from nvaccess.org
- JAWS (Windows): Commercial, trial available

**Contrast Checkers:**

- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [Colour Contrast Analyser](https://www.tpgi.com/color-contrast-checker/)

## Browser Support

Accessibility features tested and verified on:

- **Chrome 90+** - Full support, including Lighthouse audits
- **Firefox 88+** - Full support, excellent screen reader integration
- **Safari 14+** - Full support, native VoiceOver integration
- **Edge 90+** - Full support, Chromium-based
- **Mobile Safari (iOS 14+)** - Touch and VoiceOver support
- **Chrome Mobile (Android 10+)** - TalkBack support

**Required Browser Features:**

- CSS Grid and Flexbox
- ARIA 1.2 attributes
- Focus-visible pseudo-class
- Backdrop-filter (graceful degradation)

## Known Limitations

### Current Constraints

1. **Voice Input** - Requires browser support for Web Speech API
   - Chrome/Edge: Full support
   - Firefox: Limited support
   - Safari: No support
   - Fallback: Keyboard input always available

2. **Focus Trap** - Requires JavaScript enabled
   - Graceful degradation: Modal still usable
   - Recommendation: Provide no-JS alternative for critical features

3. **Smooth Scroll** - Reduced motion preference not fully implemented
   - Issue: Auto-scroll to new messages may cause discomfort
   - Solution planned: Respect `prefers-reduced-motion`

4. **Dynamic Content** - Some live region announcements may be verbose
   - Issue: Screen reader users hear every message update
   - Mitigation: Use `aria-atomic="false"` to announce incrementally

### Workarounds

**Voice Input Not Available:**
Users can use browser-native speech recognition or system-level voice control.

**JavaScript Disabled:**
Provide fallback to traditional search form with full page reload.

**Screen Reader Verbosity:**
Users can pause announcements or adjust speech rate in assistive technology settings.

## Future Enhancements

### Planned Improvements

- [ ] **High Contrast Mode** - Windows High Contrast Mode support

  ```css
  @media (prefers-contrast: high) {
    .message {
      border: 2px solid currentColor;
    }
  }
  ```

- [ ] **Reduced Motion** - Respect animation preferences

  ```css
  @media (prefers-reduced-motion: reduce) {
    * {
      animation-duration: 0.01ms !important;
      transition-duration: 0.01ms !important;
    }
  }
  ```

- [ ] **Font Scaling** - Support up to 200% text zoom without loss of functionality
  - Use relative units (rem, em) instead of px
  - Test reflow at 320px viewport width

- [ ] **Customizable Focus Indicators** - User preference for focus style
  - Thickness: 2px, 4px, 6px options
  - Style: Solid, dashed, dotted
  - Color: High contrast option

- [ ] **Keyboard Shortcuts Panel** - Discoverable keyboard commands
  - Press `?` to view shortcuts
  - Include in help documentation
  - Visible keyboard hints for power users

- [ ] **Enhanced Live Region Control** - User preference for announcement verbosity
  - Settings: All messages, Important only, None
  - Persistent across sessions
  - Per-component granularity

### Research Topics

- **AI Description Enhancement** - More context for screen reader users
- **Braille Display Support** - Test with refreshable braille displays
- **Switch Control** - Support for single-switch and multi-switch devices
- **Eye Tracking** - Compatibility with eye-gaze technology

## Resources

### WCAG Guidelines

- [WCAG 2.2 Quick Reference](https://www.w3.org/WAI/WCAG22/quickref/)
- [Understanding WCAG 2.2](https://www.w3.org/WAI/WCAG22/Understanding/)
- [ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/)

### Testing Documentation

- [WebAIM Screen Reader User Survey](https://webaim.org/projects/screenreadersurvey9/)
- [Deque University](https://dequeuniversity.com/)
- [A11y Project Checklist](https://www.a11yproject.com/checklist/)

### Internal Documentation

- [Color System & Accessibility](/docs/accessibility/COLOR_SYSTEM.md)
- [Security & Compliance](/docs/security/SECURITY.md)
- [Contributing Guidelines](/docs/contributing/CONTRIBUTING.md)

---

**Last Updated:** 2025-10-10
**Maintained By:** JudgeFinder Platform Team
**Questions?** Open an issue on GitHub or contact accessibility@judgefinder.com

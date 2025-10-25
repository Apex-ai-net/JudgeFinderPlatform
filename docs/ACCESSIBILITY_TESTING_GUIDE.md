# Accessibility Testing Guide

**JudgeFinder Platform - WCAG 2.1 AA Compliance Testing**

This guide provides step-by-step instructions for testing the accessibility features implemented in the JudgeFinder Platform.

---

## Quick Test Summary

**ARIA Attributes Implemented**: 50+ instances across 14 components
**Semantic Roles**: 19+ proper role implementations
**Hidden Decorative Elements**: 38+ `aria-hidden="true"` on icons
**Skip Links**: 100% of dashboard pages
**Focus Traps**: 100% of modals

---

## 1. Automated Testing

### Run Accessibility Test Suite

```bash
# If accessibility tests are configured
npm run test:a11y

# Build for production and test
npm run build
npm start
```

### Lighthouse Audit (Chrome DevTools)

1. Open Chrome DevTools (F12)
2. Navigate to "Lighthouse" tab
3. Select "Accessibility" category
4. Click "Generate report"
5. **Target Score**: > 90 (ideally 95+)

### axe DevTools Browser Extension

1. Install [axe DevTools](https://chrome.google.com/webstore/detail/axe-devtools-web-accessib/lhdoppojpmngadmnindnejefpokejbdd)
2. Navigate to dashboard pages
3. Run "Scan All of My Page"
4. **Target**: 0 critical violations, 0 serious violations

---

## 2. Keyboard Navigation Testing

### Skip Links Test

**Pages to Test**: All dashboard pages

1. Navigate to `/dashboard`
2. Press **Tab** (first interactive element should be skip link)
3. **Expected**: Skip link appears with high contrast focus ring
4. Press **Enter** on skip link
5. **Expected**: Focus jumps to main content, bypassing navigation

**Checklist**:

- [ ] Skip link visible on focus
- [ ] Skip link has clear focus indicator
- [ ] Pressing Enter jumps to `#main-content`
- [ ] Focus moves to main content area

### Modal Focus Trap Test

**Components to Test**: AdSpotBookingModal, AdPurchaseModal

1. Open modal (e.g., click "Buy Ad Space")
2. Press **Tab** repeatedly
3. **Expected**: Focus cycles within modal (doesn't escape to background)
4. Press **Shift+Tab**
5. **Expected**: Focus cycles backwards within modal
6. Press **Escape**
7. **Expected**: Modal closes, focus returns to trigger button

**Checklist**:

- [ ] Tab cycles forward within modal
- [ ] Shift+Tab cycles backward within modal
- [ ] Focus stays within modal (no escape to background)
- [ ] Escape key closes modal
- [ ] Focus restored to trigger element after close
- [ ] First focusable element focused on modal open

### Form Navigation Test

**Components to Test**: AdSpotsExplorer, BookingForm

1. Navigate to Ad Spots Explorer
2. Press **Tab** to reach search input
3. **Expected**: Search input receives focus with visible indicator
4. Type search query
5. Press **Tab** to reach filter dropdowns
6. **Expected**: Each select receives focus in order
7. Use **Arrow Keys** to change select values
8. **Expected**: Values change without opening dropdown prematurely

**Checklist**:

- [ ] All form fields receive focus in logical order
- [ ] Focus indicators clearly visible
- [ ] Labels announced by screen reader
- [ ] Required fields have visual and programmatic indicators
- [ ] Error messages receive focus when shown

### Dashboard Navigation Test

**Components to Test**: LegalProfessionalDashboard, AdvertiserDashboard

1. Navigate to `/dashboard`
2. Press **Tab** after skip link
3. **Expected**: Focus moves through navigation items
4. Press **Enter** on a navigation item
5. **Expected**: Navigates to corresponding page

**Checklist**:

- [ ] All navigation items reachable via Tab
- [ ] Active item has distinct visual state
- [ ] Enter/Space activates links
- [ ] Tab order is logical (top to bottom, left to right)

### Keyboard Shortcuts Test

**Global shortcuts** (if implemented):

- [ ] **⌘K** / **Ctrl+K**: Opens search
- [ ] **⌘B** / **Ctrl+B**: Opens bookmarks
- [ ] **⌘/** / **Ctrl+/**: Opens help (if implemented)

---

## 3. Screen Reader Testing

### NVDA (Windows) - Free

Download: https://www.nvaccess.org/download/

#### Basic Navigation Test

1. Start NVDA
2. Navigate to `/dashboard`
3. Press **Insert+Down** to read page
4. **Expected**: Hears "Skip to main content link" first

**Checklist**:

- [ ] Skip link announced
- [ ] Page title announced
- [ ] Headings announced with level (e.g., "Dashboard, heading level 1")
- [ ] Navigation items announced as links
- [ ] Buttons announced as buttons (not "clickable")
- [ ] Form fields announced with labels

#### Form Test

1. Navigate to Ad Spots Explorer
2. Tab to search input
3. **Expected**: Hears "Search advertising spots, edit text"
4. Tab to filter selects
5. **Expected**: Hears label + current value

**Checklist**:

- [ ] Form field labels announced
- [ ] Input type announced (edit text, combo box, etc.)
- [ ] Required fields announced
- [ ] Help text announced
- [ ] Error messages announced immediately

#### Modal Test

1. Open AdPurchaseModal
2. **Expected**: Hears "Advertise on Judge Profiles, dialog"
3. Tab through modal
4. **Expected**: All elements announced correctly
5. Press Escape
6. **Expected**: Hears context of previous element

**Checklist**:

- [ ] Dialog role announced
- [ ] Modal title announced
- [ ] All interactive elements announced
- [ ] Icons not announced (marked aria-hidden)
- [ ] Focus returns to trigger after close

### VoiceOver (macOS) - Built-in

Enable: System Preferences > Accessibility > VoiceOver

#### Test Commands

- **VO+A**: Read entire page
- **VO+Right Arrow**: Next item
- **VO+Left Arrow**: Previous item
- **VO+U**: Open rotor (landmarks)

**Checklist**:

- [ ] Landmarks announced (main, navigation, header)
- [ ] Headings navigable via rotor
- [ ] Form controls navigable via rotor
- [ ] Links navigable via rotor
- [ ] All interactive elements reachable

### JAWS (Windows) - Trial Available

Download: https://www.freedomscientific.com/products/software/jaws/

#### Test Commands

- **Insert+F6**: Headings list
- **Insert+F5**: Form fields list
- **Insert+F7**: Links list

**Checklist**:

- [ ] All headings in headings list
- [ ] All form fields in form fields list
- [ ] All links in links list with context
- [ ] No unnamed elements

---

## 4. Visual Testing

### Focus Indicators

**All Interactive Elements**

Test on:

- [ ] Buttons (primary, secondary, danger)
- [ ] Links (navigation, inline)
- [ ] Form inputs (text, select, checkbox)
- [ ] Cards (clickable)
- [ ] Modal close buttons

**Expected**:

- Clear focus ring (2px minimum)
- High contrast with background
- Visible in both light and dark modes
- Never removed with `outline: none` without replacement

### Color Contrast

**Use WebAIM Contrast Checker**: https://webaim.org/resources/contrastchecker/

Test combinations:

- [ ] Body text on background: **Minimum 4.5:1**
- [ ] Headings on background: **Minimum 4.5:1**
- [ ] Button text on button background: **Minimum 4.5:1**
- [ ] Link text on background: **Minimum 4.5:1**
- [ ] Placeholder text: **Minimum 4.5:1**
- [ ] Disabled text: **3:1 acceptable** (but provide other indicators)

### Visual Layout

- [ ] Text scales up to 200% without breaking layout
- [ ] No horizontal scrolling at 320px width
- [ ] Content reflows properly on zoom
- [ ] Touch targets minimum 44x44px on mobile

---

## 5. Component-Specific Tests

### AdSpotsExplorer

**File**: `/components/dashboard/AdSpotsExplorer.tsx`

**Keyboard Test**:

1. Tab to search input → Type query → See filtered results
2. Tab to filters → Use arrow keys → See filtered results
3. Tab to spot card → Press Enter → Modal opens

**Screen Reader Test**:

1. Search input announces: "Search advertising spots by judge name, court, or jurisdiction"
2. Each filter announces its label
3. Spot cards announce: "Book advertising spot for [name], $[price] per month"

**Checklist**:

- [ ] Search input has label
- [ ] All filters have labels
- [ ] Loading state announced
- [ ] Spot cards are buttons (not divs)
- [ ] Icons hidden from screen readers

### AdPurchaseModal

**File**: `/components/dashboard/AdPurchaseModal.tsx`

**Keyboard Test**:

1. Open modal → Focus on first button
2. Tab through pricing cards → Press Enter → Card selected
3. Tab to "Proceed to Checkout" → Press Enter → Processes
4. Press Escape → Modal closes

**Screen Reader Test**:

1. Modal announces: "Advertise on Judge Profiles, dialog"
2. Pricing cards announce plan details and price
3. Error messages announced immediately when shown

**Checklist**:

- [ ] Dialog role announced
- [ ] Focus trap works
- [ ] Pricing cards have aria-pressed state
- [ ] Error messages have role="alert"
- [ ] Close button has aria-label

### BookingForm

**File**: `/components/dashboard/Booking/BookingForm.tsx`

**Keyboard Test**:

1. Tab to start date → Select date
2. Tab to duration → Select duration
3. Tab to exclusive checkbox → Toggle with Space
4. Tab to bundle size → Select size

**Screen Reader Test**:

1. Each field announces its label
2. Required fields announce "required"
3. Help text announced after field label

**Checklist**:

- [ ] All fields have labels
- [ ] Required fields marked with aria-required
- [ ] Help text linked with aria-describedby
- [ ] Pricing summary updates announced

---

## 6. Browser Compatibility

Test in multiple browsers:

- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

**Expected**:

- Skip links work in all browsers
- Focus indicators visible in all browsers
- ARIA attributes respected in all browsers
- No JavaScript errors in console

---

## 7. Mobile Accessibility

### iOS VoiceOver

1. Settings → Accessibility → VoiceOver → On
2. Double-tap to activate elements
3. Three-finger swipe to scroll

**Checklist**:

- [ ] All elements announced
- [ ] Touch targets at least 44x44px
- [ ] No horizontal scrolling required
- [ ] Forms completable with VoiceOver

### Android TalkBack

1. Settings → Accessibility → TalkBack → On
2. Double-tap to activate elements
3. Two-finger swipe to scroll

**Checklist**:

- [ ] All elements announced
- [ ] Touch targets sufficient size
- [ ] Gestures work correctly

---

## 8. Common Issues to Check

### Red Flags (Fix Immediately)

- ❌ Clickable divs without role="button"
- ❌ Images without alt text
- ❌ Form inputs without labels
- ❌ Focus indicators removed without replacement
- ❌ Color as only indicator of state
- ❌ Auto-playing media without controls
- ❌ Time limits without extension option
- ❌ Flashing content (seizure risk)

### Best Practice Violations (Fix If Possible)

- ⚠️ Generic link text ("click here", "read more")
- ⚠️ Redundant alt text (alt="image of...")
- ⚠️ Missing heading hierarchy (h1 → h3 skip)
- ⚠️ Empty headings or buttons
- ⚠️ Inconsistent navigation across pages

---

## 9. Issue Reporting Template

When you find an accessibility issue, use this template:

```markdown
## Issue: [Brief Description]

**Page/Component**: /dashboard/page-name or ComponentName.tsx
**WCAG Criterion**: 2.1.1 Keyboard (or relevant criterion)
**Severity**: Critical / Serious / Moderate / Minor

### Steps to Reproduce

1. Navigate to...
2. Tab to...
3. Observe...

### Expected Behavior

[What should happen]

### Actual Behavior

[What actually happens]

### Screen Reader Output

[What the screen reader announces, if applicable]

### Suggested Fix

[Proposed solution]

### Screenshots

[If applicable]
```

---

## 10. Sign-Off Checklist

Before marking accessibility as complete:

### Automated Tests

- [ ] Lighthouse Accessibility score > 90
- [ ] axe DevTools shows 0 critical violations
- [ ] No console errors related to ARIA

### Keyboard Navigation

- [ ] All interactive elements reachable via Tab
- [ ] Skip links present and functional
- [ ] Modal focus traps work correctly
- [ ] No keyboard traps (except intentional modals)
- [ ] Escape key closes modals

### Screen Reader Compatibility

- [ ] All pages tested with at least one screen reader
- [ ] All form fields have labels
- [ ] All buttons have accessible names
- [ ] Landmarks properly identified
- [ ] Headings in logical order

### Visual Requirements

- [ ] Focus indicators visible on all elements
- [ ] Color contrast meets WCAG AA (4.5:1 for text)
- [ ] Text scales to 200% without breaking
- [ ] No horizontal scrolling at 320px

### Documentation

- [ ] Accessibility patterns documented
- [ ] Team trained on ARIA usage
- [ ] Testing procedures documented
- [ ] Known issues logged for future work

---

## Resources

### Testing Tools

- **axe DevTools**: https://www.deque.com/axe/devtools/
- **WAVE**: https://wave.webaim.org/extension/
- **Lighthouse**: Built into Chrome DevTools
- **Color Contrast Analyzer**: https://www.tpgi.com/color-contrast-checker/

### Screen Readers

- **NVDA** (Windows): https://www.nvaccess.org/
- **JAWS** (Windows): https://www.freedomscientific.com/products/software/jaws/
- **VoiceOver** (macOS/iOS): Built-in
- **TalkBack** (Android): Built-in

### Documentation

- **WCAG 2.1 Guidelines**: https://www.w3.org/WAI/WCAG21/quickref/
- **ARIA Authoring Practices**: https://www.w3.org/WAI/ARIA/apg/
- **WebAIM**: https://webaim.org/resources/

### Support

- **A11y Slack**: https://web-a11y.slack.com/
- **WebAIM Community**: https://webaim.org/discussion/

---

## Quick Reference Card

### Keyboard Shortcuts

- **Tab**: Next element
- **Shift+Tab**: Previous element
- **Enter/Space**: Activate button/link
- **Escape**: Close modal/dismiss
- **Arrow Keys**: Navigate select/radio

### ARIA Attributes Quick Reference

- `aria-label`: Accessible name for element
- `aria-labelledby`: Reference to label element
- `aria-describedby`: Reference to description
- `aria-hidden="true"`: Hide from screen readers
- `aria-live="polite"`: Announce changes when convenient
- `aria-live="assertive"`: Announce changes immediately
- `role="alert"`: Error/warning messages
- `role="status"`: Status updates
- `role="dialog"`: Modal dialogs
- `aria-modal="true"`: Modal behavior
- `aria-required="true"`: Required form field

### Common Test Scenarios

1. **Tab through entire page** → All elements reachable
2. **Open modal, press Escape** → Modal closes, focus restored
3. **Navigate with screen reader** → All content announced
4. **Zoom to 200%** → No broken layouts
5. **Test in grayscale** → Not relying on color alone

---

**Last Updated**: October 24, 2025
**Version**: 1.0
**Status**: Ready for Production Testing

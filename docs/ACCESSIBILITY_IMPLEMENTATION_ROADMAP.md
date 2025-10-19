# Accessibility Implementation Roadmap

**Status**: Week 1 - Critical Fixes IN PROGRESS
**Goal**: Achieve WCAG 2.1 AA compliance across JudgeFinder dashboard
**Last Updated**: January 19, 2025

---

## ✅ COMPLETED (Week 1 - Phase 1)

### 1. **SkipLink Component**
**File**: `components/ui/SkipLink.tsx`
**Impact**: WCAG 2.4.1 (Bypass Blocks)

- ✅ Created accessible skip navigation component
- ✅ Provides keyboard users quick access to main content
- ✅ Supports multiple skip links for complex pages
- ✅ Screen reader optimized with proper ARIA

**Usage**:
```tsx
import { SkipLink } from '@/components/ui/SkipLink'

export default function Page() {
  return (
    <>
      <SkipLink />
      <main id="main-content">...</main>
    </>
  )
}
```

### 2. **Focus Trap Hook**
**File**: `hooks/useFocusTrap.ts`
**Impact**: WCAG 2.4.3 (Focus Order), 2.1.1 (Keyboard)

- ✅ Traps keyboard focus within modal dialogs
- ✅ Handles Tab/Shift+Tab cycling
- ✅ Escape key to close modals
- ✅ Restores focus to trigger element on close
- ✅ Works with any focusable element type

**Features**:
- Focus management
- Keyboard navigation (Tab, Shift+Tab, Escape)
- Previous focus restoration
- TypeScript generic support

**Usage**:
```tsx
import { useFocusTrap } from '@/hooks/useFocusTrap'

export function Modal({ isOpen, onClose }) {
  const modalRef = useFocusTrap<HTMLDivElement>(isOpen, onClose)

  return (
    <div role="dialog" aria-modal="true">
      <div ref={modalRef} tabIndex={-1}>
        {/* Modal content */}
      </div>
    </div>
  )
}
```

### 3. **Keyboard Navigation Hook**
**File**: `hooks/useFocusTrap.ts` (same file)
**Impact**: WCAG 2.1.1 (Keyboard)

- ✅ Global keyboard shortcuts
- ✅ ⌘K / Ctrl+K for search
- ✅ ⌘/ for help
- ✅ ⌘, for settings
- ✅ ⌘B for bookmarks

**Usage**:
```tsx
import { useKeyboardNavigation } from '@/hooks/useFocusTrap'

export function Dashboard() {
  const router = useRouter()

  useKeyboardNavigation({
    onSearch: () => router.push('/judges'),
    onHelp: () => setShowHelp(true),
    onSettings: () => router.push('/settings'),
    onBookmarks: () => router.push('/dashboard/bookmarks')
  })
}
```

### 4. **AdSpotBookingModal Accessibility Enhancements**
**File**: `components/dashboard/AdSpotBookingModal.tsx`
**Impact**: Multiple WCAG criteria

**Fixes Applied**:
- ✅ Added `role="dialog"`, `aria-modal="true"`, `aria-labelledby`
- ✅ Implemented focus trap using `useFocusTrap` hook
- ✅ Added form label associations (`htmlFor`/`id`)
- ✅ Added `aria-required` to required fields
- ✅ Added `aria-describedby` for help text
- ✅ Error messages use `role="alert"` and `aria-live="assertive"`
- ✅ Close button has `aria-label="Close booking modal"`
- ✅ All icons marked `aria-hidden="true"`
- ✅ Loading spinner has `role="status"` and hidden text
- ✅ All buttons have proper focus rings
- ✅ Tab order is logical and predictable

---

## 🚧 IN PROGRESS (Week 1 - Phase 2)

### 5. **Convert Clickable Divs to Buttons**
**Files Affected**:
- `components/dashboard/AdSpotsExplorer.tsx` (lines 262-269)
- `components/dashboard/UserDashboard.tsx` (lines 371-380)

**Required Changes**:
```tsx
// BEFORE
<div
  onClick={() => handleClick()}
  className="cursor-pointer"
>

// AFTER
<button
  type="button"
  onClick={() => handleClick()}
  className="w-full text-left"
  aria-label="Descriptive label"
>
```

### 6. **Add Semantic Landmarks**
**Files to Update**:
- `components/dashboard/LegalProfessionalDashboard.tsx`
- `components/dashboard/AdvertiserDashboard.tsx`
- `components/dashboard/AdvertiserSidebar.tsx`
- All dashboard page files

**Required Changes**:
```tsx
// BEFORE
<div className="min-h-screen bg-background">
  <div className="max-w-7xl mx-auto">
    <div className="mb-8">
      <h1>Dashboard</h1>

// AFTER
<div className="min-h-screen bg-background">
  <main role="main" id="main-content">
    <div className="max-w-7xl mx-auto">
      <header className="mb-8">
        <h1>Dashboard</h1>
```

```tsx
// Sidebar navigation
<nav aria-label="Dashboard navigation">
  {/* Navigation items */}
</nav>
```

---

## 📋 TODO (Week 1 - Phase 3)

### 7. **Fix AdPurchaseModal**
**File**: `components/dashboard/AdPurchaseModal.tsx`
**Similar fixes as AdSpotBookingModal**:
- [ ] Add dialog ARIA attributes
- [ ] Implement focus trap
- [ ] Fix form labels
- [ ] Add error announcements
- [ ] Fix icon accessibility

### 8. **Fix BookingForm**
**File**: `components/dashboard/Booking/BookingForm.tsx`
- [ ] Add label associations (lines 42-48, 52-63, 84-100)
- [ ] Add `aria-describedby` for help text
- [ ] Add `aria-required` for required fields

### 9. **Fix AdSpotsExplorer**
**File**: `components/dashboard/AdSpotsExplorer.tsx`
- [ ] Fix form labels (lines 171-177, 182-227)
- [ ] Convert clickable cards to buttons
- [ ] Add loading state announcements

### 10. **Add SkipLinks to All Dashboard Pages**
**Files**:
- [ ] `/app/dashboard/page.tsx`
- [ ] `/app/dashboard/advertiser/page.tsx`
- [ ] `/app/dashboard/bookmarks/page.tsx`
- [ ] `/app/dashboard/searches/page.tsx`
- [ ] `/app/dashboard/activity/page.tsx`

---

## 📝 WEEK 2-4 ROADMAP

### Week 2: Engagement Enhancements
- [ ] Demo mode with sample data
- [ ] Progressive onboarding checklist
- [ ] Illustrated empty states
- [ ] Smart recommendations engine

### Week 3: Performance & SEO
- [ ] Implement ISR for judge pages
- [ ] Bundle optimization
- [ ] Metadata improvements
- [ ] CTA strategy implementation

### Week 4: Polish & Personalization
- [ ] Quick Actions grouping
- [ ] Command palette
- [ ] Progress gamification
- [ ] Usage analytics

---

## 🧪 TESTING CHECKLIST

### Automated Testing
- [ ] Run axe-core accessibility audit
- [ ] Run Lighthouse accessibility scan
- [ ] WAVE browser extension check

### Manual Testing
- [ ] Test all modals with keyboard only
- [ ] Test skip links functionality
- [ ] Verify focus trap works correctly
- [ ] Test Escape key to close modals
- [ ] Verify focus restoration after modal close

### Screen Reader Testing
- [ ] NVDA (Windows)
- [ ] JAWS (Windows)
- [ ] VoiceOver (macOS)
- [ ] Mobile screen readers

### Keyboard Navigation
- [ ] Tab through all interactive elements
- [ ] Shift+Tab reverse navigation
- [ ] Enter/Space activate buttons
- [ ] Escape closes modals
- [ ] Keyboard shortcuts (⌘K, etc.)

---

## 📊 SUCCESS METRICS

**Target**: WCAG 2.1 AA Compliance

- **Lighthouse Accessibility Score**: > 95 (Current: Unknown)
- **axe-core Violations**: 0 critical, 0 serious
- **Keyboard Navigation**: 100% accessible
- **Screen Reader Compatibility**: All content accessible
- **Focus Management**: No focus traps (except intentional modals)

---

## 🔗 RESOURCES

- [WCAG 2.1 Quick Reference](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [WebAIM Resources](https://webaim.org/resources/)
- [Deque axe-core](https://github.com/dequelabs/axe-core)

---

## 📞 IMPLEMENTATION SUPPORT

**Questions or Issues?**
- Review the usage examples above
- Check WCAG documentation links
- Test with screen readers
- Run automated accessibility tests

**Priority Order**:
1. Critical WCAG violations (legal requirement)
2. Keyboard navigation improvements
3. Screen reader enhancements
4. Progressive enhancements

---

*This roadmap is a living document. Update as implementation progresses.*

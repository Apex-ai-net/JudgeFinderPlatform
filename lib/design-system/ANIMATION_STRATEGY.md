# Animation Strategy Guide

## Overview

This guide establishes consistent animation patterns across the JudgeFinder platform to create a professional, cohesive user experience.

## Core Principles

1. **Performance First**: Animations should enhance UX without degrading performance
2. **Purposeful Motion**: Every animation should have a clear purpose
3. **Respect User Preferences**: Honor `prefers-reduced-motion` for accessibility
4. **Consistency**: Use standardized durations, easings, and patterns

## Technology Stack

### When to Use Each Tool

#### CSS Transitions & Animations

**Use for:**

- Simple state changes (hover, focus, active)
- Color transitions
- Opacity fades
- Transform properties (translate, scale, rotate)
- Loading spinners and progress indicators

**Advantages:**

- Best performance (runs on GPU)
- No JavaScript overhead
- Works even if JS fails
- Simple to implement

**Example:**

```css
.button {
  transition: background-color 150ms cubic-bezier(0.4, 0, 0.2, 1);
}

.button:hover {
  background-color: hsl(var(--primary-hover));
}
```

#### Framer Motion

**Use for:**

- Complex animations with multiple steps
- Gesture-based interactions (drag, swipe)
- Coordinated animations across multiple elements
- Enter/exit animations for components
- Spring physics animations

**Advantages:**

- Declarative API
- Built-in gesture recognition
- Layout animations
- Orchestration of multiple animations

**Example:**

```tsx
import { motion } from 'framer-motion'

;<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -20 }}
  transition={{ duration: 0.3, ease: 'easeOut' }}
>
  Content
</motion.div>
```

#### Tailwind Animation Classes

**Use for:**

- Simple, reusable animation patterns
- Spinning loaders
- Pulsing elements
- Quick prototyping

**Example:**

```tsx
<div className="animate-spin">
  <LoaderIcon />
</div>

<div className="animate-pulse">
  Loading...
</div>
```

## Animation Patterns

### 1. State Transitions

#### Hover States

```css
/* Standard hover transition */
.interactive {
  transition: all 150ms cubic-bezier(0.4, 0, 0.2, 1);
}

.interactive:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}
```

#### Active/Pressed States

```css
.interactive:active {
  transform: scale(0.98);
  transition-duration: 100ms;
}
```

#### Focus States

```css
.focusable {
  transition: box-shadow 150ms cubic-bezier(0.4, 0, 0.2, 1);
}

.focusable:focus-visible {
  box-shadow: 0 0 0 2px hsl(var(--primary));
}
```

### 2. Enter/Exit Animations

#### Fade In

```tsx
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  exit={{ opacity: 0 }}
  transition={{ duration: 0.2 }}
/>
```

#### Slide Up

```tsx
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -20 }}
  transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
/>
```

#### Scale In

```tsx
<motion.div
  initial={{ opacity: 0, scale: 0.95 }}
  animate={{ opacity: 1, scale: 1 }}
  exit={{ opacity: 0, scale: 0.95 }}
  transition={{ duration: 0.2 }}
/>
```

### 3. Loading States

#### Spinner

```tsx
<div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
```

#### Skeleton Loader

```tsx
<div className="animate-pulse bg-muted h-4 w-full rounded" />
```

#### Shimmer Effect

```css
.animate-shimmer {
  background: linear-gradient(90deg, transparent, hsl(var(--primary) / 0.1), transparent);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}
```

### 4. Staggered Animations

#### List Items

```tsx
const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
}

<motion.ul variants={container} initial="hidden" animate="show">
  {items.map(item => (
    <motion.li key={item.id} variants={item}>
      {item.name}
    </motion.li>
  ))}
</motion.ul>
```

### 5. Micro-Interactions

#### Button Press

```tsx
<motion.button whileTap={{ scale: 0.98 }} transition={{ duration: 0.1 }}>
  Click Me
</motion.button>
```

#### Card Hover

```tsx
<motion.div whileHover={{ scale: 1.02, y: -4 }} transition={{ duration: 0.2 }} className="card">
  Card Content
</motion.div>
```

#### Icon Bounce

```tsx
<motion.div initial={{ scale: 1 }} animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 0.3 }}>
  <CheckIcon />
</motion.div>
```

## Durations

Use standardized durations from design tokens:

```typescript
import { transitions } from '@/lib/design-system/tokens'

// Fast: 150ms - Quick feedback, subtle changes
transitions.duration.fast

// Normal: 300ms - Standard transitions, moderate changes
transitions.duration.normal

// Slow: 500ms - Dramatic effects, complex animations
transitions.duration.slow
```

### Duration Guidelines

| Duration | Use Case            | Examples                             |
| -------- | ------------------- | ------------------------------------ |
| 100ms    | Instant feedback    | Button press, toggle switch          |
| 150ms    | Quick transitions   | Hover states, color changes          |
| 300ms    | Standard animations | Slide in/out, fade, scale            |
| 500ms    | Deliberate effects  | Complex multi-step, page transitions |
| 1000ms+  | Special effects     | Hero animations, celebrations        |

## Easing Functions

Use standardized easing curves from design tokens:

```typescript
import { transitions } from '@/lib/design-system/tokens'

// Default: Ease-in-out (smooth start and end)
transitions.easing.default

// Ease-in: Slow start, fast end
transitions.easing.in

// Ease-out: Fast start, slow end
transitions.easing.out

// Spring: Playful bounce effect
transitions.easing.spring
```

### Easing Guidelines

| Easing      | Use Case             | cubic-bezier          |
| ----------- | -------------------- | --------------------- |
| ease-out    | Elements entering    | (0, 0, 0.2, 1)        |
| ease-in     | Elements exiting     | (0.4, 0, 1, 1)        |
| ease-in-out | General transitions  | (0.4, 0, 0.2, 1)      |
| spring      | Playful interactions | (0.34, 1.56, 0.64, 1) |

## Accessibility

### Reduced Motion

**ALWAYS respect user preferences:**

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

```tsx
import { useReducedMotion } from 'framer-motion'

function Component() {
  const shouldReduceMotion = useReducedMotion()

  return (
    <motion.div
      animate={{
        x: shouldReduceMotion ? 0 : 100,
      }}
    />
  )
}
```

### Performance Considerations

1. **Use transform and opacity** - These properties can be animated on the GPU
2. **Avoid animating layout properties** - width, height, top, left cause reflows
3. **Use `will-change` sparingly** - Only for elements that will definitely animate
4. **Limit concurrent animations** - Too many simultaneous animations hurt performance

```css
/* Good - GPU accelerated */
.optimized {
  transform: translateY(10px);
  opacity: 0.5;
}

/* Bad - Causes reflow */
.not-optimized {
  top: 10px;
  margin-top: 20px;
}
```

## Common Patterns

### Modal/Dialog Enter/Exit

```tsx
<AnimatePresence>
  {isOpen && (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 bg-black/50"
      />

      {/* Modal Content */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="modal-content"
      >
        {children}
      </motion.div>
    </>
  )}
</AnimatePresence>
```

### Dropdown Menu

```tsx
<AnimatePresence>
  {isOpen && (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.15 }}
      className="dropdown-menu"
    >
      {items}
    </motion.div>
  )}
</AnimatePresence>
```

### Toast Notification

```tsx
<motion.div
  initial={{ opacity: 0, x: 100 }}
  animate={{ opacity: 1, x: 0 }}
  exit={{ opacity: 0, x: 100 }}
  transition={{ duration: 0.3, ease: 'easeOut' }}
  className="toast"
>
  {message}
</motion.div>
```

### Page Transition

```tsx
<motion.div
  key={router.pathname}
  initial={{ opacity: 0, x: -20 }}
  animate={{ opacity: 1, x: 0 }}
  exit={{ opacity: 0, x: 20 }}
  transition={{ duration: 0.3 }}
>
  {children}
</motion.div>
```

## Decision Tree

Use this decision tree to choose the right animation approach:

```
Is it a simple state change (hover, focus)?
├─ Yes → Use CSS transition
└─ No → Is it a complex multi-step animation?
    ├─ Yes → Use Framer Motion
    └─ No → Is it a standard pattern (fade, slide)?
        ├─ Yes → Use Tailwind animation classes
        └─ No → Does it need gesture support?
            ├─ Yes → Use Framer Motion
            └─ No → Use CSS animation
```

## Testing Checklist

- [ ] Animation runs smoothly at 60fps
- [ ] Respects `prefers-reduced-motion`
- [ ] Doesn't block user interaction
- [ ] Works on mobile devices
- [ ] Doesn't cause layout shifts
- [ ] Enhances UX (not just decorative)
- [ ] Uses GPU-accelerated properties
- [ ] Has appropriate duration and easing

## Resources

- [Framer Motion Documentation](https://www.framer.com/motion/)
- [CSS Triggers (Performance)](https://csstriggers.com/)
- [WCAG Animation Guidelines](https://www.w3.org/WAI/WCAG21/Understanding/animation-from-interactions.html)
- [Design Tokens](/lib/design-system/tokens.ts)

---

_Last updated: [Today's Date]_
_Version: 1.0.0_

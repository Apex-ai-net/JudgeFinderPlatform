/**
 * JudgeFinder Design System Tokens
 * ==========================================
 * Single source of truth for all design tokens across the platform.
 *
 * USAGE:
 * - Import from this file for TypeScript/JavaScript usage
 * - CSS variables in globals.css are generated from these tokens
 * - Tailwind config extends these tokens automatically
 *
 * NEVER use hardcoded colors, spacing, or other design values.
 * Always reference tokens from this file.
 */

// =============================================================================
// COLOR SYSTEM
// =============================================================================

/**
 * Core color palette with light and dark mode variants
 * All colors use HSL format for easy manipulation
 */
export const colors = {
  // Primary Brand Color - JudgeFinder Cyan-Blue
  primary: {
    DEFAULT: '199 82% 53%', // #2B9FE3
    foreground: '222 86% 9%',
    hover: '199 70% 46%',
    active: '199 70% 40%',
    subtle: '199 82% 93%',
    // Full scale for granular control
    50: '199 100% 97%',
    100: '199 96% 89%',
    200: '199 94% 82%',
    300: '199 90% 68%',
    400: '199 84% 57%',
    500: '199 82% 53%', // DEFAULT
    600: '199 70% 46%',
    700: '199 72% 40%',
    800: '199 75% 33%',
    900: '199 78% 26%',
  },

  // Semantic Colors for contextual use
  semantic: {
    success: {
      DEFAULT: '142 76% 36%',
      light: '142 76% 90%',
      foreground: '142 76% 10%',
    },
    warning: {
      DEFAULT: '38 92% 50%',
      light: '38 92% 90%',
      foreground: '38 92% 10%',
    },
    error: {
      DEFAULT: '0 84% 60%',
      light: '0 84% 95%',
      foreground: '0 84% 15%',
    },
    info: {
      DEFAULT: '199 82% 53%', // Same as primary brand
      light: '199 82% 93%',
      foreground: '199 82% 10%',
    },
  },

  // Neutral Scale (Light Mode)
  light: {
    background: {
      page: '210 40% 98%',
      panel: '213 44% 96%',
      card: '216 41% 92%',
      elevated: '213 44% 96%',
      sunken: '210 40% 94%',
      muted: '220 14% 96%',
    },
    text: {
      primary: '222 47% 10%',
      secondary: '221 20% 28%',
      tertiary: '220 13% 46%',
      muted: '220 13% 46%',
    },
    border: {
      DEFAULT: '220 13% 91%',
      subtle: '220 13% 95%',
      strong: '220 13% 80%',
    },
  },

  // Neutral Scale (Dark Mode)
  dark: {
    background: {
      page: '228 19% 6%',
      panel: '223 17% 10%',
      card: '226 23% 14%',
      elevated: '223 17% 10%',
      sunken: '228 19% 4%',
      muted: '220 20% 16%',
    },
    text: {
      primary: '216 18% 92%',
      secondary: '217 18% 76%',
      tertiary: '216 12% 60%',
      muted: '216 12% 60%',
    },
    border: {
      DEFAULT: '221 16% 22%',
      subtle: '221 16% 18%',
      strong: '221 16% 30%',
    },
  },
} as const

// =============================================================================
// TYPOGRAPHY SYSTEM
// =============================================================================

export const typography = {
  fontFamily: {
    sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
    mono: ['JetBrains Mono', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
  },

  fontSize: {
    xs: { size: '0.75rem', lineHeight: '1rem' }, // 12px
    sm: { size: '0.875rem', lineHeight: '1.25rem' }, // 14px
    base: { size: '1rem', lineHeight: '1.5rem' }, // 16px
    lg: { size: '1.125rem', lineHeight: '1.75rem' }, // 18px
    xl: { size: '1.25rem', lineHeight: '1.75rem' }, // 20px
    '2xl': { size: '1.5rem', lineHeight: '2rem' }, // 24px
    '3xl': { size: '1.875rem', lineHeight: '2.25rem' }, // 30px
    '4xl': { size: '2.25rem', lineHeight: '2.5rem' }, // 36px
    '5xl': { size: '3rem', lineHeight: '3rem' }, // 48px
    '6xl': { size: '3.75rem', lineHeight: '3.75rem' }, // 60px
  },

  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },

  letterSpacing: {
    tight: '-0.025em',
    normal: '0em',
    wide: '0.025em',
  },
} as const

// =============================================================================
// SPACING SYSTEM
// =============================================================================

/**
 * 8px grid system for consistent spacing
 * Use these tokens for padding, margin, and gap
 */
export const spacing = {
  0: '0',
  px: '1px',
  0.5: '0.125rem', // 2px
  1: '0.25rem', // 4px
  1.5: '0.375rem', // 6px
  2: '0.5rem', // 8px
  2.5: '0.625rem', // 10px
  3: '0.75rem', // 12px
  3.5: '0.875rem', // 14px
  4: '1rem', // 16px
  5: '1.25rem', // 20px
  6: '1.5rem', // 24px
  7: '1.75rem', // 28px
  8: '2rem', // 32px
  9: '2.25rem', // 36px
  10: '2.5rem', // 40px
  11: '2.75rem', // 44px
  12: '3rem', // 48px
  14: '3.5rem', // 56px
  16: '4rem', // 64px
  20: '5rem', // 80px
  24: '6rem', // 96px
  28: '7rem', // 112px
  32: '8rem', // 128px
} as const

// =============================================================================
// BORDER RADIUS
// =============================================================================

export const borderRadius = {
  none: '0',
  sm: '0.25rem', // 4px
  DEFAULT: '0.5rem', // 8px
  md: '0.75rem', // 12px
  lg: '1rem', // 16px
  xl: '1.5rem', // 24px
  '2xl': '2rem', // 32px
  '3xl': '3rem', // 48px
  full: '9999px',
} as const

// =============================================================================
// SHADOWS
// =============================================================================

export const shadows = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  DEFAULT: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)',
  none: 'none',
} as const

// Dark mode shadow variants (lighter for visibility on dark backgrounds)
export const shadowsDark = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
  DEFAULT: '0 1px 3px 0 rgba(0, 0, 0, 0.4), 0 1px 2px -1px rgba(0, 0, 0, 0.4)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -2px rgba(0, 0, 0, 0.4)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -4px rgba(0, 0, 0, 0.5)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.3)',
  none: 'none',
} as const

// =============================================================================
// Z-INDEX SCALE
// =============================================================================

/**
 * Consistent z-index layering for UI elements
 * Never use arbitrary z-index values outside this scale
 */
export const zIndex = {
  base: 0,
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modalBackdrop: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070,
  notification: 1080,
} as const

// =============================================================================
// TRANSITIONS & ANIMATIONS
// =============================================================================

/**
 * Standard easing curves and durations for consistent motion
 */
export const transitions = {
  duration: {
    fast: '150ms',
    normal: '300ms',
    slow: '500ms',
  },
  easing: {
    default: 'cubic-bezier(0.4, 0, 0.2, 1)', // ease-in-out
    in: 'cubic-bezier(0.4, 0, 1, 1)', // ease-in
    out: 'cubic-bezier(0, 0, 0.2, 1)', // ease-out
    spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)', // spring effect
  },
  // Convenience properties combining duration + easing
  fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
  normal: '300ms cubic-bezier(0.4, 0, 0.2, 1)',
  slow: '500ms cubic-bezier(0.4, 0, 0.2, 1)',
  spring: '500ms cubic-bezier(0.34, 1.56, 0.64, 1)',
} as const

// =============================================================================
// BREAKPOINTS
// =============================================================================

/**
 * Responsive breakpoints matching Tailwind defaults
 * Mobile-first approach: sm and up
 */
export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const

// =============================================================================
// COMPONENT-SPECIFIC TOKENS
// =============================================================================

/**
 * Standardized sizing and spacing for common components
 * Use these instead of arbitrary values
 */
export const components = {
  button: {
    height: {
      sm: '2rem', // 32px
      md: '2.5rem', // 40px
      lg: '3rem', // 48px
      xl: '3.5rem', // 56px
    },
    padding: {
      sm: '0.5rem 0.75rem', // 8px 12px
      md: '0.75rem 1.5rem', // 12px 24px
      lg: '1rem 2rem', // 16px 32px
      xl: '1.25rem 2.5rem', // 20px 40px
    },
    fontSize: {
      sm: typography.fontSize.sm,
      md: typography.fontSize.base,
      lg: typography.fontSize.lg,
      xl: typography.fontSize.xl,
    },
  },

  input: {
    height: {
      sm: '2rem', // 32px
      md: '2.5rem', // 40px
      lg: '3rem', // 48px
    },
    padding: '0.75rem 1rem', // 12px 16px
    borderWidth: '1px',
    fontSize: {
      sm: typography.fontSize.sm,
      md: typography.fontSize.base,
      lg: typography.fontSize.lg,
    },
  },

  card: {
    padding: {
      sm: '1rem', // 16px
      md: '1.5rem', // 24px
      lg: '2rem', // 32px
      xl: '2.5rem', // 40px
    },
    borderWidth: '1px',
    shadow: shadows.md,
  },

  modal: {
    maxWidth: {
      sm: '24rem', // 384px
      md: '32rem', // 512px
      lg: '48rem', // 768px
      xl: '64rem', // 1024px
    },
    padding: spacing[6],
  },

  tooltip: {
    maxWidth: '20rem', // 320px
    padding: `${spacing[2]} ${spacing[3]}`, // 8px 12px
    fontSize: typography.fontSize.sm,
  },
} as const

// =============================================================================
// ACCESSIBILITY TOKENS
// =============================================================================

/**
 * Tokens specifically for accessibility requirements
 */
export const a11y = {
  focusRing: {
    width: '2px',
    offset: '2px',
    color: colors.primary.DEFAULT,
    style: 'solid',
  },
  minTouchTarget: '44px', // WCAG 2.1 Level AAA
  minClickTarget: '24px', // Smaller targets acceptable for precise input devices
} as const

// =============================================================================
// EXPORT ALL TOKENS
// =============================================================================

export const designTokens = {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  shadowsDark,
  zIndex,
  transitions,
  breakpoints,
  components,
  a11y,
} as const

export type DesignTokens = typeof designTokens
export type ColorMode = 'light' | 'dark'

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Convert HSL token to CSS hsl() value
 * @param hslToken - HSL token in format "H S% L%"
 * @returns CSS hsl() string
 */
export function hsl(hslToken: string): string {
  return `hsl(${hslToken})`
}

/**
 * Convert HSL token to CSS hsl() value with alpha
 * @param hslToken - HSL token in format "H S% L%"
 * @param alpha - Alpha value from 0 to 1
 * @returns CSS hsla() string
 */
export function hsla(hslToken: string, alpha: number): string {
  return `hsl(${hslToken} / ${alpha})`
}

/**
 * Get color value for current mode
 * @param mode - 'light' or 'dark'
 * @param colorPath - Path to color token (e.g., 'background.page')
 * @returns HSL token string
 */
export function getColor(mode: ColorMode, colorPath: string): string {
  const [category, property] = colorPath.split('.')
  const modeColors = mode === 'light' ? colors.light : colors.dark

  if (category in modeColors) {
    const categoryObj = modeColors[category as keyof typeof modeColors]
    if (property in categoryObj) {
      return categoryObj[property as keyof typeof categoryObj]
    }
  }

  console.warn(`Color token not found: ${colorPath}`)
  return colors.light.background.page // Fallback
}

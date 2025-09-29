/**
 * JudgeFinder Design System Tokens
 * Unified design tokens for consistent styling across the platform
 */

// Color System
export const colors = {
  // Primary Brand Colors
  primary: {
    DEFAULT: 'hsl(216, 80%, 55%)', // #2563eb
    foreground: 'hsl(222, 86%, 9%)',
    light: 'hsl(216, 80%, 64%)',
    dark: 'hsl(216, 80%, 45%)',
    50: 'hsl(216, 100%, 97%)',
    100: 'hsl(216, 96%, 89%)',
    200: 'hsl(216, 94%, 82%)',
    300: 'hsl(216, 90%, 68%)',
    400: 'hsl(216, 84%, 57%)',
    500: 'hsl(216, 80%, 55%)', // DEFAULT
    600: 'hsl(216, 80%, 45%)',
    700: 'hsl(216, 82%, 36%)',
    800: 'hsl(216, 85%, 28%)',
    900: 'hsl(216, 88%, 20%)',
  },

  // Semantic Colors
  success: {
    DEFAULT: 'hsl(151, 74%, 66%)',
    light: 'hsl(151, 74%, 76%)',
    dark: 'hsl(151, 74%, 56%)',
  },

  danger: {
    DEFAULT: 'hsl(0, 94%, 82%)',
    light: 'hsl(0, 94%, 92%)',
    dark: 'hsl(0, 94%, 72%)',
  },

  warning: {
    DEFAULT: 'hsl(38, 93%, 77%)',
    light: 'hsl(38, 93%, 87%)',
    dark: 'hsl(38, 93%, 67%)',
  },

  // Neutral Scale (Light Mode)
  neutral: {
    0: 'hsl(210, 40%, 98%)',   // Page background
    50: 'hsl(213, 44%, 96%)',  // Panels
    100: 'hsl(216, 41%, 92%)', // Cards
    200: 'hsl(220, 13%, 91%)', // Borders
    300: 'hsl(220, 14%, 96%)', // Muted bg
    400: 'hsl(220, 13%, 46%)', // Muted text
    500: 'hsl(221, 20%, 28%)', // Secondary text
    600: 'hsl(222, 47%, 10%)', // Primary text
  },

  // Dark Mode Neutral Scale
  neutralDark: {
    0: 'hsl(228, 19%, 6%)',    // Page background
    50: 'hsl(223, 17%, 10%)',  // Panels
    100: 'hsl(226, 23%, 14%)', // Cards
    200: 'hsl(221, 16%, 22%)', // Borders
    300: 'hsl(220, 20%, 16%)', // Muted bg
    400: 'hsl(216, 12%, 60%)', // Muted text
    500: 'hsl(217, 18%, 76%)', // Secondary text
    600: 'hsl(216, 18%, 92%)', // Primary text
  },
} as const

// Typography Scale
export const typography = {
  fontFamily: {
    sans: ['Inter', 'system-ui', 'sans-serif'],
    mono: ['JetBrains Mono', 'Menlo', 'Monaco', 'monospace'],
  },

  fontSize: {
    xs: ['0.75rem', { lineHeight: '1rem' }],      // 12px
    sm: ['0.875rem', { lineHeight: '1.25rem' }],  // 14px
    base: ['1rem', { lineHeight: '1.5rem' }],     // 16px
    lg: ['1.125rem', { lineHeight: '1.75rem' }],  // 18px
    xl: ['1.25rem', { lineHeight: '1.75rem' }],   // 20px
    '2xl': ['1.5rem', { lineHeight: '2rem' }],    // 24px
    '3xl': ['1.875rem', { lineHeight: '2.25rem' }], // 30px
    '4xl': ['2.25rem', { lineHeight: '2.5rem' }],   // 36px
    '5xl': ['3rem', { lineHeight: '1' }],           // 48px
    '6xl': ['3.75rem', { lineHeight: '1' }],        // 60px
  },

  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
} as const

// Spacing Scale (8px grid system)
export const spacing = {
  xs: '0.25rem',  // 4px
  sm: '0.5rem',   // 8px
  md: '1rem',     // 16px
  lg: '1.5rem',   // 24px
  xl: '2rem',     // 32px
  '2xl': '3rem',  // 48px
  '3xl': '4rem',  // 64px
  '4xl': '6rem',  // 96px
  '5xl': '8rem',  // 128px
} as const

// Border Radius
export const borderRadius = {
  none: '0',
  sm: '0.25rem',   // 4px
  DEFAULT: '0.5rem',  // 8px
  md: '0.75rem',   // 12px
  lg: '1rem',      // 16px
  xl: '1.5rem',    // 24px
  '2xl': '2rem',   // 32px
  full: '9999px',
} as const

// Shadows
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

// Z-Index Scale
export const zIndex = {
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modalBackdrop: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070,
} as const

// Transitions
export const transitions = {
  fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
  normal: '300ms cubic-bezier(0.4, 0, 0.2, 1)',
  slow: '500ms cubic-bezier(0.4, 0, 0.2, 1)',
  spring: '500ms cubic-bezier(0.34, 1.56, 0.64, 1)',
} as const

// Breakpoints
export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const

// Component Specific Tokens
export const components = {
  button: {
    height: {
      sm: '2rem',    // 32px
      md: '2.5rem',  // 40px
      lg: '3rem',    // 48px
    },
    padding: {
      sm: '0.5rem 0.75rem',
      md: '0.75rem 1.5rem',
      lg: '1rem 2rem',
    },
  },

  card: {
    padding: {
      sm: '1rem',
      md: '1.5rem',
      lg: '2rem',
    },
    borderWidth: '1px',
    shadow: shadows.md,
  },

  input: {
    height: {
      sm: '2rem',
      md: '2.5rem',
      lg: '3rem',
    },
    padding: '0.75rem 1rem',
    borderWidth: '1px',
  },
} as const

// Export all tokens
export const designTokens = {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  zIndex,
  transitions,
  breakpoints,
  components,
} as const

export type DesignTokens = typeof designTokens
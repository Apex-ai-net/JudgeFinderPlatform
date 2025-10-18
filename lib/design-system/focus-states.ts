/**
 * Focus State Utilities
 * ====================
 * Standardized focus ring styles for consistent keyboard navigation UX
 *
 * WCAG 2.1 Level AA Requirements:
 * - Focus indicators must have a contrast ratio of at least 3:1
 * - Focus indicators must be visible on all interactive elements
 * - Focus must be programmatically determinable
 */

import { a11y } from './tokens'

/**
 * Standard focus ring classes for interactive elements
 * Use this on buttons, links, and other clickable elements
 */
export const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2'

/**
 * Inset focus ring for elements within containers
 * Use this for dropdown items, list items, and nested interactive elements
 */
export const focusRingInset =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset'

/**
 * Light focus ring for dark backgrounds
 * Use on interactive elements over dark images or colored backgrounds
 */
export const focusRingLight =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2'

/**
 * Focus ring for form inputs
 * Inputs typically handle focus on their container, not the input itself
 */
export const focusInput = 'focus:outline-none'

/**
 * Focus ring with custom color
 * @param color - Tailwind color class (e.g., 'blue-500', 'success')
 * @returns Focus ring class string with custom color
 */
export function focusRingCustom(color: string): string {
  return `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-${color} focus-visible:ring-offset-2`
}

/**
 * Combine focus styles with other class names
 * @param baseClasses - Base CSS classes
 * @param variant - Focus ring variant ('default' | 'inset' | 'light' | 'input')
 * @returns Combined class string
 */
export function withFocusRing(
  baseClasses: string,
  variant: 'default' | 'inset' | 'light' | 'input' = 'default'
): string {
  const focusVariant = {
    default: focusRing,
    inset: focusRingInset,
    light: focusRingLight,
    input: focusInput,
  }[variant]

  return `${baseClasses} ${focusVariant}`
}

/**
 * Focus trap utilities for modals and dialogs
 */
export class FocusTrap {
  private element: HTMLElement
  private previouslyFocusedElement: HTMLElement | null = null
  private focusableElements: HTMLElement[] = []

  constructor(element: HTMLElement) {
    this.element = element
  }

  /**
   * Activate focus trap
   * Stores currently focused element and sets up keyboard handlers
   */
  activate(): void {
    this.previouslyFocusedElement = document.activeElement as HTMLElement
    this.updateFocusableElements()

    if (this.focusableElements.length > 0) {
      this.focusableElements[0].focus()
    }

    this.element.addEventListener('keydown', this.handleKeyDown)
  }

  /**
   * Deactivate focus trap
   * Restores focus to previously focused element
   */
  deactivate(): void {
    this.element.removeEventListener('keydown', this.handleKeyDown)

    if (this.previouslyFocusedElement) {
      this.previouslyFocusedElement.focus()
    }
  }

  /**
   * Update list of focusable elements within trap
   */
  private updateFocusableElements(): void {
    const focusableSelectors = [
      'a[href]',
      'button:not([disabled])',
      'textarea:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(', ')

    this.focusableElements = Array.from(
      this.element.querySelectorAll<HTMLElement>(focusableSelectors)
    ).filter((el) => {
      // Filter out elements that are not visible or have display: none
      return el.offsetParent !== null
    })
  }

  /**
   * Handle keyboard navigation within trap
   */
  private handleKeyDown = (e: KeyboardEvent): void => {
    if (e.key !== 'Tab') return

    this.updateFocusableElements()

    const firstElement = this.focusableElements[0]
    const lastElement = this.focusableElements[this.focusableElements.length - 1]

    if (e.shiftKey) {
      // Shift + Tab: move focus backwards
      if (document.activeElement === firstElement) {
        e.preventDefault()
        lastElement.focus()
      }
    } else {
      // Tab: move focus forwards
      if (document.activeElement === lastElement) {
        e.preventDefault()
        firstElement.focus()
      }
    }
  }
}

/**
 * React hook for focus trap
 * @param ref - React ref to trap focus within
 * @param isActive - Whether the trap is active
 *
 * @example
 * const dialogRef = useRef<HTMLDivElement>(null)
 * useFocusTrap(dialogRef, isOpen)
 */
export function useFocusTrap(ref: React.RefObject<HTMLElement>, isActive: boolean): void {
  React.useEffect(() => {
    if (!isActive || !ref.current) return

    const trap = new FocusTrap(ref.current)
    trap.activate()

    return () => {
      trap.deactivate()
    }
  }, [ref, isActive])
}

/**
 * Skip link navigation for accessibility
 * Allows keyboard users to skip to main content
 */
export const skipLinkClasses =
  'fixed left-4 top-[-4rem] z-[9999] px-4 py-2 rounded-lg bg-primary text-primary-foreground shadow-xl transition-all duration-300 focus:top-4 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2'

/**
 * Keyboard navigation helpers
 */
export const keyboardHandlers = {
  /**
   * Handle Escape key to close dialogs/menus
   */
  onEscape: (callback: () => void) => (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      callback()
    }
  },

  /**
   * Handle Enter/Space to activate buttons
   */
  onActivate: (callback: () => void) => (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      callback()
    }
  },

  /**
   * Handle arrow key navigation in lists
   */
  onArrowNav:
    (direction: 'up' | 'down' | 'left' | 'right', callback: () => void) =>
    (e: React.KeyboardEvent) => {
      const keys = {
        up: 'ArrowUp',
        down: 'ArrowDown',
        left: 'ArrowLeft',
        right: 'ArrowRight',
      }

      if (e.key === keys[direction]) {
        e.preventDefault()
        callback()
      }
    },
}

/**
 * ARIA helpers for common patterns
 */
export const ariaHelpers = {
  /**
   * Props for a button that opens a dialog
   */
  dialogTrigger: (isOpen: boolean, dialogId: string) => ({
    'aria-expanded': isOpen,
    'aria-haspopup': 'dialog' as const,
    'aria-controls': dialogId,
  }),

  /**
   * Props for a button that opens a menu/dropdown
   */
  menuTrigger: (isOpen: boolean, menuId: string) => ({
    'aria-expanded': isOpen,
    'aria-haspopup': 'menu' as const,
    'aria-controls': menuId,
  }),

  /**
   * Props for a toggle button
   */
  toggleButton: (isPressed: boolean) => ({
    'aria-pressed': isPressed,
  }),

  /**
   * Props for tab panels
   */
  tabPanel: (isSelected: boolean, panelId: string, tabId: string) => ({
    role: 'tabpanel' as const,
    id: panelId,
    'aria-labelledby': tabId,
    tabIndex: isSelected ? 0 : -1,
    hidden: !isSelected,
  }),
}

/**
 * Validate focus indicator contrast
 * Ensures focus indicators meet WCAG 2.1 Level AA requirements
 *
 * @param foreground - Foreground color (hex)
 * @param background - Background color (hex)
 * @returns True if contrast ratio >= 3:1
 */
export function validateFocusContrast(foreground: string, background: string): boolean {
  // Simple contrast calculation (actual WCAG calculation is more complex)
  // This is a simplified version for quick validation
  const getRGB = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : null
  }

  const getLuminance = (rgb: { r: number; g: number; b: number }) => {
    const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((val) => {
      val = val / 255
      return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4)
    })
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
  }

  const fg = getRGB(foreground)
  const bg = getRGB(background)

  if (!fg || !bg) return false

  const l1 = getLuminance(fg)
  const l2 = getLuminance(bg)
  const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)

  return ratio >= 3 // WCAG 2.1 Level AA for focus indicators
}

// Re-export React for useFocusTrap
import * as React from 'react'

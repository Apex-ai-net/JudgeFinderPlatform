/**
 * useFocusTrap Hook
 *
 * Traps keyboard focus within a modal dialog, preventing users from
 * tabbing out of the modal. Meets WCAG 2.4.3 (Focus Order).
 *
 * Features:
 * - Focuses first focusable element on mount
 * - Traps Tab/Shift+Tab within modal
 * - Restores focus to trigger element on unmount
 * - Handles Escape key to close modal
 *
 * Usage:
 * const modalRef = useFocusTrap(isOpen, onClose)
 * return <div ref={modalRef}>...</div>
 */

import { useEffect, useRef, RefObject } from 'react'

const FOCUSABLE_ELEMENTS = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
]

export function useFocusTrap<T extends HTMLElement = HTMLDivElement>(
  isOpen: boolean,
  onClose?: () => void
): RefObject<T> {
  const containerRef = useRef<T>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!isOpen || !containerRef.current) return

    // Store previously focused element
    previousFocusRef.current = document.activeElement as HTMLElement

    // Get all focusable elements within modal
    const getFocusableElements = (): HTMLElement[] => {
      if (!containerRef.current) return []
      const elements = containerRef.current.querySelectorAll<HTMLElement>(
        FOCUSABLE_ELEMENTS.join(', ')
      )
      return Array.from(elements)
    }

    // Focus first element
    const focusableElements = getFocusableElements()
    if (focusableElements.length > 0) {
      focusableElements[0].focus()
    }

    // Handle keyboard navigation
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) {
        e.preventDefault()
        onClose()
        return
      }

      if (e.key !== 'Tab') return

      const focusableElements = getFocusableElements()
      if (focusableElements.length === 0) return

      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault()
        lastElement.focus()
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault()
        firstElement.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    // Cleanup: restore focus to previous element
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      if (previousFocusRef.current) {
        previousFocusRef.current.focus()
      }
    }
  }, [isOpen, onClose])

  return containerRef
}

/**
 * useKeyboardNavigation Hook
 *
 * Provides keyboard shortcuts for common dashboard actions.
 * Meets WCAG 2.1.1 (Keyboard) requirements.
 *
 * Usage:
 * useKeyboardNavigation({
 *   onSearch: () => router.push('/judges'),
 *   onHelp: () => setShowHelp(true)
 * })
 */

interface KeyboardNavigationOptions {
  onSearch?: () => void
  onHelp?: () => void
  onSettings?: () => void
  onBookmarks?: () => void
  enabled?: boolean
}

export function useKeyboardNavigation({
  onSearch,
  onHelp,
  onSettings,
  onBookmarks,
  enabled = true,
}: KeyboardNavigationOptions) {
  useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K: Search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k' && onSearch) {
        e.preventDefault()
        onSearch()
      }

      // Cmd/Ctrl + /: Help
      if ((e.metaKey || e.ctrlKey) && e.key === '/' && onHelp) {
        e.preventDefault()
        onHelp()
      }

      // Cmd/Ctrl + ,: Settings
      if ((e.metaKey || e.ctrlKey) && e.key === ',' && onSettings) {
        e.preventDefault()
        onSettings()
      }

      // Cmd/Ctrl + B: Bookmarks
      if ((e.metaKey || e.ctrlKey) && e.key === 'b' && onBookmarks) {
        e.preventDefault()
        onBookmarks()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [enabled, onSearch, onHelp, onSettings, onBookmarks])
}

/**
 * iOS Platform Detection Utilities
 *
 * Detects if the app is running in iOS Capacitor environment
 * Used to conditionally apply iOS-specific optimizations
 */

declare global {
  interface Window {
    Capacitor?: {
      getPlatform: () => string
      isNativePlatform: () => boolean
    }
  }
}

/**
 * Check if running in iOS Capacitor app (not web browser)
 */
export const isIOSCapacitor = (): boolean => {
  if (typeof window === 'undefined') return false

  try {
    return (
      'Capacitor' in window &&
      typeof window.Capacitor?.getPlatform === 'function' &&
      window.Capacitor.getPlatform() === 'ios'
    )
  } catch {
    return false
  }
}

/**
 * Check if running in ANY Capacitor native app (iOS or Android)
 */
export const isNativeCapacitor = (): boolean => {
  if (typeof window === 'undefined') return false

  try {
    return (
      'Capacitor' in window &&
      typeof window.Capacitor?.isNativePlatform === 'function' &&
      window.Capacitor.isNativePlatform()
    )
  } catch {
    return false
  }
}

/**
 * Check if running in web browser (not native app)
 */
export const isWebBrowser = (): boolean => {
  return !isNativeCapacitor()
}

/**
 * Get safe area insets (iOS only)
 * Returns pixel values for safe area insets
 */
export const getSafeAreaInsets = () => {
  if (typeof window === 'undefined' || !isIOSCapacitor()) {
    return { top: 0, bottom: 0, left: 0, right: 0 }
  }

  const computedStyle = getComputedStyle(document.documentElement)

  return {
    top: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-top)') || '0'),
    bottom: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-bottom)') || '0'),
    left: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-left)') || '0'),
    right: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-right)') || '0'),
  }
}

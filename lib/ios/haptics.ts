/**
 * iOS Haptic Feedback Utilities
 *
 * Provides haptic feedback for user interactions on iOS
 * Uses Capacitor Haptics plugin for native feedback
 */

import { isIOSCapacitor } from './platformDetection'

// Lazy load Capacitor Haptics to avoid errors in web environment
let Haptics: any = null
let HapticsImpactStyle: any = null
let HapticsNotificationType: any = null

/**
 * Initialize Haptics plugin
 * Called automatically on first haptic call
 */
async function initializeHaptics() {
  if (!isIOSCapacitor()) return false

  try {
    const capacitorHaptics = await import('@capacitor/haptics')
    Haptics = capacitorHaptics.Haptics
    HapticsImpactStyle = capacitorHaptics.ImpactStyle
    HapticsNotificationType = capacitorHaptics.NotificationType
    return true
  } catch (error) {
    console.warn('[Haptics] Failed to load Capacitor Haptics plugin:', error)
    return false
  }
}

/**
 * Light impact feedback
 * Use for: UI element selections, tab switches, small button taps
 */
export async function hapticLight() {
  if (!isIOSCapacitor()) return

  try {
    if (!Haptics) await initializeHaptics()
    if (!Haptics) return

    await Haptics.impact({ style: HapticsImpactStyle.Light })
  } catch (error) {
    console.warn('[Haptics] Light impact failed:', error)
  }
}

/**
 * Medium impact feedback
 * Use for: Standard button taps, swipe actions, pull-to-refresh
 */
export async function hapticMedium() {
  if (!isIOSCapacitor()) return

  try {
    if (!Haptics) await initializeHaptics()
    if (!Haptics) return

    await Haptics.impact({ style: HapticsImpactStyle.Medium })
  } catch (error) {
    console.warn('[Haptics] Medium impact failed:', error)
  }
}

/**
 * Heavy impact feedback
 * Use for: Confirmation actions, important button taps, errors
 */
export async function hapticHeavy() {
  if (!isIOSCapacitor()) return

  try {
    if (!Haptics) await initializeHaptics()
    if (!Haptics) return

    await Haptics.impact({ style: HapticsImpactStyle.Heavy })
  } catch (error) {
    console.warn('[Haptics] Heavy impact failed:', error)
  }
}

/**
 * Success notification feedback
 * Use for: Successful form submissions, completed actions
 */
export async function hapticSuccess() {
  if (!isIOSCapacitor()) return

  try {
    if (!Haptics) await initializeHaptics()
    if (!Haptics) return

    await Haptics.notification({ type: HapticsNotificationType.Success })
  } catch (error) {
    console.warn('[Haptics] Success notification failed:', error)
  }
}

/**
 * Warning notification feedback
 * Use for: Warning messages, potentially destructive actions
 */
export async function hapticWarning() {
  if (!isIOSCapacitor()) return

  try {
    if (!Haptics) await initializeHaptics()
    if (!Haptics) return

    await Haptics.notification({ type: HapticsNotificationType.Warning })
  } catch (error) {
    console.warn('[Haptics] Warning notification failed:', error)
  }
}

/**
 * Error notification feedback
 * Use for: Error messages, failed actions, validation errors
 */
export async function hapticError() {
  if (!isIOSCapacitor()) return

  try {
    if (!Haptics) await initializeHaptics()
    if (!Haptics) return

    await Haptics.notification({ type: HapticsNotificationType.Error })
  } catch (error) {
    console.warn('[Haptics] Error notification failed:', error)
  }
}

/**
 * Selection changed feedback (continuous)
 * Use for: Scrolling through options, pickers, sliders
 */
export async function hapticSelection() {
  if (!isIOSCapacitor()) return

  try {
    if (!Haptics) await initializeHaptics()
    if (!Haptics) return

    await Haptics.selectionStart()
  } catch (error) {
    console.warn('[Haptics] Selection feedback failed:', error)
  }
}

/**
 * End selection feedback
 */
export async function hapticSelectionEnd() {
  if (!isIOSCapacitor()) return

  try {
    if (!Haptics) await initializeHaptics()
    if (!Haptics) return

    await Haptics.selectionEnd()
  } catch (error) {
    console.warn('[Haptics] Selection end failed:', error)
  }
}

/**
 * Vibrate device (fallback for non-Capacitor environments)
 * @param duration - Vibration duration in ms (default: 10ms)
 */
export function vibrate(duration: number = 10) {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(duration)
  }
}

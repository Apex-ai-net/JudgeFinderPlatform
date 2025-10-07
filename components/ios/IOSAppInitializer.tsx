/**
 * iOS App Initializer Component
 *
 * Initializes iOS native features on app mount.
 * Placed at the root level in layout.tsx
 *
 * Key Features:
 * - Detects Capacitor iOS environment
 * - Injects iOS-specific CSS overrides
 * - Initializes AppBridge for native features
 */

'use client'

import { useEffect } from 'react'
import { isIOSCapacitor } from '@/lib/ios/platformDetection'

export function IOSAppInitializer() {
  useEffect(() => {
    const initializeIOS = async () => {
      try {
        // Check if running in iOS Capacitor app
        if (!isIOSCapacitor()) {
          console.log('[IOSAppInitializer] Not iOS Capacitor - skipping initialization')
          return
        }

        console.log('[IOSAppInitializer] Detected iOS Capacitor environment')

        // Inject iOS-specific CSS overrides
        injectIOSStylesheet()

        // Initialize native iOS bridge
        const { appBridge } = await import('@/lib/ios/AppBridge')
        await appBridge.initialize()

        // Log device info for debugging
        const appInfo = await appBridge.getAppInfo()
        console.log('[IOSAppInitializer] iOS app initialized', {
          version: appInfo?.version,
          build: appInfo?.build,
        })
      } catch (error) {
        console.error('[IOSAppInitializer] Failed to initialize iOS features:', error)
      }
    }

    initializeIOS()
  }, [])

  // This component doesn't render anything
  return null
}

/**
 * Inject iOS-specific stylesheet
 * Only applies in iOS Capacitor environment
 */
function injectIOSStylesheet() {
  // Check if already injected
  if (document.getElementById('ios-overrides')) {
    console.log('[IOSAppInitializer] iOS stylesheet already injected')
    return
  }

  const link = document.createElement('link')
  link.id = 'ios-overrides'
  link.rel = 'stylesheet'
  link.href = '/ios/styles/ios-overrides.css'
  link.media = 'all'

  // Add to head
  document.head.appendChild(link)

  console.log('[IOSAppInitializer] iOS stylesheet injected')

  // Add debug class to body for conditional styling
  document.body.classList.add('ios-capacitor')

  // Log safe area values for debugging
  link.addEventListener('load', () => {
    const style = getComputedStyle(document.documentElement)
    console.log('[IOSAppInitializer] Safe area insets:', {
      top: style.getPropertyValue('--ios-status-bar-height'),
      bottom: style.getPropertyValue('--ios-home-indicator-height'),
      left: style.getPropertyValue('--ios-safe-left'),
      right: style.getPropertyValue('--ios-safe-right'),
    })
  })
}

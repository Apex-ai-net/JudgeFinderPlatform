/**
 * iOS App Initializer Component
 * 
 * Initializes iOS native features on app mount.
 * Placed at the root level in layout.tsx
 */

'use client'

import { useEffect } from 'react'

export function IOSAppInitializer() {
  useEffect(() => {
    const initializeIOS = async () => {
      try {
        // Dynamically import iOS modules only if running in native app
        if (typeof window !== 'undefined' && 
            'Capacitor' in window) {
          
          console.log('[IOSAppInitializer] Detected Capacitor environment')
          
          const { appBridge } = await import('@/lib/ios/AppBridge')
          await appBridge.initialize()
          
          console.log('[IOSAppInitializer] iOS features initialized')
        }
      } catch (error) {
        console.error('[IOSAppInitializer] Failed to initialize iOS features:', error)
      }
    }
    
    initializeIOS()
  }, [])
  
  // This component doesn't render anything
  return null
}

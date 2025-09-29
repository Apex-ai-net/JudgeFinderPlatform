/**
 * React Hook for iOS Native Features
 * 
 * Provides easy access to iOS-specific functionality from React components.
 */

import { useEffect, useState } from 'react'
import { appBridge } from '@/lib/ios/AppBridge'
import { pushNotificationManager } from '@/lib/ios/PushNotificationManager'

export interface IOSAppInfo {
  isNative: boolean
  version?: string
  build?: string
  platform?: string
}

export function useIOSApp() {
  const [appInfo, setAppInfo] = useState<IOSAppInfo>({ isNative: false })
  const [pushEnabled, setPushEnabled] = useState(false)
  
  useEffect(() => {
    // Initialize iOS bridge on mount
    const initializeIOS = async () => {
      await appBridge.initialize()
      
      const isNative = await appBridge.isNativeApp()
      
      if (isNative) {
        const info = await appBridge.getAppInfo()
        setAppInfo({
          isNative: true,
          version: info?.version,
          build: info?.build,
          platform: 'ios' // Always iOS when Capacitor is available
        })
        
        // Check push notification status
        const pushStatus = await pushNotificationManager.isEnabled()
        setPushEnabled(pushStatus)
      }
    }
    
    initializeIOS()
  }, [])
  
  return {
    ...appInfo,
    pushEnabled,
    
    // Deep linking
    openExternal: (url: string) => appBridge.openExternalUrl(url),
    
    // Push notifications
    enablePush: async () => {
      const success = await pushNotificationManager.initialize()
      setPushEnabled(success)
      return success
    },
    disablePush: async () => {
      await pushNotificationManager.unregister()
      setPushEnabled(false)
    },
    
    // Preferences/storage
    savePreference: (key: string, value: string) => 
      appBridge.setPreference(key, value),
    getPreference: (key: string) => 
      appBridge.getPreference(key),
    
    // App control
    exitApp: () => appBridge.exitApp()
  }
}

/**
 * Hook to check if running in iOS native app
 */
export function useIsNativeIOS() {
  const [isNative, setIsNative] = useState(false)
  
  useEffect(() => {
    appBridge.isNativeApp().then(setIsNative)
  }, [])
  
  return isNative
}

/**
 * Hook for push notification features
 */
export function usePushNotifications() {
  const [isEnabled, setIsEnabled] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  
  useEffect(() => {
    const checkStatus = async () => {
      const enabled = await pushNotificationManager.isEnabled()
      const currentToken = pushNotificationManager.getToken()
      
      setIsEnabled(enabled)
      setToken(currentToken)
    }
    
    checkStatus()
  }, [])
  
  const enableNotifications = async () => {
    const success = await pushNotificationManager.initialize()
    setIsEnabled(success)
    
    if (success) {
      setToken(pushNotificationManager.getToken())
    }
    
    return success
  }
  
  const disableNotifications = async () => {
    await pushNotificationManager.unregister()
    setIsEnabled(false)
    setToken(null)
  }
  
  return {
    isEnabled,
    token,
    enableNotifications,
    disableNotifications
  }
}

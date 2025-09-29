/**
 * iOS Native Bridge - Core App Integration
 * 
 * Handles Capacitor plugin initialization and core app lifecycle events
 * for the JudgeFinder iOS app.
 */

import { App, URLOpenListenerEvent } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
import { Preferences } from '@capacitor/preferences'

export class AppBridge {
  private static instance: AppBridge
  
  private constructor() {}
  
  static getInstance(): AppBridge {
    if (!AppBridge.instance) {
      AppBridge.instance = new AppBridge()
    }
    return AppBridge.instance
  }
  
  /**
   * Initialize the iOS app bridge
   * Call this in _app.tsx or layout.tsx on mount
   */
  async initialize() {
    console.log('[AppBridge] Initializing iOS native bridge...')
    
    try {
      // Check if we're running in native iOS
      const isNative = await this.isNativeApp()
      
      if (isNative) {
        await this.setupDeepLinkHandlers()
        await this.setupAppStateListeners()
        
        // Check for URLs shared from Share Extension
        await this.checkForSharedURL()
        
        console.log('[AppBridge] iOS bridge initialized successfully')
      } else {
        console.log('[AppBridge] Running in web mode, native features disabled')
      }
    } catch (error) {
      console.error('[AppBridge] Failed to initialize:', error)
    }
  }
  
  /**
   * Check if running in native iOS app vs web browser
   */
  async isNativeApp(): Promise<boolean> {
    try {
      const info = await App.getInfo()
      return info.platform === 'ios'
    } catch {
      return false
    }
  }
  
  /**
   * Setup deep link handlers for universal links and custom URL schemes
   */
  private async setupDeepLinkHandlers() {
    App.addListener('appUrlOpen', (event: URLOpenListenerEvent) => {
      console.log('[AppBridge] Deep link received:', event.url)
      
      try {
        const url = new URL(event.url)
        
        // Handle custom scheme: judgefinder://
        if (url.protocol === 'judgefinder:') {
          this.handleCustomScheme(url)
          return
        }
        
        // Handle universal links: https://judgefinder.io/...
        if (url.hostname.includes('judgefinder.io') || 
            url.hostname.includes('netlify.app')) {
          this.handleUniversalLink(url)
          return
        }
        
        console.warn('[AppBridge] Unknown deep link format:', event.url)
      } catch (error) {
        console.error('[AppBridge] Failed to parse deep link:', error)
      }
    })
    
    console.log('[AppBridge] Deep link handlers registered')
  }
  
  /**
   * Handle custom URL scheme: judgefinder://
   */
  private handleCustomScheme(url: URL) {
    const path = url.hostname + url.pathname
    console.log('[AppBridge] Handling custom scheme path:', path)
    
    // Route to appropriate page
    if (typeof window !== 'undefined') {
      window.location.href = `/${path}${url.search}`
    }
  }
  
  /**
   * Handle universal links: https://judgefinder.io/...
   */
  private handleUniversalLink(url: URL) {
    const path = url.pathname + url.search + url.hash
    console.log('[AppBridge] Handling universal link path:', path)
    
    // Navigate to the path
    if (typeof window !== 'undefined') {
      window.location.href = path
    }
  }
  
  /**
   * Setup app state listeners (foreground/background transitions)
   */
  private async setupAppStateListeners() {
    App.addListener('appStateChange', async ({ isActive }) => {
      console.log('[AppBridge] App state changed:', isActive ? 'foreground' : 'background')
      
      if (isActive) {
        // App came to foreground - refresh critical data
        await this.onAppForeground()
      } else {
        // App went to background - save state
        await this.onAppBackground()
      }
    })
    
    console.log('[AppBridge] App state listeners registered')
  }
  
  /**
   * Called when app comes to foreground
   */
  private async onAppForeground() {
    console.log('[AppBridge] App resumed, checking for updates...')
    // Could trigger data refresh, check for new notifications, etc.
  }
  
  /**
   * Called when app goes to background
   */
  private async onAppBackground() {
    console.log('[AppBridge] App backgrounded, saving state...')
    // Could save scroll position, form data, etc.
  }
  
  /**
   * Open external URL in SFSafariViewController
   * Use this for external links (docs, help, etc.) to keep user in context
   */
  async openExternalUrl(url: string) {
    const isNative = await this.isNativeApp()
    
    if (isNative) {
      console.log('[AppBridge] Opening external URL in Safari:', url)
      await Browser.open({ 
        url,
        presentationStyle: 'popover',
        toolbarColor: '#1f2937'
      })
    } else {
      // In web, open in new tab
      window.open(url, '_blank')
    }
  }
  
  /**
   * Store data persistently (survives app restarts)
   */
  async setPreference(key: string, value: string) {
    await Preferences.set({ key, value })
  }
  
  /**
   * Retrieve stored preference
   */
  async getPreference(key: string): Promise<string | null> {
    const { value } = await Preferences.get({ key })
    return value
  }
  
  /**
   * Remove stored preference
   */
  async removePreference(key: string) {
    await Preferences.remove({ key })
  }
  
  /**
   * Get app information (version, build, platform)
   */
  async getAppInfo() {
    try {
      return await App.getInfo()
    } catch (error) {
      console.error('[AppBridge] Failed to get app info:', error)
      return null
    }
  }
  
  /**
   * Exit the app (iOS will minimize to home screen)
   */
  async exitApp() {
    const isNative = await this.isNativeApp()
    if (isNative) {
      await App.exitApp()
    }
  }
  
  /**
   * Check for URLs shared from Share Extension
   * Called on app launch to handle shared content
   */
  async checkForSharedURL() {
    try {
      console.log('[AppBridge] Checking for shared URL from extension...')
      
      // Check App Group preferences for shared URL
      const sharedURL = await this.getPreference('sharedURL')
      const sharedDate = await this.getPreference('sharedURLDate')
      
      if (sharedURL) {
        console.log('[AppBridge] Found shared URL:', sharedURL)
        
        // Check if it's recent (within last 5 minutes)
        const shareDate = sharedDate ? new Date(sharedDate) : new Date(0)
        const now = new Date()
        const timeDiff = now.getTime() - shareDate.getTime()
        
        if (timeDiff < 5 * 60 * 1000) { // 5 minutes
          // Navigate to the shared URL
          try {
            const url = new URL(sharedURL)
            const path = url.pathname + url.search + url.hash
            
            console.log('[AppBridge] Navigating to shared path:', path)
            
            if (typeof window !== 'undefined') {
              window.location.href = path
            }
          } catch (urlError) {
            console.error('[AppBridge] Invalid shared URL:', urlError)
          }
          
          // Clear the shared URL so we don't process it again
          await this.removePreference('sharedURL')
          await this.removePreference('sharedURLDate')
        } else {
          console.log('[AppBridge] Shared URL is too old, ignoring')
        }
      }
    } catch (error) {
      console.error('[AppBridge] Error checking shared URL:', error)
    }
  }
}

// Export singleton instance
export const appBridge = AppBridge.getInstance()

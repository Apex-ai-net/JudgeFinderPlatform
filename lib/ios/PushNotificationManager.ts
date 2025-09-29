/**
 * Push Notification Manager for iOS
 * 
 * Handles APNs registration, permission requests, and notification handling
 * for saved judges, decision updates, and platform alerts.
 */

import { 
  PushNotifications, 
  Token, 
  PushNotificationSchema,
  ActionPerformed,
  PermissionStatus 
} from '@capacitor/push-notifications'
import { appBridge } from './AppBridge'

export interface NotificationPayload {
  title: string
  body: string
  data?: {
    type: 'judge_update' | 'decision' | 'system'
    judgeId?: string
    judgeSlug?: string
    decisionId?: string
    url?: string
  }
}

export class PushNotificationManager {
  private static instance: PushNotificationManager
  private registeredToken: string | null = null
  private permissionStatus: PermissionStatus | null = null
  
  private constructor() {}
  
  static getInstance(): PushNotificationManager {
    if (!PushNotificationManager.instance) {
      PushNotificationManager.instance = new PushNotificationManager()
    }
    return PushNotificationManager.instance
  }
  
  /**
   * Initialize push notifications
   * Call after user performs an action that requires notifications (e.g., saving a judge)
   */
  async initialize() {
    console.log('[PushNotifications] Initializing...')
    
    const isNative = await appBridge.isNativeApp()
    if (!isNative) {
      console.log('[PushNotifications] Not in native app, skipping')
      return false
    }
    
    try {
      // Check current permission status
      const permStatus = await PushNotifications.checkPermissions()
      this.permissionStatus = permStatus
      console.log('[PushNotifications] Current permission:', permStatus.receive)
      
      // Request permissions if not already granted
      if (permStatus.receive !== 'granted') {
        const request = await PushNotifications.requestPermissions()
        this.permissionStatus = request
        console.log('[PushNotifications] Permission request result:', request.receive)
        
        if (request.receive !== 'granted') {
          console.log('[PushNotifications] Permission denied by user')
          return false
        }
      }
      
      // Register for push notifications
      await this.register()
      return true
      
    } catch (error) {
      console.error('[PushNotifications] Failed to initialize:', error)
      return false
    }
  }
  
  /**
   * Register for push notifications and setup listeners
   */
  private async register() {
    console.log('[PushNotifications] Registering with APNs...')
    
    // Setup listeners before registering
    this.setupListeners()
    
    // Register with APNs
    await PushNotifications.register()
  }
  
  /**
   * Setup notification event listeners
   */
  private setupListeners() {
    // Success: APNs token received
    PushNotifications.addListener('registration', async (token: Token) => {
      console.log('[PushNotifications] APNs token received:', token.value)
      this.registeredToken = token.value
      
      // Send token to backend
      await this.sendTokenToBackend(token.value)
    })
    
    // Error: Registration failed
    PushNotifications.addListener('registrationError', (error: any) => {
      console.error('[PushNotifications] Registration failed:', error)
    })
    
    // Notification received while app is in foreground
    PushNotifications.addListener(
      'pushNotificationReceived',
      (notification: PushNotificationSchema) => {
        console.log('[PushNotifications] Foreground notification:', notification)
        this.handleForegroundNotification(notification)
      }
    )
    
    // Notification tapped/opened
    PushNotifications.addListener(
      'pushNotificationActionPerformed',
      (notification: ActionPerformed) => {
        console.log('[PushNotifications] Notification action:', notification)
        this.handleNotificationAction(notification)
      }
    )
    
    console.log('[PushNotifications] Listeners registered')
  }
  
  /**
   * Send APNs token to backend for storage
   */
  private async sendTokenToBackend(token: string) {
    try {
      console.log('[PushNotifications] Sending token to backend...')
      
      const response = await fetch('/api/user/push-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          platform: 'ios',
          device_info: await appBridge.getAppInfo()
        }),
        credentials: 'include'
      })
      
      if (response.ok) {
        console.log('[PushNotifications] Token saved successfully')
        // Store locally for reference
        await appBridge.setPreference('push_token', token)
      } else {
        console.error('[PushNotifications] Failed to save token:', response.status)
      }
    } catch (error) {
      console.error('[PushNotifications] Error sending token to backend:', error)
    }
  }
  
  /**
   * Handle notification received while app is in foreground
   */
  private handleForegroundNotification(notification: PushNotificationSchema) {
    console.log('[PushNotifications] Handling foreground notification:', notification.title)
    
    // Show in-app notification banner or update badge
    // Could use a toast/banner library here
    if (notification.data?.type === 'judge_update') {
      console.log('[PushNotifications] Judge update notification')
    } else if (notification.data?.type === 'decision') {
      console.log('[PushNotifications] New decision notification')
    }
  }
  
  /**
   * Handle user tapping on notification
   */
  private handleNotificationAction(action: ActionPerformed) {
    const notification = action.notification
    console.log('[PushNotifications] User tapped notification:', notification.title)
    
    const data = notification.data
    
    // Navigate to appropriate page based on notification type
    if (data?.url) {
      // Direct URL provided
      window.location.href = data.url
    } else if (data?.judgeSlug) {
      // Navigate to judge profile
      window.location.href = `/judges/${data.judgeSlug}`
    } else if (data?.decisionId) {
      // Navigate to decision (if we have a direct route)
      window.location.href = `/decisions/${data.decisionId}`
    }
  }
  
  /**
   * Get current permission status
   */
  async getPermissionStatus(): Promise<PermissionStatus | null> {
    try {
      const status = await PushNotifications.checkPermissions()
      this.permissionStatus = status
      return status
    } catch (error) {
      console.error('[PushNotifications] Failed to check permissions:', error)
      return null
    }
  }
  
  /**
   * Get registered APNs token
   */
  getToken(): string | null {
    return this.registeredToken
  }
  
  /**
   * Check if notifications are enabled
   */
  async isEnabled(): Promise<boolean> {
    const status = await this.getPermissionStatus()
    return status?.receive === 'granted'
  }
  
  /**
   * Unregister from push notifications
   */
  async unregister() {
    try {
      await PushNotifications.removeAllListeners()
      
      // Remove token from backend
      await fetch('/api/user/push-token', {
        method: 'DELETE',
        credentials: 'include'
      })
      
      // Clear local storage
      await appBridge.removePreference('push_token')
      
      this.registeredToken = null
      console.log('[PushNotifications] Unregistered successfully')
    } catch (error) {
      console.error('[PushNotifications] Failed to unregister:', error)
    }
  }
  
  /**
   * Get notification delivery count (iOS specific)
   */
  async getDeliveredNotifications() {
    try {
      const result = await PushNotifications.getDeliveredNotifications()
      console.log('[PushNotifications] Delivered notifications:', result.notifications.length)
      return result.notifications
    } catch (error) {
      console.error('[PushNotifications] Failed to get delivered notifications:', error)
      return []
    }
  }
  
  /**
   * Clear all delivered notifications from notification center
   */
  async removeAllDeliveredNotifications() {
    try {
      await PushNotifications.removeAllDeliveredNotifications()
      console.log('[PushNotifications] Cleared all delivered notifications')
    } catch (error) {
      console.error('[PushNotifications] Failed to clear notifications:', error)
    }
  }
}

// Export singleton instance
export const pushNotificationManager = PushNotificationManager.getInstance()

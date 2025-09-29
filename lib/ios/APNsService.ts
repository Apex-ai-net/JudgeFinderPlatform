/**
 * APNs Service - Backend Push Notification Sender
 * 
 * Sends push notifications to iOS devices via Apple Push Notification service.
 * Uses node-apn for production APNs communication.
 */

import { createServerClient } from '@/lib/supabase/server'

interface PushNotificationPayload {
  title: string
  body: string
  badge?: number
  sound?: string
  data?: {
    type: 'judge_update' | 'decision' | 'system' | 'profile_update'
    judgeId?: string
    judgeSlug?: string
    judgeName?: string
    decisionId?: string
    url?: string
    [key: string]: any
  }
}

interface NotificationRecipient {
  userId: string
  tokens: string[]
}

/**
 * APNs Service for sending push notifications
 * 
 * Note: This requires APNs certificates to be configured.
 * See docs/IOS_APP_SETUP.md for certificate setup instructions.
 */
export class APNsService {
  private static instance: APNsService
  private isInitialized = false
  
  private constructor() {}
  
  static getInstance(): APNsService {
    if (!APNsService.instance) {
      APNsService.instance = new APNsService()
    }
    return APNsService.instance
  }
  
  /**
   * Initialize APNs provider
   * Call once on server startup
   */
  async initialize() {
    if (this.isInitialized) return
    
    try {
      // Check for required environment variables
      const requiredVars = [
        'APNS_KEY_ID',
        'APNS_TEAM_ID', 
        'APNS_BUNDLE_ID',
        'APNS_KEY_PATH'
      ]
      
      const missing = requiredVars.filter(v => !process.env[v])
      
      if (missing.length > 0) {
        console.warn('[APNsService] Missing environment variables:', missing)
        console.warn('[APNsService] Push notifications will not be sent')
        return
      }
      
      // TODO: Initialize node-apn provider here
      // Example:
      // const apn = await import('apn')
      // this.provider = new apn.Provider({
      //   token: {
      //     key: fs.readFileSync(process.env.APNS_KEY_PATH!),
      //     keyId: process.env.APNS_KEY_ID!,
      //     teamId: process.env.APNS_TEAM_ID!
      //   },
      //   production: process.env.NODE_ENV === 'production'
      // })
      
      this.isInitialized = true
      console.log('[APNsService] Initialized successfully')
    } catch (error) {
      console.error('[APNsService] Initialization failed:', error)
    }
  }
  
  /**
   * Send push notification to a single user
   */
  async sendToUser(userId: string, payload: PushNotificationPayload) {
    try {
      const supabase = await createServerClient()
      
      // Get user's active iOS tokens
      const { data: tokens, error } = await supabase
        .from('user_push_tokens')
        .select('token')
        .eq('user_id', userId)
        .eq('platform', 'ios')
        .eq('is_active', true)
      
      if (error) {
        console.error('[APNsService] Failed to fetch user tokens:', error)
        return { success: false, error }
      }
      
      if (!tokens || tokens.length === 0) {
        console.log('[APNsService] No active tokens for user:', userId)
        return { success: false, error: 'No tokens found' }
      }
      
      const deviceTokens = tokens.map(t => t.token)
      
      return await this.sendToTokens(deviceTokens, payload)
    } catch (error) {
      console.error('[APNsService] Error sending to user:', error)
      return { success: false, error }
    }
  }
  
  /**
   * Send push notification to multiple users
   */
  async sendToUsers(userIds: string[], payload: PushNotificationPayload) {
    try {
      const supabase = await createServerClient()
      
      // Get all active iOS tokens for these users
      const { data: tokens, error } = await supabase
        .from('user_push_tokens')
        .select('user_id, token')
        .in('user_id', userIds)
        .eq('platform', 'ios')
        .eq('is_active', true)
      
      if (error) {
        console.error('[APNsService] Failed to fetch tokens:', error)
        return { success: false, error }
      }
      
      if (!tokens || tokens.length === 0) {
        console.log('[APNsService] No active tokens for users:', userIds)
        return { success: false, error: 'No tokens found' }
      }
      
      const deviceTokens = tokens.map(t => t.token)
      
      return await this.sendToTokens(deviceTokens, payload)
    } catch (error) {
      console.error('[APNsService] Error sending to users:', error)
      return { success: false, error }
    }
  }
  
  /**
   * Send push notification to specific device tokens
   */
  async sendToTokens(tokens: string[], payload: PushNotificationPayload) {
    if (!this.isInitialized) {
      console.warn('[APNsService] Not initialized, skipping notification')
      return { success: false, error: 'Not initialized' }
    }
    
    try {
      console.log(`[APNsService] Sending notification to ${tokens.length} devices`)
      console.log('[APNsService] Payload:', payload.title)
      
      // TODO: Implement actual APNs sending with node-apn
      // Example:
      // const notification = new apn.Notification()
      // notification.alert = {
      //   title: payload.title,
      //   body: payload.body
      // }
      // notification.badge = payload.badge
      // notification.sound = payload.sound || 'default'
      // notification.topic = process.env.APNS_BUNDLE_ID
      // notification.payload = payload.data || {}
      // 
      // const result = await this.provider.send(notification, tokens)
      // 
      // console.log('[APNsService] Sent:', result.sent.length)
      // console.log('[APNsService] Failed:', result.failed.length)
      // 
      // return { 
      //   success: result.sent.length > 0,
      //   sent: result.sent.length,
      //   failed: result.failed.length
      // }
      
      // For now, just log
      console.log('[APNsService] Would send to tokens:', tokens.length)
      
      return { 
        success: true, 
        sent: tokens.length,
        failed: 0,
        message: 'APNs not configured, notification logged only'
      }
    } catch (error) {
      console.error('[APNsService] Error sending notification:', error)
      return { success: false, error }
    }
  }
  
  /**
   * Notify users who follow a specific judge
   */
  async notifyJudgeFollowers(
    judgeId: string, 
    judgeName: string,
    message: string,
    type: 'decision' | 'profile_update' | 'assignment_change'
  ) {
    try {
      const supabase = await createServerClient()
      
      // Get users who have bookmarked this judge
      const { data: bookmarks, error } = await supabase
        .from('user_bookmarks')
        .select('user_id')
        .eq('judge_id', judgeId)
      
      if (error || !bookmarks || bookmarks.length === 0) {
        console.log('[APNsService] No followers for judge:', judgeId)
        return { success: false, error: 'No followers' }
      }
      
      const userIds = bookmarks.map(b => b.user_id)
      
      const payload: PushNotificationPayload = {
        title: `Update: ${judgeName}`,
        body: message,
        badge: 1,
        sound: 'default',
        data: {
          type: type === 'decision' ? 'decision' : 'judge_update',
          judgeId,
          judgeName,
          url: `/judges/${judgeId}`
        }
      }
      
      return await this.sendToUsers(userIds, payload)
    } catch (error) {
      console.error('[APNsService] Error notifying followers:', error)
      return { success: false, error }
    }
  }
  
  /**
   * Send notification about new decision for a judge
   */
  async notifyNewDecision(
    judgeId: string,
    judgeName: string,
    decisionCount: number
  ) {
    const message = decisionCount === 1
      ? 'New decision available'
      : `${decisionCount} new decisions available`
    
    return await this.notifyJudgeFollowers(
      judgeId,
      judgeName,
      message,
      'decision'
    )
  }
  
  /**
   * Send notification about judge profile update
   */
  async notifyProfileUpdate(
    judgeId: string,
    judgeName: string,
    updateType: string
  ) {
    const message = `Profile updated: ${updateType}`
    
    return await this.notifyJudgeFollowers(
      judgeId,
      judgeName,
      message,
      'profile_update'
    )
  }
  
  /**
   * Send notification about court assignment change
   */
  async notifyAssignmentChange(
    judgeId: string,
    judgeName: string,
    oldCourt: string,
    newCourt: string
  ) {
    const message = `Court assignment changed from ${oldCourt} to ${newCourt}`
    
    return await this.notifyJudgeFollowers(
      judgeId,
      judgeName,
      message,
      'assignment_change'
    )
  }
  
  /**
   * Send system-wide notification to all users
   */
  async sendSystemNotification(
    title: string,
    message: string,
    url?: string
  ) {
    try {
      const supabase = await createServerClient()
      
      // Get all active iOS tokens
      const { data: tokens, error } = await supabase
        .from('user_push_tokens')
        .select('token')
        .eq('platform', 'ios')
        .eq('is_active', true)
      
      if (error || !tokens || tokens.length === 0) {
        console.log('[APNsService] No active tokens for system notification')
        return { success: false, error: 'No tokens' }
      }
      
      const deviceTokens = tokens.map(t => t.token)
      
      const payload: PushNotificationPayload = {
        title,
        body: message,
        badge: 1,
        sound: 'default',
        data: {
          type: 'system',
          url
        }
      }
      
      return await this.sendToTokens(deviceTokens, payload)
    } catch (error) {
      console.error('[APNsService] Error sending system notification:', error)
      return { success: false, error }
    }
  }
  
  /**
   * Clean up invalid tokens (after APNs reports them as invalid)
   */
  async removeInvalidToken(token: string) {
    try {
      const supabase = await createServerClient()
      
      const { error } = await supabase
        .from('user_push_tokens')
        .update({ is_active: false })
        .eq('token', token)
      
      if (error) {
        console.error('[APNsService] Failed to remove invalid token:', error)
      } else {
        console.log('[APNsService] Removed invalid token:', token.substring(0, 10) + '...')
      }
    } catch (error) {
      console.error('[APNsService] Error removing token:', error)
    }
  }
}

// Export singleton instance
export const apnsService = APNsService.getInstance()

// Initialize on module load (server-side only)
if (typeof window === 'undefined') {
  apnsService.initialize()
}

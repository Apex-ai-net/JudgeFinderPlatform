/**
 * Widget Manager
 * 
 * Updates iOS Home Screen widget data when user saves/unsaves judges.
 * Widgets display saved judges and recent decisions.
 */

import { Preferences } from '@capacitor/preferences'
import { createBrowserClient } from '@/lib/supabase/client'

interface JudgeWidgetData {
  id: string
  name: string
  court_name: string | null
  jurisdiction: string | null
  slug: string | null
  appointed_date: string | null
}

interface WidgetData {
  judges: JudgeWidgetData[]
  lastUpdated: string
}

export class WidgetManager {
  private static instance: WidgetManager
  
  private constructor() {}
  
  static getInstance(): WidgetManager {
    if (!WidgetManager.instance) {
      WidgetManager.instance = new WidgetManager()
    }
    return WidgetManager.instance
  }
  
  /**
   * Update widget data with user's saved judges
   * Call this whenever a user saves or unsaves a judge
   */
  async updateWidgetData() {
    try {
      console.log('[WidgetManager] Updating widget data...')
      
      const supabase = createBrowserClient()
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.log('[WidgetManager] No user logged in, clearing widget data')
        await this.clearWidgetData()
        return
      }
      
      // Fetch user's saved judges (limit to 5 for widget performance)
      const { data: bookmarks, error } = await supabase
        .from('user_bookmarks')
        .select(`
          judge_id,
          judges:judge_id (
            id,
            name,
            court_name,
            jurisdiction,
            slug,
            appointed_date
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5)
      
      if (error) {
        console.error('[WidgetManager] Error fetching bookmarks:', error)
        return
      }
      
      // Transform data for widget consumption
      const judges: JudgeWidgetData[] = bookmarks
        ?.map(b => {
          const judge = b.judges as any
          return {
            id: judge.id,
            name: judge.name,
            court_name: judge.court_name,
            jurisdiction: judge.jurisdiction,
            slug: judge.slug,
            appointed_date: judge.appointed_date
          }
        })
        .filter(j => j !== null) || []
      
      const widgetData: WidgetData = {
        judges,
        lastUpdated: new Date().toISOString()
      }
      
      // Store in App Group preferences (accessible by widget)
      await Preferences.set({
        key: 'widgetJudges',
        value: JSON.stringify(widgetData)
      })
      
      console.log(`[WidgetManager] Widget data updated: ${judges.length} judges`)
      
      // Widgets will reload on their next update cycle (typically hourly)
      // iOS 17+ supports immediate widget updates via WidgetCenter
      await this.reloadWidgets()
      
    } catch (error) {
      console.error('[WidgetManager] Error updating widget:', error)
    }
  }
  
  /**
   * Reload all widgets to show updated data
   * Note: Widgets auto-update hourly, but this can force an update
   */
  async reloadWidgets() {
    try {
      // Capacitor doesn't have a direct widget reload API
      // Widgets use Timeline refresh policy and will update on next cycle
      // For immediate updates in production, consider adding a native plugin
      
      console.log('[WidgetManager] Widgets scheduled for next update cycle')
      
      // Future enhancement: Native plugin to force immediate update
      // if (Capacitor.isNativePlatform()) {
      //   await WidgetCenter.reloadAllTimelines()
      // }
      
    } catch (error) {
      console.error('[WidgetManager] Error reloading widgets:', error)
    }
  }
  
  /**
   * Clear widget data
   * Call when user logs out or has no saved judges
   */
  async clearWidgetData() {
    try {
      await Preferences.remove({ key: 'widgetJudges' })
      console.log('[WidgetManager] Widget data cleared')
      await this.reloadWidgets()
    } catch (error) {
      console.error('[WidgetManager] Error clearing widget:', error)
    }
  }
  
  /**
   * Get current widget data (for debugging)
   */
  async getWidgetData(): Promise<WidgetData | null> {
    try {
      const { value } = await Preferences.get({ key: 'widgetJudges' })
      if (value) {
        return JSON.parse(value)
      }
      return null
    } catch (error) {
      console.error('[WidgetManager] Error getting widget data:', error)
      return null
    }
  }
  
  /**
   * Check if widgets are available (iOS only)
   */
  async isWidgetAvailable(): Promise<boolean> {
    try {
      // Check if running on iOS
      if (typeof window === 'undefined') return false
      
      const { App } = await import('@capacitor/app')
      const info = await App.getInfo()
      
      return info.platform === 'ios'
    } catch {
      return false
    }
  }
}

// Export singleton instance
export const widgetManager = WidgetManager.getInstance()

/**
 * Send Push Notifications API
 * 
 * Manually trigger push notifications for testing or admin purposes.
 * Protected by admin authentication.
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { resolveAdminStatus } from '@/lib/auth/is-admin'
import { createServerClient } from '@/lib/supabase/server'
import { apnsService } from '@/lib/ios/APNsService'

export const dynamic = 'force-dynamic'

/**
 * POST /api/notifications/send
 * Send a push notification to users
 */
export async function POST(request: NextRequest) {
  try {
    // Admin authentication required
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const status = await resolveAdminStatus()
    if (!status.isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    const supabase = await createServerClient()
    const body = await request.json()
    const { type, ...params } = body
    
    let result
    
    switch (type) {
      case 'judge_followers':
        // Notify followers of a specific judge
        result = await apnsService.notifyJudgeFollowers(
          params.judgeId,
          params.judgeName,
          params.message,
          params.updateType || 'decision'
        )
        break
        
      case 'new_decision':
        // Notify about new decision
        result = await apnsService.notifyNewDecision(
          params.judgeId,
          params.judgeName,
          params.decisionCount || 1
        )
        break
        
      case 'profile_update':
        // Notify about profile update
        result = await apnsService.notifyProfileUpdate(
          params.judgeId,
          params.judgeName,
          params.updateType
        )
        break
        
      case 'assignment_change':
        // Notify about court assignment change
        result = await apnsService.notifyAssignmentChange(
          params.judgeId,
          params.judgeName,
          params.oldCourt,
          params.newCourt
        )
        break
        
      case 'system':
        // Send system notification to all users
        result = await apnsService.sendSystemNotification(
          params.title,
          params.message,
          params.url
        )
        break
        
      case 'user':
        // Send to specific user
        result = await apnsService.sendToUser(
          params.userId,
          {
            title: params.title,
            body: params.message,
            badge: params.badge,
            sound: params.sound,
            data: params.data
          }
        )
        break
        
      default:
        return NextResponse.json(
          { error: 'Invalid notification type' },
          { status: 400 }
        )
    }
    
    return NextResponse.json(result)
    
  } catch (error) {
    console.error('[Notifications] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/notifications/send
 * Get notification sending status and stats
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // Get notification stats
    const { data: stats, error } = await supabase
      .from('user_push_tokens')
      .select('platform, is_active')
    
    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch stats' },
        { status: 500 }
      )
    }
    
    const totalTokens = stats?.length || 0
    const activeTokens = stats?.filter(s => s.is_active).length || 0
    const iosTokens = stats?.filter(s => s.platform === 'ios' && s.is_active).length || 0
    
    return NextResponse.json({
      totalTokens,
      activeTokens,
      iosTokens,
      apnsConfigured: !!(
        process.env.APNS_KEY_ID && 
        process.env.APNS_TEAM_ID && 
        process.env.APNS_BUNDLE_ID
      )
    })
    
  } catch (error) {
    console.error('[Notifications] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

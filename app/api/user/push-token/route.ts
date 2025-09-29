/**
 * Push Notification Token Management API
 * 
 * Handles storing and removing APNs tokens for push notifications
 * on iOS devices.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * POST /api/user/push-token
 * Store a new push notification token
 */
export async function POST(request: NextRequest) {
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
    
    const body = await request.json()
    const { token, platform, device_info } = body
    
    if (!token || !platform) {
      return NextResponse.json(
        { error: 'Missing required fields: token, platform' },
        { status: 400 }
      )
    }
    
    // Store token in database
    // Note: You'll need to create this table in Supabase
    const { data, error } = await supabase
      .from('user_push_tokens')
      .upsert({
        user_id: user.id,
        token,
        platform,
        device_info: device_info || {},
        last_updated: new Date().toISOString(),
        is_active: true
      }, {
        onConflict: 'user_id,token'
      })
      .select()
      .single()
    
    if (error) {
      console.error('[PushToken] Database error:', error)
      
      // If table doesn't exist, return success anyway
      // (Token can be stored once table is created)
      if (error.code === '42P01') {
        console.warn('[PushToken] Table user_push_tokens does not exist yet')
        return NextResponse.json({ 
          success: true,
          message: 'Token received (table pending creation)'
        })
      }
      
      return NextResponse.json(
        { error: 'Failed to store token' },
        { status: 500 }
      )
    }
    
    console.log('[PushToken] Token stored successfully for user:', user.id)
    
    return NextResponse.json({ 
      success: true,
      token_id: data.id 
    })
    
  } catch (error) {
    console.error('[PushToken] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/user/push-token
 * Remove push notification token (unregister)
 */
export async function DELETE(request: NextRequest) {
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
    
    // Mark all user tokens as inactive
    const { error } = await supabase
      .from('user_push_tokens')
      .update({ is_active: false })
      .eq('user_id', user.id)
    
    if (error) {
      console.error('[PushToken] Delete error:', error)
      
      // If table doesn't exist, return success anyway
      if (error.code === '42P01') {
        return NextResponse.json({ success: true })
      }
      
      return NextResponse.json(
        { error: 'Failed to remove tokens' },
        { status: 500 }
      )
    }
    
    console.log('[PushToken] Tokens deactivated for user:', user.id)
    
    return NextResponse.json({ success: true })
    
  } catch (error) {
    console.error('[PushToken] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/user/push-token
 * Get all active tokens for the current user
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
    
    // Get all active tokens
    const { data, error } = await supabase
      .from('user_push_tokens')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('last_updated', { ascending: false })
    
    if (error) {
      console.error('[PushToken] Query error:', error)
      
      if (error.code === '42P01') {
        return NextResponse.json({ tokens: [] })
      }
      
      return NextResponse.json(
        { error: 'Failed to fetch tokens' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ 
      tokens: data || []
    })
    
  } catch (error) {
    console.error('[PushToken] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

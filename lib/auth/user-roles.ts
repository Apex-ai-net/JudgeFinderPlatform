import { createServiceRoleClient } from '@/lib/supabase/server'

export type UserRole = 'legal_professional' | 'advertiser' | 'admin' | 'unknown'

export interface UserRoleInfo {
  role: UserRole
  isAdvertiser: boolean
  isLegalProfessional: boolean
  isAdmin: boolean
  advertiserProfile?: {
    id: string
    firm_name: string
    firm_type: string
    verification_status: string
    account_status: string
    total_spend: number
    stripe_customer_id?: string
  }
}

/**
 * Detects user role based on database records
 * Priority: Advertiser > Legal Professional (Admins use separate /admin route)
 *
 * @param userId - The Supabase user ID
 * @param clerkUserId - The Clerk user ID
 * @returns UserRoleInfo with detected role and profile data
 */
export async function getUserRole(userId: string, clerkUserId: string): Promise<UserRoleInfo> {
  const supabase = await createServiceRoleClient()

  try {
    // Check if user is advertiser
    // Using maybeSingle() to handle missing table gracefully
    const { data: advertiserProfile, error: advertiserError } = await supabase
      .from('advertiser_profiles')
      .select(
        'id, firm_name, firm_type, verification_status, account_status, total_spend, stripe_customer_id'
      )
      .eq('user_id', userId)
      .maybeSingle()

    // Log errors but don't crash - table might not exist yet
    if (advertiserError && advertiserError.code !== 'PGRST116') {
      // PGRST116 = relation does not exist, which is fine during initial setup
      console.warn('Error checking advertiser profile:', advertiserError)
    }

    if (advertiserProfile) {
      return {
        role: 'advertiser',
        isAdvertiser: true,
        isLegalProfessional: false,
        isAdmin: false,
        advertiserProfile,
      }
    }

    // Default to legal professional
    return {
      role: 'legal_professional',
      isAdvertiser: false,
      isLegalProfessional: true,
      isAdmin: false,
    }
  } catch (error) {
    console.error('Error detecting user role:', error)
    // Default to legal professional on error
    return {
      role: 'legal_professional',
      isAdvertiser: false,
      isLegalProfessional: true,
      isAdmin: false,
    }
  }
}

/**
 * Gets role-specific dashboard data
 * Returns empty results if tables don't exist during initial setup
 */
export async function getDashboardDataByRole(
  userId: string,
  role: UserRole
): Promise<Record<string, any>> {
  const supabase = await createServiceRoleClient()

  try {
    if (role === 'advertiser') {
      // Get advertiser-specific data
      const { data: campaigns, error: campaignsError } = await supabase
        .from('ad_campaigns')
        .select(
          `
          id,
          name,
          status,
          budget_total,
          budget_spent,
          impressions_total,
          clicks_total,
          start_date,
          end_date
        `
        )
        .eq('advertiser_id', userId)
        .order('created_at', { ascending: false })
        .limit(5)

      const { data: bookings, error: bookingsError } = await supabase
        .from('ad_bookings')
        .select(
          `
          id,
          booking_status,
          start_date,
          end_date,
          price_paid,
          impressions,
          clicks
        `
        )
        .eq('advertiser_id', userId)
        .eq('booking_status', 'active')

      const { data: metrics, error: metricsError } = await supabase
        .from('ad_performance_metrics')
        .select('impressions, clicks, ctr, conversions, spend')
        .eq('booking_id', bookings?.[0]?.id || '')
        .order('metric_date', { ascending: false })
        .limit(30)

      // Log errors but provide default empty data
      if (campaignsError) console.warn('Error fetching campaigns:', campaignsError)
      if (bookingsError) console.warn('Error fetching bookings:', bookingsError)
      if (metricsError) console.warn('Error fetching metrics:', metricsError)

      return {
        campaigns: campaigns || [],
        activeBookings: bookings || [],
        recentMetrics: metrics || [],
      }
    }

    // Legal professional dashboard data
    const { data: bookmarks, error: bookmarksError } = await supabase
      .from('user_bookmarks')
      .select('judge_id')
      .eq('user_id', userId)
      .limit(10)

    const { data: savedSearches, error: savedSearchesError } = await supabase
      .from('user_saved_searches')
      .select('id, search_query, results_count')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5)

    // Log errors but provide default empty data
    if (bookmarksError) console.warn('Error fetching bookmarks:', bookmarksError)
    if (savedSearchesError) console.warn('Error fetching saved searches:', savedSearchesError)

    return {
      bookmarks: bookmarks || [],
      savedSearches: savedSearches || [],
    }
  } catch (error) {
    console.error('Error fetching dashboard data by role:', error)
    // Return safe defaults on error
    return role === 'advertiser'
      ? {
          campaigns: [],
          activeBookings: [],
          recentMetrics: [],
        }
      : {
          bookmarks: [],
          savedSearches: [],
        }
  }
}

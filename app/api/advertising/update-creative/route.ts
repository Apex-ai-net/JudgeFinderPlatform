import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const updateCreativeSchema = z.object({
  advertiser_id: z.string().uuid(),
  description: z.string().max(150).optional(),
  website: z.string().url().optional().nullable(),
  specializations: z.array(z.string()).optional(),
})

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = updateCreativeSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.errors },
        { status: 400 }
      )
    }

    const { advertiser_id, ...updates } = parsed.data
    const supabase = await createClient()

    // Verify advertiser ownership
    const { data: profile } = await supabase
      .from('advertiser_profiles')
      .select('id, user_id')
      .eq('id', advertiser_id)
      .single()

    if (!profile || profile.user_id !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Update advertiser profile
    const { data, error } = await supabase
      .from('advertiser_profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', advertiser_id)
      .select()
      .single()

    if (error) {
      console.error('[Update Creative] Failed to update profile:', error)
      return NextResponse.json({ error: 'Failed to update creative content' }, { status: 500 })
    }

    return NextResponse.json({
      profile: data,
      message: 'Creative content updated successfully',
    })
  } catch (error) {
    console.error('[Update Creative] Error:', error)
    return NextResponse.json({ error: 'Failed to update creative content' }, { status: 500 })
  }
}

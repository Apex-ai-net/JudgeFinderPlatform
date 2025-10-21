import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'

// Maximum file size: 2MB
const MAX_FILE_SIZE = 2 * 1024 * 1024

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const advertiserId = formData.get('advertiser_id') as string

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!advertiserId) {
      return NextResponse.json({ error: 'Advertiser ID required' }, { status: 400 })
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large. Maximum size is 2MB' }, { status: 400 })
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Invalid file type. Only images are allowed' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Verify advertiser ownership
    const { data: profile } = await supabase
      .from('advertiser_profiles')
      .select('id, user_id')
      .eq('id', advertiserId)
      .single()

    if (!profile || profile.user_id !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Generate unique filename
    const fileExtension = file.name.split('.').pop() || 'jpg'
    const fileName = `${randomUUID()}.${fileExtension}`

    // Save file to public/uploads/logos directory
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'logos')
    await mkdir(uploadDir, { recursive: true })

    const filePath = join(uploadDir, fileName)
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    // Generate public URL
    const logoUrl = `/uploads/logos/${fileName}`

    // Update advertiser profile with logo URL
    const { error: updateError } = await supabase
      .from('advertiser_profiles')
      .update({
        logo_url: logoUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', advertiserId)

    if (updateError) {
      console.error('[Upload Logo] Failed to update profile:', updateError)
      return NextResponse.json({ error: 'Failed to save logo reference' }, { status: 500 })
    }

    return NextResponse.json({
      logo_url: logoUrl,
      message: 'Logo uploaded successfully',
    })
  } catch (error) {
    console.error('[Upload Logo] Error:', error)
    return NextResponse.json({ error: 'Failed to upload logo' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { advertiser_id } = body

    if (!advertiser_id) {
      return NextResponse.json({ error: 'Advertiser ID required' }, { status: 400 })
    }

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

    // Remove logo URL from profile
    const { error: updateError } = await supabase
      .from('advertiser_profiles')
      .update({
        logo_url: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', advertiser_id)

    if (updateError) {
      console.error('[Delete Logo] Failed to update profile:', updateError)
      return NextResponse.json({ error: 'Failed to remove logo' }, { status: 500 })
    }

    // Note: We don't delete the actual file from disk to prevent breaking any cached references
    // Files can be cleaned up periodically via a cron job

    return NextResponse.json({
      message: 'Logo removed successfully',
    })
  } catch (error) {
    console.error('[Delete Logo] Error:', error)
    return NextResponse.json({ error: 'Failed to remove logo' }, { status: 500 })
  }
}

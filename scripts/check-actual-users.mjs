#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://xstlnicbnzdxlgfiewmg.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function main() {
  // Get actual users
  const { data: users, error } = await supabase
    .from('app_users')
    .select('clerk_user_id, email, is_admin')

  if (error) {
    console.log('Error:', error)
  } else {
    console.log('\nActual app_users:')
    console.log(JSON.stringify(users, null, 2))

    // Now try to insert into onboarding_analytics with a real user
    if (users && users.length > 0) {
      console.log('\n\nTrying to insert onboarding analytics for:', users[0].clerk_user_id)

      const { data: insertData, error: insertError } = await supabase
        .from('onboarding_analytics')
        .insert({
          user_id: users[0].clerk_user_id,
          onboarding_started_at: new Date().toISOString(),
        })
        .select()

      if (insertError) {
        console.log('Insert Error:', insertError)
      } else {
        console.log('✓ Insert successful:', insertData)

        // Clean up
        if (insertData && insertData[0]?.id) {
          const { error: deleteError } = await supabase
            .from('onboarding_analytics')
            .delete()
            .eq('id', insertData[0].id)

          if (!deleteError) {
            console.log('✓ Test record cleaned up')
          }
        }
      }
    }
  }
}

main().catch(console.error)

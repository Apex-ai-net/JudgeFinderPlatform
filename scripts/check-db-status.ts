#!/usr/bin/env tsx
import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(__dirname, '../.env.local') })

import { createClient } from '@supabase/supabase-js'

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Check courts
  const { data: courts, error: courtError, count } = await supabase
    .from('courts')
    .select('*', { count: 'exact', head: false })
    .limit(10)

  console.log('\n📊 Current Database Status:')
  console.log('='.repeat(50))
  console.log(`Total Courts: ${count || 0}`)

  if (courts && courts.length > 0) {
    console.log('\nRecent Courts:')
    courts.slice(0, 5).forEach((c: any) => {
      console.log(`  - ${c.name} (${c.id})`)
    })
  }

  // Check judges
  const { count: judgeCount } = await supabase
    .from('judges')
    .select('*', { count: 'exact', head: true })

  console.log(`\nTotal Judges: ${judgeCount || 0}`)
  console.log('='.repeat(50) + '\n')
}

main().catch(console.error)

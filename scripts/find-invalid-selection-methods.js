/**
 * Find judges with invalid selection_method values
 */

const { createClient } = require('@supabase/supabase-js')

// Supabase client configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

const VALID_SELECTION_METHODS = [
  'appointed',
  'elected',
  'merit_selection',
  'legislative_appointment',
  'retention_election',
  'commission_appointment'
]

async function findInvalidSelectionMethods() {
  console.log('Querying judges with invalid selection_method values...\n')

  const { data: judges, error } = await supabase
    .from('judges')
    .select('id, name, slug, selection_method, court_name, jurisdiction')
    .not('selection_method', 'is', null)
    .limit(1000)

  if (error) {
    console.error('Error querying judges:', error)
    process.exit(1)
  }

  // Filter for invalid values
  const invalidJudges = judges.filter(judge =>
    !VALID_SELECTION_METHODS.includes(judge.selection_method)
  )

  if (invalidJudges.length === 0) {
    console.log('✅ No judges found with invalid selection_method values!')
    return
  }

  console.log(`Found ${invalidJudges.length} judges with invalid selection_method values:\n`)

  // Group by selection_method value
  const grouped = invalidJudges.reduce((acc, judge) => {
    const method = judge.selection_method || 'null'
    if (!acc[method]) {
      acc[method] = []
    }
    acc[method].push(judge)
    return acc
  }, {})

  // Display results
  Object.entries(grouped).forEach(([method, judges]) => {
    console.log(`\n📋 selection_method = "${method}" (${judges.length} judges):`)
    console.log('─'.repeat(80))

    judges.slice(0, 10).forEach(judge => {
      const courtCategory = judge.court_name?.toLowerCase().includes('federal') ||
                           judge.court_name?.toLowerCase().includes('district court') ||
                           judge.court_name?.toLowerCase().includes('court of appeals')
        ? 'federal (likely appointed)'
        : judge.court_name?.toLowerCase().includes('superior')
          ? 'state superior (likely elected)'
          : 'unknown'

      console.log(`  • ${judge.name}`)
      console.log(`    Slug: ${judge.slug}`)
      console.log(`    Court: ${judge.court_name || 'N/A'}`)
      console.log(`    Jurisdiction: ${judge.jurisdiction || 'N/A'}`)
      console.log(`    Category: ${courtCategory}`)
      console.log(`    ID: ${judge.id}`)
      console.log()
    })

    if (judges.length > 10) {
      console.log(`  ... and ${judges.length - 10} more judges`)
    }
  })

  console.log('\n' + '='.repeat(80))
  console.log(`Total: ${invalidJudges.length} judges with invalid selection_method values`)
  console.log('='.repeat(80))
}

findInvalidSelectionMethods()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Script failed:', error)
    process.exit(1)
  })

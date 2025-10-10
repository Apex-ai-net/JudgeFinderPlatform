const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkJudgeData() {
  console.log('\n=== JUDGE ANALYTICS DATA VERIFICATION ===\n')

  // Get sample of judges with case counts
  const { data: judges, error } = await supabase
    .from('judges')
    .select('id, name, court_name, total_cases')
    .order('total_cases', { ascending: false })
    .limit(10)

  if (error) {
    console.error('Error fetching judges:', error)
    return
  }

  console.log('Top 10 Judges by Profile Case Count:\n')
  console.log(
    'Judge Name                    | Court                  | Profile Total | Actual | Decided | Pending | Recent (5yr)'
  )
  console.log('-'.repeat(120))

  for (const judge of judges) {
    // Count actual cases
    const { count: totalCases } = await supabase
      .from('cases')
      .select('*', { count: 'exact', head: true })
      .eq('judge_id', judge.id)

    // Count decided cases (with decision_date)
    const { count: decidedCases } = await supabase
      .from('cases')
      .select('*', { count: 'exact', head: true })
      .eq('judge_id', judge.id)
      .not('decision_date', 'is', null)

    // Count recent cases (5 years)
    const fiveYearsAgo = new Date()
    fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5)
    const { count: recentCases } = await supabase
      .from('cases')
      .select('*', { count: 'exact', head: true })
      .eq('judge_id', judge.id)
      .gte('filing_date', fiveYearsAgo.toISOString().split('T')[0])

    const pendingCases = (totalCases || 0) - (decidedCases || 0)

    const name = judge.name.substring(0, 28).padEnd(28)
    const court = (judge.court_name || 'N/A').substring(0, 22).padEnd(22)
    const profileTotal = (judge.total_cases || 0).toString().padStart(6)
    const actual = (totalCases || 0).toString().padStart(6)
    const decided = (decidedCases || 0).toString().padStart(7)
    const pending = pendingCases.toString().padStart(7)
    const recent = (recentCases || 0).toString().padStart(12)

    console.log(
      `${name} | ${court} | ${profileTotal} | ${actual} | ${decided} | ${pending} | ${recent}`
    )
  }

  console.log('\n=== ANALYTICS CACHE STATUS ===\n')

  // Check analytics cache table
  const { count: cachedAnalytics } = await supabase
    .from('judge_analytics_cache')
    .select('*', { count: 'exact', head: true })

  console.log(`Total judges with cached analytics: ${cachedAnalytics || 0}`)

  // Get sample of cached analytics
  const { data: cacheEntries, error: cacheError } = await supabase
    .from('judge_analytics_cache')
    .select('judge_id, created_at, updated_at, analytics')
    .order('updated_at', { ascending: false })
    .limit(5)

  if (!cacheError && cacheEntries && cacheEntries.length > 0) {
    console.log('\nMost recent 5 cached analytics:')
    console.log('Judge ID (first 8) | Created At          | Updated At          | Has Analytics')
    console.log('-'.repeat(90))

    for (const entry of cacheEntries) {
      const judgeId = entry.judge_id.substring(0, 8)
      const created = new Date(entry.created_at).toISOString().split('T')[0]
      const updated = new Date(entry.updated_at).toISOString().split('T')[0]
      const hasAnalytics = entry.analytics ? 'Yes' : 'No'

      console.log(
        `${judgeId}         | ${created}          | ${updated}          | ${hasAnalytics}`
      )

      if (entry.analytics && entry.analytics.total_cases_analyzed !== undefined) {
        console.log(
          `  ↳ Total cases analyzed: ${entry.analytics.total_cases_analyzed}, Quality: ${entry.analytics.analysis_quality || 'N/A'}`
        )
      }
    }
  }

  console.log('\n=== CASE TYPE DISTRIBUTION (for analytics) ===\n')

  // Check case types distribution
  const { data: caseTypes, error: caseTypesError } = await supabase
    .from('cases')
    .select('case_type')
    .not('decision_date', 'is', null)
    .limit(1000)

  if (!caseTypesError && caseTypes) {
    const typeCounts = {}
    caseTypes.forEach((c) => {
      const type = c.case_type || 'Unknown'
      typeCounts[type] = (typeCounts[type] || 0) + 1
    })

    const sortedTypes = Object.entries(typeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)

    console.log('Top 10 case types (decided cases only):')
    sortedTypes.forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`)
    })
  }

  console.log('\n=== DIAGNOSIS ===\n')

  // Count judges with sufficient data for analytics
  const { data: allJudges } = await supabase.from('judges').select('id')

  let sufficientDataCount = 0

  if (allJudges && allJudges.length > 0) {
    // Sample first 50 judges
    const sampleSize = Math.min(50, allJudges.length)

    for (let i = 0; i < sampleSize; i++) {
      const { count: decidedCases } = await supabase
        .from('cases')
        .select('*', { count: 'exact', head: true })
        .eq('judge_id', allJudges[i].id)
        .not('decision_date', 'is', null)

      if (decidedCases && decidedCases >= 15) {
        sufficientDataCount++
      }
    }

    const percentSufficient = ((sufficientDataCount / sampleSize) * 100).toFixed(1)

    console.log(`Sample of ${sampleSize} judges checked:`)
    console.log(`  - ${sufficientDataCount} have ≥15 decided cases (${percentSufficient}%)`)
    console.log(
      `  - ${sampleSize - sufficientDataCount} have <15 decided cases (insufficient for analytics)`
    )
  }

  console.log('\n=== RECOMMENDATIONS ===\n')
  console.log('1. Check if judges with "Pending" cases need decision_date populated')
  console.log(
    '2. Verify analytics cache is being generated (POST /api/judges/[id]/analytics?force=true)'
  )
  console.log('3. Ensure judges have ≥15 cases in EACH category (civil, custody, criminal, etc.)')
  console.log('4. Check browser console and network tab on live site for API errors')
  console.log('5. Verify environment variables are configured in Netlify')

  console.log('\n')
}

checkJudgeData().catch(console.error)

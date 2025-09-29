// Trigger production judges sync without exposing secrets in logs
// Usage: node scripts/trigger-judges-sync.js [--force]

/* eslint-disable no-console */
require('dotenv').config({ path: '.env.local' })

const endpoint = process.env.PROD_JUDGES_SYNC_ENDPOINT || 'https://olms-4375-tw501-x421.netlify.app/api/sync/judges'
const apiKey = process.env.SYNC_API_KEY

if (!apiKey) {
  console.error('Missing SYNC_API_KEY in environment. Add it to .env.local or your environment variables.')
  process.exit(1)
}

const force = process.argv.includes('--force')
const payload = {
  batchSize: 20,
  jurisdiction: 'CA',
  forceRefresh: !!force,
}

async function main() {
  console.log(`Triggering production judge sync ${force ? '(force)' : ''}...`)
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify(payload),
  })
  const text = await res.text()
  try {
    const json = JSON.parse(text)
    console.log('Status:', res.status)
    console.log('Result:', JSON.stringify(json, null, 2))
  } catch {
    console.log('Status:', res.status)
    console.log('Body:', text)
  }
}

main().catch((err) => {
  console.error('Failed to trigger judge sync:', err?.message || err)
  process.exit(1)
})



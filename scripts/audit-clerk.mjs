#!/usr/bin/env node

/**
 * Clerk Sign-In Audit Script
 *
 * Uses Puppeteer to instrument the /sign-in page and capture:
 * - Console logs (errors, warnings)
 * - Network requests (filtered for Clerk-related)
 * - Screenshots
 * - Page errors
 *
 * Exit codes:
 * - 0: Success (no Clerk errors detected)
 * - 2: Clerk configuration issues detected
 * - 1: Script execution error
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Configuration
const SIGNIN_URL = process.env.SIGNIN_URL || 'https://judgefinder.io/sign-in'
const TIMEOUT_MS = 60000

// Get artifacts directory from timestamp file
let ARTIFACTS_DIR
try {
  const timestamp = (await fs.readFile('.artifacts-timestamp', 'utf-8')).trim()
  ARTIFACTS_DIR = path.join(process.cwd(), 'artifacts', `jf-auth-billing-${timestamp}`)
} catch {
  // Fallback if timestamp file doesn't exist
  const now = new Date()
  const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`
  ARTIFACTS_DIR = path.join(process.cwd(), 'artifacts', `jf-auth-billing-${timestamp}`)
}

// Ensure artifacts directory exists
await fs.mkdir(ARTIFACTS_DIR, { recursive: true })

console.log('========================================')
console.log('Clerk Sign-In Page Audit')
console.log('========================================')
console.log(`Target URL: ${SIGNIN_URL}`)
console.log(`Artifacts: ${ARTIFACTS_DIR}`)
console.log('')

// Check if puppeteer is installed
let puppeteer
try {
  puppeteer = await import('puppeteer')
} catch (error) {
  console.error('❌ Puppeteer not installed')
  console.error('Please run: npm install puppeteer --save-dev')
  process.exit(1)
}

const browser = await puppeteer.default.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
})

const page = await browser.newPage()

// Capture network requests (filter for Clerk-related)
const networkRequests = []
page.on('response', async (response) => {
  const url = response.url()
  // Filter for Clerk-related requests
  if (url.includes('clerk') || url.includes('/v1/client')) {
    networkRequests.push({
      url,
      status: response.status(),
      ok: response.ok(),
      type: response.request().resourceType(),
      headers: response.headers(),
    })
  }
})

// Capture console messages
const consoleMessages = []
page.on('console', (msg) => {
  const text = msg.text()
  consoleMessages.push(`[${msg.type()}] ${text}`)
})

// Capture page errors
page.on('pageerror', (error) => {
  consoleMessages.push(`[pageerror] ${error.message}`)
})

try {
  console.log('🚀 Navigating to sign-in page...')
  await page.goto(SIGNIN_URL, {
    waitUntil: 'networkidle2',
    timeout: TIMEOUT_MS,
  })

  console.log('✓ Page loaded')

  // Take screenshot
  const screenshotPath = path.join(ARTIFACTS_DIR, 'sign-in.png')
  await page.screenshot({
    path: screenshotPath,
    fullPage: true,
  })
  console.log(`✓ Screenshot saved: ${screenshotPath}`)

  // Save console logs
  const consolePath = path.join(ARTIFACTS_DIR, 'sign-in-console.txt')
  await fs.writeFile(consolePath, consoleMessages.join('\n'))
  console.log(`✓ Console logs saved: ${consolePath}`)

  // Save network requests
  const networkPath = path.join(ARTIFACTS_DIR, 'sign-in-network.json')
  await fs.writeFile(networkPath, JSON.stringify(networkRequests, null, 2))
  console.log(`✓ Network logs saved: ${networkPath}`)

  // Analyze for Clerk errors
  console.log('')
  console.log('========================================')
  console.log('Analysis')
  console.log('========================================')

  const hasClerkErrors = consoleMessages.some(
    (line) =>
      line.toLowerCase().includes('missing publishablekey') ||
      (line.toLowerCase().includes('clerk') && line.toLowerCase().includes('error'))
  )

  const failedClerkRequests = networkRequests.filter((req) => !req.ok)

  let exitCode = 0

  if (hasClerkErrors) {
    console.error('❌ Clerk configuration errors detected in console:')
    consoleMessages
      .filter(
        (line) =>
          line.toLowerCase().includes('clerk') || line.toLowerCase().includes('publishablekey')
      )
      .forEach((line) => console.error(`   ${line}`))
    exitCode = 2
  } else {
    console.log('✓ No Clerk console errors')
  }

  if (failedClerkRequests.length > 0) {
    console.error('❌ Failed Clerk network requests:')
    failedClerkRequests.forEach((req) => {
      console.error(`   ${req.status} ${req.url}`)
    })
    exitCode = 2
  } else {
    console.log('✓ All Clerk network requests succeeded')
  }

  console.log('')
  console.log(`Total console messages: ${consoleMessages.length}`)
  console.log(`Total Clerk requests: ${networkRequests.length}`)
  console.log(`Failed Clerk requests: ${failedClerkRequests.length}`)

  if (exitCode === 0) {
    console.log('')
    console.log('✅ Sign-in page audit PASSED')
  } else {
    console.log('')
    console.log('❌ Sign-in page audit FAILED')
    console.log('Review artifacts for details')
  }

  await browser.close()
  process.exit(exitCode)
} catch (error) {
  console.error('❌ Audit script error:', error.message)
  await browser.close()
  process.exit(1)
}

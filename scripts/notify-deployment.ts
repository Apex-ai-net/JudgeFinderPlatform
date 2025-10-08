#!/usr/bin/env ts-node
/**
 * Deployment Notification Script
 *
 * Sends notifications to configured channels when a deployment completes.
 * Supports: Slack, Discord, Email (optional)
 *
 * Usage:
 *   ts-node scripts/notify-deployment.ts
 *
 * Environment Variables:
 *   DEPLOY_HOOK_URL - Slack/Discord webhook URL
 *   DEPLOY_NOTIFICATION_TYPE - 'slack' | 'discord' (default: slack)
 *   NETLIFY_SITE_NAME - Site name for display
 *   DEPLOY_PRIME_URL - Deployment URL
 *   COMMIT_REF - Git commit hash
 *   CONTEXT - Deploy context (production, deploy-preview, branch-deploy)
 */

interface DeploymentInfo {
  siteName: string
  environment: string
  deployUrl: string
  commitHash: string
  commitMessage: string
  deployedBy: string
  timestamp: string
  healthStatus?: HealthCheckResult
}

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy'
  responseTime: number
  checks: {
    database: string
    redis: string
    memory: string
    external_apis: string
  }
}

/**
 * Get deployment information from environment
 */
function getDeploymentInfo(): DeploymentInfo {
  const siteName = process.env.NETLIFY_SITE_NAME || process.env.SITE_NAME || 'JudgeFinder Platform'
  const environment = process.env.CONTEXT || process.env.DEPLOY_CONTEXT || 'production'
  const deployUrl = process.env.DEPLOY_PRIME_URL || process.env.DEPLOY_URL || 'https://judgefinder.io'
  const commitHash = process.env.COMMIT_REF || process.env.GITHUB_SHA || 'unknown'
  const commitMessage = process.env.COMMIT_MESSAGE || 'No commit message'
  const deployedBy = process.env.DEPLOY_USER || process.env.GITHUB_ACTOR || 'Automated'
  const timestamp = new Date().toISOString()

  return {
    siteName,
    environment,
    deployUrl,
    commitHash: commitHash.substring(0, 7),
    commitMessage,
    deployedBy,
    timestamp
  }
}

/**
 * Check health endpoint
 */
async function checkHealth(deployUrl: string): Promise<HealthCheckResult | undefined> {
  try {
    const healthUrl = `${deployUrl}/api/health`
    console.log(`Checking health at: ${healthUrl}`)

    const startTime = Date.now()
    const response = await fetch(healthUrl, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(10000) // 10 second timeout
    })

    const responseTime = Date.now() - startTime

    if (!response.ok) {
      console.warn(`Health check returned status ${response.status}`)
      return undefined
    }

    const data = await response.json()

    return {
      status: data.status || 'unknown',
      responseTime,
      checks: data.checks || {
        database: 'unknown',
        redis: 'unknown',
        memory: 'unknown',
        external_apis: 'unknown'
      }
    }
  } catch (error) {
    console.error('Health check failed:', error)
    return undefined
  }
}

/**
 * Format message for Slack
 */
function formatSlackMessage(info: DeploymentInfo): object {
  const statusColor =
    info.healthStatus?.status === 'healthy' ? 'good' :
    info.healthStatus?.status === 'degraded' ? 'warning' : 'danger'

  const statusEmoji =
    info.healthStatus?.status === 'healthy' ? ':white_check_mark:' :
    info.healthStatus?.status === 'degraded' ? ':warning:' : ':x:'

  const envEmoji =
    info.environment === 'production' ? ':rocket:' :
    info.environment === 'deploy-preview' ? ':mag:' : ':construction:'

  let fields = [
    {
      title: 'Environment',
      value: `${envEmoji} ${info.environment}`,
      short: true
    },
    {
      title: 'Deployed By',
      value: info.deployedBy,
      short: true
    },
    {
      title: 'Commit',
      value: `\`${info.commitHash}\``,
      short: true
    },
    {
      title: 'Timestamp',
      value: new Date(info.timestamp).toLocaleString('en-US', {
        timeZone: 'America/Los_Angeles',
        dateStyle: 'short',
        timeStyle: 'short'
      }),
      short: true
    }
  ]

  if (info.healthStatus) {
    fields.push({
      title: 'Health Status',
      value: `${statusEmoji} ${info.healthStatus.status.toUpperCase()}`,
      short: true
    })
    fields.push({
      title: 'Response Time',
      value: `${info.healthStatus.responseTime}ms`,
      short: true
    })
  }

  return {
    username: 'Deployment Bot',
    icon_emoji: ':rocket:',
    attachments: [
      {
        color: statusColor,
        fallback: `Deployment: ${info.siteName} - ${info.environment}`,
        title: `Deployment Complete: ${info.siteName}`,
        title_link: info.deployUrl,
        text: info.commitMessage,
        fields,
        footer: 'JudgeFinder Platform',
        footer_icon: 'https://judgefinder.io/favicon.ico',
        ts: Math.floor(new Date(info.timestamp).getTime() / 1000)
      }
    ]
  }
}

/**
 * Format message for Discord
 */
function formatDiscordMessage(info: DeploymentInfo): object {
  const statusColor =
    info.healthStatus?.status === 'healthy' ? 0x00ff00 : // Green
    info.healthStatus?.status === 'degraded' ? 0xffaa00 : // Orange
    0xff0000 // Red

  const statusEmoji =
    info.healthStatus?.status === 'healthy' ? '✅' :
    info.healthStatus?.status === 'degraded' ? '⚠️' : '❌'

  const envEmoji =
    info.environment === 'production' ? '🚀' :
    info.environment === 'deploy-preview' ? '🔍' : '🚧'

  let fields = [
    {
      name: 'Environment',
      value: `${envEmoji} ${info.environment}`,
      inline: true
    },
    {
      name: 'Deployed By',
      value: info.deployedBy,
      inline: true
    },
    {
      name: 'Commit',
      value: `\`${info.commitHash}\``,
      inline: true
    }
  ]

  if (info.healthStatus) {
    fields.push({
      name: 'Health Status',
      value: `${statusEmoji} ${info.healthStatus.status.toUpperCase()}`,
      inline: true
    })
    fields.push({
      name: 'Response Time',
      value: `${info.healthStatus.responseTime}ms`,
      inline: true
    })
  }

  return {
    username: 'Deployment Bot',
    avatar_url: 'https://judgefinder.io/favicon.ico',
    embeds: [
      {
        title: `Deployment Complete: ${info.siteName}`,
        url: info.deployUrl,
        description: info.commitMessage,
        color: statusColor,
        fields,
        timestamp: info.timestamp,
        footer: {
          text: 'JudgeFinder Platform'
        }
      }
    ]
  }
}

/**
 * Send notification to webhook
 */
async function sendNotification(webhookUrl: string, payload: object): Promise<boolean> {
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      console.error(`Webhook request failed: ${response.status} ${response.statusText}`)
      return false
    }

    console.log('Notification sent successfully')
    return true
  } catch (error) {
    console.error('Failed to send notification:', error)
    return false
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('JudgeFinder Deployment Notification')
  console.log('=====================================')

  // Check if webhook URL is configured
  const webhookUrl = process.env.DEPLOY_HOOK_URL
  if (!webhookUrl) {
    console.log('No DEPLOY_HOOK_URL configured. Skipping notification.')
    return
  }

  // Get deployment info
  const deployInfo = getDeploymentInfo()
  console.log('Deployment Info:')
  console.log(`  Site: ${deployInfo.siteName}`)
  console.log(`  Environment: ${deployInfo.environment}`)
  console.log(`  URL: ${deployInfo.deployUrl}`)
  console.log(`  Commit: ${deployInfo.commitHash}`)
  console.log(`  Deployed By: ${deployInfo.deployedBy}`)

  // Check health endpoint
  console.log('\nChecking deployment health...')
  const healthStatus = await checkHealth(deployInfo.deployUrl)

  if (healthStatus) {
    console.log(`  Status: ${healthStatus.status}`)
    console.log(`  Response Time: ${healthStatus.responseTime}ms`)
    deployInfo.healthStatus = healthStatus
  } else {
    console.log('  Health check failed or timed out')
  }

  // Determine notification type
  const notificationType = process.env.DEPLOY_NOTIFICATION_TYPE || 'slack'
  console.log(`\nSending ${notificationType} notification...`)

  // Format and send message
  let payload: object
  if (notificationType === 'discord') {
    payload = formatDiscordMessage(deployInfo)
  } else {
    payload = formatSlackMessage(deployInfo)
  }

  const success = await sendNotification(webhookUrl, payload)

  if (success) {
    console.log('\n✓ Deployment notification sent successfully!')
  } else {
    console.error('\n✗ Failed to send deployment notification')
    process.exit(1)
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
}

export { getDeploymentInfo, checkHealth, formatSlackMessage, formatDiscordMessage, sendNotification }

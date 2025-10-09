import { NextRequest, NextResponse } from 'next/server'
import { createSecurityConfig, getCORSHeaders } from '@/lib/security/headers'
import { enforceRateLimit, getClientKey } from '@/lib/security/rate-limit'
import { logger } from '@/lib/utils/logger'
import { getBaseUrl } from '@/lib/utils/baseUrl'
import { ssrFetch } from '@/lib/utils/baseFetch'

// Add dynamic export for Vercel deployment
export const dynamic = 'force-dynamic'

function withCors(response: NextResponse): void {
  const cors = getCORSHeaders(createSecurityConfig())
  Object.entries(cors).forEach(([k, v]) => response.headers.set(k, v))
  response.headers.set('Vary', 'Origin')
  return response
}

function forwardHeaders(req: NextRequest): HeadersInit {
  const src = req.headers
  const headers: Record<string, string> = {
    Accept: 'application/json',
  }
  const passThrough = ['x-forwarded-for', 'x-real-ip', 'accept-language', 'user-agent']
  for (const key of passThrough) {
    const val = src.get(key)
    if (val) headers[key] = val
  }
  return headers
}

export async function OPTIONS(): Promise<void> {
  const res = new NextResponse(null, { status: 204 })
  return withCors(res)
}

// Basic MCP (Model Context Protocol) server endpoint
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Rate limit first
    const clientKey = getClientKey(request.headers)
    const rl = await enforceRateLimit(`mcp:${clientKey}`)
    if (!rl.allowed) {
      const retryAfter = rl.reset ? Math.max(1, Math.ceil((rl.reset - Date.now()) / 1000)) : 60
      const res = NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
      res.headers.set('Retry-After', String(retryAfter))
      return withCors(res)
    }

    // Enforce secure Bearer token (no hardcoded fallback)
    const expectedToken = process.env.VERCEL_MCP_TOKEN
    if (!expectedToken) {
      logger.error('MCP token not configured in environment')
      const res = NextResponse.json(
        { error: 'Server misconfiguration: MCP token missing' },
        { status: 500 }
      )
      return withCors(res)
    }

    const authHeader = request.headers.get('authorization') || ''
    const providedToken = authHeader.toLowerCase().startsWith('bearer ')
      ? authHeader.slice(7).trim()
      : null

    if (!providedToken || providedToken !== expectedToken) {
      const res = NextResponse.json(
        { error: 'Missing or invalid authorization token' },
        { status: 401 }
      )
      return withCors(res)
    }

    const body = await request.json()

    // Handle MCP protocol methods
    switch (body.method) {
      case 'initialize':
        return withCors(
          NextResponse.json({
            jsonrpc: '2.0',
            id: body.id,
            result: {
              protocolVersion: '2024-11-05',
              capabilities: {
                logging: {},
                prompts: {
                  listChanged: true,
                },
                resources: {
                  subscribe: true,
                  listChanged: true,
                },
                tools: {
                  listChanged: true,
                },
              },
              serverInfo: {
                name: 'JudgeFinder Platform MCP Server',
                version: '1.0.0',
              },
            },
          })
        )

      case 'notifications/initialized':
        return withCors(
          NextResponse.json({
            jsonrpc: '2.0',
            id: body.id,
            result: {},
          })
        )

      case 'ping':
        return withCors(
          NextResponse.json({
            jsonrpc: '2.0',
            id: body.id,
            result: {
              status: 'ok',
              timestamp: new Date().toISOString(),
              server: 'JudgeFinder Platform',
            },
          })
        )

      case 'tools/list':
        return withCors(
          NextResponse.json({
            jsonrpc: '2.0',
            id: body.id,
            result: {
              tools: [
                {
                  name: 'search_judges',
                  description: 'Search for California judges by name or jurisdiction',
                  inputSchema: {
                    type: 'object',
                    properties: {
                      query: {
                        type: 'string',
                        description: 'Search query for judge name or court',
                      },
                      limit: {
                        type: 'number',
                        description: 'Maximum number of results',
                        default: 10,
                      },
                    },
                    required: ['query'],
                  },
                },
                {
                  name: 'get_judge_analytics',
                  description: 'Get AI-powered analytics for a specific judge',
                  inputSchema: {
                    type: 'object',
                    properties: {
                      judge_id: {
                        type: 'string',
                        description: 'Unique judge identifier',
                      },
                    },
                    required: ['judge_id'],
                  },
                },
                {
                  name: 'get_bias_analysis',
                  description: 'Get bias analysis metrics for a judge',
                  inputSchema: {
                    type: 'object',
                    properties: {
                      judge_id: {
                        type: 'string',
                        description: 'Unique judge identifier',
                      },
                    },
                    required: ['judge_id'],
                  },
                },
              ],
            },
          })
        )

      case 'tools/call':
        const toolName = body.params?.name
        const toolArgs = body.params?.arguments

        if (toolName === 'search_judges') {
          const baseUrl = getBaseUrl()
          const query = String(toolArgs?.query || '').trim()
          const limit = Math.max(1, Math.min(50, Number(toolArgs?.limit ?? 10)))
          const url = `${baseUrl}/api/judges/search?q=${encodeURIComponent(query)}&limit=${limit}`

          try {
            const res = await ssrFetch(url, { method: 'GET', headers: forwardHeaders(request) })
            const data = await res.json()
            if (!res.ok) {
              throw new Error(`Upstream ${res.status}`)
            }
            return withCors(
              NextResponse.json({
                jsonrpc: '2.0',
                id: body.id,
                result: {
                  content: [{ type: 'json', json: data }],
                },
              })
            )
          } catch (err) {
            logger.error(
              'search_judges tool failed',
              { scope: 'mcp', tool: 'search_judges' },
              err as Error
            )
            return withCors(
              NextResponse.json(
                {
                  jsonrpc: '2.0',
                  id: body.id,
                  error: { code: -32001, message: 'search_judges failed' },
                },
                { status: 502 }
              )
            )
          }
        }

        if (toolName === 'get_judge_analytics') {
          const baseUrl = getBaseUrl()
          const judgeId = String(toolArgs?.judge_id || '').trim()
          const url = `${baseUrl}/api/judges/${encodeURIComponent(judgeId)}/analytics`

          try {
            const res = await ssrFetch(url, { method: 'GET', headers: forwardHeaders(request) })
            const data = await res.json()
            if (!res.ok) {
              throw new Error(`Upstream ${res.status}`)
            }
            return withCors(
              NextResponse.json({
                jsonrpc: '2.0',
                id: body.id,
                result: {
                  content: [{ type: 'json', json: data }],
                },
              })
            )
          } catch (err) {
            logger.error(
              'get_judge_analytics tool failed',
              { scope: 'mcp', tool: 'get_judge_analytics' },
              err as Error
            )
            return withCors(
              NextResponse.json(
                {
                  jsonrpc: '2.0',
                  id: body.id,
                  error: { code: -32002, message: 'get_judge_analytics failed' },
                },
                { status: 502 }
              )
            )
          }
        }

        if (toolName === 'get_bias_analysis') {
          const baseUrl = getBaseUrl()
          const judgeId = String(toolArgs?.judge_id || '').trim()
          const url = `${baseUrl}/api/judges/${encodeURIComponent(judgeId)}/bias-analysis`

          try {
            const res = await ssrFetch(url, { method: 'GET', headers: forwardHeaders(request) })
            const data = await res.json()
            if (!res.ok) {
              throw new Error(`Upstream ${res.status}`)
            }
            return withCors(
              NextResponse.json({
                jsonrpc: '2.0',
                id: body.id,
                result: {
                  content: [{ type: 'json', json: data }],
                },
              })
            )
          } catch (err) {
            logger.error(
              'get_bias_analysis tool failed',
              { scope: 'mcp', tool: 'get_bias_analysis' },
              err as Error
            )
            return withCors(
              NextResponse.json(
                {
                  jsonrpc: '2.0',
                  id: body.id,
                  error: { code: -32003, message: 'get_bias_analysis failed' },
                },
                { status: 502 }
              )
            )
          }
        }

        return withCors(
          NextResponse.json({
            jsonrpc: '2.0',
            id: body.id,
            error: {
              code: -32601,
              message: `Unknown tool: ${toolName}`,
            },
          })
        )

      default:
        return withCors(
          NextResponse.json({
            jsonrpc: '2.0',
            id: body.id,
            error: {
              code: -32601,
              message: `Method not found: ${body.method}`,
            },
          })
        )
    }
  } catch (error) {
    logger.error('MCP endpoint error', { scope: 'mcp' }, error as Error)
    return withCors(
      NextResponse.json(
        {
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: 'Internal error',
            data: error instanceof Error ? error.message : 'Unknown error',
          },
        },
        { status: 500 }
      )
    )
  }
}

// Handle GET requests for health check
export async function GET(): Promise<NextResponse> {
  const res = NextResponse.json({
    status: 'ok',
    service: 'JudgeFinder Platform MCP Server',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    capabilities: ['initialize', 'ping', 'tools/list', 'tools/call'],
  })
  return withCors(res)
}

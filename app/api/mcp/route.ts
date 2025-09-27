import { NextRequest, NextResponse } from 'next/server';

// Add dynamic export for Vercel deployment
export const dynamic = 'force-dynamic';

// Basic MCP (Model Context Protocol) server endpoint
export async function POST(request: NextRequest) {
  try {
    // Verify Bearer token if provided
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.VERCEL_MCP_TOKEN || 'wtkAmuv4WFAGx1Aierbpt4PA';
    
    if (authHeader && !authHeader.includes(expectedToken)) {
      return NextResponse.json(
        { error: 'Invalid authorization token' },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    // Handle MCP protocol methods
    switch (body.method) {
      case 'initialize':
        return NextResponse.json({
          jsonrpc: '2.0',
          id: body.id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: {
              logging: {},
              prompts: {
                listChanged: true
              },
              resources: {
                subscribe: true,
                listChanged: true
              },
              tools: {
                listChanged: true
              }
            },
            serverInfo: {
              name: 'JudgeFinder Platform MCP Server',
              version: '1.0.0'
            }
          }
        });

      case 'notifications/initialized':
        return NextResponse.json({
          jsonrpc: '2.0',
          id: body.id,
          result: {}
        });

      case 'ping':
        return NextResponse.json({
          jsonrpc: '2.0',
          id: body.id,
          result: {
            status: 'ok',
            timestamp: new Date().toISOString(),
            server: 'JudgeFinder Platform'
          }
        });

      case 'tools/list':
        return NextResponse.json({
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
                      description: 'Search query for judge name or court'
                    },
                    limit: {
                      type: 'number',
                      description: 'Maximum number of results',
                      default: 10
                    }
                  },
                  required: ['query']
                }
              },
              {
                name: 'get_judge_analytics',
                description: 'Get AI-powered analytics for a specific judge',
                inputSchema: {
                  type: 'object',
                  properties: {
                    judge_id: {
                      type: 'string',
                      description: 'Unique judge identifier'
                    }
                  },
                  required: ['judge_id']
                }
              }
            ]
          }
        });

      case 'tools/call':
        const toolName = body.params?.name;
        const toolArgs = body.params?.arguments;

        if (toolName === 'search_judges') {
          // Mock response for now - you can integrate with your actual API
          return NextResponse.json({
            jsonrpc: '2.0',
            id: body.id,
            result: {
              content: [
                {
                  type: 'text',
                  text: `Searched for judges matching "${toolArgs?.query}". This is a demo response from the JudgeFinder Platform MCP server.`
                }
              ]
            }
          });
        }

        if (toolName === 'get_judge_analytics') {
          return NextResponse.json({
            jsonrpc: '2.0',
            id: body.id,
            result: {
              content: [
                {
                  type: 'text',
                  text: `Analytics for judge ID ${toolArgs?.judge_id} would be returned here. This is a demo response from the JudgeFinder Platform MCP server.`
                }
              ]
            }
          });
        }

        return NextResponse.json({
          jsonrpc: '2.0',
          id: body.id,
          error: {
            code: -32601,
            message: `Unknown tool: ${toolName}`
          }
        });

      default:
        return NextResponse.json({
          jsonrpc: '2.0',
          id: body.id,
          error: {
            code: -32601,
            message: `Method not found: ${body.method}`
          }
        });
    }
  } catch (error) {
    console.error('MCP endpoint error:', error);
    return NextResponse.json(
      {
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal error',
          data: error instanceof Error ? error.message : 'Unknown error'
        }
      },
      { status: 500 }
    );
  }
}

// Handle GET requests for health check
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'JudgeFinder Platform MCP Server',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    capabilities: ['initialize', 'ping', 'tools/list', 'tools/call']
  });
}

import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createServerClient } from '@/lib/supabase/server'
import { auth } from '@clerk/nextjs/server'
import { verifyTurnstileToken } from '@/lib/auth/turnstile'
import { getClientIp, buildRateLimiter } from '@/lib/security/rate-limit'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

// Chat-specific rate limiter: 20 messages per hour for authenticated users
const chatRateLimiter = buildRateLimiter({
  tokens: 20,
  window: '1 h',
  prefix: 'chat:user',
})

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  : null

const SYSTEM_PROMPT = `You are JudgeFinder AI, a legal information assistant for California's court system.

Your capabilities:
- Provide information about California judges and courts
- Explain bias scores and judicial analytics
- Guide users to relevant judge profiles
- Answer questions about court procedures and jurisdictions
- Help users understand judicial patterns and statistics

Important guidelines:
- NEVER provide legal advice or recommendations
- Always suggest consulting with a qualified attorney for legal matters
- Be professional, helpful, and empathetic
- Use clear, accessible language
- When mentioning specific judges, provide their full name and court
- Focus on factual information from the JudgeFinder database

Available data:
- Statewide California judge directory with bias analytics
- Court coverage across jurisdictions
- AI-powered bias detection metrics
- Case history and judicial patterns
- Court jurisdictions and assignments`

interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export async function POST(request: NextRequest): Promise<Response | NextResponse> {
  try {
    // CRITICAL: Authentication check (protected by middleware, but double-check)
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required. Please sign in to use the AI chatbox.' },
        { status: 401 }
      )
    }

    // Rate limiting: 20 messages per hour per user
    const rateLimitKey = `user:${userId}`
    const rateLimitResult = await chatRateLimiter.limit(rateLimitKey)
    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded. You can send up to 20 messages per hour.',
          remaining: rateLimitResult.remaining,
          reset: rateLimitResult.reset,
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': '20',
            'X-RateLimit-Remaining': String(rateLimitResult.remaining),
            'X-RateLimit-Reset': String(rateLimitResult.reset),
          },
        }
      )
    }

    const body = await request.json()
    const { messages, stream = true, judge_id, judge_slug, turnstileToken } = body

    // Verify Turnstile CAPTCHA token to prevent bot abuse
    if (turnstileToken) {
      const clientIp = getClientIp(request)
      const isValid = await verifyTurnstileToken(turnstileToken, clientIp)
      if (!isValid) {
        return NextResponse.json(
          { error: 'CAPTCHA verification failed. Please try again.' },
          { status: 403 }
        )
      }
    }

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Messages array is required' }, { status: 400 })
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 })
    }

    // Get context about judges if the query mentions any
    // If judge_id or judge_slug is provided, filter context to that specific judge only
    const userQuery = messages[messages.length - 1]?.content || ''
    const context = await getRelevantContext(userQuery, judge_id, judge_slug)

    // Build messages array with system prompt and context
    const chatMessages: ChatMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...context,
      ...messages,
    ]

    if (stream) {
      // Create streaming response
      const streamResponse = await openai!.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: chatMessages as any,
        temperature: 0.7,
        max_tokens: 1000,
        stream: true,
      })

      // Create a readable stream
      const encoder = new TextEncoder()
      const readableStream = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of streamResponse) {
              const text = chunk.choices[0]?.delta?.content || ''
              if (text) {
                const encoded = encoder.encode(`data: ${JSON.stringify({ text })}\n\n`)
                controller.enqueue(encoded)
              }
            }
            controller.enqueue(encoder.encode('data: [DONE]\n\n'))
            controller.close()
          } catch (error) {
            controller.error(error)
          }
        },
      })

      return new Response(readableStream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      })
    } else {
      // Non-streaming response
      const completion = await openai!.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: chatMessages as any,
        temperature: 0.7,
        max_tokens: 1000,
      })

      const responseText = completion.choices[0]?.message?.content || ''

      return NextResponse.json({
        message: responseText,
        usage: completion.usage,
      })
    }
  } catch (error) {
    console.error('Chat API error:', error)

    if (error instanceof OpenAI.APIError) {
      return NextResponse.json(
        { error: `OpenAI API error: ${error.message}` },
        { status: error.status || 500 }
      )
    }

    return NextResponse.json({ error: 'Failed to process chat request' }, { status: 500 })
  }
}

async function getRelevantContext(
  query: string,
  judgeId?: string,
  judgeSlug?: string
): Promise<ChatMessage[]> {
  const context: ChatMessage[] = []

  try {
    const supabase = await createServerClient()

    // PRIORITY 1: If judge_id or judge_slug is provided, fetch ONLY that specific judge
    if (judgeId || judgeSlug) {
      let judgeQuery = supabase
        .from('judges')
        .select(
          'id, name, court_name, appointed_date, case_analytics, jurisdiction, total_cases, slug'
        )
        .limit(1)

      if (judgeId) {
        judgeQuery = judgeQuery.eq('id', judgeId)
      } else if (judgeSlug) {
        judgeQuery = judgeQuery.eq('slug', judgeSlug)
      }

      const { data: judges } = await judgeQuery

      if (judges && judges.length > 0) {
        const judge = judges[0]
        context.push({
          role: 'system',
          content: `User is currently viewing Judge ${judge.name} from ${judge.court_name || 'California'} (${judge.jurisdiction || 'CA'}). Appointed: ${judge.appointed_date || 'unknown'}, Total cases: ${judge.total_cases || 0}. All responses should be SPECIFICALLY about this judge. Do not reference other judges unless explicitly asked to compare.`,
        })
        return context // Return early - only this judge matters
      }
    }

    // PRIORITY 2: If no specific judge, check if query mentions specific judges or courts
    const lowerQuery = query.toLowerCase()

    // Look for judge names (improved pattern matching)
    if (lowerQuery.includes('judge')) {
      // Extract potential judge name (handles "Hon." prefix and "(Ret.)" suffix)
      const nameMatch = query.match(
        /(?:hon\.?\s+)?judge\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s*(?:\(ret\.?\))?/i
      )

      if (nameMatch) {
        const judgeName = nameMatch[1]

        // Use the full-text search function for better results
        const { data: judges, error } = await supabase.rpc('search_judges_ranked', {
          search_query: judgeName,
          result_limit: 5,
          similarity_threshold: 0.3,
        })

        if (!error && judges && judges.length > 0) {
          if (judges.length === 1) {
            // Single match - provide full info
            const j = judges[0]
            context.push({
              role: 'system',
              content: `Judge ${j.name} - ${j.court_name || 'Court not specified'}, ${j.jurisdiction || 'California'}, ${j.total_cases || 0} cases`,
            })
          } else {
            // Multiple matches - ask for disambiguation
            const judgeList = judges
              .slice(0, 5)
              .map(
                (j: any, i: number) =>
                  `${i + 1}. Judge ${j.name} - ${j.court_name || 'Court not specified'} (${j.jurisdiction || 'CA'})`
              )
              .join('\n')

            context.push({
              role: 'system',
              content: `Multiple judges match "${judgeName}". Please ask the user to clarify which judge they mean:\n${judgeList}`,
            })
          }
        }
      }
    }

    // Look for court mentions
    if (lowerQuery.includes('court')) {
      const { data: courts } = await supabase
        .from('courts')
        .select('id, name, location, annual_filings')
        .limit(5)
        .order('annual_filings', { ascending: false })

      if (courts && courts.length > 0) {
        const courtInfo = courts
          .map(
            (c) =>
              `${c.name} - ${c.location || 'Location not specified'}, ${c.annual_filings || 0} annual filings`
          )
          .join('\n')

        context.push({
          role: 'system',
          content: `Top California courts by activity:\n${courtInfo}`,
        })
      }
    }

    // Add platform statistics as context
    if (
      lowerQuery.includes('how many') ||
      lowerQuery.includes('statistics') ||
      lowerQuery.includes('data')
    ) {
      context.push({
        role: 'system',
        content: `Platform statistics:
- Total judges: statewide California coverage
- Total courts: comprehensive jurisdiction coverage
- Total cases analyzed: expanding case library
- AI bias metrics: 5 key indicators (Consistency, Decision Speed, Settlement Preference, Risk Tolerance, Predictability)
- Coverage: All California jurisdictions`,
      })
    }
  } catch (error) {
    console.error('Error fetching context:', error)
  }

  return context
}

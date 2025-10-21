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

// Log OpenAI client initialization status at module load time
console.log('[Chat API Module] OpenAI client initialized:', !!openai)

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
    console.log('[Chat API] Request received')

    // Log environment configuration (without exposing actual keys)
    console.log('[Chat API] Environment check:', {
      hasOpenAIKey: !!process.env.OPENAI_API_KEY,
      openAIKeyLength: process.env.OPENAI_API_KEY?.length || 0,
      hasRedisURL: !!process.env.UPSTASH_REDIS_REST_URL,
      hasRedisToken: !!process.env.UPSTASH_REDIS_REST_TOKEN,
      hasTurnstileSecret: !!process.env.TURNSTILE_SECRET_KEY,
      hasSupabaseURL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      hasSupabaseServiceRole: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      nodeEnv: process.env.NODE_ENV,
    })

    // CRITICAL: Authentication check (protected by middleware, but double-check)
    const { userId } = await auth()
    if (!userId) {
      console.error('[Chat API] Authentication failed: No userId')
      return NextResponse.json(
        { error: 'Authentication required. Please sign in to use the AI chatbox.' },
        { status: 401 }
      )
    }

    console.log('[Chat API] User authenticated:', userId)

    // Rate limiting: 20 messages per hour per user
    const rateLimitKey = `user:${userId}`
    let rateLimitResult
    try {
      rateLimitResult = await chatRateLimiter.limit(rateLimitKey)
    } catch (rateLimitError) {
      console.error('[Chat API] Rate limiter error (continuing without rate limit):', rateLimitError)
      // Continue without rate limiting if Redis is unavailable
      rateLimitResult = { success: true, remaining: 20, reset: Date.now() }
    }

    if (!rateLimitResult.success) {
      console.warn('[Chat API] Rate limit exceeded for user:', userId)
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

    console.log('[Chat API] Rate limit check passed, remaining:', rateLimitResult.remaining)

    const body = await request.json()
    const { messages, stream = true, judge_id, judge_slug, turnstileToken } = body

    console.log('[Chat API] Request body:', {
      messageCount: messages?.length,
      stream,
      hasJudgeId: !!judge_id,
      hasJudgeSlug: !!judge_slug,
      hasTurnstileToken: !!turnstileToken,
    })

    // Verify Turnstile CAPTCHA token to prevent bot abuse
    if (turnstileToken) {
      console.log('[Chat API] Verifying Turnstile token...')
      const clientIp = getClientIp(request)
      const isValid = await verifyTurnstileToken(turnstileToken, clientIp)
      if (!isValid) {
        console.error('[Chat API] Turnstile verification failed for IP:', clientIp)
        return NextResponse.json(
          { error: 'CAPTCHA verification failed. Please try again.' },
          { status: 403 }
        )
      }
      console.log('[Chat API] Turnstile verification successful')
    }

    if (!messages || !Array.isArray(messages)) {
      console.error('[Chat API] Invalid messages array')
      return NextResponse.json({ error: 'Messages array is required' }, { status: 400 })
    }

    if (!process.env.OPENAI_API_KEY) {
      console.error('[Chat API] OpenAI API key not configured!')
      return NextResponse.json(
        { error: 'AI assistant is temporarily unavailable. The OpenAI API key is not configured.' },
        { status: 500 }
      )
    }

    console.log('[Chat API] All validation checks passed, fetching context...')

    // Get context about judges if the query mentions any
    // If judge_id or judge_slug is provided, filter context to that specific judge only
    const userQuery = messages[messages.length - 1]?.content || ''
    const context = await getRelevantContext(userQuery, judge_id, judge_slug)

    console.log('[Chat API] Context fetched, building chat messages...')

    // Build messages array with system prompt and context
    const chatMessages: ChatMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...context,
      ...messages,
    ]

    console.log('[Chat API] Chat messages built, total messages:', chatMessages.length)

    if (stream) {
      console.log('[Chat API] Creating streaming OpenAI response...')
      // Create streaming response
      let streamResponse
      try {
        streamResponse = await openai!.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: chatMessages as any,
          temperature: 0.7,
          max_tokens: 1000,
          stream: true,
        })
        console.log('[Chat API] Streaming response created successfully')
      } catch (openaiError) {
        console.error('[Chat API] OpenAI streaming creation failed:', {
          error: openaiError instanceof Error ? openaiError.message : String(openaiError),
          stack: openaiError instanceof Error ? openaiError.stack : undefined,
        })
        throw openaiError
      }

      // Create a readable stream
      const encoder = new TextEncoder()
      const readableStream = new ReadableStream({
        async start(controller) {
          try {
            console.log('[Chat API] Starting stream processing...')
            let chunkCount = 0
            for await (const chunk of streamResponse) {
              chunkCount++
              const text = chunk.choices[0]?.delta?.content || ''
              if (text) {
                const encoded = encoder.encode(`data: ${JSON.stringify({ text })}\n\n`)
                controller.enqueue(encoded)
              }
            }
            console.log('[Chat API] Stream completed, total chunks:', chunkCount)
            controller.enqueue(encoder.encode('data: [DONE]\n\n'))
            controller.close()
          } catch (streamError) {
            console.error('[Chat API] Stream processing error:', {
              error: streamError instanceof Error ? streamError.message : String(streamError),
              stack: streamError instanceof Error ? streamError.stack : undefined,
            })
            controller.error(streamError)
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
    console.error('[Chat API] ERROR occurred:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      isOpenAIError: error instanceof OpenAI.APIError,
    })

    if (error instanceof OpenAI.APIError) {
      console.error('[Chat API] OpenAI API error details:', {
        status: error.status,
        code: error.code,
        type: error.type,
      })
      return NextResponse.json(
        { error: `OpenAI API error: ${error.message}` },
        { status: error.status || 500 }
      )
    }

    // Provide detailed error message for debugging
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    console.error('[Chat API] Returning 500 error to client:', errorMessage)

    return NextResponse.json(
      { error: `Failed to process chat request: ${errorMessage}` },
      { status: 500 }
    )
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

        if (error) {
          console.error('[Chat API] Error calling search_judges_ranked RPC:', error)
          // Fallback to regular SELECT if RPC function doesn't exist
          console.log('[Chat API] Falling back to regular SELECT query for judges')
          const { data: fallbackJudges } = await supabase
            .from('judges')
            .select('id, name, court_name, jurisdiction, total_cases')
            .ilike('name', `%${judgeName}%`)
            .limit(5)

          if (fallbackJudges && fallbackJudges.length > 0) {
            const judgeList = fallbackJudges
              .map((j: any) => `${j.name} - ${j.court_name || 'Court not specified'}`)
              .join(', ')
            context.push({
              role: 'system',
              content: `Judges matching "${judgeName}": ${judgeList}`,
            })
          }
        } else if (judges && judges.length > 0) {
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
    console.error('[Chat API] Error fetching context:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })
    // Return empty context on error - don't fail the entire chat request
  }

  return context
}

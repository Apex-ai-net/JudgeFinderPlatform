'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Send,
  Bot,
  User,
  Loader2,
  Sparkles,
  AlertCircle,
  Mic,
  MicOff,
  X,
  Minimize2,
  Maximize2,
  LogIn,
} from 'lucide-react'
import { useSafeUser } from '@/lib/auth/safe-clerk-components'
import { TurnstileWidget } from '@/components/auth/TurnstileWidget'
import Link from 'next/link'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  isTyping?: boolean
}

interface AILegalAssistantProps {
  className?: string
  onJudgeSelect?: (judgeName: string) => void
}

export function AILegalAssistant({ className, onJudgeSelect }: AILegalAssistantProps): JSX.Element {
  const { isSignedIn, isLoaded } = useSafeUser()
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content:
        "👋 Hello! I'm your AI legal assistant. I can help you find information about California judges, understand bias scores, and navigate our judicial transparency platform. How can I assist you today?",
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isExpanded, setIsExpanded] = useState(true)
  const [isListening, setIsListening] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [showTurnstile, setShowTurnstile] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const isInitialMount = useRef(true)

  // Scroll to bottom when messages change (except on initial mount)
  useEffect(() => {
    if (!isInitialMount.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    } else {
      isInitialMount.current = false
    }
  }, [messages])

  // Auto-resize textarea
  useEffect(() => {
    if (!inputRef.current) return

    const element = inputRef.current
    const adjustHeight = () => {
      element.style.height = 'auto'
      element.style.height = `${element.scrollHeight}px`
    }

    const frame = requestAnimationFrame(adjustHeight)
    return () => cancelAnimationFrame(frame)
  }, [input])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    // Show Turnstile on first message if not yet verified
    if (messages.length === 1 && !turnstileToken) {
      setShowTurnstile(true)
      return
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    // Add typing indicator
    const typingMessage: Message = {
      id: 'typing',
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isTyping: true,
    }
    setMessages((prev) => [...prev, typingMessage])

    try {
      // Create abort controller for request cancellation
      abortControllerRef.current = new AbortController()

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messages
            .filter((m) => !m.isTyping)
            .map((m) => ({
              role: m.role,
              content: m.content,
            }))
            .concat({ role: 'user', content: input.trim() }),
          stream: true,
          turnstileToken, // Include Turnstile token
        }),
        signal: abortControllerRef.current.signal,
      })

      // Enhanced error handling with specific messages
      if (!response.ok) {
        let errorMessage = 'Failed to get response from AI assistant.'

        // Try to parse error response body
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorMessage
          console.error('Chat API error response:', {
            status: response.status,
            statusText: response.statusText,
            error: errorData,
          })
        } catch (parseError) {
          console.error('Chat API error (no JSON body):', {
            status: response.status,
            statusText: response.statusText,
          })
        }

        // Provide user-friendly messages based on status code
        if (response.status === 401) {
          errorMessage = 'Please sign in to use the AI assistant.'
        } else if (response.status === 403) {
          errorMessage = 'Security verification failed. Please try again.'
        } else if (response.status === 429) {
          errorMessage = 'Rate limit exceeded. You can send up to 20 messages per hour.'
        } else if (response.status === 500) {
          errorMessage = errorMessage || 'AI assistant is temporarily unavailable. Please try again later.'
        }

        throw new Error(errorMessage)
      }

      // Remove typing indicator
      setMessages((prev) => prev.filter((m) => m.id !== 'typing'))

      // Handle streaming response
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let assistantMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: '',
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, assistantMessage])

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value)
          const lines = chunk.split('\n')

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6)
              if (data === '[DONE]') continue

              try {
                const json = JSON.parse(data)
                if (json.text) {
                  assistantMessage.content += json.text
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantMessage.id ? { ...m, content: assistantMessage.content } : m
                    )
                  )
                }
              } catch (e) {
                // Ignore parse errors
              }
            }
          }
        }
      }

      // Check for judge names in the response
      const judgePattern = /Judge\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g
      const matches = assistantMessage.content.matchAll(judgePattern)
      for (const match of matches) {
        if (onJudgeSelect) {
          // Could trigger judge selection here
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Request was cancelled')
      } else {
        console.error('Chat error:', error)
        setMessages((prev) => prev.filter((m) => m.id !== 'typing'))

        // Use the actual error message if available
        const errorMessage = error.message || 'I apologize, but I encountered an error processing your request. Please try again.'

        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: 'assistant',
            content: `Sorry, I encountered an error. ${errorMessage}`,
            timestamp: new Date(),
          },
        ])
      }
    } finally {
      setIsLoading(false)
      abortControllerRef.current = null
    }
  }

  const handleVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('Speech recognition is not supported in your browser')
      return
    }

    const SpeechRecognition =
      (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
    const recognition = new SpeechRecognition()

    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'en-US'

    if (isListening) {
      recognition.stop()
      setIsListening(false)
      return
    }

    recognition.start()
    setIsListening(true)

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
      setInput(transcript)
      setIsListening(false)
    }

    recognition.onerror = () => {
      setIsListening(false)
    }

    recognition.onend = () => {
      setIsListening(false)
    }
  }

  const suggestedQuestions = [
    "Tell me about Judge Smith's bias scores",
    'Which courts handle family law cases?',
    'How do bias scores work?',
    'Find judges in Los Angeles County',
  ]

  // Show authentication requirement if not signed in
  if (isLoaded && !isSignedIn) {
    return (
      <motion.div
        className={`relative bg-card/95 backdrop-blur-lg border border-border rounded-2xl shadow-2xl p-8 ${className}`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex flex-col items-center justify-center gap-4 text-center">
          <div className="p-3 rounded-full bg-primary/10">
            <LogIn className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-xl font-semibold">Sign In Required</h3>
          <p className="text-muted-foreground max-w-md">
            Please sign in to use our AI legal assistant. This helps us prevent bot abuse and provide you with a personalized experience.
          </p>
          <Link
            href="/sign-in?redirect_url=/judges"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-all"
          >
            <LogIn className="w-4 h-4" />
            Sign In to Continue
          </Link>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      className={`relative bg-card/95 backdrop-blur-lg border border-border rounded-2xl shadow-2xl ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-gradient-to-r from-enterprise-primary/10 to-enterprise-deep/10">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-enterprise-primary to-enterprise-deep text-white">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">JudgeFinder AI Assistant</h3>
            <p className="text-xs text-muted-foreground">Ask me anything about California judges</p>
          </div>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-2 rounded-lg hover:bg-muted transition-colors"
        >
          {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            {/* Messages */}
            <div className="h-[400px] overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, x: message.role === 'user' ? 20 : -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                  className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : ''}`}
                >
                  {message.role === 'assistant' && (
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-enterprise-primary to-enterprise-deep flex items-center justify-center text-white">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}
                  <div
                    className={`flex-1 ${message.role === 'user' ? 'max-w-[80%]' : 'max-w-[90%]'}`}
                  >
                    <div
                      className={`rounded-xl px-4 py-2 ${
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground ml-auto'
                          : 'bg-muted'
                      }`}
                    >
                      {message.isTyping ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span className="text-sm">Thinking...</span>
                        </div>
                      ) : (
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 px-2">
                      {message.timestamp.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  {message.role === 'user' && (
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </motion.div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Suggested Questions */}
            {messages.length === 1 && !showTurnstile && (
              <div className="px-4 pb-2">
                <p className="text-xs text-muted-foreground mb-2">Suggested questions:</p>
                <div className="flex flex-wrap gap-2">
                  {suggestedQuestions.map((question, index) => (
                    <button
                      key={index}
                      onClick={() => setInput(question)}
                      className="text-xs px-3 py-1.5 rounded-full border border-border hover:bg-muted transition-colors"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Turnstile CAPTCHA Verification */}
            {showTurnstile && !turnstileToken && (
              <div className="px-4 pb-4 border-t border-border">
                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Please complete the verification below to continue:
                  </p>
                  <TurnstileWidget
                    onVerify={(token) => {
                      setTurnstileToken(token)
                      setShowTurnstile(false)
                    }}
                    onError={() => {
                      setShowTurnstile(false)
                      setMessages((prev) => [
                        ...prev,
                        {
                          id: Date.now().toString(),
                          role: 'assistant',
                          content: 'CAPTCHA verification failed. Please try again.',
                          timestamp: new Date(),
                        },
                      ])
                    }}
                  />
                </div>
              </div>
            )}

            {/* Input Form */}
            <form onSubmit={handleSubmit} className="p-4 border-t border-border">
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleSubmit(e)
                      }
                    }}
                    placeholder="Ask about judges, courts, or bias scores..."
                    className="w-full px-4 py-2 pr-10 rounded-xl border border-border bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[44px] max-h-[120px]"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={handleVoiceInput}
                    className={`absolute right-2 top-2 p-1.5 rounded-lg transition-colors ${
                      isListening ? 'bg-red-500/10 text-red-500' : 'hover:bg-muted'
                    }`}
                  >
                    {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>
                </div>
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-enterprise-primary to-enterprise-deep text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-all"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Sparkles className="w-3 h-3 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">
                  Powered by OpenAI • No legal advice provided
                </p>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

'use client'

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import {
  Search,
  X,
  Mic,
  MicOff,
  Sparkles,
  Brain,
  ChevronRight,
  Loader2,
  History,
  Scale,
  Building,
  MapPin,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import type { SearchResult } from '@/types/search'

interface AIUnifiedSearchProps {
  placeholder?: string
  className?: string
  autoFocus?: boolean
  showVoiceSearch?: boolean
  showHistory?: boolean
}

// Debounce hook
function useDebounce(value: string, delay: number): JSX.Element {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

const AIUnifiedSearchComponent: React.FC<AIUnifiedSearchProps> = ({
  placeholder = 'Ask me anything about judges...',
  className = '',
  autoFocus = false,
  showVoiceSearch = true,
  showHistory = true,
}) => {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [showHistoryDropdown, setShowHistoryDropdown] = useState(false)
  const [voiceTranscript, setVoiceTranscript] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [recentQueries, setRecentQueries] = useState<string[]>([])

  // Debounce search query
  const debouncedQuery = useDebounce(query, 300)

  // Load recent queries from localStorage
  useEffect(() => {
    const savedQueries = localStorage.getItem('recentSearchQueries')
    if (savedQueries) {
      try {
        setRecentQueries(JSON.parse(savedQueries))
      } catch (e) {
        console.error('Failed to load search history:', e)
      }
    }
  }, [])

  // Save query to recent queries
  const saveToHistory = useCallback(
    (searchQuery: string) => {
      if (!searchQuery.trim()) return
      const updatedQueries = [searchQuery, ...recentQueries.filter((q) => q !== searchQuery)].slice(
        0,
        5
      )
      setRecentQueries(updatedQueries)
      localStorage.setItem('recentSearchQueries', JSON.stringify(updatedQueries))
    },
    [recentQueries]
  )

  // Clear search history
  const clearHistory = useCallback(() => {
    setRecentQueries([])
    localStorage.removeItem('recentSearchQueries')
    setShowHistoryDropdown(false)
  }, [])

  // Fetch real search results from API
  useEffect(() => {
    const fetchSearchResults = async () => {
      if (!debouncedQuery.trim() || debouncedQuery.trim().length < 2) {
        setSearchResults([])
        return
      }

      setIsLoading(true)
      try {
        const response = await fetch(
          `/api/judges/search?q=${encodeURIComponent(debouncedQuery)}&limit=8`
        )
        if (response.ok) {
          const data = await response.json()
          setSearchResults(data.results || [])
        }
      } catch (error) {
        console.error('Search error:', error)
        setSearchResults([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchSearchResults()
  }, [debouncedQuery])

  const handleSearch = useCallback(() => {
    if (!query.trim()) return
    saveToHistory(query)
    // Navigate to search page for full results
    router.push(`/search?q=${encodeURIComponent(query)}`)
  }, [query, router, saveToHistory])

  const handleSelectResult = useCallback(
    (searchQuery: string | SearchResult) => {
      if (typeof searchQuery === 'string') {
        // If it's a string (from voice or history), navigate to search page
        saveToHistory(searchQuery)
        router.push(`/search?q=${encodeURIComponent(searchQuery)}`)
      } else {
        // If it's a SearchResult object, navigate directly to the profile
        saveToHistory(searchQuery.title)
        router.push(searchQuery.url)
      }
      setQuery('')
      setSearchResults([])
      setShowHistoryDropdown(false)
      setIsFocused(false)
    },
    [router, saveToHistory]
  )

  // Voice search setup (after handleSelectResult so it's in scope)
  useEffect(() => {
    if (!showVoiceSearch || typeof window === 'undefined') return

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) return

    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onstart = () => {
      setIsListening(true)
      setVoiceTranscript('')
    }

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0])
        .map((result: any) => result.transcript)
        .join('')

      setVoiceTranscript(transcript)
      setQuery(transcript)
    }

    recognition.onend = () => {
      setIsListening(false)
      if (voiceTranscript) {
        handleSelectResult(voiceTranscript)
      }
    }

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error)
      setIsListening(false)
    }

    if (isListening) {
      recognition.start()
    } else {
      recognition.stop()
    }

    return () => {
      recognition.stop()
    }
  }, [isListening, showVoiceSearch, voiceTranscript, handleSelectResult])

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleSearch()
      } else if (e.key === 'Escape') {
        setQuery('')
        setShowHistoryDropdown(false)
      }
    },
    [handleSearch]
  )

  const clearSearch = useCallback(() => {
    setQuery('')
    inputRef.current?.focus()
  }, [])

  const toggleVoiceSearch = useCallback(() => {
    setIsListening(!isListening)
  }, [isListening])

  const getResultIcon = useCallback((type: string) => {
    switch (type) {
      case 'judge':
        return <Scale className="w-4 h-4 text-interactive-primary" aria-hidden="true" />
      case 'court':
        return <Building className="w-4 h-4 text-success" aria-hidden="true" />
      case 'jurisdiction':
        return <MapPin className="w-4 h-4 text-accent" aria-hidden="true" />
      default:
        return <Search className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
    }
  }, [])

  return (
    <div className={`relative w-full ${className}`}>
      {/* Main Search Bar with Glassmorphism */}
      <motion.div
        className={`
          relative flex items-center w-full
          bg-white/90 dark:bg-surface-sunken/90 backdrop-blur-xl
          rounded-2xl shadow-2xl
          border-2 transition-all duration-300
          min-h-[60px] lg:min-h-[64px]
          ${
            isFocused
              ? 'border-interactive-primary shadow-[0_0_30px_rgba(59,130,246,0.3)] scale-[1.02]'
              : 'border-border/50 dark:border-border/50 hover:border-interactive-primary/50'
          }
        `}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* AI Icon with Pulse Animation */}
        <motion.div
          className="pl-4 pr-3 py-3 lg:pl-5 lg:pr-3"
          animate={isLoading ? { scale: [1, 1.2, 1] } : {}}
          transition={{ repeat: Infinity, duration: 1.5 }}
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 text-interactive-primary animate-spin" aria-hidden="true" />
          ) : (
            <div className="relative">
              <Brain
                className={`w-5 h-5 transition-colors ${
                  isFocused ? 'text-interactive-primary' : 'text-muted-foreground'
                }`}
                aria-hidden="true"
              />
              {isFocused && (
                <motion.div
                  className="absolute inset-0 w-5 h-5 bg-primary/50 rounded-full opacity-30"
                  animate={{ scale: [1, 2, 1], opacity: [0.3, 0, 0.3] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                />
              )}
            </div>
          )}
        </motion.div>

        {/* Input Field */}
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyPress}
          aria-label="Search for judges, courts, or jurisdictions"
          onFocus={() => {
            setIsFocused(true)
            if (showHistory && recentQueries.length > 0 && !query) {
              setShowHistoryDropdown(true)
            }
          }}
          onBlur={(e) => {
            // Only blur if focus is moving outside the search component
            if (!e.currentTarget.contains(e.relatedTarget as Node)) {
              setIsFocused(false)
              setShowHistoryDropdown(false)
            }
          }}
          placeholder={isListening ? 'Listening...' : placeholder}
          autoFocus={autoFocus}
          autoComplete="off"
          className="
            flex-1 py-3 lg:py-4 pr-2
            bg-transparent
            text-base lg:text-lg font-medium
            text-foreground dark:text-white
            placeholder:text-muted-foreground dark:placeholder:text-muted-foreground
            focus:outline-none
            min-h-[48px]
          "
        />

        {/* Voice Transcript Display */}
        <AnimatePresence>
          {isListening && voiceTranscript && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="absolute bottom-full mb-2 left-4 right-4 p-2 bg-interactive-subtle rounded-lg"
            >
              <p className="text-sm text-interactive-primary">{voiceTranscript}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 mr-3">
          {/* Clear Button */}
          <AnimatePresence>
            {query && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={clearSearch}
                className="p-2 rounded-lg hover:bg-muted dark:hover:bg-accent transition-colors"
                aria-label="Clear search"
              >
                <X className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
              </motion.button>
            )}
          </AnimatePresence>

          {/* Voice Search Button */}
          {showVoiceSearch && (
            <motion.button
              onClick={toggleVoiceSearch}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className={`p-2 rounded-lg transition-all ${
                isListening
                  ? 'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                  : 'hover:bg-muted dark:hover:bg-accent text-muted-foreground'
              }`}
              aria-label={isListening ? 'Stop voice search' : 'Start voice search'}
              aria-pressed={isListening}
            >
              {isListening ? (
                <MicOff className="w-5 h-5" aria-hidden="true" />
              ) : (
                <Mic className="w-5 h-5" aria-hidden="true" />
              )}
            </motion.button>
          )}

          {/* Search Button with Gradient */}
          <motion.button
            onClick={handleSearch}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="
              px-6 py-3 rounded-xl
              bg-interactive-primary
              text-white font-semibold
              hover:bg-interactive-hover
              transition-all duration-300
              shadow-lg hover:shadow-xl
              min-h-[48px]
              flex items-center gap-2
            "
            aria-label="Search for judges and legal information"
          >
            <Sparkles className="w-4 h-4" aria-hidden="true" />
            <span className="hidden sm:inline">AI Search</span>
            <span className="sm:hidden">Search</span>
          </motion.button>
        </div>
      </motion.div>

      {/* Real Search Results & History Dropdown */}
      <AnimatePresence>
        {isFocused &&
          (searchResults.length > 0 ||
            isLoading ||
            (showHistoryDropdown && recentQueries.length > 0 && !query)) && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              role="log"
              aria-live="polite"
              aria-atomic="false"
              className="
              absolute z-50 w-full mt-2
              bg-white/95 dark:bg-surface-sunken/95 backdrop-blur-xl
              rounded-xl shadow-2xl
              border border-border/50 dark:border-border/50
              overflow-hidden
              max-h-96 overflow-y-auto
            "
            >
              {/* Loading State */}
              {isLoading && (
                <div className="flex items-center justify-center p-4">
                  <Loader2
                    className="w-5 h-5 text-interactive-primary animate-spin"
                    aria-hidden="true"
                  />
                  <span className="ml-2 text-muted-foreground">Searching...</span>
                </div>
              )}

              {/* Search Results */}
              {!isLoading && searchResults.length > 0 && (
                <div className="border-b border-border dark:border-border">
                  <div className="px-4 py-2 bg-interactive-subtle">
                    <div className="flex items-center gap-2">
                      <Sparkles
                        className="w-4 h-4 text-primary dark:text-primary"
                        aria-hidden="true"
                      />
                      <span className="text-xs font-medium text-interactive-primary">
                        Search Results
                      </span>
                    </div>
                  </div>
                  {searchResults.map((result, index) => (
                    <motion.button
                      key={`${result.type}-${result.id}-${index}`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => handleSelectResult(result)}
                      className="
                      w-full px-5 py-3 text-left
                      hover:bg-interactive-subtle
                      transition-all duration-200
                      flex items-center gap-3
                      group
                      border-b border-gray-100 dark:border-gray-800 last:border-b-0
                    "
                    >
                      <div className="flex-shrink-0">{getResultIcon(result.type)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-foreground dark:text-foreground truncate group-hover:text-primary dark:group-hover:text-primary">
                          {result.title}
                        </div>
                        {result.subtitle && (
                          <div className="text-xs text-muted-foreground dark:text-muted-foreground truncate">
                            {result.subtitle}
                          </div>
                        )}
                        {result.description && (
                          <div className="text-xs text-muted-foreground dark:text-muted-foreground truncate">
                            {result.description}
                          </div>
                        )}
                      </div>
                      <ChevronRight
                        className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                        aria-hidden="true"
                      />
                    </motion.button>
                  ))}
                  <button
                    onClick={handleSearch}
                    className="
                    w-full px-5 py-3 text-center
                    bg-muted dark:bg-card/50
                    hover:bg-muted dark:hover:bg-accent
                    transition-colors
                    text-sm text-primary dark:text-primary
                    font-medium
                  "
                  >
                    View all results for "{query}" →
                  </button>
                </div>
              )}

              {/* Search History */}
              {!isLoading && showHistoryDropdown && recentQueries.length > 0 && !query && (
                <div>
                  <div className="px-4 py-2 bg-muted dark:bg-card/50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <History className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                      <span className="text-xs font-medium text-muted-foreground dark:text-muted-foreground">
                        Recent Searches
                      </span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        clearHistory()
                      }}
                      className="text-xs text-muted-foreground hover:text-red-500 transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                  {recentQueries.map((historyQuery, index) => (
                    <motion.button
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => {
                        setQuery(historyQuery)
                        handleSelectResult(historyQuery)
                      }}
                      className="
                      w-full px-5 py-3 text-left
                      hover:bg-muted dark:hover:bg-accent/50
                      transition-colors
                      flex items-center gap-3
                      group
                    "
                    >
                      <History className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                      <span className="text-sm text-muted-foreground dark:text-muted-foreground group-hover:text-foreground dark:group-hover:text-gray-200">
                        {historyQuery}
                      </span>
                    </motion.button>
                  ))}
                </div>
              )}
            </motion.div>
          )}
      </AnimatePresence>
    </div>
  )
}

const AIUnifiedSearch = React.memo(AIUnifiedSearchComponent, (prevProps, nextProps) => {
  return (
    prevProps.placeholder === nextProps.placeholder &&
    prevProps.className === nextProps.className &&
    prevProps.autoFocus === nextProps.autoFocus &&
    prevProps.showVoiceSearch === nextProps.showVoiceSearch &&
    prevProps.showHistory === nextProps.showHistory
  )
})

AIUnifiedSearch.displayName = 'AIUnifiedSearch'

export default AIUnifiedSearch

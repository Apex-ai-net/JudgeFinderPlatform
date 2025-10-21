'use client'

import { Search, MapPin, Scale } from 'lucide-react'

interface SuggestedPromptsProps {
  onSelectPrompt: (prompt: string) => void
}

export default function SuggestedPrompts({ onSelectPrompt }: SuggestedPromptsProps): JSX.Element {
  const prompts = [
    {
      icon: Search,
      text: 'Search for Judge Thompson in Los Angeles',
      shortText: 'Search judge',
    },
    {
      icon: Scale,
      text: 'Show bias analysis for Judge Martinez',
      shortText: 'Bias analysis',
    },
    {
      icon: MapPin,
      text: 'Find judges in Orange County Superior Court',
      shortText: 'Find by court',
    },
  ]

  return (
    <div className="px-3 sm:px-4 py-3 border-t border-slate-200 dark:border-border bg-slate-50 dark:bg-surface-sunken">
      <p className="text-xs text-slate-500 dark:text-muted-foreground mb-2 font-medium">
        Suggested queries:
      </p>
      <div className="flex flex-col sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {prompts.map((prompt, index) => (
          <button
            key={index}
            onClick={() => onSelectPrompt(prompt.text)}
            className="flex items-center gap-3 px-3 py-3 sm:py-2.5 text-xs bg-white dark:bg-card hover:bg-slate-100 dark:hover:bg-surface-elevated border border-slate-200 dark:border-border rounded-lg transition-all duration-200 shadow-sm hover:shadow-md text-left touch-manipulation"
          >
            <div className="w-9 h-9 sm:w-8 sm:h-8 flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary-600/10 dark:from-primary/20 dark:to-primary-600/20 rounded-lg flex-shrink-0">
              <prompt.icon className="w-4 h-4 text-primary" />
            </div>
            <span className="text-sm sm:text-xs text-slate-700 dark:text-muted-foreground font-medium">
              {prompt.shortText}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

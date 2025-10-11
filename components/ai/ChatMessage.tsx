'use client'

import { useState } from 'react'
import { Scale, User } from 'lucide-react'
import Image from 'next/image'
import { Message } from './BuilderStyleChat'
import ImageLightbox from '../ui/ImageLightbox'

interface ChatMessageProps {
  message: Message
}

export default function ChatMessage({ message }: ChatMessageProps): JSX.Element {
  const isUser = message.role === 'user'
  const [lightboxOpen, setLightboxOpen] = useState(false)

  return (
    <>
      <article
        role="article"
        aria-label={`${isUser ? 'You' : 'AI Assistant'} message`}
        className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
      >
        {!isUser && (
          <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-interactive-primary shadow-sm flex items-center justify-center">
            <Scale className="w-4 h-4 text-white" aria-hidden="true" />
          </div>
        )}

        <div className={`max-w-[70%] ${isUser ? 'order-1' : 'order-2'}`}>
          <div
            className={`px-4 py-3 rounded-xl ${
              isUser
                ? 'bg-muted dark:bg-surface-elevated text-foreground dark:text-foreground rounded-br-md shadow-sm'
                : 'bg-muted dark:bg-card text-foreground dark:text-foreground rounded-bl-md border border-border dark:border-border'
            }`}
          >
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>

            {message.image && (
              <button
                onClick={() => setLightboxOpen(true)}
                aria-label="Expand image to full size"
                aria-haspopup="dialog"
                className="block w-full mt-2 rounded-lg overflow-hidden bg-muted hover:opacity-90 transition-opacity focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                style={{ aspectRatio: message.image.aspectRatio || '16/9' }}
              >
                <Image
                  src={message.image.url}
                  alt={message.image.alt}
                  width={400}
                  height={225}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  placeholder="blur"
                  blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjIyNSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjIyNSIgZmlsbD0iI2UyZThmMCIvPjwvc3ZnPg=="
                />
              </button>
            )}
          </div>
          <time
            dateTime={message.timestamp.toISOString()}
            className={`text-[10px] mt-1 ${isUser ? 'text-right' : 'text-left'} text-muted-foreground block`}
          >
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </time>
        </div>

        {isUser && (
          <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-slate-200 dark:bg-surface-elevated flex items-center justify-center order-2 shadow-sm">
            <User
              className="w-4 h-4 text-slate-600 dark:text-muted-foreground"
              aria-hidden="true"
            />
          </div>
        )}
      </article>

      {lightboxOpen && message.image && (
        <ImageLightbox
          src={message.image.url}
          alt={message.image.alt}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </>
  )
}

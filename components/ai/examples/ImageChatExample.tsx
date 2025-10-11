'use client'

import { useState } from 'react'
import BuilderStyleChat, { Message } from '../BuilderStyleChat'

/**
 * Example demonstrating how to add images to chat messages
 * This shows various use cases for the image feature
 */
export default function ImageChatExample(): JSX.Element {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Welcome! I can show you various types of images in our conversation.',
      timestamp: new Date(),
    },
    {
      id: '2',
      role: 'user',
      content: 'Show me a court document',
      timestamp: new Date(),
    },
    {
      id: '3',
      role: 'assistant',
      content: 'Here is the court document you requested:',
      timestamp: new Date(),
      image: {
        url: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800',
        alt: 'Legal document with gavel and law books',
        aspectRatio: '16/9',
      },
    },
    {
      id: '4',
      role: 'user',
      content: 'Show a square profile image',
      timestamp: new Date(),
    },
    {
      id: '5',
      role: 'assistant',
      content: 'Here is a square profile photo:',
      timestamp: new Date(),
      image: {
        url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
        alt: 'Professional headshot of a person in formal attire',
        aspectRatio: '1/1',
      },
    },
    {
      id: '6',
      role: 'user',
      content: 'Show a chart visualization',
      timestamp: new Date(),
    },
    {
      id: '7',
      role: 'assistant',
      content: 'Here is a wide chart showing case analytics:',
      timestamp: new Date(),
      image: {
        url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200',
        alt: 'Analytics chart showing case statistics and trends',
        aspectRatio: '21/9',
      },
    },
  ])

  // Function to demonstrate programmatically adding an image message
  const addImageMessage = (imageUrl: string, alt: string, aspectRatio: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      role: 'assistant',
      content: 'Here is the image you requested:',
      timestamp: new Date(),
      image: {
        url: imageUrl,
        alt,
        aspectRatio,
      },
    }

    setMessages((prev) => [...prev, newMessage])
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Image Chat Example</h2>
        <p className="text-muted-foreground">
          Demonstrates image support in chat messages with different aspect ratios
        </p>
      </div>

      <BuilderStyleChat />

      {/* Example controls for adding images */}
      <div className="space-y-2 border-t pt-4">
        <h3 className="font-semibold text-sm">Add Sample Images:</h3>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() =>
              addImageMessage(
                'https://images.unsplash.com/photo-1589994965851-a8f479c573a9?w=800',
                'Gavel on legal documents',
                '16/9'
              )
            }
            className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Add Document (16:9)
          </button>
          <button
            onClick={() =>
              addImageMessage(
                'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400',
                'Judge in courtroom',
                '1/1'
              )
            }
            className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Add Profile (1:1)
          </button>
          <button
            onClick={() =>
              addImageMessage(
                'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1200',
                'Case timeline and analytics',
                '21/9'
              )
            }
            className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Add Chart (21:9)
          </button>
        </div>
      </div>

      {/* Implementation notes */}
      <div className="border border-border rounded-lg p-4 space-y-2 bg-muted/50">
        <h3 className="font-semibold text-sm">Implementation Notes:</h3>
        <ul className="text-sm space-y-1 text-muted-foreground">
          <li>✓ Images lazy load when scrolled into view</li>
          <li>✓ Click any image to open full-screen lightbox</li>
          <li>✓ Press Escape to close lightbox</li>
          <li>✓ Keyboard accessible with focus trap</li>
          <li>✓ Screen reader friendly with alt text</li>
          <li>✓ Aspect ratio preserves layout (no CLS)</li>
          <li>✓ Works in light and dark mode</li>
        </ul>
      </div>

      {/* Code example */}
      <div className="border border-border rounded-lg p-4 space-y-2">
        <h3 className="font-semibold text-sm">Example Code:</h3>
        <pre className="text-xs bg-slate-900 text-slate-100 p-3 rounded-md overflow-x-auto">
          {`const messageWithImage: Message = {
  id: Date.now().toString(),
  role: 'assistant',
  content: 'Here is the document:',
  timestamp: new Date(),
  image: {
    url: 'https://example.com/doc.jpg',
    alt: 'Court document showing case details',
    aspectRatio: '16/9'  // Optional
  }
}`}
        </pre>
      </div>
    </div>
  )
}

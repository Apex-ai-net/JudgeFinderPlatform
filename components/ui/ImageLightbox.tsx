'use client'

import { X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import Image from 'next/image'

interface ImageLightboxProps {
  src: string
  alt: string
  onClose: () => void
}

export default function ImageLightbox({ src, alt, onClose }: ImageLightboxProps): JSX.Element {
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Focus the close button when lightbox opens
    closeButtonRef.current?.focus()

    // Store the previously focused element
    const previouslyFocusedElement = document.activeElement as HTMLElement

    // Prevent body scroll
    document.body.style.overflow = 'hidden'

    // Trap focus within lightbox
    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      const focusableElements = overlayRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      if (!focusableElements || focusableElements.length === 0) return

      const firstElement = focusableElements[0] as HTMLElement
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault()
          lastElement.focus()
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault()
          firstElement.focus()
        }
      }
    }

    document.addEventListener('keydown', handleTabKey)

    return () => {
      document.body.style.overflow = 'unset'
      document.removeEventListener('keydown', handleTabKey)
      // Restore focus to previously focused element
      previouslyFocusedElement?.focus()
    }
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    }
  }

  return (
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="lightbox-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
      onClick={onClose}
      onKeyDown={handleKeyDown}
    >
      <h2 id="lightbox-title" className="sr-only">
        Expanded image view
      </h2>

      <button
        ref={closeButtonRef}
        onClick={(e) => {
          e.stopPropagation()
          onClose()
        }}
        aria-label="Close expanded image"
        className="absolute top-4 right-4 p-3 bg-white/10 hover:bg-white/20 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-white z-10"
      >
        <X className="w-6 h-6 text-white" aria-hidden="true" />
      </button>

      <div
        className="relative max-w-7xl max-h-[90vh] w-full h-full"
        onClick={(e) => e.stopPropagation()}
      >
        <Image
          src={src}
          alt={alt}
          fill
          className="object-contain"
          sizes="(max-width: 1280px) 100vw, 1280px"
          priority
        />
      </div>
    </div>
  )
}

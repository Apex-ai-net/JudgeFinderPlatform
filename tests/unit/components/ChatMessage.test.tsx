import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import ChatMessage from '@/components/ai/ChatMessage'
import { Message } from '@/components/ai/BuilderStyleChat'

describe('ChatMessage with Images', () => {
  const mockMessage: Message = {
    id: '1',
    role: 'assistant',
    content: 'Here is an example image',
    timestamp: new Date('2025-10-10T10:00:00'),
    image: {
      url: 'https://example.com/image.jpg',
      alt: 'Example image showing a court document',
      aspectRatio: '16/9',
    },
  }

  it('renders message with image', () => {
    render(<ChatMessage message={mockMessage} />)

    expect(screen.getByText('Here is an example image')).toBeInTheDocument()
    expect(screen.getByAltText('Example image showing a court document')).toBeInTheDocument()
  })

  it('opens lightbox when image is clicked', async () => {
    const user = userEvent.setup()
    render(<ChatMessage message={mockMessage} />)

    const expandButton = screen.getByRole('button', { name: 'Expand image to full size' })
    await user.click(expandButton)

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Expanded image view')).toBeInTheDocument()
  })

  it('closes lightbox when close button is clicked', async () => {
    const user = userEvent.setup()
    render(<ChatMessage message={mockMessage} />)

    // Open lightbox
    const expandButton = screen.getByRole('button', { name: 'Expand image to full size' })
    await user.click(expandButton)

    // Close lightbox
    const closeButton = screen.getByRole('button', { name: 'Close expanded image' })
    await user.click(closeButton)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('closes lightbox when Escape is pressed', async () => {
    const user = userEvent.setup()
    render(<ChatMessage message={mockMessage} />)

    // Open lightbox
    const expandButton = screen.getByRole('button', { name: 'Expand image to full size' })
    await user.click(expandButton)

    // Press Escape
    await user.keyboard('{Escape}')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders message without image when image prop is not provided', () => {
    const messageWithoutImage: Message = {
      id: '2',
      role: 'user',
      content: 'Just text message',
      timestamp: new Date(),
    }

    render(<ChatMessage message={messageWithoutImage} />)

    expect(screen.getByText('Just text message')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Expand image to full size' })
    ).not.toBeInTheDocument()
  })

  it('uses default aspect ratio when not specified', () => {
    const messageWithDefaultAspect: Message = {
      ...mockMessage,
      image: {
        url: 'https://example.com/image.jpg',
        alt: 'Test image',
      },
    }

    const { container } = render(<ChatMessage message={messageWithDefaultAspect} />)
    const imageButton = screen.getByRole('button', { name: 'Expand image to full size' })

    expect(imageButton).toHaveStyle({ aspectRatio: '16/9' })
  })

  it('applies custom aspect ratio when provided', () => {
    const messageWithCustomAspect: Message = {
      ...mockMessage,
      image: {
        url: 'https://example.com/image.jpg',
        alt: 'Square image',
        aspectRatio: '1/1',
      },
    }

    render(<ChatMessage message={messageWithCustomAspect} />)
    const imageButton = screen.getByRole('button', { name: 'Expand image to full size' })

    expect(imageButton).toHaveStyle({ aspectRatio: '1/1' })
  })
})

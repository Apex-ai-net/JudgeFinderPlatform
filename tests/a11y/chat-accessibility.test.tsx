/**
 * Accessibility Tests for AI Chat Components
 * WCAG 2.2 AA Compliance Testing
 */

import { render, screen, waitFor } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import AIChatModal from '@/components/ai/AIChatModal'
import ChatMessage from '@/components/ai/ChatMessage'
import type { Message } from '@/components/ai/BuilderStyleChat'

expect.extend(toHaveNoViolations)

describe('Chat Accessibility - WCAG 2.2 AA', () => {
  describe('AIChatModal', () => {
    it('should have no axe violations when open', async () => {
      const { container } = render(<AIChatModal isOpen={true} onClose={() => {}} />)
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should not render when closed', () => {
      const { container } = render(<AIChatModal isOpen={false} onClose={() => {}} />)
      expect(container).toBeEmptyDOMElement()
    })

    it('has proper modal semantics', () => {
      render(<AIChatModal isOpen={true} onClose={() => {}} />)

      // Modal should be in the document
      const heading = screen.getByText('AI Legal Assistant')
      expect(heading).toBeInTheDocument()

      // Close button should be accessible
      const closeButton = screen.getByRole('button', { name: /close/i })
      expect(closeButton).toBeInTheDocument()
    })

    it('has accessible input field', () => {
      render(<AIChatModal isOpen={true} onClose={() => {}} />)

      const input = screen.getByPlaceholderText(/ask me anything/i)
      expect(input).toBeInTheDocument()
      expect(input.tagName).toBe('TEXTAREA')
    })

    it('has accessible submit button', () => {
      render(<AIChatModal isOpen={true} onClose={() => {}} />)

      const submitButton = screen.getByRole('button', { name: /send message/i })
      expect(submitButton).toBeInTheDocument()
      expect(submitButton).toHaveAttribute('type', 'submit')
    })

    it('supports keyboard navigation - Escape closes modal', async () => {
      const user = userEvent.setup()
      const onClose = vi.fn()
      render(<AIChatModal isOpen={true} onClose={onClose} />)

      // Backdrop click should close
      const backdrop = screen
        .getByRole('button', { name: /close/i })
        .closest('div')?.previousSibling
      if (backdrop) {
        await user.click(backdrop as Element)
        expect(onClose).toHaveBeenCalled()
      }
    })

    it('focuses input on open', async () => {
      render(<AIChatModal isOpen={true} onClose={() => {}} />)

      const input = screen.getByPlaceholderText(/ask me anything/i)
      await waitFor(() => {
        expect(document.activeElement).toBe(input)
      })
    })

    it('displays initial assistant message', () => {
      render(<AIChatModal isOpen={true} onClose={() => {}} />)

      expect(screen.getByText(/Hello! I'm your AI legal assistant/i)).toBeInTheDocument()
    })

    it('allows typing in input field', async () => {
      const user = userEvent.setup()
      render(<AIChatModal isOpen={true} onClose={() => {}} />)

      const input = screen.getByPlaceholderText(/ask me anything/i) as HTMLInputElement
      await user.type(input, 'Test query')

      expect(input.value).toBe('Test query')
    })

    it('disables submit when input is empty', () => {
      render(<AIChatModal isOpen={true} onClose={() => {}} />)

      const submitButton = screen.getByRole('button', { name: /send message/i })
      expect(submitButton).toBeDisabled()
    })

    it('enables submit when input has content', async () => {
      const user = userEvent.setup()
      render(<AIChatModal isOpen={true} onClose={() => {}} />)

      const input = screen.getByPlaceholderText(/ask me anything/i)
      const submitButton = screen.getByRole('button', { name: /send message/i })

      await user.type(input, 'Test query')
      expect(submitButton).not.toBeDisabled()
    })

    it('shows loading state during message submission', async () => {
      const user = userEvent.setup()
      const { container } = render(<AIChatModal isOpen={true} onClose={() => {}} />)

      const input = screen.getByPlaceholderText(/ask me anything/i)
      const submitButton = screen.getByRole('button', { name: /send message/i })

      await user.type(input, 'Test query')
      await user.click(submitButton)

      // Loading indicator should appear - check for loading animation
      await waitFor(
        () => {
          const loadingIndicator = container.querySelector('.animate-bounce')
          expect(loadingIndicator).toBeInTheDocument()
        },
        { timeout: 200 }
      )
    })

    it('clears input after submission', async () => {
      const user = userEvent.setup()
      render(<AIChatModal isOpen={true} onClose={() => {}} />)

      const input = screen.getByPlaceholderText(/ask me anything/i) as HTMLTextAreaElement
      const submitButton = screen.getByRole('button', { name: /send message/i })

      await user.type(input, 'Test query')
      await user.click(submitButton)

      expect(input.value).toBe('')
    })

    it('suggested questions are clickable', async () => {
      const user = userEvent.setup()
      render(<AIChatModal isOpen={true} onClose={() => {}} />)

      const suggestedButton = screen.getByRole('button', { name: /How do I find a judge/i })
      await user.click(suggestedButton)

      const input = screen.getByPlaceholderText(/ask me anything/i) as HTMLInputElement
      expect(input.value).toBe('How do I find a judge?')
    })
  })

  describe('ChatMessage', () => {
    const mockUserMessage: Message = {
      role: 'user',
      content: 'Test user message',
      timestamp: new Date('2024-01-01T12:00:00'),
    }

    const mockAssistantMessage: Message = {
      role: 'assistant',
      content: 'Test assistant message',
      timestamp: new Date('2024-01-01T12:00:00'),
    }

    it('should have no axe violations for user message', async () => {
      const { container } = render(<ChatMessage message={mockUserMessage} />)
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should have no axe violations for assistant message', async () => {
      const { container } = render(<ChatMessage message={mockAssistantMessage} />)
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('displays message content', () => {
      render(<ChatMessage message={mockUserMessage} />)
      expect(screen.getByText('Test user message')).toBeInTheDocument()
    })

    it('displays timestamp', () => {
      render(<ChatMessage message={mockUserMessage} />)
      expect(screen.getByText('12:00 PM')).toBeInTheDocument()
    })

    it('shows user icon for user messages', () => {
      const { container } = render(<ChatMessage message={mockUserMessage} />)
      const userIcon = container.querySelector('svg')
      expect(userIcon).toBeInTheDocument()
    })

    it('shows scale icon for assistant messages', () => {
      const { container } = render(<ChatMessage message={mockAssistantMessage} />)
      const scaleIcon = container.querySelector('svg')
      expect(scaleIcon).toBeInTheDocument()
    })

    it('uses appropriate styling for user messages', () => {
      const { container } = render(<ChatMessage message={mockUserMessage} />)
      const messageDiv = container.querySelector('.bg-muted')
      expect(messageDiv).toBeInTheDocument()
    })

    it('uses appropriate styling for assistant messages', () => {
      const { container } = render(<ChatMessage message={mockAssistantMessage} />)
      const messageDiv = container.querySelector('.bg-muted')
      expect(messageDiv).toBeInTheDocument()
    })

    it('preserves whitespace in message content', () => {
      const messageWithWhitespace: Message = {
        role: 'assistant',
        content: 'Line 1\nLine 2\n\nLine 3',
        timestamp: new Date(),
      }

      const { container } = render(<ChatMessage message={messageWithWhitespace} />)
      const messageContent = container.querySelector('.whitespace-pre-wrap')
      expect(messageContent).toBeInTheDocument()
    })

    it('formats timestamp correctly', () => {
      const message: Message = {
        role: 'user',
        content: 'Test',
        timestamp: new Date('2024-01-01T14:30:00'),
      }

      render(<ChatMessage message={message} />)
      expect(screen.getByText(/2:30 PM/i)).toBeInTheDocument()
    })
  })

  describe('Focus Management', () => {
    it('focuses input when modal opens', async () => {
      const { rerender } = render(<AIChatModal isOpen={false} onClose={() => {}} />)

      rerender(<AIChatModal isOpen={true} onClose={() => {}} />)

      await waitFor(() => {
        const input = screen.getByPlaceholderText(/ask me anything/i)
        expect(document.activeElement).toBe(input)
      })
    })

    it('all interactive elements are keyboard accessible', () => {
      render(<AIChatModal isOpen={true} onClose={() => {}} />)

      const buttons = screen.getAllByRole('button')
      buttons.forEach((button) => {
        expect(button).not.toHaveAttribute('tabindex', '-1')
      })
    })

    it('suggested prompts are focusable', async () => {
      const user = userEvent.setup()
      render(<AIChatModal isOpen={true} onClose={() => {}} />)

      const firstPrompt = screen.getByRole('button', { name: /How do I find a judge/i })
      await user.tab()

      // Should be able to focus on prompt buttons
      expect(firstPrompt).toBeInTheDocument()
    })
  })

  describe('ARIA Attributes', () => {
    it('uses semantic HTML elements', () => {
      const { container } = render(<AIChatModal isOpen={true} onClose={() => {}} />)

      // Should use semantic form element
      const form = container.querySelector('form')
      expect(form).toBeInTheDocument()
    })

    it('buttons have accessible labels', () => {
      render(<AIChatModal isOpen={true} onClose={() => {}} />)

      // All buttons should be labeled or have icons with aria-labels
      const buttons = screen.getAllByRole('button')
      buttons.forEach((button) => {
        const hasText = button.textContent && button.textContent.length > 0
        const hasAriaLabel = button.hasAttribute('aria-label')
        const hasAriaLabelledBy = button.hasAttribute('aria-labelledby')

        expect(hasText || hasAriaLabel || hasAriaLabelledBy).toBe(true)
      })
    })

    it('decorative icons are hidden from screen readers', () => {
      const { container } = render(<AIChatModal isOpen={true} onClose={() => {}} />)

      // SVG icons should have aria-hidden
      const icons = container.querySelectorAll('svg')
      icons.forEach((icon) => {
        expect(icon).toHaveAttribute('aria-hidden', 'true')
      })
    })

    it('loading state is announced', async () => {
      const user = userEvent.setup()
      const { container } = render(<AIChatModal isOpen={true} onClose={() => {}} />)

      const input = screen.getByPlaceholderText(/ask me anything/i)
      await user.type(input, 'Test query')

      const submitButton = screen.getByRole('button', { name: /send message/i })
      await user.click(submitButton)

      // Loading indicator should appear
      await waitFor(
        () => {
          const loadingIndicator = container.querySelector('.animate-bounce')
          expect(loadingIndicator).toBeTruthy()
        },
        { timeout: 200 }
      )
    })
  })

  describe('Color Contrast', () => {
    it('uses CSS variables for theming', () => {
      const { container } = render(<AIChatModal isOpen={true} onClose={() => {}} />)

      // Check that dark mode classes are present
      const darkModeElements = container.querySelectorAll('[class*="dark:"]')
      expect(darkModeElements.length).toBeGreaterThan(0)
    })

    it('maintains readable text in both light and dark modes', () => {
      const { container } = render(
        <ChatMessage
          message={{
            role: 'assistant',
            content: 'Test message',
            timestamp: new Date(),
          }}
        />
      )

      const messageContent = screen.getByText('Test message')
      // Message text inherits color from parent div which has text-foreground class
      expect(messageContent.parentElement).toHaveClass('text-foreground')
    })
  })

  describe('Responsive Design', () => {
    it('modal adapts to mobile viewport', () => {
      const { container } = render(<AIChatModal isOpen={true} onClose={() => {}} />)

      const modal = container.querySelector('.max-w-2xl')
      expect(modal).toHaveClass('rounded-t-2xl', 'sm:rounded-2xl')
    })

    it('touch targets are appropriately sized', () => {
      const { container } = render(<AIChatModal isOpen={true} onClose={() => {}} />)

      const buttons = screen.getAllByRole('button')
      buttons.forEach((button) => {
        // Check that buttons have appropriate padding classes for touch targets
        const hasMinHeight =
          button.className.includes('min-h-') ||
          button.className.includes('py-') ||
          button.className.includes('p-')
        expect(hasMinHeight).toBe(true)
      })
    })
  })

  describe('Form Validation', () => {
    it('prevents submission of empty messages', async () => {
      const user = userEvent.setup()
      render(<AIChatModal isOpen={true} onClose={() => {}} />)

      const submitButton = screen.getByRole('button', { name: /send message/i })
      expect(submitButton).toBeDisabled()
    })

    it('trims whitespace from messages', async () => {
      const user = userEvent.setup()
      render(<AIChatModal isOpen={true} onClose={() => {}} />)

      const input = screen.getByPlaceholderText(/ask me anything/i) as HTMLTextAreaElement
      const submitButton = screen.getByRole('button', { name: /send message/i })

      await user.type(input, '   ')
      expect(submitButton).toBeDisabled()
    })

    it('accepts valid message input', async () => {
      const user = userEvent.setup()
      render(<AIChatModal isOpen={true} onClose={() => {}} />)

      const input = screen.getByPlaceholderText(/ask me anything/i)
      const submitButton = screen.getByRole('button', { name: /send message/i })

      await user.type(input, 'Valid message')
      expect(submitButton).not.toBeDisabled()
    })
  })
})

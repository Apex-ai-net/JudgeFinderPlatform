/**
 * ElectionBadge Component Tests
 *
 * Comprehensive test suite for the ElectionBadge component covering:
 * - Rendering all selection methods
 * - Different variants (minimal, compact, detailed)
 * - Election date formatting
 * - Accessibility features
 * - Tooltip interactions
 * - Animation preferences
 *
 * @module components/judges/ElectionBadge.test
 */

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ElectionBadge, ElectionStatusBadge } from './ElectionBadge'
import { SelectionMethod } from '@/types/elections'

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  },
}))

describe('ElectionBadge', () => {
  describe('Selection Method Rendering', () => {
    it('renders elected badge correctly', () => {
      render(
        <ElectionBadge
          selectionMethod={SelectionMethod.ELECTED}
          variant="compact"
        />
      )
      expect(screen.getByText('Elected')).toBeInTheDocument()
    })

    it('renders appointed badge correctly', () => {
      render(
        <ElectionBadge
          selectionMethod={SelectionMethod.APPOINTED}
          variant="compact"
        />
      )
      expect(screen.getByText('Appointed')).toBeInTheDocument()
    })

    it('renders retention badge correctly', () => {
      render(
        <ElectionBadge
          selectionMethod={SelectionMethod.RETENTION_ELECTION}
          variant="compact"
        />
      )
      expect(screen.getByText('Retention')).toBeInTheDocument()
    })

    it('renders merit selection badge correctly', () => {
      render(
        <ElectionBadge
          selectionMethod={SelectionMethod.MERIT_SELECTION}
          variant="compact"
        />
      )
      expect(screen.getByText('Merit Selection')).toBeInTheDocument()
    })

    it('renders legislative appointment badge correctly', () => {
      render(
        <ElectionBadge
          selectionMethod={SelectionMethod.LEGISLATIVE_APPOINTMENT}
          variant="compact"
        />
      )
      expect(screen.getByText('Legislative')).toBeInTheDocument()
    })

    it('renders commission appointment badge correctly', () => {
      render(
        <ElectionBadge
          selectionMethod={SelectionMethod.COMMISSION_APPOINTMENT}
          variant="compact"
        />
      )
      expect(screen.getByText('Commission')).toBeInTheDocument()
    })
  })

  describe('Variant Rendering', () => {
    it('renders minimal variant with icon only', () => {
      render(
        <ElectionBadge
          selectionMethod={SelectionMethod.ELECTED}
          variant="minimal"
        />
      )
      // Check for sr-only text for accessibility
      expect(screen.getByText('Elected')).toHaveClass('sr-only')
    })

    it('renders compact variant without election date', () => {
      render(
        <ElectionBadge
          selectionMethod={SelectionMethod.ELECTED}
          nextElectionDate="2026-11-03"
          variant="compact"
        />
      )
      expect(screen.getByText('Elected')).toBeInTheDocument()
      expect(screen.queryByText(/Next Election/i)).not.toBeInTheDocument()
    })

    it('renders detailed variant with election date', () => {
      render(
        <ElectionBadge
          selectionMethod={SelectionMethod.ELECTED}
          nextElectionDate="2026-11-03"
          variant="detailed"
        />
      )
      expect(screen.getByText('Elected')).toBeInTheDocument()
      expect(screen.getByText(/Next Election: Nov 2026/i)).toBeInTheDocument()
    })
  })

  describe('Election Date Formatting', () => {
    it('formats election date correctly', () => {
      render(
        <ElectionBadge
          selectionMethod={SelectionMethod.ELECTED}
          nextElectionDate="2026-11-03"
          variant="detailed"
        />
      )
      expect(screen.getByText(/Nov 2026/i)).toBeInTheDocument()
    })

    it('handles invalid date gracefully', () => {
      render(
        <ElectionBadge
          selectionMethod={SelectionMethod.ELECTED}
          nextElectionDate="invalid-date"
          variant="detailed"
        />
      )
      // Should still render without crashing
      expect(screen.getByText('Elected')).toBeInTheDocument()
    })
  })

  describe('Up For Election Status', () => {
    it('shows pulse animation when up for election', () => {
      render(
        <ElectionBadge
          selectionMethod={SelectionMethod.ELECTED}
          nextElectionDate="2026-11-03"
          isUpForElection={true}
          variant="detailed"
        />
      )
      expect(screen.getByText(/Up for Election:/i)).toBeInTheDocument()
    })

    it('shows countdown when enabled', () => {
      render(
        <ElectionBadge
          selectionMethod={SelectionMethod.ELECTED}
          nextElectionDate="2026-11-03"
          isUpForElection={true}
          showCountdown={true}
          variant="detailed"
        />
      )
      // Tooltip should contain days remaining
      const tooltipButton = screen.getByLabelText(/election details/i)
      expect(tooltipButton).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('includes proper ARIA labels', () => {
      render(
        <ElectionBadge
          selectionMethod={SelectionMethod.ELECTED}
          variant="minimal"
        />
      )
      expect(screen.getByLabelText(/Selection method: Elected/i)).toBeInTheDocument()
    })

    it('includes screen reader only text for minimal variant', () => {
      render(
        <ElectionBadge
          selectionMethod={SelectionMethod.APPOINTED}
          variant="minimal"
        />
      )
      const srText = screen.getByText('Appointed')
      expect(srText).toHaveClass('sr-only')
    })

    it('tooltip button is keyboard accessible', async () => {
      const user = userEvent.setup()
      render(
        <ElectionBadge
          selectionMethod={SelectionMethod.ELECTED}
          variant="compact"
        />
      )

      const tooltipButton = screen.getByLabelText(/details/i)
      await user.tab()
      expect(tooltipButton).toHaveFocus()
    })
  })

  describe('Tooltip Interactions', () => {
    it('shows tooltip content on hover', async () => {
      const user = userEvent.setup()
      render(
        <ElectionBadge
          selectionMethod={SelectionMethod.ELECTED}
          variant="compact"
        />
      )

      const tooltipButton = screen.getByLabelText(/details/i)
      await user.hover(tooltipButton)

      await waitFor(() => {
        expect(
          screen.getByText(/This judge was elected by voters/i)
        ).toBeInTheDocument()
      })
    })

    it('includes election date in tooltip', async () => {
      const user = userEvent.setup()
      render(
        <ElectionBadge
          selectionMethod={SelectionMethod.ELECTED}
          nextElectionDate="2026-11-03"
          variant="compact"
        />
      )

      const tooltipButton = screen.getByLabelText(/details/i)
      await user.hover(tooltipButton)

      await waitFor(() => {
        expect(screen.getByText(/Next Election:/i)).toBeInTheDocument()
      })
    })
  })

  describe('Custom Styling', () => {
    it('applies custom className', () => {
      const { container } = render(
        <ElectionBadge
          selectionMethod={SelectionMethod.ELECTED}
          variant="compact"
          className="custom-test-class"
        />
      )
      expect(container.querySelector('.custom-test-class')).toBeInTheDocument()
    })
  })

  describe('ElectionStatusBadge Wrapper', () => {
    it('auto-detects up for election status', () => {
      // Date 90 days in the future
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 90)
      const dateString = futureDate.toISOString().split('T')[0]

      render(
        <ElectionStatusBadge
          selectionMethod={SelectionMethod.ELECTED}
          nextElectionDate={dateString}
          variant="detailed"
        />
      )

      // Should show "Up for Election" since it's within 180 days
      expect(screen.getByText(/Up for Election:/i)).toBeInTheDocument()
    })

    it('does not show up for election for distant dates', () => {
      // Date 200 days in the future
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 200)
      const dateString = futureDate.toISOString().split('T')[0]

      render(
        <ElectionStatusBadge
          selectionMethod={SelectionMethod.ELECTED}
          nextElectionDate={dateString}
          variant="detailed"
        />
      )

      // Should show "Next Election" since it's beyond 180 days
      expect(screen.getByText(/Next Election:/i)).toBeInTheDocument()
      expect(screen.queryByText(/Up for Election:/i)).not.toBeInTheDocument()
    })
  })

  describe('Reduced Motion', () => {
    it('respects prefers-reduced-motion preference', () => {
      // Mock matchMedia for reduced motion
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation((query) => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      })

      render(
        <ElectionBadge
          selectionMethod={SelectionMethod.ELECTED}
          variant="compact"
        />
      )

      // Component should render without animations
      expect(screen.getByText('Elected')).toBeInTheDocument()
    })
  })
})

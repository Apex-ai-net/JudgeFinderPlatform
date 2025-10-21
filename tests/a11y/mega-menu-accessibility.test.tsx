/**
 * Accessibility Tests for Mega Menu Navigation
 * WCAG 2.2 AA Compliance Testing
 */

import { render, screen, waitFor } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MegaMenu } from '@/components/navigation/MegaMenu'
import { MegaMenuItem, MegaMenuSection } from '@/components/navigation/MegaMenuItem'

expect.extend(toHaveNoViolations)

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: () => '/judges',
}))

describe('Mega Menu Accessibility - WCAG 2.2 AA', () => {
  describe('MegaMenu Desktop', () => {
    it('should have no axe violations when closed', async () => {
      const { container } = render(
        <MegaMenu type="judges" label="Judges" isActive={false} isMobile={false} />
      )
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should have proper button semantics', () => {
      render(<MegaMenu type="judges" label="Judges" isActive={false} isMobile={false} />)

      const button = screen.getByRole('button', { name: /judges menu/i })
      expect(button).toBeInTheDocument()
      expect(button).toHaveAttribute('aria-expanded', 'false')
      expect(button).toHaveAttribute('aria-haspopup', 'true')
    })

    it('should be keyboard accessible', async () => {
      const user = userEvent.setup()
      render(<MegaMenu type="judges" label="Judges" isActive={false} isMobile={false} />)

      const button = screen.getByRole('button', { name: /judges menu/i })

      // Tab to button
      await user.tab()
      expect(button).toHaveFocus()

      // Enter key opens menu
      await user.keyboard('{Enter}')
      await waitFor(() => {
        expect(button).toHaveAttribute('aria-expanded', 'true')
      })

      // Escape key closes menu
      await user.keyboard('{Escape}')
      await waitFor(() => {
        expect(button).toHaveAttribute('aria-expanded', 'false')
      })
    })

    it('should support hover interaction', async () => {
      const user = userEvent.setup()
      render(<MegaMenu type="courts" label="Courts" isActive={false} isMobile={false} />)

      const button = screen.getByRole('button', { name: /courts menu/i })

      // Hover opens menu
      await user.hover(button)
      await waitFor(() => {
        expect(button).toHaveAttribute('aria-expanded', 'true')
      })
    })
  })

  describe('MegaMenu Mobile', () => {
    it('should have no axe violations in mobile mode', async () => {
      const { container } = render(
        <MegaMenu type="resources" label="Resources" isActive={false} isMobile={true} />
      )
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should have proper accordion semantics', () => {
      render(<MegaMenu type="resources" label="Resources" isActive={false} isMobile={true} />)

      const button = screen.getByRole('button', { name: /resources/i })
      expect(button).toBeInTheDocument()
      expect(button).toHaveAttribute('aria-expanded', 'false')
      expect(button).toHaveAttribute('aria-controls')
    })

    it('should toggle on click in mobile mode', async () => {
      const user = userEvent.setup()
      render(<MegaMenu type="judges" label="Judges" isActive={false} isMobile={true} />)

      const button = screen.getByRole('button', { name: /judges/i })

      // Click opens
      await user.click(button)
      await waitFor(() => {
        expect(button).toHaveAttribute('aria-expanded', 'true')
      })

      // Click closes
      await user.click(button)
      await waitFor(() => {
        expect(button).toHaveAttribute('aria-expanded', 'false')
      })
    })
  })

  describe('MegaMenuItem', () => {
    it('should have no axe violations', async () => {
      const item = {
        label: 'All Judges',
        href: '/judges',
        description: 'Complete directory of California judges',
      }

      const { container } = render(<MegaMenuItem item={item} />)
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should have accessible link with aria-label', () => {
      const item = {
        label: 'All Judges',
        href: '/judges',
        description: 'Complete directory of California judges',
      }

      render(<MegaMenuItem item={item} />)

      const link = screen.getByRole('link', { name: /all judges/i })
      expect(link).toBeInTheDocument()
      expect(link).toHaveAttribute('href', '/judges')
      expect(link).toHaveAttribute('aria-label')
    })

    it('should handle keyboard focus', async () => {
      const user = userEvent.setup()
      const item = {
        label: 'Compare Judges',
        href: '/compare',
        description: 'Side-by-side judge comparison',
      }

      render(<MegaMenuItem item={item} />)

      const link = screen.getByRole('link', { name: /compare judges/i })

      // Tab to link
      await user.tab()
      expect(link).toHaveFocus()
    })

    it('should render nested items with proper structure', () => {
      const item = {
        label: 'By County',
        href: '#',
        children: [
          { label: 'Los Angeles', href: '/jurisdictions/los-angeles-county' },
          { label: 'Orange County', href: '/jurisdictions/orange-county' },
        ],
      }

      render(<MegaMenuItem item={item} />)

      expect(screen.getByText('By County')).toBeInTheDocument()
      expect(screen.getByLabelText(/by county submenu/i)).toBeInTheDocument()
    })
  })

  describe('MegaMenuSection', () => {
    it('should have no axe violations', async () => {
      const items = [
        { label: 'All Judges', href: '/judges', description: 'Complete directory' },
        { label: 'Compare Judges', href: '/compare', description: 'Side-by-side comparison' },
      ]

      const { container } = render(<MegaMenuSection title="Browse Judges" items={items} />)
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should have proper heading structure', () => {
      const items = [{ label: 'All Courts', href: '/courts' }]

      render(<MegaMenuSection title="Browse Courts" items={items} />)

      const heading = screen.getByText('Browse Courts')
      expect(heading).toBeInTheDocument()
      expect(heading.tagName).toBe('H3')
    })

    it('should group items with proper list structure', () => {
      const items = [
        { label: 'Superior Courts', href: '/courts/type/superior' },
        { label: 'Appellate Courts', href: '/courts/type/appellate' },
      ]

      render(<MegaMenuSection title="Court Levels" items={items} />)

      expect(screen.getByRole('list')).toBeInTheDocument()
    })
  })

  describe('Keyboard Navigation', () => {
    it('should support Tab navigation through menu items', async () => {
      const user = userEvent.setup()
      const items = [
        { label: 'Item 1', href: '/item-1' },
        { label: 'Item 2', href: '/item-2' },
        { label: 'Item 3', href: '/item-3' },
      ]

      render(<MegaMenuSection title="Test Section" items={items} />)

      // Tab through items
      await user.tab()
      expect(screen.getByRole('link', { name: /item 1/i })).toHaveFocus()

      await user.tab()
      expect(screen.getByRole('link', { name: /item 2/i })).toHaveFocus()

      await user.tab()
      expect(screen.getByRole('link', { name: /item 3/i })).toHaveFocus()
    })
  })

  describe('Focus Management', () => {
    it('should return focus to trigger button on Escape', async () => {
      const user = userEvent.setup()
      render(<MegaMenu type="judges" label="Judges" isActive={false} isMobile={false} />)

      const button = screen.getByRole('button', { name: /judges menu/i })

      // Open menu with Enter
      button.focus()
      await user.keyboard('{Enter}')

      // Close with Escape
      await user.keyboard('{Escape}')

      // Focus should return to button
      await waitFor(() => {
        expect(button).toHaveFocus()
      })
    })
  })
})

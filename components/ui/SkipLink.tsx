/**
 * SkipLink Component
 *
 * Provides keyboard users with a quick way to skip repetitive navigation
 * and jump directly to main content. Meets WCAG 2.4.1 (Bypass Blocks).
 *
 * Usage:
 * <SkipLink />
 * <main id="main-content">...</main>
 */

export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:shadow-lg focus:font-medium"
    >
      Skip to main content
    </a>
  )
}

/**
 * SkipLinks Component
 *
 * Multiple skip links for complex pages with sidebars and footers.
 */

interface SkipLinksProps {
  links?: Array<{
    href: string
    label: string
  }>
}

export function SkipLinks({ links }: SkipLinksProps) {
  const defaultLinks = [
    { href: '#main-content', label: 'Skip to main content' },
    { href: '#navigation', label: 'Skip to navigation' },
  ]

  const skipLinks = links || defaultLinks

  return (
    <div className="sr-only focus-within:not-sr-only focus-within:absolute focus-within:top-4 focus-within:left-4 focus-within:z-50 focus-within:flex focus-within:flex-col focus-within:gap-2">
      {skipLinks.map((link) => (
        <a
          key={link.href}
          href={link.href}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg outline-none ring-2 ring-primary ring-offset-2 shadow-lg font-medium hover:bg-primary/90 transition-colors"
        >
          {link.label}
        </a>
      ))}
    </div>
  )
}

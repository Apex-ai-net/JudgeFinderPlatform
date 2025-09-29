'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import * as React from 'react'

type SharedTransitionLinkProps = React.ComponentProps<typeof Link> & {
  viewTransitionName?: string
}

export function SharedTransitionLink({
  viewTransitionName,
  children,
  href,
  onClick,
  replace,
  scroll,
  target,
  ...props
}: SharedTransitionLinkProps) {
  const router = useRouter()

  const handleClick: React.MouseEventHandler<HTMLAnchorElement> = (event) => {
    onClick?.(event)

    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      target && target !== '_self'
    ) {
      return
    }

    if (!document.startViewTransition || typeof href !== 'string') {
      return
    }

    event.preventDefault()

    const navigate = () => {
      const options = scroll === undefined ? undefined : { scroll }
      if (replace) {
        return router.replace(href, options)
      }
      return router.push(href, options)
    }

    document.startViewTransition(() => navigate())
  }

  return (
    <Link
      {...props}
      href={href}
      onClick={handleClick}
      replace={replace}
      scroll={scroll}
      target={target}
    >
      <span data-view-transition-name={viewTransitionName}>{children}</span>
    </Link>
  )
}


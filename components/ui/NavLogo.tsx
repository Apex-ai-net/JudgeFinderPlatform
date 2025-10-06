'use client'

import React from 'react'
import Link from 'next/link'

interface NavLogoProps {
  className?: string
  variant?: 'default' | 'dark' | 'monochrome'
  showText?: boolean
}

const NavLogo: React.FC<NavLogoProps> = ({
  className = "",
  variant = 'default',
  showText = true
}) => {
  const brandBlue = '#2B9FE3'
  const brandBlueDark = '#2389C9'
  const white = '#FFFFFF'

  return (
    <Link href="/" className={className}>
      <div className="flex items-center gap-2.5 group">
        {/* Courthouse Logo Icon */}
        <div className="w-10 h-10 flex items-center justify-center">
          <svg
            viewBox="0 0 160 120"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full transition-transform duration-200 group-hover:scale-105"
          >
            <g transform="translate(80, 60)">
              {/* Base */}
              <rect x="-80" y="50" width="160" height="8" fill={variant === 'dark' ? white : 'currentColor'} className="text-foreground"/>
              <rect x="-75" y="58" width="150" height="4" fill={variant === 'dark' ? white : 'currentColor'} className="text-foreground"/>

              {/* Columns */}
              <rect x="-65" y="-10" width="12" height="60" fill={variant === 'dark' ? white : 'currentColor'} className="text-foreground"/>
              <rect x="-35" y="-10" width="12" height="60" fill={variant === 'dark' ? white : 'currentColor'} className="text-foreground"/>
              <rect x="23" y="-10" width="12" height="60" fill={variant === 'dark' ? white : 'currentColor'} className="text-foreground"/>
              <rect x="53" y="-10" width="12" height="60" fill={variant === 'dark' ? white : 'currentColor'} className="text-foreground"/>

              {/* Door (Brand Blue) */}
              <rect x="-15" y="0" width="30" height="50" fill={brandBlue} className="transition-colors duration-200 group-hover:fill-[#2389C9]"/>

              {/* Entablature */}
              <rect x="-75" y="-18" width="150" height="8" fill={variant === 'dark' ? white : 'currentColor'} className="text-foreground"/>

              {/* Pediment */}
              <path d="M 0,-50 L 85,-18 L -85,-18 Z" fill={variant === 'dark' ? white : 'currentColor'} className="text-foreground"/>
              <path d="M 0,-45 L 75,-18 L -75,-18 Z" fill={variant === 'dark' ? white : 'currentColor'} fillOpacity="0.3" className="text-foreground"/>
            </g>
          </svg>
        </div>

        {/* Logo Text */}
        {showText && (
          <div className="flex items-baseline">
            <span className={`text-xl font-semibold transition-colors duration-200 ${
              variant === 'dark'
                ? 'text-white'
                : variant === 'monochrome'
                ? 'text-enterprise-slate-black'
                : 'text-enterprise-slate-black dark:text-white'
            }`}>
              JudgeFinder
            </span>
            <span className={`text-xl font-normal transition-colors duration-200`}
              style={{ color: brandBlue }}>
              .io
            </span>
          </div>
        )}
      </div>
    </Link>
  )
}

export default NavLogo
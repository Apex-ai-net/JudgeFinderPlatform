'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDownIcon, MapPinIcon } from '@heroicons/react/24/outline'
import { focusRing, focusRingInset } from '@/lib/design-system/focus-states'
import { cn } from '@/lib/utils'

interface County {
  id: string
  name: string
  judges_count: number
  status: 'active' | 'expanding' | 'planned'
  phase: number
}

const counties: County[] = [
  {
    id: 'orange',
    name: 'Orange County',
    judges_count: 250,
    status: 'active',
    phase: 2,
  },
  {
    id: 'los-angeles',
    name: 'Los Angeles County',
    judges_count: 600,
    status: 'expanding',
    phase: 3,
  },
  {
    id: 'san-diego',
    name: 'San Diego County',
    judges_count: 150,
    status: 'planned',
    phase: 4,
  },
  {
    id: 'santa-clara',
    name: 'Santa Clara County',
    judges_count: 75,
    status: 'planned',
    phase: 4,
  },
]

export function CountySelector(): JSX.Element {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedCounty, setSelectedCounty] = useState<County>(counties[0])
  const [focusedIndex, setFocusedIndex] = useState(0)
  const router = useRouter()
  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuId = 'county-selector-menu'

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return

      const availableCounties = counties.filter((c) => c.status !== 'planned')

      switch (e.key) {
        case 'Escape':
          e.preventDefault()
          setIsOpen(false)
          buttonRef.current?.focus()
          break

        case 'ArrowDown':
          e.preventDefault()
          setFocusedIndex((prev) => {
            const next = Math.min(prev + 1, counties.length - 1)
            return next
          })
          break

        case 'ArrowUp':
          e.preventDefault()
          setFocusedIndex((prev) => {
            const next = Math.max(prev - 1, 0)
            return next
          })
          break

        case 'Home':
          e.preventDefault()
          setFocusedIndex(0)
          break

        case 'End':
          e.preventDefault()
          setFocusedIndex(counties.length - 1)
          break

        case 'Enter':
        case ' ':
          e.preventDefault()
          const county = counties[focusedIndex]
          if (county.status !== 'planned') {
            handleCountyChange(county)
          }
          break

        default:
          break
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, focusedIndex])

  // Focus the selected option when menu opens
  useEffect(() => {
    if (isOpen) {
      const selectedIndex = counties.findIndex((c) => c.id === selectedCounty.id)
      setFocusedIndex(selectedIndex >= 0 ? selectedIndex : 0)
    }
  }, [isOpen, selectedCounty.id])

  const handleCountyChange = (county: County) => {
    setSelectedCounty(county)
    setIsOpen(false)

    // Navigate to jurisdiction-specific page
    if (county.status === 'active' || county.status === 'expanding') {
      router.push(`/jurisdictions/${county.id}`)
    }
  }

  const getStatusBadge = (status: County['status']) => {
    const badges = {
      active: 'bg-success/10 text-success border-success/20',
      expanding: 'bg-primary/10 text-primary border-primary/20',
      planned: 'bg-muted text-muted-foreground border-border',
    }

    const labels = {
      active: 'Active',
      expanding: 'Expanding',
      planned: 'Planned',
    }

    return (
      <span className={cn('px-2 py-1 text-xs font-medium rounded-full border', badges[status])}>
        {labels[status]}
      </span>
    )
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center space-x-2 px-4 py-2 bg-background border border-border rounded-lg shadow-sm hover:bg-muted transition-colors',
          focusRing
        )}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={menuId}
        aria-label={`Select county. Current selection: ${selectedCounty.name}`}
      >
        <MapPinIcon className="h-5 w-5 text-muted-foreground" />
        <span className="font-medium text-foreground">{selectedCounty.name}</span>
        <ChevronDownIcon
          className={cn(
            'h-4 w-4 text-muted-foreground transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {isOpen && (
        <div
          id={menuId}
          role="listbox"
          aria-label="County selection menu"
          className="absolute top-full left-0 mt-2 w-80 bg-background border border-border rounded-lg shadow-lg z-50"
        >
          <div className="p-2">
            <div className="text-sm font-medium text-muted-foreground px-3 py-2 border-b border-border">
              Select County Market
            </div>
            <div className="max-h-96 overflow-y-auto">
              {counties.map((county, index) => {
                const isSelected = county.id === selectedCounty.id
                const isFocused = index === focusedIndex
                const isDisabled = county.status === 'planned'

                return (
                  <button
                    key={county.id}
                    onClick={() => !isDisabled && handleCountyChange(county)}
                    className={cn(
                      'w-full text-left px-3 py-3 rounded-md transition-colors',
                      isFocused && 'bg-accent',
                      !isFocused && 'hover:bg-muted',
                      isDisabled && 'opacity-50 cursor-not-allowed',
                      focusRingInset
                    )}
                    disabled={isDisabled}
                    role="option"
                    aria-selected={isSelected}
                    aria-disabled={isDisabled}
                    tabIndex={isFocused ? 0 : -1}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-foreground">{county.name}</span>
                      {getStatusBadge(county.status)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {county.judges_count} judges • Phase {county.phase}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {county.status === 'active'
                        ? 'Data available'
                        : county.status === 'expanding'
                          ? 'Expanding coverage'
                          : 'Coming soon'}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CountySelector

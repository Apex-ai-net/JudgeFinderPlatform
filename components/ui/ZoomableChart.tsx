'use client'

import { useState, ReactNode } from 'react'
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ZoomableChartProps {
  /** Chart content to wrap */
  children: ReactNode
  /** Enable zoom controls (default: true) */
  enableZoom?: boolean
  /** Enable pan/drag (default: true) */
  enablePan?: boolean
  /** Initial zoom level (default: 1) */
  initialZoom?: number
  /** CSS class name */
  className?: string
}

/**
 * ZoomableChart - Wrapper that adds zoom and pan controls to charts
 *
 * Provides intuitive controls for exploring detailed chart data.
 * Works with any Recharts component.
 *
 * @example
 * ```tsx
 * <ZoomableChart>
 *   <ResponsiveContainer width="100%" height={300}>
 *     <LineChart data={data}>
 *       <Line dataKey="value" />
 *     </LineChart>
 *   </ResponsiveContainer>
 * </ZoomableChart>
 * ```
 */
export function ZoomableChart({
  children,
  enableZoom = true,
  enablePan = true,
  initialZoom = 1,
  className = '',
}: ZoomableChartProps) {
  const [zoom, setZoom] = useState(initialZoom)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev * 1.2, 5)) // Max 5x zoom
  }

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev / 1.2, 1)) // Min 1x zoom
  }

  const handleReset = () => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!enablePan || zoom === 1) return
    setIsDragging(true)
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  return (
    <div className={cn('relative', className)}>
      {/* Zoom Controls */}
      {enableZoom && (
        <div className="absolute top-2 right-2 z-10 flex gap-1 bg-card border border-border rounded-lg shadow-sm p-1">
          <button
            onClick={handleZoomIn}
            disabled={zoom >= 5}
            className={cn(
              'p-2 rounded-md transition-colors',
              'hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed'
            )}
            title="Zoom in"
          >
            <ZoomIn className="h-4 w-4 text-foreground" />
          </button>
          <button
            onClick={handleZoomOut}
            disabled={zoom <= 1}
            className={cn(
              'p-2 rounded-md transition-colors',
              'hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed'
            )}
            title="Zoom out"
          >
            <ZoomOut className="h-4 w-4 text-foreground" />
          </button>
          <button
            onClick={handleReset}
            disabled={zoom === 1 && pan.x === 0 && pan.y === 0}
            className={cn(
              'p-2 rounded-md transition-colors',
              'hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed'
            )}
            title="Reset view"
          >
            <RotateCcw className="h-4 w-4 text-foreground" />
          </button>
        </div>
      )}

      {/* Chart Container */}
      <div
        className={cn(
          'overflow-hidden',
          enablePan && zoom > 1 && 'cursor-move'
        )}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div
          style={{
            transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
            transformOrigin: 'center center',
            transition: isDragging ? 'none' : 'transform 0.2s ease-out',
          }}
        >
          {children}
        </div>
      </div>

      {/* Zoom Level Indicator */}
      {enableZoom && zoom > 1 && (
        <div className="absolute bottom-2 right-2 z-10 px-2 py-1 bg-card border border-border rounded text-xs font-medium text-muted-foreground">
          {Math.round(zoom * 100)}%
        </div>
      )}
    </div>
  )
}

/**
 * Type declarations for react-window
 * react-window@1.8.11 does not ship with TypeScript definitions
 * This declaration file provides minimal type support for the components we use
 */

declare module 'react-window' {
  import { ComponentType, CSSProperties, ReactElement, Ref } from 'react'

  export interface GridChildComponentProps<T = unknown> {
    columnIndex: number
    rowIndex: number
    style: CSSProperties
    data?: T
  }

  export interface GridOnItemsRenderedProps {
    overscanColumnStartIndex: number
    overscanColumnStopIndex: number
    overscanRowStartIndex: number
    overscanRowStopIndex: number
    visibleColumnStartIndex: number
    visibleColumnStopIndex: number
    visibleRowStartIndex: number
    visibleRowStopIndex: number
  }

  export interface GridOnScrollProps {
    horizontalScrollDirection: 'forward' | 'backward'
    scrollLeft: number
    scrollTop: number
    scrollUpdateWasRequested: boolean
    verticalScrollDirection: 'forward' | 'backward'
  }

  export interface FixedSizeGridProps<T = unknown> {
    children: ComponentType<GridChildComponentProps<T>>
    columnCount: number
    columnWidth: number
    height: number
    rowCount: number
    rowHeight: number
    width: number
    itemData?: T
    itemKey?: (props: { columnIndex: number; rowIndex: number; data?: T }) => string | number
    overscanColumnCount?: number
    overscanRowCount?: number
    onItemsRendered?: (props: GridOnItemsRenderedProps) => void
    onScroll?: (props: GridOnScrollProps) => void
    className?: string
    style?: CSSProperties
    ref?: Ref<unknown>
  }

  export const FixedSizeGrid: ComponentType<FixedSizeGridProps>

  export interface VariableSizeGridProps
    extends Omit<FixedSizeGridProps, 'columnWidth' | 'rowHeight'> {
    columnWidth: (index: number) => number
    rowHeight: (index: number) => number
  }

  export const VariableSizeGrid: ComponentType<VariableSizeGridProps>
}

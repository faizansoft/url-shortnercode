declare module 'react-simple-maps' {
  import * as React from 'react'

  export interface GeographyProps {
    geography: unknown
    className?: string
    style?: Record<string, unknown>
    fill?: string
    stroke?: string
    onClick?: (event: React.MouseEvent<SVGPathElement, MouseEvent>) => void
    onMouseEnter?: (event: React.MouseEvent<SVGPathElement, MouseEvent>) => void
    onMouseLeave?: (event: React.MouseEvent<SVGPathElement, MouseEvent>) => void
    children?: React.ReactNode
  }

  export const ComposableMap: React.FC<{
    projection?: string | unknown
    projectionConfig?: unknown
    width?: number
    height?: number
    className?: string
    style?: Record<string, unknown>
    children?: React.ReactNode
  }>

  export const Geographies: React.FC<{
    geography: string | unknown
    children?: (props: { geographies: unknown[] }) => React.ReactNode
  }>

  export const Geography: React.FC<GeographyProps>
}

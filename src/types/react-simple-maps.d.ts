declare module 'react-simple-maps' {
  import * as React from 'react'

  export interface GeographyProps {
    geography: any
    className?: string
    style?: any
    fill?: string
    stroke?: string
    onClick?: (event: React.MouseEvent<SVGPathElement, MouseEvent>) => void
    onMouseEnter?: (event: React.MouseEvent<SVGPathElement, MouseEvent>) => void
    onMouseLeave?: (event: React.MouseEvent<SVGPathElement, MouseEvent>) => void
    children?: React.ReactNode
  }

  export const ComposableMap: React.FC<{
    projection?: string | any
    projectionConfig?: any
    width?: number
    height?: number
    className?: string
    style?: any
    children?: React.ReactNode
  }>

  export const Geographies: React.FC<{
    geography: string | any
    children?: (props: { geographies: any[] }) => React.ReactNode
  }>

  export const Geography: React.FC<GeographyProps>
}

export type HeroBlock = { id: string; type: 'hero'; heading: string; subheading?: string }
export type TextBlock = { id: string; type: 'text'; text: string }
export type HeadingBlock = { id: string; type: 'heading'; text: string; level?: 1 | 2 | 3 | 4 | 5 | 6 }
export type ButtonBlock = { id: string; type: 'button'; label: string; href: string }
export type LinkBlock = { id: string; type: 'link'; text: string; href: string }
export type ImageBlock = { id: string; type: 'image'; src: string; alt?: string; rounded?: boolean }
export type ProductCardBlock = {
  id: string
  type: 'product-card'
  image: string
  title: string
  subtitle?: string
  ctaLabel?: string
  ctaHref?: string
}

// An SVG-based theme/template block rendered from a preset with editable slots.
// slots: arbitrary key/value map for text, colors, image URLs, etc.
export type SvgThemeBlock = {
  id: string
  type: 'svg-theme'
  themeId: string
  slots: Record<string, string>
}

export type Block = HeroBlock | TextBlock | HeadingBlock | ButtonBlock | LinkBlock | ImageBlock | ProductCardBlock | SvgThemeBlock

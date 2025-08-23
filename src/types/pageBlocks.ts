export type HeroBlock = { id: string; type: 'hero'; heading: string; subheading?: string }
export type TextBlock = { id: string; type: 'text'; text: string; styles?: Record<string, string> }
export type ButtonBlock = { id: string; type: 'button'; label: string; href: string; styles?: Record<string, string> }
export type ImageBlock = { id: string; type: 'image'; src: string; alt?: string; rounded?: boolean; styles?: Record<string, string> }
export type DividerBlock = { id: string; type: 'divider' }
export type ProductCardBlock = {
  id: string
  type: 'product-card'
  image: string
  title: string
  subtitle?: string
  ctaLabel?: string
  ctaHref?: string
}

export type Block = HeroBlock | TextBlock | ButtonBlock | ImageBlock | ProductCardBlock | DividerBlock

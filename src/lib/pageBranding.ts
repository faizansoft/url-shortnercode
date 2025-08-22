export type Branding = {
  logoUrl: string | null
  coverUrl: string | null
  brandColor: string
  accentColor: string
  hero: {
    height: number // px
    align: 'left' | 'center'
  }
  bg: {
    type: 'none' | 'image'
    imageUrl: string | null
    repeat: 'no-repeat' | 'repeat' | 'repeat-x' | 'repeat-y'
    size: 'cover' | 'contain' | 'auto'
    position: string // e.g. 'center', 'left top'
    overlay: { color: string; opacity: number } // 0..1
  }
}

export const defaultBranding: Branding = {
  logoUrl: null,
  coverUrl: null,
  brandColor: '#2563eb',
  accentColor: '#22c55e',
  hero: { height: 360, align: 'left' },
  bg: {
    type: 'none',
    imageUrl: null,
    repeat: 'no-repeat',
    size: 'cover',
    position: 'center',
    overlay: { color: '#000000', opacity: 0.4 },
  },
}

// Sanitizes user-provided branding payload
export function normalizeBranding(input: unknown): Branding {
  const b = (typeof input === 'object' && input !== null ? (input as Partial<Branding>) : {})
  const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n))
  return {
    logoUrl: typeof b.logoUrl === 'string' ? b.logoUrl : null,
    coverUrl: typeof b.coverUrl === 'string' ? b.coverUrl : null,
    brandColor: typeof b.brandColor === 'string' ? b.brandColor : defaultBranding.brandColor,
    accentColor: typeof b.accentColor === 'string' ? b.accentColor : defaultBranding.accentColor,
    hero: {
      height: clamp(typeof b.hero?.height === 'number' ? b.hero.height : defaultBranding.hero.height, 200, 600),
      align: b.hero?.align === 'center' || b.hero?.align === 'left' ? b.hero.align : defaultBranding.hero.align,
    },
    bg: {
      type: b.bg?.type === 'image' ? 'image' : 'none',
      imageUrl: typeof b.bg?.imageUrl === 'string' ? b.bg.imageUrl : null,
      repeat: (['no-repeat','repeat','repeat-x','repeat-y'] as const).includes((b.bg?.repeat as any)) ? (b.bg!.repeat as any) : 'no-repeat',
      size: (['cover','contain','auto'] as const).includes((b.bg?.size as any)) ? (b.bg!.size as any) : 'cover',
      position: typeof b.bg?.position === 'string' ? b.bg.position : defaultBranding.bg.position,
      overlay: {
        color: typeof b.bg?.overlay?.color === 'string' ? b.bg.overlay.color : defaultBranding.bg.overlay.color,
        opacity: clamp(typeof b.bg?.overlay?.opacity === 'number' ? b.bg.overlay.opacity : defaultBranding.bg.overlay.opacity, 0, 1),
      }
    }
  }
}

import { getSupabaseServer } from '@/lib/supabaseServer'
import Image from 'next/image'
import FontLoader from './FontLoader'
import type { Theme } from '@/lib/pageThemes'
import { defaultTheme } from '@/lib/pageThemes'
import type { Branding } from '@/lib/pageBranding'
import { defaultBranding, normalizeBranding } from '@/lib/pageBranding'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

// Public-facing page renderer by slug
type HeroBlock = { id?: string; type: 'hero'; heading: string; subheading?: string }
type TextBlock = { id?: string; type: 'text'; text: string }
type ButtonBlock = { id?: string; type: 'button'; label: string; href: string }
type Block = HeroBlock | TextBlock | ButtonBlock

type PublicPageRow = { title: string; blocks: unknown; published: boolean; theme?: Theme | null; branding?: Branding | null }

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null
}
function isHero(b: unknown): b is HeroBlock {
  if (!isRecord(b)) return false
  return b['type'] === 'hero' && typeof b['heading'] === 'string'
}
function isText(b: unknown): b is TextBlock {
  if (!isRecord(b)) return false
  return b['type'] === 'text' && typeof b['text'] === 'string'
}
function isButton(b: unknown): b is ButtonBlock {
  if (!isRecord(b)) return false
  return b['type'] === 'button' && typeof b['label'] === 'string' && typeof b['href'] === 'string'
}

export default async function PublicPage({ params }: { params: Promise<{ slug: string }> }) {
  const supabase = getSupabaseServer()
  const { slug } = await params
  const slugDecoded = decodeURIComponent(slug)

  const { data, error } = await supabase
    .from('pages')
    .select('*')
    .eq('slug', slugDecoded)
    .eq('published', true)
    .maybeSingle()

  if (error) {
    return (
      <div className="min-h-[60vh] grid place-items-center">
        <div className="text-sm text-red-600">{error.message}</div>
      </div>
    )
  }
  if (!data) {
    return (
      <div className="min-h-[60vh] grid place-items-center">
        <div className="text-sm text-[var(--muted)]">Page not found</div>
      </div>
    )
  }

  const row = data as PublicPageRow
  const rawBlocks = row.blocks
  const blocks: Block[] = Array.isArray(rawBlocks)
    ? rawBlocks.filter((b: unknown): b is Block => isHero(b) || isText(b) || isButton(b))
    : []

  const theme = (row.theme as Partial<Theme> | null | undefined) || undefined
  // Merge with defaults to avoid undefined access from partial/legacy rows
  const t: Theme = theme ? {
    ...defaultTheme,
    ...theme,
    palette: { ...defaultTheme.palette, ...(theme.palette ?? {}) },
    gradient: {
      angle: theme.gradient?.angle ?? defaultTheme.gradient.angle,
      stops: theme.gradient?.stops ?? defaultTheme.gradient.stops,
    },
    typography: { ...defaultTheme.typography, ...(theme.typography ?? {}) },
    layout: { ...defaultTheme.layout, ...(theme.layout ?? {}) },
  } : defaultTheme

  // Branding: normalize
  const b: Branding = normalizeBranding((row as { branding?: unknown }).branding ?? defaultBranding)

  function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex)
    if (!m) return null
    return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) }
  }
  function overlayCss(color: string, opacity: number): string {
    const rgb = hexToRgb(color) || { r: 0, g: 0, b: 0 }
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${Math.max(0, Math.min(1, opacity))})`
  }

  const googleFontMap: Record<NonNullable<Theme['typography']['font']>, { css: string; family: string }> = {
    'system': { css: '', family: `ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, Apple Color Emoji, Segoe UI Emoji` },
    'inter': { css: 'Inter:wght@400;500;600;700', family: 'Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial' },
    'poppins': { css: 'Poppins:wght@400;500;600;700', family: 'Poppins, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial' },
    'outfit': { css: 'Outfit:wght@400;500;600;700', family: 'Outfit, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial' },
    'merriweather': { css: 'Merriweather:wght@400;700', family: 'Merriweather, Georgia, serif' },
    'space-grotesk': { css: 'Space+Grotesk:wght@400;500;600;700', family: '"Space Grotesk", ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial' },
    'lora': { css: 'Lora:wght@400;500;600;700', family: 'Lora, Georgia, serif' },
  }
  const allowedFonts = ['system','inter','poppins','outfit','merriweather','space-grotesk','lora'] as const
  type FontKey = typeof allowedFonts[number]
  function normalizeFont(f: unknown): FontKey {
    if (typeof f !== 'string') return 'system'
    const s = f.toLowerCase().replace(/_/g, '-').replace(/\s+/g, '-')
    return (allowedFonts as readonly string[]).includes(s) ? (s as FontKey) : 'system'
  }
  const fontKey = normalizeFont((t as unknown as { typography?: { font?: unknown } }).typography?.font)
  const gf = googleFontMap[fontKey] || googleFontMap['system']
  const cssVars = {
    '--primary': t.palette.primary,
    '--secondary': t.palette.secondary,
    '--surface': t.palette.surface,
    '--foreground': t.palette.foreground,
    '--muted': t.palette.muted,
    '--border': t.palette.border,
    '--radius': `${t.radius}px`,
    '--maxw': `${t.layout.maxWidth}px`,
    '--section-gap': `${t.layout.sectionGap}px`,
    '--gradient': `linear-gradient(${t.gradient.angle}deg, ${t.gradient.stops.map(s=>`${s.color} ${s.at}%`).join(', ')})`,
    '--font': gf.family,
    '--font-size': `${t.typography.baseSize}px`,
    '--font-weight': `${t.typography.weight}`,
    '--brand': b.brandColor,
    '--accent': b.accentColor,
  } as React.CSSProperties

  return (
    <>
    {gf.css && (
      <FontLoader href={`https://fonts.googleapis.com/css2?family=${gf.css}&display=swap`} />
    )}
    <main
      className="mx-auto p-6"
      style={{
        ...cssVars,
        maxWidth: t.layout.maxWidth ?? 768,
        background: t.palette.surface ?? 'var(--surface)',
        color: t.palette.foreground ?? 'var(--foreground)',
        fontFamily: 'var(--font)',
        fontSize: 'var(--font-size)',
        fontWeight: (t.typography.weight ?? 500),
        backgroundImage: b.bg.type === 'image' && b.bg.imageUrl ? `${b.bg.overlay.opacity > 0 ? `linear-gradient(${overlayCss(b.bg.overlay.color, b.bg.overlay.opacity)}, ${overlayCss(b.bg.overlay.color, b.bg.overlay.opacity)}), ` : ''}url(${b.bg.imageUrl})` : undefined,
        backgroundRepeat: b.bg.type === 'image' ? b.bg.repeat : undefined,
        backgroundSize: b.bg.type === 'image' ? b.bg.size : undefined,
        backgroundPosition: b.bg.type === 'image' ? b.bg.position : undefined,
      }}
    >
      {(b.logoUrl) && (
        <header className="mb-4" style={{ textAlign: t.layout.align }}>
          <Image src={b.logoUrl} alt="Logo" width={120} height={32} style={{ height: 32, width: 'auto', objectFit: 'contain', display: 'inline-block' }} unoptimized />
        </header>
      )}
      <div
        className="rounded-xl mb-6"
        style={{
          padding: '24px',
          textAlign: (b.hero.align ?? 'left'),
          height: b.coverUrl ? `${b.hero.height}px` : undefined,
          display: 'grid',
          alignItems: 'center',
          background: b.coverUrl
            ? undefined
            : 'var(--gradient)',
          backgroundImage: b.coverUrl
            ? `${overlayCss('#000000', 0.0) && b.bg.overlay.opacity >= 0 ? `linear-gradient(${overlayCss(b.bg.overlay.color, b.bg.overlay.opacity)}, ${overlayCss(b.bg.overlay.color, b.bg.overlay.opacity)}), ` : ''}url(${b.coverUrl})`
            : undefined,
          backgroundSize: b.coverUrl ? 'cover' : undefined,
          backgroundPosition: b.coverUrl ? 'center' : undefined,
          borderRadius: 'var(--radius)'
        }}
      >
        <h1 className="text-3xl font-bold" style={{ margin: 0 }}>{row.title}</h1>
      </div>
      <section className="space-y-6" style={{ marginTop: 0 }}>
        {blocks.map((b, idx) => {
          if (b?.type === 'hero') {
            return (
              <div key={b.id ?? idx} className="rounded-xl p-8" style={{ background: 'color-mix(in oklab, var(--brand) 10%, transparent)', borderRadius: 'var(--radius)' }}>
                <div className="text-2xl font-semibold mb-1">{b.heading}</div>
                {b.subheading && <div className="text-sm" style={{ color: 'var(--muted)' }}>{b.subheading}</div>}
              </div>
            )
          }
          if (b?.type === 'text') {
            return (
              <div key={b.id ?? idx} className="prose prose-invert max-w-none" style={{ color: 'var(--foreground)' }}>
                {b.text}
              </div>
            )
          }
          if (b?.type === 'button') {
            return (
              <div key={b.id ?? idx} style={{ textAlign: (t.layout.align ?? 'left') }}>
                <a href={b.href} target="_blank" rel="noreferrer" className="btn btn-primary h-10 inline-flex items-center justify-center px-4" style={{ background: 'var(--brand)', borderRadius: 'var(--radius)' }}>{b.label}</a>
              </div>
            )
          }
          return null
        })}
      </section>
    </main>
    </>
  )
}

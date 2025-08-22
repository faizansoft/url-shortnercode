import { getSupabaseServer } from '@/lib/supabaseServer'
import FontLoader from './FontLoader'
import type { Theme } from '@/lib/pageThemes'
import { defaultTheme } from '@/lib/pageThemes'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

// Public-facing page renderer by slug
type HeroBlock = { id?: string; type: 'hero'; heading: string; subheading?: string }
type TextBlock = { id?: string; type: 'text'; text: string }
type ButtonBlock = { id?: string; type: 'button'; label: string; href: string }
type Block = HeroBlock | TextBlock | ButtonBlock

type PublicPageRow = { title: string; blocks: unknown; published: boolean; theme?: Theme | null }

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
    .select('title, blocks, published, theme')
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

  const googleFontMap: Record<NonNullable<Theme['typography']['font']>, { css: string; family: string }> = {
    'system': { css: '', family: `ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, Apple Color Emoji, Segoe UI Emoji` },
    'inter': { css: 'Inter:wght@400;500;600;700', family: 'Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial' },
    'poppins': { css: 'Poppins:wght@400;500;600;700', family: 'Poppins, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial' },
    'outfit': { css: 'Outfit:wght@400;500;600;700', family: 'Outfit, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial' },
    'merriweather': { css: 'Merriweather:wght@400;700', family: 'Merriweather, Georgia, serif' },
    'space-grotesk': { css: 'Space+Grotesk:wght@400;500;600;700', family: '"Space Grotesk", ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial' },
    'lora': { css: 'Lora:wght@400;500;600;700', family: 'Lora, Georgia, serif' },
  }
  const fontKey = (t.typography.font ?? 'system') as NonNullable<Theme['typography']['font']>
  const gf = googleFontMap[fontKey]
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
        fontWeight: (t.typography.weight ?? 500)
      }}
    >
      <div
        className="rounded-xl mb-6"
        style={{ background: 'var(--gradient)', padding: '24px', textAlign: (t.layout.align ?? 'left') }}
      >
        <h1 className="text-3xl font-bold" style={{ margin: 0 }}>{row.title}</h1>
      </div>
      <section className="space-y-6" style={{ marginTop: 0 }}>
        {blocks.map((b, idx) => {
          if (b?.type === 'hero') {
            return (
              <div key={b.id ?? idx} className="rounded-xl p-8" style={{ background: 'var(--gradient)', borderRadius: 'var(--radius)' }}>
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
                <a href={b.href} target="_blank" rel="noreferrer" className="btn btn-primary h-10 inline-flex items-center justify-center px-4" style={{ background: 'var(--primary)', borderRadius: 'var(--radius)' }}>{b.label}</a>
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

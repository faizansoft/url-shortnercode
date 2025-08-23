import { getSupabaseServer } from '@/lib/supabaseServer'
import Image from 'next/image'
import type { Block as SharedBlock, ImageBlock, ProductCardBlock } from '@/types/pageBlocks'
import type React from 'react'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

// Public-facing page renderer by slug
type HeroBlock = { id?: string; type: 'hero'; heading: string; subheading?: string }
type TextBlock = { id?: string; type: 'text'; text: string }
type ButtonBlock = { id?: string; type: 'button'; label: string; href: string }
type Block = HeroBlock | TextBlock | ButtonBlock | SharedBlock

type PublicPageRow = { title: string; blocks: unknown; published: boolean }

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
function isImage(b: unknown): b is ImageBlock {
  if (!isRecord(b)) return false
  return b['type'] === 'image' && typeof b['src'] === 'string'
}
function isProductCard(b: unknown): b is ProductCardBlock {
  if (!isRecord(b)) return false
  return b['type'] === 'product-card' && typeof b['image'] === 'string' && typeof b['title'] === 'string'
}

function isHeading(b: unknown): b is { id?: string; type: 'heading'; text: string; level?: number } {
  if (!isRecord(b)) return false
  return b['type'] === 'heading' && typeof b['text'] === 'string'
}
function isLink(b: unknown): b is { id?: string; type: 'link'; text: string; href: string } {
  if (!isRecord(b)) return false
  return b['type'] === 'link' && typeof b['text'] === 'string' && typeof b['href'] === 'string'
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
    ? rawBlocks.filter((b: unknown): b is Block =>
        isHero(b) ||
        isText(b) ||
        isButton(b) ||
        isImage(b) ||
        isProductCard(b) ||
        isHeading(b) ||
        isLink(b)
      )
    : []

  // Neutral, content-first presentation (no theme or branding)
  const t = {
    layout: { maxWidth: 768, align: 'left' as const },
  }

  // no-op helpers removed with branding/theme purge

  const cssVars = {
    '--surface': '#0b0f1a',
    '--foreground': '#e5e7eb',
    '--muted': '#94a3b8',
    '--border': '#1f2937',
    '--radius': '12px',
  } as React.CSSProperties

  return (
    <main
      className="mx-auto p-6"
      style={{
        ...cssVars,
        maxWidth: 768,
        background: 'var(--surface)',
        color: 'var(--foreground)',
        fontFamily: `ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, Apple Color Emoji, Segoe UI Emoji`,
        fontSize: 16,
        fontWeight: 500,
      }}
    >
      <header className="mb-4" style={{ textAlign: 'left' }}>
        <h1 className="text-3xl font-bold" style={{ margin: 0 }}>{row.title}</h1>
      </header>
      <section className="space-y-6" style={{ marginTop: 0 }}>
        {blocks.map((b, idx) => {
          if (isHero(b)) {
            return (
              <div key={b.id ?? idx} className="rounded-xl p-8" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                <div className="text-2xl font-semibold mb-1">{b.heading}</div>
                {b.subheading && <div className="text-sm" style={{ color: 'var(--muted)' }}>{b.subheading}</div>}
              </div>
            )
          }
          if (isHeading(b)) {
            const lvl = Math.min(6, Math.max(1, Number(b.level ?? 2))) as 1|2|3|4|5|6
            const key = b.id ?? idx
            const commonProps = { className: 'font-semibold', style: { margin: 0, textAlign: 'left' as React.CSSProperties['textAlign'] } }
            if (lvl === 1) return (<h1 key={key} {...commonProps} className={`text-3xl ${commonProps.className}`}>{b.text}</h1>)
            if (lvl === 2) return (<h2 key={key} {...commonProps} className={`text-2xl ${commonProps.className}`}>{b.text}</h2>)
            if (lvl === 3) return (<h3 key={key} {...commonProps} className={`text-xl ${commonProps.className}`}>{b.text}</h3>)
            if (lvl === 4) return (<h4 key={key} {...commonProps} className={`text-lg ${commonProps.className}`}>{b.text}</h4>)
            if (lvl === 5) return (<h5 key={key} {...commonProps} className={`text-base ${commonProps.className}`}>{b.text}</h5>)
            return (<h6 key={key} {...commonProps} className={`text-sm ${commonProps.className}`}>{b.text}</h6>)
          }
          if (isText(b)) {
            return (
              <div key={b.id ?? idx} className="prose prose-invert max-w-none" style={{ color: 'var(--foreground)' }}>
                {b.text}
              </div>
            )
          }
          if (isButton(b)) {
            return (
              <div key={b.id ?? idx} style={{ textAlign: 'left' }}>
                <a href={b.href} target="_blank" rel="noreferrer" className="btn btn-primary h-10 inline-flex items-center justify-center px-4" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>{b.label}</a>
              </div>
            )
          }
          if (isLink(b)) {
            return (
              <div key={b.id ?? idx} style={{ textAlign: 'left' }}>
                <a href={b.href} target="_blank" rel="noreferrer" className="underline" style={{ color: 'var(--foreground)' }}>{b.text}</a>
              </div>
            )
          }
          if (isImage(b)) {
            const rounded = b.rounded ? 'var(--radius)' : '8px'
            return (
              <div key={b.id ?? idx} className="overflow-hidden" style={{ borderRadius: rounded }}>
                <Image src={b.src} alt={b.alt || ''} width={1200} height={675} style={{ width: '100%', height: 'auto', objectFit: 'cover' }} unoptimized />
              </div>
            )
          }
          if (isProductCard(b)) {
            const pb = b
            return (
              <div key={pb.id ?? idx} className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-4 items-center rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                <div className="overflow-hidden rounded-lg">
                  <Image src={pb.image} alt={pb.title || ''} width={800} height={800} style={{ width: '100%', height: 'auto', objectFit: 'cover' }} unoptimized />
                </div>
                <div>
                  <div className="text-xl font-semibold mb-1">{pb.title}</div>
                  {pb.subtitle && <div className="text-sm mb-3" style={{ color: 'var(--muted)' }}>{pb.subtitle}</div>}
                  {pb.ctaHref && pb.ctaLabel && (
                    <a href={pb.ctaHref} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center h-10 px-4" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>{pb.ctaLabel}</a>
                  )}
                </div>
              </div>
            )
          }
          return null
        })}
      </section>
    </main>
  )
}

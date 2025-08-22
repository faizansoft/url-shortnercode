import { getSupabaseServer } from '@/lib/supabaseServer'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

// Public-facing page renderer by slug
type HeroBlock = { id?: string; type: 'hero'; heading: string; subheading?: string }
type TextBlock = { id?: string; type: 'text'; text: string }
type ButtonBlock = { id?: string; type: 'button'; label: string; href: string }
type Block = HeroBlock | TextBlock | ButtonBlock

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

export default async function PublicPage({ params }: { params: Promise<{ slug: string }> }) {
  const supabase = getSupabaseServer()
  const { slug } = await params
  const slugDecoded = decodeURIComponent(slug)

  const { data, error } = await supabase
    .from('pages')
    .select('title, blocks, published')
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

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-8">
      <h1 className="text-3xl font-bold">{row.title}</h1>
      <section className="space-y-6">
        {blocks.map((b, idx) => {
          if (b?.type === 'hero') {
            return (
              <div key={b.id ?? idx} className="rounded-xl p-8 text-center" style={{ background: 'color-mix(in oklab, var(--accent) 12%, transparent)' }}>
                <div className="text-2xl font-semibold mb-1">{b.heading}</div>
                {b.subheading && <div className="text-sm text-[var(--muted)]">{b.subheading}</div>}
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
              <div key={b.id ?? idx} className="text-center">
                <a href={b.href} target="_blank" rel="noreferrer" className="btn btn-primary h-10 inline-flex items-center justify-center px-4">{b.label}</a>
              </div>
            )
          }
          return null
        })}
      </section>
    </main>
  )
}

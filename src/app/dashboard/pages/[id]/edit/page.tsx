"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabaseClient } from "@/lib/supabaseClient";
import { defaultTheme, themePresets } from "@/lib/pageThemes";
import type { Theme } from "@/lib/pageThemes";
import type { Branding } from "@/lib/pageBranding";
import { defaultBranding, normalizeBranding } from "@/lib/pageBranding";

export const runtime = 'edge'

// Very simple block system
type Block =
  | { id: string; type: "hero"; heading: string; subheading?: string }
  | { id: string; type: "text"; text: string }
  | { id: string; type: "button"; label: string; href: string };

// Deep partial helper for strong typing without using `any`
type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K]
}

// Normalize and deep-merge a potentially partial/malformed theme from DB
function normalizeTheme(input: unknown): Theme {
  const t: DeepPartial<Theme> = (typeof input === 'object' && input !== null ? (input as DeepPartial<Theme>) : {})
  const allowedFonts = ['system','inter','poppins','outfit','merriweather','space-grotesk','lora'] as const
  type FontKey = typeof allowedFonts[number]
  const isAllowedWeight = (x: unknown): x is 400|500|600|700 => x === 400 || x === 500 || x === 600 || x === 700
  const normFont = (f: unknown): FontKey => {
    if (typeof f !== 'string') return 'system'
    const s = f.toLowerCase().replace(/_/g, '-').replace(/\s+/g, '-')
    return (allowedFonts as readonly string[]).includes(s as FontKey) ? (s as FontKey) : 'system'
  }

  const palette = {
    primary: typeof t?.palette?.primary === 'string' ? t.palette.primary : defaultTheme.palette.primary,
    secondary: typeof t?.palette?.secondary === 'string' ? t.palette.secondary : defaultTheme.palette.secondary,
    surface: typeof t?.palette?.surface === 'string' ? t.palette.surface : defaultTheme.palette.surface,
    foreground: typeof t?.palette?.foreground === 'string' ? t.palette.foreground : defaultTheme.palette.foreground,
    muted: typeof t?.palette?.muted === 'string' ? t.palette.muted : defaultTheme.palette.muted,
    border: typeof t?.palette?.border === 'string' ? t.palette.border : defaultTheme.palette.border,
  }

  const rawStops: Array<{ color?: unknown; at?: unknown }> = Array.isArray(t?.gradient?.stops)
    ? (t.gradient!.stops as Array<{ color?: unknown; at?: unknown }>)
    : defaultTheme.gradient.stops
  const stops = rawStops
    .slice(0, 4)
    .map(s => ({
      color: typeof s?.color === 'string' ? s.color : defaultTheme.gradient.stops[0].color,
      at: Math.max(0, Math.min(100, typeof s?.at === 'number' ? (s.at as number) : 0))
    }))
  const gradient = {
    angle: Math.max(0, Math.min(360, typeof t?.gradient?.angle === 'number' ? t.gradient.angle : defaultTheme.gradient.angle)),
    stops: stops.length >= 2 ? stops : defaultTheme.gradient.stops,
  }

  const typography = {
    font: normFont(t?.typography?.font as unknown),
    baseSize: Math.max(12, Math.min(22, typeof t?.typography?.baseSize === 'number' ? (t.typography.baseSize as number) : defaultTheme.typography.baseSize)),
    weight: isAllowedWeight(t?.typography?.weight) ? t.typography.weight : defaultTheme.typography.weight,
  }

  const radius = Math.max(6, Math.min(24, typeof t?.radius === 'number' ? t.radius : defaultTheme.radius))
  const layout = {
    maxWidth: Math.max(480, Math.min(1200, typeof t?.layout?.maxWidth === 'number' ? t.layout.maxWidth : defaultTheme.layout.maxWidth)),
    sectionGap: Math.max(12, Math.min(48, typeof t?.layout?.sectionGap === 'number' ? t.layout.sectionGap : defaultTheme.layout.sectionGap)),
    align: t?.layout?.align === 'center' || t?.layout?.align === 'left' ? t.layout.align : defaultTheme.layout.align,
  }

  return { palette, gradient, typography, radius, layout }
}

interface PageData {
  id: string;
  title: string;
  slug: string;
  published: boolean;
  blocks: Block[] | null;
  theme?: Theme | null;
  branding?: Branding | null;
}

export default function PageEditor() {
  const params = useParams<{ id: string }>();
  const id = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [published, setPublished] = useState(false);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [theme, setTheme] = useState<Theme>(defaultTheme);
  const [branding, setBranding] = useState<Branding>(defaultBranding);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const res = await fetch(`/api/pages/${id}`, { cache: 'no-store' });
        const payload = await res.json();
        if (!res.ok) throw new Error(payload?.error || 'Failed to load page');
        const p = payload.page as PageData;
        setTitle(p.title || "");
        setSlug(p.slug || "");
        setPublished(!!p.published);
        setBlocks(Array.isArray(p.blocks) ? p.blocks as Block[] : []);
        setTheme(normalizeTheme(p.theme));
        setBranding(normalizeBranding(p.branding));
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  function addBlock(t: Block["type"]) {
    const nid = Math.random().toString(36).slice(2);
    if (t === 'hero') setBlocks((p) => [...p, { id: nid, type: 'hero', heading: 'Your Heading', subheading: '' }]);
    if (t === 'text') setBlocks((p) => [...p, { id: nid, type: 'text', text: 'Your text here' }]);
    if (t === 'button') setBlocks((p) => [...p, { id: nid, type: 'button', label: 'Call to Action', href: 'https://example.com' }]);
  }
  function rmBlock(id: string) { setBlocks((p) => p.filter(b => b.id !== id)); }

  async function handleSave() {
    try {
      setSaving(true);
      const { data } = await supabaseClient.auth.getSession();
      const token = data.session?.access_token;
      const res = await fetch(`/api/pages/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ title, slug, published, blocks, theme, branding })
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error || 'Save failed');
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const publicUrl = typeof window !== 'undefined' ? `${window.location.origin}/p/${slug}` : `/p/${slug}`;

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)]">Edit Page</h1>
        <div className="flex items-center gap-2">
          <a className="btn btn-secondary h-9" href={publicUrl} target="_blank" rel="noreferrer">View</a>
          <button className="btn btn-primary h-9" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </header>

      {loading ? (
        <div className="p-4 text-sm text-[var(--muted)]">Loading…</div>
      ) : error ? (
        <div className="p-4 text-sm text-red-600">{error}</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4">
          <section className="rounded-xl glass p-5 space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <div className="text-xs text-[var(--muted)] mb-1">Title</div>
                <input className="h-10 w-full px-3 rounded border" value={title} onChange={(e) => setTitle(e.target.value)} style={{ background: 'var(--surface)', borderColor: 'var(--border)' }} />
              </div>
              <div>
                <div className="text-xs text-[var(--muted)] mb-1">Slug</div>
                <input className="h-10 w-full px-3 rounded border font-mono" value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase())} style={{ background: 'var(--surface)', borderColor: 'var(--border)' }} />
              </div>
            </div>
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} />
              <span>Published</span>
            </label>

            <div className="pt-2">
              <div className="flex items-center justify-between mb-2">
                <div className="font-medium">Blocks</div>
                <div className="inline-flex gap-2">
                  <button className="btn btn-secondary h-8" onClick={() => addBlock('hero')}>Add Hero</button>
                  <button className="btn btn-secondary h-8" onClick={() => addBlock('text')}>Add Text</button>
                  <button className="btn btn-secondary h-8" onClick={() => addBlock('button')}>Add Button</button>
                </div>
              </div>
              <div className="space-y-3">
                {blocks.map((b) => (
                  <BlockEditor key={b.id} block={b} onChange={(nb) => setBlocks((p) => p.map(x => x.id === b.id ? nb as Block : x))} onRemove={() => rmBlock(b.id)} />
                ))}
                {blocks.length === 0 && <div className="text-sm text-[var(--muted)]">No blocks yet. Use the buttons above to add content.</div>}
              </div>
            </div>
          </section>

          <aside className="rounded-xl glass p-5">
            <div className="font-medium mb-2">Preview</div>
            <div className="rounded border p-4" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
              <PagePreview title={title} blocks={blocks} />
            </div>
            <div className="h-px my-5" style={{ background: 'var(--border)' }} />
            <div className="font-medium mb-2">Branding</div>
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-[var(--muted)] mb-1">Brand Color</div>
                  <input type="color" className="h-9 w-full rounded border p-0" value={branding.brandColor} onChange={(e)=> setBranding({ ...branding, brandColor: e.target.value })} />
                </div>
                <div>
                  <div className="text-xs text-[var(--muted)] mb-1">Accent Color</div>
                  <input type="color" className="h-9 w-full rounded border p-0" value={branding.accentColor} onChange={(e)=> setBranding({ ...branding, accentColor: e.target.value })} />
                </div>
              </div>
              <div className="grid gap-2">
                <div className="text-xs text-[var(--muted)]">Logo URL</div>
                <input className="h-9 w-full rounded border px-2" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }} value={branding.logoUrl ?? ''} onChange={(e)=> setBranding({ ...branding, logoUrl: e.target.value || null })} placeholder="https://…/logo.png" />
              </div>
              <div className="grid gap-2">
                <div className="text-xs text-[var(--muted)]">Cover Image URL</div>
                <input className="h-9 w-full rounded border px-2" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }} value={branding.coverUrl ?? ''} onChange={(e)=> setBranding({ ...branding, coverUrl: e.target.value || null })} placeholder="https://…/cover.jpg" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-[var(--muted)] mb-1">Hero Height (px)</div>
                  <input type="number" min={200} max={600} className="h-9 w-full rounded border px-2" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }} value={branding.hero.height} onChange={(e)=> setBranding({ ...branding, hero: { ...branding.hero, height: Number(e.target.value) } })} />
                </div>
                <div>
                  <div className="text-xs text-[var(--muted)] mb-1">Hero Align</div>
                  <select className="h-9 w-full rounded border px-2" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }} value={branding.hero.align} onChange={(e)=> setBranding({ ...branding, hero: { ...branding.hero, align: e.target.value as Branding['hero']['align'] } })}>
                    <option value="left">Left</option>
                    <option value="center">Center</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-[var(--muted)] mb-1">Background Type</div>
                  <select className="h-9 w-full rounded border px-2" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }} value={branding.bg.type} onChange={(e)=> setBranding({ ...branding, bg: { ...branding.bg, type: e.target.value as Branding['bg']['type'] } })}>
                    <option value="none">None</option>
                    <option value="image">Image</option>
                  </select>
                </div>
                <div>
                  <div className="text-xs text-[var(--muted)] mb-1">BG Image URL</div>
                  <input className="h-9 w-full rounded border px-2" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }} value={branding.bg.imageUrl ?? ''} onChange={(e)=> setBranding({ ...branding, bg: { ...branding.bg, imageUrl: e.target.value || null } })} placeholder="https://…/background.jpg" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <div className="text-xs text-[var(--muted)] mb-1">BG Size</div>
                  <select className="h-9 w-full rounded border px-2" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }} value={branding.bg.size} onChange={(e)=> setBranding({ ...branding, bg: { ...branding.bg, size: e.target.value as Branding['bg']['size'] } })}>
                    <option value="cover">Cover</option>
                    <option value="contain">Contain</option>
                    <option value="auto">Auto</option>
                  </select>
                </div>
                <div>
                  <div className="text-xs text-[var(--muted)] mb-1">BG Repeat</div>
                  <select className="h-9 w-full rounded border px-2" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }} value={branding.bg.repeat} onChange={(e)=> setBranding({ ...branding, bg: { ...branding.bg, repeat: e.target.value as Branding['bg']['repeat'] } })}>
                    <option value="no-repeat">No repeat</option>
                    <option value="repeat">Repeat</option>
                    <option value="repeat-x">Repeat X</option>
                    <option value="repeat-y">Repeat Y</option>
                  </select>
                </div>
                <div>
                  <div className="text-xs text-[var(--muted)] mb-1">BG Position</div>
                  <input className="h-9 w-full rounded border px-2" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }} value={branding.bg.position} onChange={(e)=> setBranding({ ...branding, bg: { ...branding.bg, position: e.target.value } })} placeholder="center" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-[var(--muted)] mb-1">Overlay Color</div>
                  <input type="color" className="h-9 w-full rounded border p-0" value={branding.bg.overlay.color} onChange={(e)=> setBranding({ ...branding, bg: { ...branding.bg, overlay: { ...branding.bg.overlay, color: e.target.value } } })} />
                </div>
                <div>
                  <div className="text-xs text-[var(--muted)] mb-1">Overlay Opacity</div>
                  <input type="range" min={0} max={1} step={0.05} value={branding.bg.overlay.opacity} onChange={(e)=> setBranding({ ...branding, bg: { ...branding.bg, overlay: { ...branding.bg.overlay, opacity: Number(e.target.value) } } })} />
                </div>
              </div>
              <div className="flex gap-2">
                <button className="btn btn-secondary h-8" onClick={()=> setBranding(defaultBranding)}>Reset</button>
                <button className="btn btn-primary h-8" onClick={handleSave} disabled={saving}>Save Branding</button>
              </div>
            </div>
            <div className="h-px my-5" style={{ background: 'var(--border)' }} />
            <div className="font-medium mb-2">Theme</div>
            <div className="space-y-3 text-sm">
              <div>
                <div className="text-xs text-[var(--muted)] mb-1">Preset</div>
                <select className="h-9 w-full rounded border px-2" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }} onChange={(e) => {
                  const p = themePresets.find(t => t.id === e.target.value)
                  if (p) setTheme(p.theme)
                }} value="">
                  <option value="" disabled>Choose preset…</option>
                  {themePresets.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-[var(--muted)] mb-1">Font</div>
                  <select className="h-9 w-full rounded border px-2" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }} value={theme.typography.font} onChange={(e)=> setTheme({ ...theme, typography: { ...theme.typography, font: e.target.value as Theme['typography']['font'] } })}>
                    <option value="system">System</option>
                    <option value="inter">Inter</option>
                    <option value="poppins">Poppins</option>
                    <option value="outfit">Outfit</option>
                    <option value="merriweather">Merriweather</option>
                    <option value="space-grotesk">Space Grotesk</option>
                    <option value="lora">Lora</option>
                  </select>
                </div>
                <div>
                  <div className="text-xs text-[var(--muted)] mb-1">Font Size</div>
                  <input type="number" min={12} max={22} className="h-9 w-full rounded border px-2" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }} value={theme.typography.baseSize} onChange={(e)=> setTheme({ ...theme, typography: { ...theme.typography, baseSize: Number(e.target.value) } })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-[var(--muted)] mb-1">Font Weight</div>
                  <select className="h-9 w-full rounded border px-2" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }} value={theme.typography.weight} onChange={(e)=> setTheme({ ...theme, typography: { ...theme.typography, weight: Number(e.target.value) as Theme['typography']['weight'] } })}>
                    <option value={400}>400</option>
                    <option value={500}>500</option>
                    <option value={600}>600</option>
                    <option value={700}>700</option>
                  </select>
                </div>
                <div>
                  <div className="text-xs text-[var(--muted)] mb-1">Alignment</div>
                  <select className="h-9 w-full rounded border px-2" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }} value={theme.layout.align} onChange={(e)=> setTheme({ ...theme, layout: { ...theme.layout, align: e.target.value as Theme['layout']['align'] } })}>
                    <option value="left">Left</option>
                    <option value="center">Center</option>
                  </select>
                </div>
              </div>
              <div>
                <div className="text-xs text-[var(--muted)] mb-1">Gradient</div>
                <div className="grid gap-2">
                  <div className="grid grid-cols-[1fr_auto] gap-2 items-center">
                    <div className="text-xs">Angle</div>
                    <input type="number" min={0} max={360} className="h-8 w-20 rounded border px-2" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }} value={theme.gradient.angle} onChange={(e)=> setTheme({ ...theme, gradient: { ...theme.gradient, angle: Number(e.target.value) } })} />
                  </div>
                  <div className="space-y-2">
                    {theme.gradient.stops.map((s, i) => (
                      <div key={i} className="grid grid-cols-[1fr_auto_auto] gap-2 items-center">
                        <input type="color" className="h-8 w-full rounded border p-0" value={s.color} onChange={(e)=> {
                          const stops = theme.gradient.stops.slice();
                          stops[i] = { ...stops[i], color: e.target.value };
                          setTheme({ ...theme, gradient: { ...theme.gradient, stops } })
                        }} />
                        <input type="number" min={0} max={100} className="h-8 w-20 rounded border px-2" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }} value={s.at} onChange={(e)=> {
                          const stops = theme.gradient.stops.slice();
                          stops[i] = { ...stops[i], at: Math.max(0, Math.min(100, Number(e.target.value))) };
                          setTheme({ ...theme, gradient: { ...theme.gradient, stops } })
                        }} />
                        <button type="button" className="btn btn-secondary h-8" onClick={()=> {
                          if (theme.gradient.stops.length <= 2) return;
                          const stops = theme.gradient.stops.filter((_, idx)=> idx !== i);
                          setTheme({ ...theme, gradient: { ...theme.gradient, stops } })
                        }}>Remove</button>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <button type="button" className="btn btn-secondary h-8" onClick={()=> {
                        if (theme.gradient.stops.length >= 4) return;
                        const last = theme.gradient.stops[theme.gradient.stops.length - 1];
                        const nextAt = Math.max(0, Math.min(100, last.at + 20));
                        setTheme({ ...theme, gradient: { ...theme.gradient, stops: [...theme.gradient.stops, { color: last.color, at: nextAt }] } })
                      }}>Add Stop</button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-[var(--muted)] mb-1">Primary</div>
                  <input type="color" className="h-9 w-full rounded border p-0" value={theme.palette.primary} onChange={(e)=> setTheme({ ...theme, palette: { ...theme.palette, primary: e.target.value } })} />
                </div>
                <div>
                  <div className="text-xs text-[var(--muted)] mb-1">Secondary</div>
                  <input type="color" className="h-9 w-full rounded border p-0" value={theme.palette.secondary} onChange={(e)=> setTheme({ ...theme, palette: { ...theme.palette, secondary: e.target.value } })} />
                </div>
                <div>
                  <div className="text-xs text-[var(--muted)] mb-1">Surface</div>
                  <input type="color" className="h-9 w-full rounded border p-0" value={theme.palette.surface} onChange={(e)=> setTheme({ ...theme, palette: { ...theme.palette, surface: e.target.value } })} />
                </div>
                <div>
                  <div className="text-xs text-[var(--muted)] mb-1">Foreground</div>
                  <input type="color" className="h-9 w-full rounded border p-0" value={theme.palette.foreground} onChange={(e)=> setTheme({ ...theme, palette: { ...theme.palette, foreground: e.target.value } })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-[var(--muted)] mb-1">Radius</div>
                  <input type="range" min={6} max={24} value={theme.radius} onChange={(e)=> setTheme({ ...theme, radius: Number(e.target.value) })} />
                </div>
                <div>
                  <div className="text-xs text-[var(--muted)] mb-1">Max Width</div>
                  <input type="number" className="h-9 w-full rounded border px-2" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }} value={theme.layout.maxWidth} onChange={(e)=> setTheme({ ...theme, layout: { ...theme.layout, maxWidth: Number(e.target.value) } })} />
                </div>
              </div>
              <div className="flex gap-2">
                <button className="btn btn-secondary h-8" onClick={()=> setTheme(defaultTheme)}>Reset</button>
                <button className="btn btn-primary h-8" onClick={handleSave} disabled={saving}>Save Theme</button>
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

function BlockEditor({ block, onChange, onRemove }: { block: Block; onChange: (b: Block) => void; onRemove: () => void }) {
  if (block.type === 'hero') {
    return (
      <div className="rounded border p-4 space-y-2" style={{ borderColor: 'var(--border)' }}>
        <div className="text-xs text-[var(--muted)]">Hero</div>
        <input className="h-9 w-full px-3 rounded border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }} value={block.heading} onChange={(e)=> onChange({ ...block, heading: e.target.value })} />
        <input className="h-9 w-full px-3 rounded border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }} value={block.subheading ?? ''} onChange={(e)=> onChange({ ...block, subheading: e.target.value })} placeholder="Subheading" />
        <div className="text-right"><button className="btn btn-secondary h-8" onClick={onRemove}>Remove</button></div>
      </div>
    )
  }
  if (block.type === 'text') {
    return (
      <div className="rounded border p-4 space-y-2" style={{ borderColor: 'var(--border)' }}>
        <div className="text-xs text-[var(--muted)]">Text</div>
        <textarea className="w-full min-h-[120px] p-3 rounded border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }} value={block.text} onChange={(e)=> onChange({ ...block, text: e.target.value })} />
        <div className="text-right"><button className="btn btn-secondary h-8" onClick={onRemove}>Remove</button></div>
      </div>
    )
  }
  return (
    <div className="rounded border p-4 space-y-2" style={{ borderColor: 'var(--border)' }}>
      <div className="text-xs text-[var(--muted)]">Button</div>
      <input className="h-9 w-full px-3 rounded border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }} value={block.label} onChange={(e)=> onChange({ ...block, label: e.target.value })} placeholder="Label" />
      <input className="h-9 w-full px-3 rounded border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }} value={block.href} onChange={(e)=> onChange({ ...block, href: e.target.value })} placeholder="https://…" />
      <div className="text-right"><button className="btn btn-secondary h-8" onClick={onRemove}>Remove</button></div>
    </div>
  )
}

function PagePreview({ title, blocks }: { title: string; blocks: Block[] }) {
  return (
    <div className="space-y-6">
      <div className="text-2xl font-semibold">{title || 'Untitled Page'}</div>
      {blocks.map((b) => {
        if (b.type === 'hero') {
          return (
            <div key={b.id} className="rounded-lg p-6" style={{ background: 'color-mix(in oklab, var(--accent) 12%, transparent)' }}>
              <div className="text-xl font-semibold mb-1">{b.heading}</div>
              {b.subheading && <div className="text-sm text-[var(--muted)]">{b.subheading}</div>}
            </div>
          )
        }
        if (b.type === 'text') {
          return <div key={b.id} className="prose prose-invert max-w-none" style={{ color: 'var(--foreground)' }}>{b.text}</div>
        }
        return (
          <div key={b.id}>
            <a href={b.href} target="_blank" rel="noreferrer" className="btn btn-primary h-9">{b.label}</a>
          </div>
        )
      })}
    </div>
  )
}

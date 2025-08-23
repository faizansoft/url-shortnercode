"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Image from 'next/image'
import { supabaseClient } from "@/lib/supabaseClient";
import { defaultTheme, themePresets } from "@/lib/pageThemes";
import type { Theme } from "@/lib/pageThemes";
import type { Branding } from "@/lib/pageBranding";
import { defaultBranding, normalizeBranding } from "@/lib/pageBranding";
import type { Block } from "@/types/pageBlocks";
import Palette from "./builder/Palette";
import Canvas from "./builder/Canvas";
import Inspector from "./builder/Inspector";

export const runtime = 'edge'

// Uses shared Block type defined in src/types/pageBlocks.ts

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
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [history, setHistory] = useState<Block[][]>([]);
  const [future, setFuture] = useState<Block[][]>([]);
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
        const initialBlocks = Array.isArray(p.blocks) ? (p.blocks as Block[]) : [];
        setBlocks(initialBlocks);
        setHistory([]);
        setFuture([]);
        setSelectedId(null);
        setTheme(normalizeTheme(p.theme));
        setBranding(normalizeBranding(p.branding));
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  // History helpers
  const commit = useCallback((next: Block[]) => {
    setHistory((h: Block[][]) => [...h, blocks]);
    setFuture([]);
    setBlocks(next);
  }, [blocks]);

  const undo = useCallback(() => {
    setHistory((h: Block[][]) => {
      if (h.length === 0) return h;
      const prev = h[h.length - 1];
      setFuture((f: Block[][]) => [...f, blocks]);
      setBlocks(prev);
      return h.slice(0, -1);
    });
  }, [blocks]);

  const redo = useCallback(() => {
    setFuture((f: Block[][]) => {
      if (f.length === 0) return f;
      const next = f[f.length - 1];
      setHistory((h: Block[][]) => [...h, blocks]);
      setBlocks(next);
      return f.slice(0, -1);
    });
  }, [blocks]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      if (e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      if ((e.key.toLowerCase() === 'y') || (e.key.toLowerCase() === 'z' && e.shiftKey)) { e.preventDefault(); redo(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo]);

  // Block factory
  const createBlock = useCallback((t: Block["type"]): Block => {
    const nid = Math.random().toString(36).slice(2);
    if (t === 'hero') return { id: nid, type: 'hero', heading: 'Your Heading', subheading: '' } as Block;
    if (t === 'heading') return { id: nid, type: 'heading', text: 'Heading', level: 2 } as Block;
    if (t === 'text') return { id: nid, type: 'text', text: 'Your text here' } as Block;
    if (t === 'button') return { id: nid, type: 'button', label: 'Call to Action', href: 'https://example.com' } as Block;
    if (t === 'link') return { id: nid, type: 'link', text: 'Visit link', href: 'https://example.com' } as Block;
    if (t === 'image') return { id: nid, type: 'image', src: 'https://picsum.photos/1200/675', alt: 'Image', rounded: true } as Block;
    if (t === 'product-card') return { id: nid, type: 'product-card', image: 'https://picsum.photos/800', title: 'Product title', subtitle: 'Subtitle', ctaLabel: 'Buy now', ctaHref: 'https://example.com' } as Block;
    return { id: nid, type: 'text', text: 'New block' } as Block;
  }, []);

  // Canvas handlers
  const handleReorder = useCallback((from: number, to: number) => {
    if (from === to || from < 0 || to < 0 || from >= blocks.length) return;
    const arr = [...blocks];
    const [moved] = arr.splice(from, 1);
    const insertAt = to > from ? to - 1 : to;
    arr.splice(Math.min(arr.length, Math.max(0, insertAt)), 0, moved);
    commit(arr);
  }, [blocks, commit]);

  const handleDropNew = useCallback((type: Block["type"], atIndex: number | null) => {
    const nb = createBlock(type);
    const arr = [...blocks];
    if (atIndex === null || atIndex < 0 || atIndex > arr.length) arr.push(nb); else arr.splice(atIndex, 0, nb);
    commit(arr);
    setSelectedId(nb.id);
  }, [blocks, commit, createBlock]);

  const updateBlock = useCallback((id: string, partial: Partial<Block> | ((b: Block)=>Block)) => {
    const arr = blocks.map((b: Block) => {
      if (b.id !== id) return b;
      const next = typeof partial === 'function' ? (partial as any)(b) : { ...b, ...partial };
      return next as Block;
    });
    commit(arr);
  }, [blocks, commit]);

  const deleteBlock = useCallback((id: string) => {
    const arr = blocks.filter(b => b.id !== id);
    commit(arr);
    if (selectedId === id) setSelectedId(null);
  }, [blocks, commit, selectedId]);

  const duplicateBlock = useCallback((id: string) => {
    const idx = blocks.findIndex(b => b.id === id);
    if (idx === -1) return;
    const b = blocks[idx];
    const clone = { ...b, id: Math.random().toString(36).slice(2) } as Block;
    const arr = [...blocks];
    arr.splice(idx + 1, 0, clone);
    commit(arr);
    setSelectedId(clone.id);
  }, [blocks, commit]);

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
          <a className="btn btn-secondary h-9" href={`/dashboard/pages/${id}/templates`}>Select template</a>
          <a className="btn btn-secondary h-9 inline-flex items-center gap-1" href={publicUrl} target="_blank" rel="noreferrer">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M12 5C6 5 2 12 2 12s4 7 10 7 10-7 10-7-4-7-10-7Zm0 12c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5Z"/>
              <circle cx="12" cy="12" r="2.5"/>
            </svg>
            View
          </a>
          <button className="btn btn-primary h-9" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </header>

      {loading ? (
        <div className="p-4 text-sm text-[var(--muted)]">Loading…</div>
      ) : error ? (
        <div className="p-4 text-sm text-red-600">{error}</div>
      ) : (
        <div className="space-y-4">
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
            <div className="flex items-center gap-2">
              <button className="btn btn-secondary h-8" onClick={undo} disabled={history.length === 0}>Undo</button>
              <button className="btn btn-secondary h-8" onClick={redo} disabled={future.length === 0}>Redo</button>
            </div>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_320px] gap-4">
            <Palette onAdd={(t)=> {
              const nb = createBlock(t);
              const arr = [...blocks, nb];
              commit(arr);
              setSelectedId(nb.id);
            }} />

            <Canvas
              blocks={blocks}
              selectedId={selectedId}
              onSelect={(id)=> setSelectedId(id)}
              onReorder={handleReorder}
              onDropNew={handleDropNew}
            />

            <div className="space-y-4">
              <Inspector
                block={blocks.find(b=> b.id === selectedId) || null}
                onChange={(b)=> updateBlock(b.id, b)}
                onDelete={()=> selectedId && deleteBlock(selectedId)}
                onDuplicate={()=> selectedId && duplicateBlock(selectedId)}
              />
              <div className="rounded-xl glass p-4">
                <div className="font-medium mb-2">Theme & Branding</div>
                <Tabs
                  onApplyPreset={(id: string)=> {
                    const p = themePresets.find(x=> x.id === id)
                    if (p) setTheme(p.theme)
                  }}
                  branding={branding}
                  setBranding={setBranding}
                  saving={saving}
                  onSave={handleSave}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Tabs({
  onApplyPreset,
  branding,
  setBranding,
  saving,
  onSave,
}: {
  onApplyPreset: (id: string) => void
  branding: Branding
  setBranding: (b: Branding) => void
  saving: boolean
  onSave: () => void
}) {
  const [active, setActive] = useState<'theme' | 'customize'>('theme')
  return (
    <div className="text-sm">
      <div className="inline-flex rounded border overflow-hidden mb-4" style={{ borderColor: 'var(--border)' }}>
        <button className={`px-3 h-8 ${active==='theme' ? 'bg-[var(--surface-2)]' : ''}`} onClick={()=> setActive('theme')}>Theme</button>
        <button className={`px-3 h-8 ${active==='customize' ? 'bg-[var(--surface-2)]' : ''}`} onClick={()=> setActive('customize')}>Customize</button>
      </div>

      {active === 'theme' && (
        <div className="space-y-3">
          <div className="text-xs text-[var(--muted)]">Built-in Themes</div>
          <div className="grid grid-cols-1 gap-2">
            {themePresets.map(p => (
              <div key={p.id} className="flex items-center justify-between rounded border p-3" style={{ borderColor: 'var(--border)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded" style={{ background: p.theme.palette.primary }} />
                  <div>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs text-[var(--muted)]">Preset</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="btn btn-secondary h-8" onClick={()=> onApplyPreset(p.id)}>Apply</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {active === 'customize' && (
        <div className="space-y-3">
          <div className="font-medium">Branding</div>
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
            <button className="btn btn-primary h-8" onClick={onSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </div>
      )}
    </div>
  )
}

// PagePreview removed in favor of interactive Canvas

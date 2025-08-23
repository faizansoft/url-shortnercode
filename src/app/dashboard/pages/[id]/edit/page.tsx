"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { supabaseClient } from "@/lib/supabaseClient";
import type { Block } from "@/types/pageBlocks";
import Palette from "./builder/Palette";
import Canvas from "./builder/Canvas";
import Inspector from "./builder/Inspector";
import type React from "react";
import type { Theme } from "@/lib/pageThemes";
import { defaultTheme } from "@/lib/pageThemes";

export const runtime = 'edge'

interface PageData {
  id: string;
  title: string;
  slug: string;
  published: boolean;
  blocks: Block[] | null;
  theme?: Partial<Theme> | null;
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
  // Theme state (branding removed). We still render with selected theme.
  const [theme, setTheme] = useState<Theme>(defaultTheme);

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
        // Load theme if present, merge with defaults for safety
        if (p.theme && typeof p.theme === 'object') {
          const t = p.theme as Partial<Theme>;
          const merged: Theme = {
            ...defaultTheme,
            ...t,
            palette: { ...defaultTheme.palette, ...(t.palette ?? {}) },
            gradient: {
              angle: t.gradient?.angle ?? defaultTheme.gradient.angle,
              stops: t.gradient?.stops ?? defaultTheme.gradient.stops,
            },
            typography: { ...defaultTheme.typography, ...(t.typography ?? {}) },
            layout: { ...defaultTheme.layout, ...(t.layout ?? {}) },
          };
          setTheme(merged);
        } else {
          setTheme(defaultTheme);
        }
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
      const next = typeof partial === 'function' ? (partial as (b: Block)=>Block)(b) : { ...b, ...partial };
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
        body: JSON.stringify({ title, slug, published, blocks })
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

  // Compute CSS variables from theme for Canvas WYSIWYG
  const themeVars: Record<string, string> = {
    '--primary': theme.palette.primary,
    '--secondary': theme.palette.secondary,
    '--surface': theme.palette.surface,
    '--foreground': theme.palette.foreground,
    '--muted': theme.palette.muted,
    '--border': theme.palette.border,
    '--radius': `${theme.radius}px`,
    '--maxw': `${theme.layout.maxWidth}px`,
    '--section-gap': `${theme.layout.sectionGap}px`,
    '--gradient': `linear-gradient(${theme.gradient.angle}deg, ${theme.gradient.stops.map((s: { color: string; at: number }) => `${s.color} ${s.at}%`).join(', ')})`,
    '--font': 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
    '--font-size': `${theme.typography.baseSize}px`,
    '--brand': theme.palette.primary,
    '--accent': theme.palette.secondary,
    '--accent-2': theme.palette.primary,
  };

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
                <input className="h-10 w-full px-3 rounded border" value={title} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)} style={{ background: 'var(--surface)', borderColor: 'var(--border)' }} />
              </div>
              <div>
                <div className="text-xs text-[var(--muted)] mb-1">Slug</div>
                <input className="h-10 w-full px-3 rounded border font-mono" value={slug} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSlug(e.target.value.toLowerCase())} style={{ background: 'var(--surface)', borderColor: 'var(--border)' }} />
              </div>
            </div>
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={published} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPublished(e.target.checked)} />
              <span>Published</span>
            </label>
            <div className="flex items-center gap-2">
              <button className="btn btn-secondary h-8" onClick={undo} disabled={history.length === 0}>Undo</button>
              <button className="btn btn-secondary h-8" onClick={redo} disabled={future.length === 0}>Redo</button>
            </div>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_0px] gap-4">
            <Palette onAdd={(t)=> {
              const nb = createBlock(t);
              const arr = [...blocks, nb];
              commit(arr);
              setSelectedId(nb.id);
            }} />

            <div style={{ ...(themeVars as unknown as React.CSSProperties), fontFamily: 'var(--font)', color: 'var(--foreground)' }}>
              <Canvas
                blocks={blocks}
                selectedId={selectedId}
                onSelect={(id: string)=> setSelectedId(id)}
                onReorder={handleReorder}
                onDropNew={handleDropNew}
              />
            </div>
            <div className="space-y-4">
              <Inspector
                block={blocks.find((b: Block)=> b.id === selectedId) || null}
                onChange={(b: Block)=> updateBlock(b.id, b)}
                onDelete={()=> selectedId && deleteBlock(selectedId)}
                onDuplicate={()=> selectedId && duplicateBlock(selectedId)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
// PagePreview removed in favor of interactive Canvas

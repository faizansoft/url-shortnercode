"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabaseClient } from "@/lib/supabaseClient";

export const runtime = 'edge'

// Very simple block system
type Block =
  | { id: string; type: "hero"; heading: string; subheading?: string }
  | { id: string; type: "text"; text: string }
  | { id: string; type: "button"; label: string; href: string };

interface PageData {
  id: string;
  title: string;
  slug: string;
  published: boolean;
  blocks: Block[] | null;
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

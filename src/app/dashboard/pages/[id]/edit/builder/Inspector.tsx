"use client";
import React from "react";
import type { Block } from "@/types/pageBlocks";

export default function Inspector({
  block,
  onChange,
  onDelete,
  onDuplicate,
}: {
  block: Block | null;
  onChange: (b: Block) => void;
  onDelete: () => void;
  onDuplicate: () => void;
}) {
  if (!block) {
    return (
      <aside className="rounded-xl glass p-4">
        <div className="font-medium mb-2">Inspector</div>
        <div className="text-sm text-[var(--muted)]">Select an element on the canvas to edit its content and style.</div>
      </aside>
    );
  }

  return (
    <aside className="rounded-xl glass p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="font-medium">Inspector</div>
        <div className="inline-flex gap-2">
          <button className="btn btn-secondary h-8" onClick={onDuplicate}>Duplicate</button>
          <button className="btn btn-secondary h-8" onClick={onDelete}>Delete</button>
        </div>
      </div>

      {block.type === 'hero' && (
        <section className="space-y-2">
          <div className="text-xs text-[var(--muted)]">Hero</div>
          <input className="h-9 w-full rounded border px-3" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }} value={block.heading} onChange={(e)=> onChange({ ...block, heading: e.target.value })} />
          <input className="h-9 w-full rounded border px-3" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }} value={block.subheading ?? ''} onChange={(e)=> onChange({ ...block, subheading: e.target.value })} placeholder="Subheading" />
        </section>
      )}

      {block.type === 'heading' && (
        <section className="space-y-2">
          <div className="text-xs text-[var(--muted)]">Heading</div>
          <input
            className="h-9 w-full rounded border px-3"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
            value={block.text}
            onChange={(e)=> onChange({ ...block, text: e.target.value })}
            placeholder="Heading text"
          />
          <label className="text-xs inline-flex items-center gap-2">
            Level
            <select
              className="h-8 rounded border px-2"
              style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
              value={String(block.level ?? 2)}
              onChange={(e)=> onChange({ ...block, level: Number(e.target.value) as 1|2|3|4|5|6 })}
            >
              <option value="1">H1</option>
              <option value="2">H2</option>
              <option value="3">H3</option>
              <option value="4">H4</option>
              <option value="5">H5</option>
              <option value="6">H6</option>
            </select>
          </label>
        </section>
      )}

      {block.type === 'text' && (
        <section className="space-y-2">
          <div className="text-xs text-[var(--muted)]">Paragraph</div>
          <textarea className="w-full min-h-[140px] rounded border p-3" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }} value={block.text} onChange={(e)=> onChange({ ...block, text: e.target.value })} />
        </section>
      )}

      {block.type === 'button' && (
        <section className="space-y-2">
          <div className="text-xs text-[var(--muted)]">Button</div>
          <input className="h-9 w-full rounded border px-3" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }} value={block.label} onChange={(e)=> onChange({ ...block, label: e.target.value })} placeholder="Label" />
          <input className="h-9 w-full rounded border px-3" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }} value={block.href} onChange={(e)=> onChange({ ...block, href: e.target.value })} placeholder="https://…" />
          {/* Presets v1 */}
          <div className="text-xs text-[var(--muted)] mt-2">Presets</div>
          <div className="flex gap-2">
            <button className="btn btn-secondary h-8 px-3" onClick={()=>{/* placeholder for style presets */}}>Solid</button>
            <button className="btn btn-secondary h-8 px-3" onClick={()=>{/* placeholder */}}>Outline</button>
            <button className="btn btn-secondary h-8 px-3" onClick={()=>{/* placeholder */}}>Ghost</button>
          </div>
        </section>
      )}

      {block.type === 'link' && (
        <section className="space-y-2">
          <div className="text-xs text-[var(--muted)]">Link</div>
          <input
            className="h-9 w-full rounded border px-3"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
            value={block.text}
            onChange={(e)=> onChange({ ...block, text: e.target.value })}
            placeholder="Link text"
          />
          <input
            className="h-9 w-full rounded border px-3"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
            value={block.href}
            onChange={(e)=> onChange({ ...block, href: e.target.value })}
            placeholder="https://…"
          />
        </section>
      )}

      {block.type === 'image' && (
        <section className="space-y-2">
          <div className="text-xs text-[var(--muted)]">Image</div>
          <input className="h-9 w-full rounded border px-3" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }} value={block.src} onChange={(e)=> onChange({ ...block, src: e.target.value })} placeholder="https://…/image.jpg" />
          <input className="h-9 w-full rounded border px-3" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }} value={block.alt ?? ''} onChange={(e)=> onChange({ ...block, alt: e.target.value })} placeholder="Alt text" />
          <label className="inline-flex items-center gap-2 text-xs">
            <input type="checkbox" checked={!!block.rounded} onChange={(e)=> onChange({ ...block, rounded: e.target.checked })} />
            Rounded corners
          </label>
        </section>
      )}

      {block.type === 'product-card' && (
        <section className="space-y-2">
          <div className="text-xs text-[var(--muted)]">Product Card</div>
          <input className="h-9 w-full rounded border px-3" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }} value={block.image} onChange={(e)=> onChange({ ...block, image: e.target.value })} placeholder="https://…/product.jpg" />
          <input className="h-9 w-full rounded border px-3" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }} value={block.title} onChange={(e)=> onChange({ ...block, title: e.target.value })} placeholder="Title" />
          <input className="h-9 w-full rounded border px-3" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }} value={block.subtitle ?? ''} onChange={(e)=> onChange({ ...block, subtitle: e.target.value })} placeholder="Subtitle" />
          <div className="grid grid-cols-2 gap-2">
            <input className="h-9 w-full rounded border px-3" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }} value={block.ctaLabel ?? ''} onChange={(e)=> onChange({ ...block, ctaLabel: e.target.value })} placeholder="CTA label" />
            <input className="h-9 w-full rounded border px-3" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }} value={block.ctaHref ?? ''} onChange={(e)=> onChange({ ...block, ctaHref: e.target.value })} placeholder="https://…" />
          </div>
        </section>
      )}
    </aside>
  );
}

"use client";
import React from "react";
import type { Block } from "@/types/pageBlocks";
import type { SvgThemeBlock } from "@/types/pageBlocks";
import Image from "next/image";
import { SvgThemeRender, getTheme, svgThemes } from "@/lib/svgThemes";

export default function Canvas({
  blocks,
  selectedId,
  onSelect,
  onReorder,
  onDropNew,
  onUpdate,
  onDelete,
  onDuplicate,
}: {
  blocks: Block[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onReorder: (from: number, to: number) => void;
  onDropNew: (type: Block["type"], atIndex: number | null) => void;
  onUpdate: (id: string, partial: Partial<Block> | ((b: Block) => Block)) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
}) {
  function handleDragStart(e: React.DragEvent, index: number) {
    e.dataTransfer.setData("text/x-drag-index", String(index));
    e.dataTransfer.effectAllowed = "move";
  }
  function handleDrop(e: React.DragEvent, toIndex: number | null) {
    e.preventDefault();
    const t = e.dataTransfer.getData("application/x-block-type");
    if (t) {
      onDropNew(t as Block["type"], toIndex);
      return;
    }
    const fromRaw = e.dataTransfer.getData("text/x-drag-index");
    if (fromRaw) {
      const from = Number(fromRaw);
      const to = toIndex ?? blocks.length;
      if (!Number.isNaN(from)) onReorder(from, to);
    }
  }

  return (
    <section
      className="rounded-xl glass p-4"
      onDragOver={(e: React.DragEvent) => e.preventDefault()}
      onDrop={(e: React.DragEvent) => handleDrop(e, null)}
    >
      <div className="text-sm text-[var(--muted)] mb-2">Canvas</div>
      <div className="space-y-3">
        {blocks.map((b, i) => (
          <div
            key={b.id}
            draggable
            onDragStart={(e: React.DragEvent) => handleDragStart(e, i)}
            onDragOver={(e: React.DragEvent) => e.preventDefault()}
            onDrop={(e: React.DragEvent) => handleDrop(e, i)}
            className={`relative rounded border p-3 cursor-move ${selectedId === b.id ? "ring-2 ring-[var(--accent)]" : ""}`}
            style={{ borderColor: "var(--border)", background: "var(--surface)" }}
            onClick={() => onSelect(b.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e: React.KeyboardEvent) => {
              if (e.key === "Enter" || e.key === " ") onSelect(b.id);
            }}
          >
            {/* Inline toolbar when selected */}
            {selectedId === b.id && (
              <div
                className="absolute -top-3 right-3 z-10 flex items-center gap-1 px-2 py-1 rounded backdrop-blur border"
                style={{ borderColor: 'var(--border)', background: 'color-mix(in oklab, black 20%, transparent)' }}
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
              >
                {[
                  { title: 'Duplicate', onClick: () => onDuplicate(b.id), icon: (<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 8h10v10H8z" opacity=".5" /><path d="M6 6h10v10H6z" /></svg>) },
                  { title: 'Delete', onClick: () => onDelete(b.id), icon: (<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M9 3h6l1 2h4v2H4V5h4l1-2zM6 9h12l-1 11H7L6 9z" /></svg>) },
                  { title: 'Move up', onClick: () => onReorder(i, Math.max(0, i - 1)), icon: (<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 5l7 7h-4v7H9v-7H5z" /></svg>), disabled: i === 0 },
                  { title: 'Move down', onClick: () => onReorder(i, Math.min(blocks.length, i + 2)), icon: (<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ transform: 'rotate(180deg)' }}><path d="M12 5l7 7h-4v7H9v-7H5z" /></svg>), disabled: i === blocks.length - 1 },
                ].map((btn, idx) => (
                  <button
                    key={idx}
                    title={btn.title}
                    onClick={btn.onClick}
                    disabled={btn.disabled}
                    style={{
                      height: 26,
                      width: 26,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 6,
                      border: '1px solid var(--border)',
                      background: 'color-mix(in oklab, var(--surface) 80%, transparent)',
                      color: 'var(--foreground)',
                      opacity: btn.disabled ? 0.5 : 1,
                    }}
                  >
                    {btn.icon}
                  </button>
                ))}
              </div>
            )}
            <BlockPreview block={b} />
            {/* Inline editor for svg-theme when selected */}
            {selectedId === b.id && b.type === 'svg-theme' && (
              <SvgThemeInlineEditor block={b} onUpdate={onUpdate} />
            )}
          </div>
        ))}
        {blocks.length === 0 && (
          <div
            className="rounded border p-6 text-center text-sm text-[var(--muted)]"
            style={{ borderColor: "var(--border)" }}
          >
            Drag elements here or use the Palette to add content.
          </div>
        )}
      </div>
    </section>
  );
}

function BlockPreview({ block }: { block: Block }) {
  if (block.type === "hero") {
    return (
      <div className="rounded-lg p-6" style={{ background: 'color-mix(in oklab, var(--brand) 10%, transparent)' }}>
        <div className="text-xl font-semibold mb-1">{block.heading}</div>
        {block.subheading && <div className="text-sm text-[var(--muted)]">{block.subheading}</div>}
      </div>
    );
  }
  if (block.type === "heading") {
    const level = Math.min(6, Math.max(1, block.level ?? 2));
    if (level === 1) return <h1 className="text-3xl font-semibold">{block.text}</h1>;
    if (level === 2) return <h2 className="text-2xl font-semibold">{block.text}</h2>;
    if (level === 3) return <h3 className="text-xl font-semibold">{block.text}</h3>;
    if (level === 4) return <h4 className="text-lg font-semibold">{block.text}</h4>;
    if (level === 5) return <h5 className="text-base font-semibold">{block.text}</h5>;
    return <h6 className="text-sm font-semibold">{block.text}</h6>;
  }
  if (block.type === "text") {
    return <div className="prose prose-invert max-w-none" style={{ color: 'var(--foreground)' }}>{block.text}</div>;
  }
  if (block.type === "button") {
    return (
      <div>
        <span
          className="inline-flex items-center justify-center h-10 px-4"
          style={{ background: 'var(--brand)', borderRadius: 'var(--radius)' }}
        >
          {block.label}
        </span>
      </div>
    );
  }
  if (block.type === "link") {
    return (
      <div>
        <a className="text-[var(--accent)] underline" href={block.href} target="_blank" rel="noreferrer">{block.text}</a>
      </div>
    );
  }
  if (block.type === "image") {
    return (
      <div className="rounded overflow-hidden" style={{ borderRadius: block.rounded ? 12 : 6 }}>
        <Image src={block.src} alt={block.alt || ''} width={800} height={450} className="w-full h-auto" unoptimized />
      </div>
    );
  }
  if (block.type === "product-card") {
    return (
      <div className="rounded p-3 grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-3" style={{ background: 'color-mix(in oklab, var(--surface) 94%, var(--brand) 6%)', borderRadius: 'var(--radius)' }}>
        <div className="rounded overflow-hidden"><Image src={block.image} alt={block.title} width={600} height={600} className="w-full h-auto" unoptimized /></div>
        <div>
          <div className="font-medium">{block.title}</div>
          {block.subtitle && <div className="text-xs text-[var(--muted)] mb-2">{block.subtitle}</div>}
          {block.ctaHref && block.ctaLabel && (
            <span className="inline-flex items-center justify-center h-9 px-3" style={{ background: 'var(--brand)', borderRadius: 'var(--radius)' }}>{block.ctaLabel}</span>
          )}
        </div>
      </div>
    );
  }
  if (block.type === 'svg-theme') {
    return (
      <div className="rounded overflow-hidden">
        <SvgThemeRender themeId={block.themeId} slots={block.slots || {}} />
      </div>
    )
  }
  return null;
}

function SvgThemeInlineEditor({ block, onUpdate }: { block: SvgThemeBlock; onUpdate: (id: string, partial: Partial<Block> | ((b: Block) => Block)) => void }) {
  const theme = getTheme(block.themeId)
  if (!theme) return null
  const keys = theme.slots
  function isColorKey(name: string): boolean {
    return /^(color|fill|stroke|bg|background|primary|secondary)/i.test(name)
  }
  function isColorValue(v: string | undefined): boolean {
    if (!v) return false
    return /^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(v) || /^rgba?\(/i.test(v) || /^hsla?\(/i.test(v)
  }
  function isImageKey(name: string): boolean {
    return /(image|img|logo|avatar|photo|picture|icon)/i.test(name)
  }
  function isImageValue(v: string | undefined): boolean {
    if (!v) return false
    return /^data:image\//.test(v) || /\.(png|jpe?g|gif|webp|svg)$/i.test(v) || /^https?:\/\//i.test(v)
  }
  function slotKind(name: string, value: string | undefined): 'color' | 'image' | 'text' {
    if (isImageKey(name) || isImageValue(value)) return 'image'
    if (isColorKey(name) || isColorValue(value)) return 'color'
    return 'text'
  }

  function updateSlot(k: string, value: string) {
    onUpdate(block.id, (prev) =>
      prev.type === 'svg-theme'
        ? { ...prev, slots: { ...(prev.slots || {}), [k]: value } }
        : prev,
    )
  }

  function onPickImage(k: string, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files && e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = String(reader.result || '')
      if (dataUrl) updateSlot(k, dataUrl)
    }
    reader.readAsDataURL(file)
    // reset so same file can be picked again
    e.target.value = ''
  }

  return (
    <div className="mt-3 p-3 rounded border grid gap-2" style={{ borderColor: 'var(--border)', background: 'rgba(0,0,0,0.15)' }}>
      <div className="text-xs text-[var(--muted)]">Inline editor</div>
      <label className="grid grid-cols-[120px_1fr] items-center gap-2 text-sm">
        <span className="opacity-80">Theme</span>
        <select
          className="h-9 px-2 rounded border bg-transparent"
          style={{ borderColor: 'var(--border)' }}
          value={block.themeId}
          onChange={(e) =>
            onUpdate(block.id, (prev) => {
              if (prev.type !== 'svg-theme') return prev
              const nextTheme = getTheme(e.target.value)
              if (!nextTheme) return { ...prev, themeId: e.target.value }
              const normalizedSlots: Record<string, string> = {}
              for (const key of nextTheme.slots) {
                normalizedSlots[key] = (prev.slots || {})[key] || ''
              }
              return { ...prev, themeId: e.target.value, slots: normalizedSlots }
            })
          }
        >
          {svgThemes.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </label>
      {keys.map((k: string) => {
        const v = block.slots?.[k]
        const kind = slotKind(k, v)
        if (kind === 'color') {
          const colorValue = v && isColorValue(v) && /^#/.test(v) ? v : (v || '#000000')
          return (
            <div key={k} className="grid grid-cols-[120px_1fr] items-center gap-2 text-sm">
              <span className="opacity-80">{k}</span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  aria-label={`${k} color`}
                  value={/^#/.test(colorValue) ? colorValue : '#000000'}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateSlot(k, e.target.value)}
                  style={{ width: 36, height: 28, padding: 0, background: 'transparent', border: '1px solid var(--border)', borderRadius: 6 }}
                />
                <input
                  className="h-9 px-2 rounded border bg-transparent flex-1"
                  style={{ borderColor: 'var(--border)' }}
                  value={v || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateSlot(k, e.target.value)}
                  placeholder="#000000 or css color"
                />
              </div>
            </div>
          )
        }
        if (kind === 'image') {
          return (
            <div key={k} className="grid grid-cols-[120px_1fr] items-center gap-2 text-sm">
              <span className="opacity-80">{k}</span>
              <div className="flex items-center gap-2">
                {v ? (
                  <img src={v} alt={k} style={{ width: 48, height: 36, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--border)' }} />
                ) : (
                  <div style={{ width: 48, height: 36, borderRadius: 6, border: '1px solid var(--border)', display: 'grid', placeItems: 'center', color: 'var(--muted)', fontSize: 10 }}>no img</div>
                )}
                <input type="file" accept="image/*" onChange={(e: React.ChangeEvent<HTMLInputElement>) => onPickImage(k, e)} />
                <button
                  type="button"
                  className="btn btn-secondary h-8"
                  onClick={() => updateSlot(k, '')}
                >Clear</button>
              </div>
              <div className="col-span-2 col-start-2">
                <input
                  className="h-9 w-full px-2 rounded border bg-transparent"
                  style={{ borderColor: 'var(--border)' }}
                  value={v || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateSlot(k, e.target.value)}
                  placeholder="Paste image URL or will use uploaded"
                />
              </div>
            </div>
          )
        }
        // text
        return (
          <label key={k} className="grid grid-cols-[120px_1fr] items-center gap-2 text-sm">
            <span className="opacity-80">{k}</span>
            <input
              className="h-9 px-2 rounded border bg-transparent"
              style={{ borderColor: 'var(--border)' }}
              value={v || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateSlot(k, e.target.value)}
              placeholder={k}
            />
          </label>
        )
      })}
    </div>
  )
}

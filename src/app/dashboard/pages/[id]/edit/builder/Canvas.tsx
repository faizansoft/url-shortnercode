"use client";
import React from "react";
import type { Block } from "@/types/pageBlocks";
import Image from "next/image";

export default function Canvas({
  blocks,
  selectedId,
  onSelect,
  onReorder,
  onDropNew,
}: {
  blocks: Block[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onReorder: (from: number, to: number) => void;
  onDropNew: (type: Block["type"], atIndex: number | null) => void;
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
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => handleDrop(e, null)}
    >
      <div className="text-sm text-[var(--muted)] mb-2">Canvas</div>
      <div className="space-y-3">
        {blocks.map((b, i) => (
          <div
            key={b.id}
            draggable
            onDragStart={(e) => handleDragStart(e, i)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleDrop(e, i)}
            className={`rounded border p-3 cursor-move ${selectedId === b.id ? "ring-2 ring-[var(--accent)]" : ""}`}
            style={{ borderColor: "var(--border)", background: "var(--surface)" }}
            onClick={() => onSelect(b.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") onSelect(b.id);
            }}
          >
            <BlockPreview block={b} />
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
  return null;
}

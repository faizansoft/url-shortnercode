"use client";
import React from "react";
import type { Block } from "@/types/pageBlocks";

export type PaletteItem = { type: Block["type"]; label: string; icon?: React.ReactNode };

const items: PaletteItem[] = [
  { type: "hero", label: "Hero" },
  { type: "heading", label: "Heading" },
  { type: "text", label: "Paragraph" },
  { type: "button", label: "Button" },
  { type: "link", label: "Link" },
  { type: "image", label: "Image" },
  { type: "product-card", label: "Product Card" },
  { type: "svg-theme", label: "Theme (SVG)" },
];

export default function Palette({ onAdd }: { onAdd: (t: Block["type"]) => void }) {
  return (
    <aside className="rounded-xl glass p-4 space-y-3">
      <div className="font-medium">Elements</div>
      <div className="grid grid-cols-2 gap-2">
        {items.map((it) => (
          <button
            key={it.type}
            className="btn btn-secondary h-9"
            onClick={() => onAdd(it.type)}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData("application/x-block-type", it.type);
            }}
          >
            {it.label}
          </button>
        ))}
      </div>
      <div className="h-px my-3" style={{ background: "var(--border)" }} />
      <div className="text-xs text-[var(--muted)]">Tip: Drag elements onto the canvas or click to insert.</div>
    </aside>
  );
}

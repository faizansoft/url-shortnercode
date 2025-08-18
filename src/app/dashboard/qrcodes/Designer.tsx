"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import QRCodeStyling, { type Options as QRStyleOptions } from "qr-code-styling";
// Explicit local helper types to satisfy TS
type DotsOpts = NonNullable<QRStyleOptions["dotsOptions"]>;
type BgOpts = NonNullable<QRStyleOptions["backgroundOptions"]>;
type DotsType = "dots" | "rounded" | "classy" | "classy-rounded" | "square" | "extra-rounded";
type BgGradType = "linear" | "radial";

export type DesignerProps = {
  value: string;
};

const palette = [
  "#0b1220",
  "#2563eb",
  "#7c3aed",
  "#db2777",
  "#ea580c",
  "#22c55e",
  "#0891b2",
  "#eab308",
];

export default function Designer({ value }: DesignerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const qrRef = useRef<QRCodeStyling | null>(null);
  const suppressUpdateRef = useRef<boolean>(false);

  // Core options
  const [size, setSize] = useState(220);
  const [margin, setMargin] = useState(2);
  const [ecLevel, setEcLevel] = useState<"L" | "M" | "Q" | "H">("M");
  const [prefersDark, setPrefersDark] = useState<boolean>(false); // retained but no longer affects colors

  // Dots/pattern
  const [dotsType, setDotsType] = useState<DotsType>("rounded");
  const [dotsColor, setDotsColor] = useState("#0b1220");
  const [dotsGradientOn, setDotsGradientOn] = useState(false);
  const [dotsGradA, setDotsGradA] = useState("#0b1220");
  const [dotsGradB, setDotsGradB] = useState("#2563eb");
  const [dotsGradRotation] = useState(0);

  // Corners
  const [cornerSquareType, setCornerSquareType] = useState<"dot" | "square" | "extra-rounded">("square");
  const [cornerSquareColor, setCornerSquareColor] = useState("#0b1220");
  const [cornerDotType, setCornerDotType] = useState<"dot" | "square">("dot");
  const [cornerDotColor, setCornerDotColor] = useState("#0b1220");

  // Background (default to solid white)
  const [bgColor, setBgColor] = useState("#ffffff");
  const [bgGradientOn, setBgGradientOn] = useState(false);
  const [bgGradA, setBgGradA] = useState("#ffffff");
  const [bgGradB, setBgGradB] = useState("#e2e8f0");
  const [bgGradType, setBgGradType] = useState<BgGradType>("linear");

  // Image / logo
  const [logoUrl, setLogoUrl] = useState<string>("");
  const [logoSize, setLogoSize] = useState<number>(0.25); // 0..1
  const [hideBgDots, setHideBgDots] = useState<boolean>(true);
  // crossOrigin is locked to 'anonymous' internally for safe exports; no UI

  // Frame (visual wrapper)
  const [frame, setFrame] = useState<"rounded" | "thin" | "square">("square");
  const [perfMode, setPerfMode] = useState<boolean>(false);
  
  // Corner custom presets (runtime only)
  const [cornerPresets, setCornerPresets] = useState<Array<{ label: string; sq: "dot" | "square" | "extra-rounded"; dot: "dot" | "square"; sc: string; dc: string }>>([]);
  
  // Built-in icons from public/
  const builtinIcons = useMemo(() => (
    [
      { name: "favicon", src: "/favicon.svg" },
      { name: "globe", src: "/globe.svg" },
      { name: "file", src: "/file.svg" },
      { name: "next", src: "/next.svg" },
    ] as const
  ), []);

  // Theme detection no longer changes QR colors; look is fixed regardless of OS theme
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
    const update = () => setPrefersDark(!!mql?.matches);
    update();
    mql?.addEventListener?.('change', update);
    return () => mql?.removeEventListener?.('change', update);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onUploadIcon = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      if (result) setLogoUrl(result);
    };
    reader.readAsDataURL(file);
  };
  const frameStyle = useMemo(() => {
    const transparentBg = (bgColor || '').toLowerCase() === '#ffffff00' || (bgColor || '').toLowerCase() === 'transparent' || (bgColor || '').endsWith('00');
    const effectiveBg = transparentBg ? '#ffffff' : bgColor;
    // All frames use zero padding so the QR fits perfectly without extra spacing
    switch (frame) {
      case "rounded":
        return { borderRadius: 16, padding: 0, border: "1px solid #e5e7eb", background: effectiveBg, overflow: "hidden" } as React.CSSProperties;
      case "thin":
        return { borderRadius: 6, padding: 0, border: "1px solid #e5e7eb", background: effectiveBg, overflow: "hidden" } as React.CSSProperties;
      case "square":
        return { borderRadius: 0, padding: 0, border: "1px solid #e5e7eb", background: effectiveBg, overflow: "hidden" } as React.CSSProperties;
      // removed other styles
      default:
        return {} as React.CSSProperties;
    }
  }, [frame, bgColor]);

  // Effective preview background used for the inner wrapper when a frame is applied
  const effectivePreviewBg = useMemo(() => {
    const v = (bgColor || '').toLowerCase();
    const isTransparent = v === '#ffffff00' || v === 'transparent' || v.endsWith('00');
    return isTransparent ? '#ffffff' : bgColor;
  }, [bgColor]);

  // Build options for qr-code-styling
  const options = useMemo<QRStyleOptions>(() => {
    // Gradients fully disabled per requirements
    const useDotsGradient = false;
    const useBgGradient = false;
    const dots: DotsOpts = useDotsGradient
      ? {
          gradient: {
            type: "linear",
            rotation: dotsGradRotation,
            colorStops: [
              { offset: 0, color: dotsGradA },
              { offset: 1, color: dotsGradB },
            ],
          },
          type: dotsType,
        }
      : { color: dotsColor, type: dotsType };
    const bg: BgOpts = useBgGradient
      ? {
          gradient: {
            type: bgGradType,
            rotation: 0,
            colorStops: [
              { offset: 0, color: bgGradA },
              { offset: 1, color: bgGradB },
            ],
          },
        }
      : { color: bgColor };

    return {
      width: size,
      height: size,
      data: value,
      margin,
      type: logoUrl ? "canvas" : "svg",
      qrOptions: { errorCorrectionLevel: ecLevel },
      dotsOptions: perfMode ? { color: dotsColor, type: "square" } : dots,
      cornersSquareOptions: { type: cornerSquareType, color: cornerSquareColor },
      cornersDotOptions: { type: cornerDotType, color: cornerDotColor },
      backgroundOptions: perfMode ? { color: bgColor } : bg,
      image: logoUrl || undefined,
      imageOptions: {
        imageSize: perfMode ? Math.min(logoSize, 0.2) : logoSize,
        hideBackgroundDots: hideBgDots,
        margin: 2,
        crossOrigin: 'anonymous',
      },
    };
  }, [value, size, margin, ecLevel, dotsType, dotsColor, dotsGradA, dotsGradB, dotsGradRotation, cornerSquareType, cornerSquareColor, cornerDotType, cornerDotColor, bgColor, bgGradA, bgGradB, bgGradType, logoUrl, logoSize, hideBgDots, perfMode]);

  // Initialize
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    qrRef.current = new QRCodeStyling(options);
    qrRef.current.append(el);
    return () => {
      if (el) el.innerHTML = "";
      qrRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update on options change, but allow temporary suppression to avoid flicker during batched resets
  useEffect(() => {
    if (suppressUpdateRef.current) return;
    qrRef.current?.update(options);
  }, [options]);

  // Helper to batch many state changes and avoid intermediate preview updates
  function batchUpdate(fn: () => void) {
    suppressUpdateRef.current = true;
    fn();
    // Release on next frame; effect will apply the final consolidated options
    requestAnimationFrame(() => {
      suppressUpdateRef.current = false;
    });
  }

  // Build a fresh combined SVG (QR + frame) without using the live preview DOM
  async function buildCombinedSVG(outer: number): Promise<string> {
    // Prepare a temporary SVG QR render using current options
    const rx = frame === 'rounded' ? 16 : frame === 'thin' ? 6 : 0;
    const strokeW = 1;
    const half = strokeW / 2;
    const surface = '#ffffff';
    const border = '#e5e7eb';
    const transparentBg = (bgColor || '').toLowerCase() === '#ffffff00' || (bgColor || '').toLowerCase() === 'transparent' || (bgColor || '').endsWith('00');
    const effectiveBg = transparentBg ? surface : bgColor;

    // Ensure we render QR as SVG regardless of preview type
    const tempOpts: QRStyleOptions = {
      ...options,
      width: size,
      height: size,
      type: 'svg',
    };
    const tmp = new QRCodeStyling(tempOpts);
    const tmpDiv = document.createElement('div');
    tmp.append(tmpDiv);
    await new Promise<void>((r) => requestAnimationFrame(() => r()));
    const svgNode = tmpDiv.querySelector('svg');

    let innerMarkup = '';
    if (svgNode) {
      // Serialize inner QR SVG and inline any external images
      let svgText = new XMLSerializer().serializeToString(svgNode);
      try {
        const hrefRegex = /<image[^>]+(?:xlink:href|href)=["']([^"']+)["'][^>]*>/gi;
        const urls: string[] = [];
        let m: RegExpExecArray | null;
        while ((m = hrefRegex.exec(svgText)) !== null) {
          const u = m[1];
          if (/^https?:\/\//i.test(u)) urls.push(u);
        }
        for (const u of Array.from(new Set(urls))) {
          try {
            const dataUrl = await urlToDataURL(u);
            svgText = svgText.split(u).join(dataUrl);
          } catch {}
        }
      } catch {}
      const cleaned = svgText.replace(/<\?xml[^>]*>/, '').replace(/<!DOCTYPE[^>]*>/, '');
      innerMarkup = cleaned
        .replace(/^[\s\S]*?<svg[^>]*>/i, '')
        .replace(/<\/svg>\s*$/i, '')
        .replace(/\n/g, '');
    }

    const defsClip = `<clipPath id="clipR"><rect x="0" y="0" width="${outer}" height="${outer}" rx="${rx}" ry="${rx}"/></clipPath>`;
    const wrapped = `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<svg xmlns="http://www.w3.org/2000/svg" width="${outer}" height="${outer}" viewBox="0 0 ${outer} ${outer}">\n` +
      `<defs>\n${defsClip}\n</defs>\n` +
      `<rect x="0" y="0" width="${outer}" height="${outer}" rx="${rx}" ry="${rx}" fill="${effectiveBg}"/>\n` +
      `<rect x="${half}" y="${half}" width="${outer - strokeW}" height="${outer - strokeW}" rx="${rx}" ry="${rx}" fill="none" stroke="${border}" stroke-width="${strokeW}" stroke-linejoin="round" stroke-linecap="round"/>\n` +
      `<g clip-path="url(#clipR)">\n` +
      `  <g transform="translate(${(outer - size)/2}, ${(outer - size)/2})">${innerMarkup}</g>\n` +
      `</g>\n` +
      `</svg>`;
    return wrapped;
  }

  // (removed unused getThemeColor)

  function downloadBlob(blob: Blob, name: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }

  // Robust canvas->PNG Blob with fallback via dataURL
  async function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
    // Try native toBlob first
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'));
    if (blob) return blob;
    // Fallback: dataURL -> Blob
    try {
      const dataUrl = canvas.toDataURL('image/png');
      const res = await fetch(dataUrl);
      return await res.blob();
    } catch {
      return null;
    }
  }

  // Helper: fetch an external URL and return a data URL for safe inlining
  async function urlToDataURL(url: string): Promise<string> {
    const res = await fetch(url, { mode: 'cors', credentials: 'omit' });
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result as string);
      fr.onerror = reject;
      fr.readAsDataURL(blob);
    });
  }

  // Helper: Blob -> data URL (removed) and blank-detection helpers (removed)

  function drawRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    const rr = Math.max(0, r);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  async function handleDownload(ext: 'png' | 'svg') {
    const pad = 0;
    const outer = size + pad * 2;
    // Ensure latest options are applied before we read states (not the DOM)
    try { qrRef.current?.update(options); } catch {}
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

    if (ext === 'svg') {
      try {
        const wrapped = await buildCombinedSVG(outer);
        const outBlob = new Blob([wrapped], { type: 'image/svg+xml;charset=utf-8' });
        downloadBlob(outBlob, 'qr-framed.svg');
        return;
      } catch {
        try { qrRef.current?.download({ extension: 'svg', name: 'qr' }); } catch {}
        return;
      }
    }

    // PNG export: rasterize our combined SVG (not the preview) to a canvas
    try {
      const wrapped = await buildCombinedSVG(outer);
      const svgBlob = new Blob([wrapped], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);
      const exportOuter = Math.max(2048, outer);
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      img.src = url;
      await new Promise((res, rej) => { img.onload = () => res(null); img.onerror = rej; });
      const canvas = document.createElement('canvas');
      canvas.width = exportOuter; canvas.height = exportOuter;
      const ctx = canvas.getContext('2d');
      if (!ctx) { URL.revokeObjectURL(url); return; }
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, exportOuter, exportOuter);
      const blob = await canvasToPngBlob(canvas);
      if (blob) downloadBlob(blob, 'qr.png');
      URL.revokeObjectURL(url);
      return;
    } catch (err) {
      // Avoid falling back to lower-quality exporter; surface a soft failure instead
      console.error('PNG export failed', err);
      return;
    }
  }
  // (removed unused resetAll)

  const saveChanges = () => {
    if (typeof window === 'undefined') return;
    const payload = {
      size, margin, ecLevel, perfMode,
      dotsType, dotsColor, dotsGradientOn, dotsGradA, dotsGradB, dotsGradRotation,
      cornerSquareType, cornerSquareColor, cornerDotType, cornerDotColor,
      bgColor, bgGradientOn, bgGradA, bgGradB, bgGradType,
      logoUrl, logoSize, hideBgDots,
      frame,
      value,
      ts: Date.now(),
    };
    try {
      window.localStorage.setItem('qrDesigner:last', JSON.stringify(payload));
    } catch {}
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
      <div className="rounded-xl glass p-4 space-y-4 sticky top-4 self-start h-[calc(100vh-2rem)] overflow-y-auto">
        {/* Top bar: performance and reset all */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--muted)]">Performance mode</span>
            <input type="checkbox" checked={perfMode} onChange={(e) => setPerfMode(e.target.checked)} />
          </div>
          {/* Removed 'Reset all' button as per request */}
        </div>

        {/* Presets */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs font-medium text-[var(--muted)]">Presets</div>
          <div className="flex flex-wrap gap-2">
            {([
              {
                name: "Classic",
                apply: () => {
                  setDotsType("square");
                  setDotsColor("#0b1220");
                  setDotsGradientOn(false);
                  setBgColor("#ffffff");
                  setBgGradientOn(false);
                  setCornerSquareType("square");
                  setCornerSquareColor("#0b1220");
                  setCornerDotType("dot");
                  setCornerDotColor("#0b1220");
                  setEcLevel("M");
                },
              },
              {
                name: "Brand Blue",
                apply: () => {
                  setDotsType("rounded");
                  setDotsColor("#2563eb");
                  setDotsGradientOn(false);
                  setBgColor("#ffffff");
                  setBgGradientOn(false);
                  setCornerSquareType("dot");
                  setCornerSquareColor("#2563eb");
                  setCornerDotType("square");
                  setCornerDotColor("#2563eb");
                  setEcLevel("Q");
                },
              },
              {
                name: "Sunset Gradient",
                apply: () => {
                  setDotsType("rounded");
                  setDotsGradientOn(true);
                  setDotsGradA("#db2777");
                  setDotsGradB("#ea580c");
                  setDotsColor("#db2777");
                  setBgGradientOn(true);
                  setBgGradType("linear");
                  setBgGradA("#ffffff");
                  setBgGradB("#fde68a");
                  setBgColor("#ffffff");
                  setCornerSquareType("extra-rounded");
                  setCornerSquareColor("#db2777");
                  setCornerDotType("dot");
                  setCornerDotColor("#ea580c");
                  setEcLevel("H");
                },
              },
            ] as const).map((p) => (
              <button key={p.name} className="btn btn-secondary h-8" onClick={p.apply}>{p.name}</button>
            ))}
          </div>
        </div>

        {/* Select styles */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <div className="text-xs font-medium text-[var(--muted)]">Patterns</div>
            <div className="flex flex-wrap gap-2.5 items-center">
              {(["square","rounded","dots","classy","classy-rounded","extra-rounded"] as DotsType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setDotsType(t)}
                  className={`h-14 w-14 rounded-md border grid place-items-center ${dotsType===t? 'ring-2 ring-[var(--accent)]' : ''} tip`}
                  style={{ background: 'transparent', borderColor: 'var(--border)' }}
                  data-tip={t}
                >
                  <div className="grid grid-cols-5 grid-rows-5 gap-[2px] p-1.5 bg-[var(--surface)] rounded-md">
                    {Array.from({ length: 25 }).map((_, i) => {
                      const row = Math.floor(i / 5);
                      const col = i % 5;
                      const common: React.CSSProperties = { background: 'currentColor', color: 'var(--foreground)' };
                      if (t === 'dots') {
                        // Smaller centered circles with more whitespace to clearly indicate "dots"
                        return <div key={i} style={{ ...common, width: 6, height: 6, borderRadius: 999, margin: 'auto' }} />;
                      }
                      if (t === 'rounded') {
                        // Slightly rounded squares (subtle rounding)
                        return <div key={i} style={{ ...common, width: 8, height: 8, borderRadius: 2 }} />;
                      }
                      if (t === 'square') {
                        return <div key={i} style={{ ...common, width: 8, height: 8, borderRadius: 0 }} />;
                      }
                      if (t === 'extra-rounded') {
                        // More circular, larger modules to clearly differ from 'rounded'
                        return <div key={i} style={{ ...common, width: 9, height: 9, borderRadius: 7 }} />;
                      }
                      if (t === 'classy' || t === 'classy-rounded') {
                        const r = t === 'classy' ? 3 : 6;
                        // Asymmetric rounding to suggest "classy" style
                        const style: React.CSSProperties = { ...common, width: 8, height: 8, borderRadius: 0 };
                        if ((row + col) % 2 === 0) {
                          style.borderTopLeftRadius = r;
                          style.borderBottomRightRadius = r;
                        } else {
                          style.borderTopRightRadius = r;
                          style.borderBottomLeftRadius = r;
                        }
                        return <div key={i} style={style} />;
                      }
                      return <div key={i} style={{ ...common, width: 8, height: 8 }} />;
                    })}
                  </div>
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-xs font-medium text-[var(--muted)]">Error correction</div>
            <div className="flex flex-wrap gap-2.5">
              {(["L","M","Q","H"] as const).map((lvl) => (
                <button key={lvl} className={`h-10 px-4 rounded border text-xs transition ${ecLevel===lvl? 'ring-1 ring-[var(--accent)] bg-[var(--panel)]' : ''}`} style={{ background: 'var(--surface)', borderColor: 'var(--border)' }} onClick={() => setEcLevel(lvl)}>
                  {lvl}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Choose your colors */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <div className="text-xs font-medium text-[var(--muted)]">Code color</div>
            <div className="flex gap-2 flex-wrap">
              {palette.map((c) => (
                <button key={c} className="h-6 w-6 rounded-full border" style={{ background: c, borderColor: 'var(--border)' }} onClick={() => setDotsColor(c)} />
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-xs font-medium text-[var(--muted)]">Background</div>
            <div className="flex gap-2 flex-wrap items-center">
              {['#ffffff','#f1f5f9','#e2e8f0','#cbd5e1','#94a3b8'].map((c) => (
                <button
                  key={c}
                  className={`h-6 w-6 rounded border ${bgColor===c ? 'ring-2 ring-[var(--accent)]' : ''}`}
                  style={{ background: c, borderColor: 'var(--border)' }}
                  onClick={() => setBgColor(c)}
                  aria-pressed={bgColor===c}
                  aria-label={`Background ${c}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Corners and Logo */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <div className="text-xs font-medium text-[var(--muted)]">Corners</div>
            {/* Composite corner style previews (one-line scrollable) */}
            <div className="flex flex-nowrap gap-2.5 items-center overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none]">
              {([
                { sq: 'square' as const, dot: 'dot' as const, label: 'Square + Dot' },
                { sq: 'square' as const, dot: 'square' as const, label: 'Square + Square' },
                { sq: 'extra-rounded' as const, dot: 'dot' as const, label: 'Extra-rounded + Dot' },
                { sq: 'extra-rounded' as const, dot: 'square' as const, label: 'Extra-rounded + Square' },
                { sq: 'dot' as const, dot: 'dot' as const, label: 'Dot + Dot' },
                { sq: 'dot' as const, dot: 'square' as const, label: 'Dot + Square' },
              ]).map(({ sq, dot, label }) => (
                <button
                  key={label}
                  onClick={() => { setCornerSquareType(sq); setCornerDotType(dot); }}
                  className={`h-14 w-14 rounded-md border grid place-items-center ${cornerSquareType===sq && cornerDotType===dot ? 'ring-2 ring-[var(--accent)]' : ''} tip`}
                  style={{ background: 'transparent', borderColor: 'var(--border)' }}
                  data-tip={label}
                >
                  <div className="h-10 w-10 grid place-items-center" style={{ background: 'var(--surface)', borderRadius: 6 }}>
                    <div style={{
                      width: 26,
                      height: 26,
                      background: 'currentColor',
                      color: 'var(--foreground)',
                      borderRadius: sq === 'square' ? 0 : sq === 'extra-rounded' ? 10 : 999,
                      display: 'grid',
                      placeItems: 'center',
                    }}>
                      <div style={{
                        width: 18,
                        height: 18,
                        background: 'var(--surface)',
                        borderRadius: sq === 'square' ? 0 : sq === 'extra-rounded' ? 8 : 999,
                        display: 'grid',
                        placeItems: 'center',
                      }}>
                        <div style={{
                          width: 10,
                          height: 10,
                          background: 'currentColor',
                          color: 'var(--foreground)',
                          borderRadius: dot === 'dot' ? 999 : 2,
                        }}/>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            {/* Corner presets (supported types only) */}
            <div className="space-y-1 mt-2">
              <div className="flex items-center justify-between pr-1">
                <div className="text-xs font-medium text-[var(--muted)]">Corner presets</div>
                <button
                  className="h-7 px-2 rounded border text-xs"
                  style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
                  onClick={() => {
                    const label = `Custom ${cornerPresets.length + 1}`;
                    setCornerPresets((prev) => [
                      ...prev,
                      { label, sq: cornerSquareType, dot: cornerDotType, sc: cornerSquareColor, dc: cornerDotColor },
                    ]);
                  }}
                >Save current as preset</button>
              </div>
              <div className="flex flex-nowrap gap-2.5 items-center overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none]">
                {(() => {
                  const builtins = [
                    { label: 'Square + Square (Dark)', sq: 'square' as const, dot: 'square' as const, sc: '#0b1220', dc: '#0b1220' },
                    { label: 'Square + Dot (Blue)', sq: 'square' as const, dot: 'dot' as const, sc: '#2563eb', dc: '#2563eb' },
                    { label: 'Extra + Dot (Violet)', sq: 'extra-rounded' as const, dot: 'dot' as const, sc: '#7c3aed', dc: '#7c3aed' },
                    { label: 'Extra + Square (Orange)', sq: 'extra-rounded' as const, dot: 'square' as const, sc: '#ea580c', dc: '#ea580c' },
                    { label: 'Dot + Dot (Green)', sq: 'dot' as const, dot: 'dot' as const, sc: '#22c55e', dc: '#22c55e' },
                    { label: 'Dot + Square (Cyan)', sq: 'dot' as const, dot: 'square' as const, sc: '#0891b2', dc: '#0891b2' },
                  ];
                  const seen = new Set<string>();
                  const items = [...builtins, ...cornerPresets]
                    // Remove any presets with outer corner type 'square'
                    .filter((p) => p.sq !== 'square')
                    // Deduplicate remaining items
                    .filter((p) => {
                      const key = `${p.sq}|${p.dot}|${p.sc}|${p.dc}`;
                      if (seen.has(key)) return false;
                      seen.add(key);
                      return true;
                    });
                  return items.map(({ label, sq, dot, sc, dc }) => (
                    <button
                      key={`${sq}-${dot}-${sc}-${dc}-${label}`}
                      onClick={() => { setCornerSquareType(sq); setCornerDotType(dot); setCornerSquareColor(sc); setCornerDotColor(dc); }}
                      className={`h-14 w-14 rounded-md border grid place-items-center ${cornerSquareType===sq && cornerDotType===dot && cornerSquareColor===sc && cornerDotColor===dc ? 'ring-2 ring-[var(--accent)]' : ''} tip`}
                      style={{ background: 'transparent', borderColor: 'var(--border)' }}
                      data-tip={label}
                    >
                      <div className="h-10 w-10 grid place-items-center" style={{ background: 'var(--surface)', borderRadius: 6 }}>
                        <div style={{
                          width: 26,
                          height: 26,
                          background: sc,
                          borderRadius: sq === 'square' ? 0 : sq === 'extra-rounded' ? 10 : 999,
                          display: 'grid',
                          placeItems: 'center',
                        }}>
                          <div style={{
                            width: 18,
                            height: 18,
                            background: 'var(--surface)',
                            borderRadius: sq === 'square' ? 0 : sq === 'extra-rounded' ? 8 : 999,
                            display: 'grid',
                            placeItems: 'center',
                          }}>
                            <div style={{
                              width: 10,
                              height: 10,
                              background: dc,
                              borderRadius: dot === 'dot' ? 999 : 2,
                            }}/>
                          </div>
                        </div>
                      </div>
                    </button>
                  ));
                })()}
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex gap-2 flex-wrap items-center">
                <div className="w-full text-xs text-[var(--muted)]">Outer corner color</div>
                {palette.map((c) => (
                  <button key={c} className="h-6 w-6 rounded border" style={{ background: c, borderColor: 'var(--border)' }} onClick={() => setCornerSquareColor(c)} />
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex gap-2 flex-wrap items-center">
                <div className="w-full text-xs text-[var(--muted)]">Inner corner color</div>
                {palette.map((c) => (
                  <button key={c} className="h-6 w-6 rounded border" style={{ background: c, borderColor: 'var(--border)' }} onClick={() => setCornerDotColor(c)} />
                ))}
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-xs font-medium text-[var(--muted)]">Logo</div>
            <input className="w-full h-9 rounded px-2" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }} placeholder="https://…/logo.png" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} />
            <div className="grid grid-cols-2 gap-2 items-center">
              <label className="text-xs">Size</label>
              <input type="range" min={0.1} max={0.45} step={0.01} value={logoSize} onChange={(e) => setLogoSize(parseFloat(e.target.value))} />
              <label className="text-xs">Hide bg dots</label>
              <input type="checkbox" checked={hideBgDots} onChange={(e) => setHideBgDots(e.target.checked)} />
            </div>
            <div className="mt-2">
              <div className="text-xs font-medium text-[var(--muted)] mb-1">Pick an icon</div>
              <div className="flex flex-wrap gap-2">
                {builtinIcons.map(icon => (
                  <button key={icon.name} className={`h-9 px-2 rounded border flex items-center gap-2 ${logoUrl===icon.src? 'ring-1 ring-[var(--accent)]' : ''}`} style={{ background: 'var(--surface)', borderColor: 'var(--border)' }} onClick={() => setLogoUrl(icon.src)}>
                    <Image src={icon.src} alt={icon.name} width={16} height={16} />
                    <span className="text-xs">{icon.name}</span>
                  </button>
                ))}
                <label className="h-9 px-2 rounded border flex items-center gap-2 cursor-pointer" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onUploadIcon(f); }} />
                  <span className="text-xs">Upload…</span>
                </label>
              </div>
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <div className="text-xs font-medium text-[var(--muted)]">Borders</div>
          <div className="flex gap-2.5 flex-wrap items-center">
              {(["square","rounded","thin"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFrame(f)}
                className={`h-14 w-14 rounded-md border grid place-items-center ${frame===f? 'ring-2 ring-[var(--accent)]' : ''} tip`}
                style={{ background: 'transparent', borderColor: 'var(--border)' }}
                data-tip={f}
              >
                <div
                  className="h-10 w-10"
                  style={(() => {
                    const common: React.CSSProperties = { background: 'var(--surface)' };
                    switch (f) {
                      case 'square':
                        return { ...common, border: '1px solid var(--border)' } as React.CSSProperties;
                      case 'rounded':
                        return { ...common, border: '1px solid var(--border)', borderRadius: 8 } as React.CSSProperties;
                      case 'thin':
                        return { ...common, border: '1px solid var(--border)', borderRadius: 4 } as React.CSSProperties;
                      // removed other styles
                      default:
                        return common;
                    }
                  })()}
                />
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="rounded-xl glass p-5 flex flex-col gap-5 items-center sticky top-4 self-start h-[calc(100vh-2rem)]">
        <div className="text-sm text-[var(--muted)] self-start">Preview</div>
        <div style={frameStyle}>
          <div
            className={`p-0 border-0`}
            style={{ background: effectivePreviewBg, borderRadius: 'inherit' }}
          >
            <div ref={containerRef} className="[&>svg]:block [&>canvas]:block" />
          </div>
        </div>
        <div className="mt-auto pt-4 flex flex-wrap gap-3 items-center justify-center w-full">
          <button className="btn btn-secondary h-10 px-4 tip" data-tip="Include frame" onClick={() => handleDownload("png")}>Download PNG</button>
          <button className="btn btn-secondary h-10 px-4 tip" data-tip="Include frame" onClick={() => handleDownload("svg")}>Download SVG</button>
          <button
            className="btn btn-outline h-10 px-4 flex items-center gap-2"
            onClick={() => {
              // Reset to default values
              setSize(220);
              setMargin(2);
              setEcLevel("M");
              setPerfMode(false);
              setDotsType("rounded");
              setDotsColor("#0b1220");
              setDotsGradientOn(false);
              setCornerSquareType("square");
              setCornerSquareColor("#0b1220");
              setCornerDotType("dot");
              setCornerDotColor("#0b1220");
              setBgGradientOn(false);
              setBgGradA("#ffffff");
              setBgGradB("#e2e8f0");
              setBgGradType("linear");
              setBgColor("#ffffff");
              setLogoUrl("");
              setLogoSize(0.25);
              setHideBgDots(true);
              setFrame("square");
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 6V3L8 7l4 4V8c2.757 0 5 2.243 5 5a5 5 0 0 1-8.535 3.535l-1.414 1.414A7 7 0 1 0 12 6z"/>
            </svg>
            <span>Reset to Default</span>
          </button>
          <button
            className="btn btn-primary h-10 px-4 tip"
            data-tip="Save current configuration"
            onClick={saveChanges}
          >
            Save changes
          </button>
        </div>
      </div>
    </div>
  );
}

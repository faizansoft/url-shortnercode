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

  // Core options
  const [size, setSize] = useState(220);
  const [margin, setMargin] = useState(2);
  const [ecLevel, setEcLevel] = useState<"L" | "M" | "Q" | "H">("M");
  const [prefersDark, setPrefersDark] = useState<boolean>(false);

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

  // Background
  const [bgColor, setBgColor] = useState("#ffffff00");
  const [bgGradientOn, setBgGradientOn] = useState(false);
  const [bgGradA, setBgGradA] = useState("#ffffff");
  const [bgGradB, setBgGradB] = useState("#e2e8f0");
  const [bgGradType, setBgGradType] = useState<BgGradType>("linear");

  // Image / logo
  const [logoUrl, setLogoUrl] = useState<string>("");
  const [logoSize, setLogoSize] = useState<number>(0.25); // 0..1
  const [hideBgDots, setHideBgDots] = useState<boolean>(true);
  const [crossOrigin, setCrossOrigin] = useState<string>("anonymous");

  // Frame (visual wrapper)
  const [frame, setFrame] = useState<
    | "none"
    | "rounded"
    | "thin"
    | "thick"
    | "square"
    | "accent"
    | "shadow"
    | "outline"
    | "dashed"
    | "double"
    | "glow"
    | "gradient"
  >("none");
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

  // Detect system dark mode and align default contrast
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
    const update = () => setPrefersDark(!!mql?.matches);
    update();
    mql?.addEventListener?.('change', update);
    return () => mql?.removeEventListener?.('change', update);
  }, []);

  // If user hasn't customized away from default dark code color, flip to white on dark
  useEffect(() => {
    if (prefersDark && dotsColor === "#0b1220") {
      setDotsColor("#ffffff");
      setCornerSquareColor("#ffffff");
      setCornerDotColor("#ffffff");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefersDark]);

  const onUploadIcon = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      if (result) setLogoUrl(result);
    };
    reader.readAsDataURL(file);
  };
  const frameStyle = useMemo(() => {
    // All frames use zero padding so the QR fits perfectly without extra spacing
    switch (frame) {
      case "rounded":
        return { borderRadius: 16, padding: 0, border: "1px solid var(--border)", background: "var(--surface)", overflow: "hidden" } as React.CSSProperties;
      case "thin":
        return { borderRadius: 6, padding: 0, border: "1px solid var(--border)", background: "var(--surface)", overflow: "hidden" } as React.CSSProperties;
      case "thick":
        return { borderRadius: 12, padding: 0, border: "2px solid color-mix(in oklab, var(--accent) 60%, var(--border))", overflow: "hidden" } as React.CSSProperties;
      case "square":
        return { borderRadius: 0, padding: 0, border: "1px solid var(--border)", background: "var(--surface)", overflow: "hidden" } as React.CSSProperties;
      case "accent":
        return { borderRadius: 10, padding: 0, border: "3px solid var(--accent)", background: "var(--surface)", overflow: "hidden" } as React.CSSProperties;
      case "shadow":
        return { borderRadius: 12, padding: 0, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", background: "var(--surface)", overflow: "hidden" } as React.CSSProperties;
      case "outline":
        return { borderRadius: 8, padding: 0, outline: "2px solid var(--border)", outlineOffset: 0, background: "var(--surface)", overflow: "hidden" } as React.CSSProperties;
      case "dashed":
        return { borderRadius: 8, padding: 0, border: "2px dashed var(--border)", background: "var(--surface)", overflow: "hidden" } as React.CSSProperties;
      case "double":
        return { borderRadius: 10, padding: 0, border: "2px solid var(--border)", outline: "2px solid var(--accent)", outlineOffset: 2, background: "var(--surface)", overflow: "hidden" } as React.CSSProperties;
      case "glow":
        return { borderRadius: 12, padding: 0, border: "1px solid var(--border)", boxShadow: "0 0 0 4px color-mix(in oklab, var(--accent) 35%, transparent), 0 12px 28px rgba(0,0,0,0.18)", background: "var(--surface)", overflow: "hidden" } as React.CSSProperties;
      case "gradient":
        return { borderRadius: 12, padding: 2, background: "conic-gradient(from 0deg, var(--accent), #7c3aed, #22c55e, var(--accent))", overflow: "hidden" } as React.CSSProperties;
      default:
        return {} as React.CSSProperties;
    }
  }, [frame]);

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
        crossOrigin: crossOrigin || undefined,
      },
    };
  }, [value, size, margin, ecLevel, dotsType, dotsColor, dotsGradA, dotsGradB, dotsGradRotation, cornerSquareType, cornerSquareColor, cornerDotType, cornerDotColor, bgColor, bgGradA, bgGradB, bgGradType, logoUrl, logoSize, hideBgDots, crossOrigin, perfMode]);

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

  // Update on options change
  useEffect(() => {
    qrRef.current?.update(options);
  }, [options]);

  // Handlers
  async function getThemeColor(varName: string, fallback: string) {
    if (typeof window === 'undefined') return fallback;
    const v = getComputedStyle(document.documentElement).getPropertyValue(varName);
    return (v && v.trim()) || fallback;
  }

  async function getQrBlobFromRendered(): Promise<Blob | null> {
    const root = containerRef.current;
    if (!root) return null;
    // Prefer canvas if present
    const canvas = root.querySelector('canvas');
    if (canvas && 'toBlob' in canvas) {
      return await new Promise<Blob | null>((resolve) => (canvas as HTMLCanvasElement).toBlob((b) => resolve(b), 'image/png'));
    }
    // Else try SVG -> rasterize to PNG blob
    const svgEl = root.querySelector('svg');
    if (svgEl) {
      const svgText = new XMLSerializer().serializeToString(svgEl);
      const svgBlob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);
      try {
        const img = new window.Image();
        img.crossOrigin = 'anonymous';
        img.src = url;
        await new Promise((res, rej) => { img.onload = () => res(null); img.onerror = rej; });
        const canvas2 = document.createElement('canvas');
        canvas2.width = size; canvas2.height = size;
        const ctx2 = canvas2.getContext('2d');
        if (!ctx2) return null;
        ctx2.drawImage(img, 0, 0, size, size);
        return await new Promise<Blob | null>((resolve) => canvas2.toBlob((b) => resolve(b), 'image/png'));
      } catch {
        return null;
      } finally {
        URL.revokeObjectURL(url);
      }
    }
    return null;
  }

  function downloadBlob(blob: Blob, name: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }

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
    const pad = 0; // no inner padding; QR will meet the frame edge
    const borderW = (frame === 'thick' ? 6 : frame === 'accent' ? 5 : frame === 'outline' ? 3 : frame === 'double' ? 3 : frame === 'dashed' ? 3 : frame === 'gradient' ? 4 : 2);
    const outer = size + pad * 2;

    const surface = await getThemeColor('--surface', '#ffffff');
    const border = await getThemeColor('--border', '#e5e7eb');
    const accent = await getThemeColor('--accent', '#2563eb');

    if (ext === 'png') {
      // If no frame, export raw QR exactly as rendered to avoid any trimming/clipping
      if (frame === 'none') {
        try { return qrRef.current?.download({ extension: 'png', name: 'qr' }); } catch { /* noop */ }
      }
      const qrBlob = await getQrBlobFromRendered();
      if (!qrBlob) { try { return qrRef.current?.download({ extension: 'png', name: 'qr' }); } catch { return; } }
      const img = new window.Image();
      img.src = URL.createObjectURL(qrBlob);
      await new Promise((res, rej) => { img.onload = () => res(null); img.onerror = rej; });

      // Trim transparent margins from the QR image
      const trimCanvas = document.createElement('canvas');
      trimCanvas.width = img.width; trimCanvas.height = img.height;
      const tctx = trimCanvas.getContext('2d'); if (!tctx) return;
      tctx.drawImage(img, 0, 0);
      const { data, width: tw, height: th } = tctx.getImageData(0, 0, trimCanvas.width, trimCanvas.height);
      let minX = tw, minY = th, maxX = 0, maxY = 0;
      for (let y = 0; y < th; y++) {
        for (let x = 0; x < tw; x++) {
          const a = data[(y * tw + x) * 4 + 3];
          if (a > 0) { if (x < minX) minX = x; if (y < minY) minY = y; if (x > maxX) maxX = x; if (y > maxY) maxY = y; }
        }
      }
      if (minX > maxX || minY > maxY) { minX = 0; minY = 0; maxX = tw - 1; maxY = th - 1; }
      const sx = Math.max(0, minX), sy = Math.max(0, minY), sw = Math.max(1, maxX - minX + 1), sh = Math.max(1, maxY - minY + 1);

      const exportOuter = Math.max(2048, outer);
      const scale = exportOuter / outer;
      const canvas = document.createElement('canvas');
      canvas.width = exportOuter; canvas.height = exportOuter;
      const ctx = canvas.getContext('2d'); if (!ctx) return;
      ctx.imageSmoothingEnabled = false;

      // Rounded background fill and clip so QR respects corner shape
      const rx = (frame === 'none') ? 8 : ((frame === 'rounded' || frame === 'glow' || frame === 'shadow' || frame === 'gradient') ? 16 : (frame === 'outline' ? 10 : (frame === 'thin' ? 6 : (frame === 'thick' ? 14 : (frame === 'double' ? 12 : 0)))));
      const rxScaled = rx * scale;
      drawRoundedRect(ctx, 0, 0, exportOuter, exportOuter, rxScaled);
      ctx.fillStyle = surface; ctx.fill();
      ctx.save();
      drawRoundedRect(ctx, 0, 0, exportOuter, exportOuter, rxScaled);
      ctx.clip();
      // Draw trimmed QR to fill the inner area completely, clipped to rounded rect
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, exportOuter, exportOuter);
      ctx.restore();

      // Draw frame stroke on top so it visually meets the QR
      drawRoundedRect(ctx, 0.5 * scale, 0.5 * scale, exportOuter - 1 * scale, exportOuter - 1 * scale, Math.max(0, rxScaled - 0.5 * scale));
      if (frame === 'accent') {
        ctx.lineWidth = 5 * scale; ctx.strokeStyle = accent; ctx.stroke();
      } else if (frame === 'double') {
        ctx.lineWidth = 3 * scale; ctx.strokeStyle = border; ctx.stroke();
        drawRoundedRect(ctx, 5.5 * scale, 5.5 * scale, exportOuter - 11 * scale, exportOuter - 11 * scale, Math.max(0, rxScaled - 5.5 * scale));
        ctx.strokeStyle = accent; ctx.lineWidth = 3 * scale; ctx.stroke();
      } else if (frame === 'dashed') {
        ctx.setLineDash([8 * scale, 8 * scale]); ctx.lineWidth = 3 * scale; ctx.strokeStyle = border; ctx.stroke(); ctx.setLineDash([]);
      } else if (frame === 'outline') {
        ctx.lineWidth = 3 * scale; ctx.strokeStyle = border; ctx.stroke();
      } else if (frame === 'thick') {
        ctx.lineWidth = 6 * scale; ctx.strokeStyle = border; ctx.stroke();
      } else if (frame === 'thin' || frame === 'square' || frame === 'rounded') {
        ctx.lineWidth = 2 * scale; ctx.strokeStyle = border; ctx.stroke();
      } else if (frame === 'glow') {
        ctx.shadowColor = accent; ctx.shadowBlur = 22 * scale; ctx.lineWidth = 3 * scale; ctx.strokeStyle = border; ctx.stroke(); ctx.shadowBlur = 0;
      } else if (frame === 'shadow') {
        ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.18)'; ctx.shadowBlur = 18 * scale; ctx.shadowOffsetY = 8 * scale; ctx.lineWidth = 2 * scale; ctx.strokeStyle = 'rgba(0,0,0,0)'; ctx.stroke(); ctx.restore();
      } else if (frame === 'gradient') {
        const g = ctx.createLinearGradient(0, 0, exportOuter, exportOuter);
        g.addColorStop(0, accent); g.addColorStop(0.5, '#7c3aed'); g.addColorStop(1, '#22c55e');
        ctx.lineWidth = 4 * scale; ctx.strokeStyle = g; ctx.stroke();
      }

      canvas.toBlob((b) => { if (b) downloadBlob(b, 'qr-framed.png'); }, 'image/png');
      URL.revokeObjectURL(img.src);
      return;
    }

    // SVG path: wrap inner SVG with outer frame SVG
    try {
      // If no frame, export raw SVG exactly as rendered
      if (frame === 'none') {
        try { return qrRef.current?.download({ extension: 'svg', name: 'qr' }); } catch { /* fallthrough to raw serialize */ }
      }
      // Source inner SVG directly from DOM to ensure parity with preview
      const root = containerRef.current;
      const svgNode = root?.querySelector('svg');
      if (!svgNode) throw new Error('no-svg');
      const svgText = new XMLSerializer().serializeToString(svgNode);
      // Extract only the inner contents of the rendered SVG (exclude outer <svg> wrapper)
      const cleaned = svgText.replace(/<\?xml[^>]*>/, '').replace(/<!DOCTYPE[^>]*>/, '');
      const inner = cleaned
        .replace(/^[\s\S]*?<svg[^>]*>/i, '')
        .replace(/<\/svg>\s*$/i, '')
        .replace(/\n/g, '');
      const rx = (frame === 'none') ? 8 : ((frame === 'rounded' || frame === 'glow' || frame === 'shadow' || frame === 'gradient') ? 16 : (frame === 'outline' ? 10 : (frame === 'thin' ? 6 : (frame === 'thick' ? 14 : (frame === 'double' ? 12 : 0)))));
      const border = await getThemeColor('--border', '#e5e7eb');
      const accent = await getThemeColor('--accent', '#2563eb');
      const surface = await getThemeColor('--surface', '#ffffff');
      const frameStroke = (frame === 'accent') ? accent : border;
      const strokeW = (frame === 'thick' ? 6 : frame === 'accent' ? 5 : frame === 'outline' ? 3 : frame === 'double' ? 3 : frame === 'dashed' ? 3 : frame === 'gradient' ? 4 : 2);

      const defsGrad = frame === 'gradient'
        ? `<linearGradient id="grad1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${accent}"/><stop offset="50%" stop-color="#7c3aed"/><stop offset="100%" stop-color="#22c55e"/></linearGradient>`
        : '';
      const defsClip = `<clipPath id="clipR"><rect x="0" y="0" width="${outer}" height="${outer}" rx="${rx}" ry="${rx}"/></clipPath>`;
      const secondStroke = frame === 'double' ? `<rect x="6" y="6" width="${outer-12}" height="${outer-12}" rx="${Math.max(0, rx-4)}" ry="${Math.max(0, rx-4)}" fill="none" stroke="${accent}" stroke-width="2"/>` : '';
      const dashed = frame === 'dashed' ? '6,6' : 'none';
      const strokeCol = frame === 'gradient' ? 'url(#grad1)' : frameStroke;

      const wrapped = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${outer}" height="${outer}" viewBox="0 0 ${outer} ${outer}">
<defs>
${defsGrad}
${defsClip}
</defs>
<rect x="0" y="0" width="${outer}" height="${outer}" rx="${rx}" ry="${rx}" fill="${surface}"/>
<g clip-path="url(#clipR)">
  <g transform="translate(${(outer - size)/2}, ${(outer - size)/2})">${inner}</g>
</g>
<rect x="2" y="2" width="${outer-4}" height="${outer-4}" rx="${rx}" ry="${rx}" fill="none" stroke="${strokeCol}" stroke-width="${strokeW}" stroke-dasharray="${dashed}"/>
${secondStroke}
</svg>`;
      const outBlob = new Blob([wrapped], { type: 'image/svg+xml;charset=utf-8' });
      downloadBlob(outBlob, 'qr-framed.svg');
    } catch {
      try { qrRef.current?.download({ extension: 'svg', name: 'qr' }); } catch {}
    }
  }
  const resetAll = () => {
    setSize(220);
    setMargin(2);
    setEcLevel("M");
    setPerfMode(false);
    // Dots
    setDotsType("rounded");
    setDotsColor("#0b1220");
    setDotsGradientOn(false);
    setDotsGradA("#0b1220");
    setDotsGradB("#2563eb");
    // Corners
    setCornerSquareType("square");
    setCornerSquareColor("#0b1220");
    setCornerDotType("dot");
    setCornerDotColor("#0b1220");
    // Background
    setBgColor("#ffffff00");
    setBgGradientOn(false);
    setBgGradA("#ffffff");
    setBgGradB("#e2e8f0");
    setBgGradType("linear");
    // Logo
    setLogoUrl("");
    setLogoSize(0.25);
    setHideBgDots(true);
    setCrossOrigin("anonymous");
    // Frame
    setFrame("none");
  };

  const saveChanges = () => {
    if (typeof window === 'undefined') return;
    const payload = {
      size, margin, ecLevel, perfMode,
      dotsType, dotsColor, dotsGradientOn, dotsGradA, dotsGradB, dotsGradRotation,
      cornerSquareType, cornerSquareColor, cornerDotType, cornerDotColor,
      bgColor, bgGradientOn, bgGradA, bgGradB, bgGradType,
      logoUrl, logoSize, hideBgDots, crossOrigin,
      frame,
      value,
      ts: Date.now(),
    };
    try {
      window.localStorage.setItem('qrDesigner:last', JSON.stringify(payload));
    } catch {}
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
      <div className="rounded-xl glass p-4 space-y-4">
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
                  setBgColor("#ffffff00");
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
                  setBgColor("#ffffff00");
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
              <button className="btn btn-secondary h-9" onClick={() => setDotsType('rounded')}>Reset</button>
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
            <button className="btn btn-secondary h-8" onClick={() => setDotsColor("#0b1220")}>Reset colors</button>
          </div>
          <div className="space-y-2">
            <div className="text-xs font-medium text-[var(--muted)]">Background</div>
            <div className="flex gap-2 flex-wrap items-center">
              <button className="h-6 px-2 rounded border text-xs" style={{ background: 'transparent', borderColor: 'var(--border)' }} onClick={() => setBgColor('#ffffff00')}>None</button>
              {['#ffffff','#f1f5f9','#e2e8f0','#cbd5e1','#94a3b8'].map((c) => (
                <button key={c} className="h-6 w-6 rounded border" style={{ background: c, borderColor: 'var(--border)' }} onClick={() => setBgColor(c)} />
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
              <label className="text-xs">crossOrigin</label>
              <input className="h-8 rounded px-2" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }} value={crossOrigin} onChange={(e) => setCrossOrigin(e.target.value)} />
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
          <div className="text-xs font-medium text-[var(--muted)]">Frames</div>
          <div className="flex gap-2.5 flex-wrap items-center">
              {(["none","square","rounded","thin","thick","accent","shadow","outline","dashed","double","glow","gradient"] as const).map((f) => (
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
                      case 'none':
                        return { ...common, border: '1px solid var(--border)', padding: 2 } as React.CSSProperties;
                      case 'square':
                        return { ...common, border: '1px solid var(--border)' } as React.CSSProperties;
                      case 'rounded':
                        return { ...common, border: '1px solid var(--border)', borderRadius: 8 } as React.CSSProperties;
                      case 'thin':
                        return { ...common, border: '1px solid var(--border)', borderRadius: 4 } as React.CSSProperties;
                      case 'thick':
                        return { ...common, border: '3px solid color-mix(in oklab, var(--accent) 60%, var(--border))', borderRadius: 8 } as React.CSSProperties;
                      case 'accent':
                        return { ...common, border: '3px solid var(--accent)', borderRadius: 8 } as React.CSSProperties;
                      case 'shadow':
                        return { ...common, borderRadius: 8, boxShadow: '0 8px 16px rgba(0,0,0,0.18)' } as React.CSSProperties;
                      case 'outline':
                        return { ...common, borderRadius: 6, outline: '2px solid var(--border)' } as React.CSSProperties;
                      case 'dashed':
                        return { ...common, borderRadius: 8, border: '2px dashed var(--border)' } as React.CSSProperties;
                      case 'double':
                        return { ...common, borderRadius: 8, border: '2px solid var(--border)', outline: '2px solid var(--accent)', outlineOffset: 2 } as React.CSSProperties;
                      case 'glow':
                        return { ...common, borderRadius: 8, border: '1px solid var(--border)', boxShadow: '0 0 0 3px color-mix(in oklab, var(--accent) 35%, transparent)' } as React.CSSProperties;
                      case 'gradient':
                        return { ...common, borderRadius: 8, padding: 2, background: 'conic-gradient(from 0deg, var(--accent), #7c3aed, #22c55e, var(--accent))' } as React.CSSProperties;
                      default:
                        return common;
                    }
                  })()}
                />
              </button>
            ))}
            <button
              onClick={() => setFrame('none')}
              className="h-14 w-14 rounded-md border grid place-items-center tip"
              style={{ background: 'transparent', borderColor: 'var(--border)' }}
              data-tip="Reset frame (None)"
              aria-label="Reset frame (None)"
            >
              <div className="h-10 w-10 grid place-items-center" style={{ background: 'var(--surface)', borderRadius: 6 }}>
                {/* NONE sign: a ring with a slash */}
                <div style={{ position:'relative', width: 22, height: 22, borderRadius: 999, border: '2px solid var(--border)' }}>
                  <div style={{ position:'absolute', left: -2, right: -2, top: '50%', height: 2, background: 'var(--border)', transform: 'rotate(-45deg)' }} />
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
      <div className="rounded-xl glass p-5 flex flex-col gap-5 items-center">
        <div className="text-sm text-[var(--muted)] self-start">Preview</div>
        <div style={frameStyle}>
          <div
            className={`${frame === 'none' ? 'p-3' : 'p-0'} ${frame !== 'none' ? 'border-0' : ''}`}
            style={frame === 'none' ? { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8 } : { background: 'var(--surface)', borderRadius: 'inherit' }}
          >
            <div ref={containerRef} className="[&>svg]:block [&>canvas]:block" />
          </div>
        </div>
        <div className="flex flex-wrap gap-3 items-center justify-center w-full">
          <button className="btn btn-secondary h-10 px-4 tip" data-tip="Include frame" onClick={() => handleDownload("png")}>Download PNG</button>
          <button className="btn btn-secondary h-10 px-4 tip" data-tip="Include frame" onClick={() => handleDownload("svg")}>Download SVG</button>
          <button
            className="btn btn-primary h-10 px-4 tip"
            data-tip="Save current configuration"
            onClick={saveChanges}
          >
            Save changes
          </button>
          <button
            className="h-14 w-14 rounded-md border grid place-items-center tip"
            style={{ background: 'transparent', borderColor: 'var(--border)' }}
            data-tip="Reset to default"
            aria-label="Reset to default"
            onClick={() => {
              setDotsType("rounded");
              setDotsColor(prefersDark ? "#ffffff" : "#0b1220");
              setCornerSquareType("square");
              setCornerSquareColor(prefersDark ? "#ffffff" : "#0b1220");
              setCornerDotType("dot");
              setCornerDotColor(prefersDark ? "#ffffff" : "#0b1220");
              setBgColor("#ffffff00");
              setLogoUrl("");
              setLogoSize(0.25);
              setHideBgDots(true);
              setCrossOrigin("anonymous");
              setFrame("none");
              setEcLevel("M");
              setSize(220);
              setMargin(2);
            }}
          >
            <div className="h-10 w-10 grid place-items-center" style={{ background: 'var(--surface)', borderRadius: 6 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 6V3L8 7l4 4V8c2.757 0 5 2.243 5 5a5 5 0 0 1-8.535 3.535l-1.414 1.414A7 7 0 1 0 12 6z"/>
              </svg>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

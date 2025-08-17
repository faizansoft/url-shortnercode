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

  // Dots/pattern
  const [dotsType, setDotsType] = useState<DotsType>("rounded");
  const [dotsColor, setDotsColor] = useState("#0b1220");
  const [dotsGradientOn, setDotsGradientOn] = useState(false);
  const [dotsGradA, setDotsGradA] = useState("#0b1220");
  const [dotsGradB, setDotsGradB] = useState("#2563eb");
  const [dotsGradRotation, setDotsGradRotation] = useState(0);

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
  const [frame, setFrame] = useState<"none" | "rounded" | "thin" | "thick">("none");
  const [perfMode, setPerfMode] = useState<boolean>(false);
  
  // Built-in icons from public/
  const builtinIcons = useMemo(() => (
    [
      { name: "favicon", src: "/favicon.svg" },
      { name: "globe", src: "/globe.svg" },
      { name: "file", src: "/file.svg" },
      { name: "next", src: "/next.svg" },
    ] as const
  ), []);

  const onUploadIcon = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      if (result) setLogoUrl(result);
    };
    reader.readAsDataURL(file);
  };
  const frameStyle = useMemo(() => {
    switch (frame) {
      case "rounded":
        return { borderRadius: 16, padding: 10, border: "1px solid var(--border)", background: "var(--surface)" } as React.CSSProperties;
      case "thin":
        return { borderRadius: 6, padding: 6, border: "1px solid var(--border)" } as React.CSSProperties;
      case "thick":
        return { borderRadius: 12, padding: 14, border: "2px solid color-mix(in oklab, var(--accent) 60%, var(--border))" } as React.CSSProperties;
      default:
        return {} as React.CSSProperties;
    }
  }, [frame]);

  // Build options for qr-code-styling
  const options = useMemo<QRStyleOptions>(() => {
    const useDotsGradient = dotsGradientOn && !perfMode;
    const useBgGradient = bgGradientOn && !perfMode;
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
      type: "svg",
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
  }, [value, size, margin, ecLevel, dotsType, dotsColor, dotsGradientOn, dotsGradA, dotsGradB, dotsGradRotation, cornerSquareType, cornerSquareColor, cornerDotType, cornerDotColor, bgColor, bgGradientOn, bgGradA, bgGradB, bgGradType, logoUrl, logoSize, hideBgDots, crossOrigin, perfMode]);

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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
      <div className="rounded-xl glass p-4 space-y-4">
        {/* Presets & performance */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--muted)]">Performance mode</span>
            <input type="checkbox" checked={perfMode} onChange={(e) => setPerfMode(e.target.checked)} />
          </div>
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
                  setCornerDotType("square");
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

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <div className="text-xs font-medium text-[var(--muted)]">Dots style</div>
            <select className="w-full h-9 rounded-md px-2" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }} value={dotsType} onChange={(e) => setDotsType(e.target.value as DotsType)}>
              <option value="dots">dots</option>
              <option value="rounded">rounded</option>
              <option value="classy">classy</option>
              <option value="classy-rounded">classy-rounded</option>
              <option value="square">square</option>
              <option value="extra-rounded">extra-rounded</option>
            </select>
          </div>
          <div className="space-y-2">
            <div className="text-xs font-medium text-[var(--muted)]">Error correction</div>
            <select className="w-full h-9 rounded-md px-2" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }} value={ecLevel} onChange={(e) => setEcLevel(e.target.value as "L" | "M" | "Q" | "H")}>
              <option value="L">L (7%)</option>
              <option value="M">M (15%)</option>
              <option value="Q">Q (25%)</option>
              <option value="H">H (30%)</option>
            </select>
          </div>
          <div className="space-y-2">
            <div className="text-xs font-medium text-[var(--muted)]">Size</div>
            <input type="range" min={160} max={480} value={size} onChange={(e) => setSize(parseInt(e.target.value))} />
          </div>
          <div className="space-y-2">
            <div className="text-xs font-medium text-[var(--muted)]">Margin</div>
            <input type="range" min={0} max={12} value={margin} onChange={(e) => setMargin(parseInt(e.target.value))} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <div className="text-xs font-medium text-[var(--muted)]">Dots color</div>
            <div className="flex gap-2 flex-wrap">
              {palette.map((c) => (
                <button key={c} className="h-6 w-6 rounded-full border" style={{ background: c, borderColor: 'var(--border)' }} onClick={() => setDotsColor(c)} />
              ))}
            </div>
            <label className="text-xs">Custom</label>
            <input type="color" value={dotsColor} onChange={(e) => setDotsColor(e.target.value)} />
            <div className="mt-2">
              <div className="text-xs font-medium text-[var(--muted)] mb-1">Brand palettes</div>
              <div className="flex flex-wrap gap-2">
                {([
                  {n:"Indigo", d:"#4f46e5", b:"#eef2ff"},
                  {n:"Emerald", d:"#10b981", b:"#ecfdf5"},
                  {n:"Amber", d:"#f59e0b", b:"#fffbeb"}
                ] as const).map((bp) => (
                  <button key={bp.n} className="btn btn-secondary h-8" onClick={() => { setDotsColor(bp.d); setBgColor(bp.b + "00"); }}>
                    {bp.n}
                  </button>
                ))}
              </div>
            </div>
            <label className="inline-flex items-center gap-2 text-xs mt-2">
              <input type="checkbox" checked={dotsGradientOn} onChange={(e) => setDotsGradientOn(e.target.checked)} /> Gradient
            </label>
            {dotsGradientOn && (
              <div className="grid grid-cols-3 gap-2 items-center mt-2">
                <input type="color" value={dotsGradA} onChange={(e) => setDotsGradA(e.target.value)} />
                <input type="color" value={dotsGradB} onChange={(e) => setDotsGradB(e.target.value)} />
                <input type="range" min={0} max={360} value={dotsGradRotation} onChange={(e) => setDotsGradRotation(parseInt(e.target.value))} />
              </div>
            )}
          </div>
          <div className="space-y-2">
            <div className="text-xs font-medium text-[var(--muted)]">Background</div>
            <input className="w-32" type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} />
            <label className="block text-xs mt-2">Gradient</label>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={bgGradientOn} onChange={(e) => setBgGradientOn(e.target.checked)} />
              <select className="h-8 rounded px-2" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }} value={bgGradType} onChange={(e) => setBgGradType(e.target.value as BgGradType)}>
                <option value="linear">linear</option>
                <option value="radial">radial</option>
              </select>
            </div>
            {bgGradientOn && (
              <div className="grid grid-cols-2 gap-2 mt-2">
                <input type="color" value={bgGradA} onChange={(e) => setBgGradA(e.target.value)} />
                <input type="color" value={bgGradB} onChange={(e) => setBgGradB(e.target.value)} />
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <div className="text-xs font-medium text-[var(--muted)]">Corners</div>
            <div className="grid grid-cols-2 gap-2">
              <select className="h-9 rounded px-2" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }} value={cornerSquareType} onChange={(e) => setCornerSquareType(e.target.value as "square" | "dot" | "extra-rounded")}>
                <option value="square">square</option>
                <option value="dot">dot</option>
                <option value="extra-rounded">extra-rounded</option>
              </select>
              <input className="h-9" type="color" value={cornerSquareColor} onChange={(e) => setCornerSquareColor(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select className="h-9 rounded px-2" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }} value={cornerDotType} onChange={(e) => setCornerDotType(e.target.value as "dot" | "square")}>
                <option value="dot">dot</option>
                <option value="square">square</option>
              </select>
              <input className="h-9" type="color" value={cornerDotColor} onChange={(e) => setCornerDotColor(e.target.value)} />
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
        <div className="flex gap-2">
          {(["none","rounded","thin","thick"] as const).map((f) => (
            <button key={f} onClick={() => setFrame(f)} className={`btn btn-secondary h-8 ${frame===f? 'ring-1 ring-[var(--accent)]' : ''}`}>{f}</button>
          ))}
        </div>
        <button className="btn btn-secondary h-9" onClick={() => qrRef.current?.download({ extension: "png", name: "qr" })}>Download PNG</button>
        <button className="btn btn-secondary h-9" onClick={() => qrRef.current?.download({ extension: "svg", name: "qr" })}>Download SVG</button>
      </div>

      <div className="rounded-xl glass p-4 flex flex-col gap-3 items-center">
        <div className="text-sm text-[var(--muted)] self-start">Preview</div>
        <div style={frameStyle}>
          <div ref={containerRef} className="[&>svg]:block" />
        </div>
      </div>
    </div>
  );
}

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
        return { borderRadius: 6, padding: 0, border: "1px solid var(--border)", overflow: "hidden" } as React.CSSProperties;
      case "thick":
        return { borderRadius: 12, padding: 0, border: "2px solid color-mix(in oklab, var(--accent) 60%, var(--border))", overflow: "hidden" } as React.CSSProperties;
      case "square":
        return { borderRadius: 0, padding: 0, border: "1px solid var(--border)", background: "var(--surface)", overflow: "hidden" } as React.CSSProperties;
      case "accent":
        return { borderRadius: 10, padding: 0, border: "3px solid var(--accent)", background: "transparent", overflow: "hidden" } as React.CSSProperties;
      case "shadow":
        return { borderRadius: 12, padding: 0, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", background: "var(--surface)", overflow: "hidden" } as React.CSSProperties;
      case "outline":
        return { borderRadius: 8, padding: 0, outline: "2px solid var(--border)", outlineOffset: 0, overflow: "hidden" } as React.CSSProperties;
      case "dashed":
        return { borderRadius: 8, padding: 0, border: "2px dashed var(--border)", background: "transparent", overflow: "hidden" } as React.CSSProperties;
      case "double":
        return { borderRadius: 10, padding: 0, border: "2px solid var(--border)", outline: "2px solid var(--accent)", outlineOffset: 2, background: "transparent", overflow: "hidden" } as React.CSSProperties;
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

        {/* Select styles */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <div className="text-xs font-medium text-[var(--muted)]">Patterns</div>
            <div className="flex flex-wrap gap-2.5 items-center">
              {(["square","rounded","dots","classy","classy-rounded","extra-rounded"] as DotsType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setDotsType(t)}
                  className={`h-14 w-14 rounded-md border grid place-items-center ${dotsType===t? 'ring-2 ring-[var(--accent)]' : ''}`}
                  style={{ background: 'transparent', borderColor: 'var(--border)' }}
                  title={t}
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
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2.5">
                {(["square","dot","extra-rounded"] as const).map((t) => (
                  <button key={t} className={`h-10 px-4 rounded border text-xs transition ${cornerSquareType===t? 'ring-1 ring-[var(--accent)] bg-[var(--panel)]' : ''}`} style={{ background: 'var(--surface)', borderColor: 'var(--border)' }} onClick={() => setCornerSquareType(t)}>{t}</button>
                ))}
              </div>
              <div className="flex gap-2 flex-wrap items-center">
                {palette.map((c) => (
                  <button key={c} className="h-6 w-6 rounded border" style={{ background: c, borderColor: 'var(--border)' }} onClick={() => setCornerSquareColor(c)} />
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2.5">
                {(["dot","square"] as const).map((t) => (
                  <button key={t} className={`h-10 px-4 rounded border text-xs transition ${cornerDotType===t? 'ring-1 ring-[var(--accent)] bg-[var(--panel)]' : ''}`} style={{ background: 'var(--surface)', borderColor: 'var(--border)' }} onClick={() => setCornerDotType(t)}>{t}</button>
                ))}
              </div>
              <div className="flex gap-2 flex-wrap items-center">
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
                className={`h-14 w-14 rounded-md border grid place-items-center ${frame===f? 'ring-2 ring-[var(--accent)]' : ''}`}
                style={{ background: 'transparent', borderColor: 'var(--border)' }}
                title={f}
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
            <button className="btn btn-secondary h-9" onClick={() => setFrame('none')}>Reset frame</button>
          </div>
        </div>
      </div>
      <div className="rounded-xl glass p-5 flex flex-col gap-5 items-center">
        <div className="text-sm text-[var(--muted)] self-start">Preview</div>
        <div style={frameStyle}>
          <div
            className={`rounded-md ${frame === 'none' ? 'p-3' : 'p-0'} ${frame !== 'none' ? 'border-0' : ''}`}
            style={frame === 'none' ? { background: 'var(--surface)', border: '1px solid var(--border)' } : { background: 'transparent' }}
          >
            <div ref={containerRef} className="[&>svg]:block [&>canvas]:block" />
          </div>
        </div>
        <div className="flex flex-wrap gap-3 items-center justify-center w-full">
          <button className="btn btn-secondary h-10 px-4" onClick={() => qrRef.current?.download({ extension: "png", name: "qr" })}>Download PNG</button>
          <button className="btn btn-secondary h-10 px-4" onClick={() => qrRef.current?.download({ extension: "svg", name: "qr" })}>Download SVG</button>
          <button
            className="btn btn-secondary h-10 px-4 flex items-center gap-2"
            title="Reset to default"
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
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 6V3L8 7l4 4V8c2.757 0 5 2.243 5 5a5 5 0 0 1-8.535 3.535l-1.414 1.414A7 7 0 1 0 12 6z"/></svg>
            <span>Reset to default</span>
          </button>
        </div>
      </div>
    </div>
  );
}

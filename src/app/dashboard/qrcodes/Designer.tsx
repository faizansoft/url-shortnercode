"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import QRCodeStyling, { type Options as QRStyleOptions } from "qr-code-styling";
import { supabaseClient } from "@/lib/supabaseClient";
// Explicit local helper types to satisfy TS
type DotsOpts = NonNullable<QRStyleOptions["dotsOptions"]>;
type BgOpts = NonNullable<QRStyleOptions["backgroundOptions"]>;

// Saved options persisted in backend/local storage
type CornerSquareType = "dot" | "square" | "extra-rounded";
type CornerDotType = "dot" | "square";
interface SavedOptions {
  size?: number;
  margin?: number;
  ecLevel?: "L" | "M" | "Q" | "H";
  perfMode?: boolean;
  dotsType?: DotsType;
  dotsColor?: string;
  dotsGradientOn?: boolean;
  dotsGradA?: string;
  dotsGradB?: string;
  dotsGradRotation?: number;
  cornerSquareType?: CornerSquareType;
  cornerSquareColor?: string;
  cornerDotType?: CornerDotType;
  cornerDotColor?: string;
  bgColor?: string;
  bgGradientOn?: boolean;
  bgGradA?: string;
  bgGradB?: string;
  bgGradType?: BgGradType;
  logoUrl?: string;
  logoSize?: number;
  hideBgDots?: boolean;
  value?: string;
  ts?: number;
}

function isSavedOptions(x: unknown): x is SavedOptions {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  // Check a few representative fields for shape without being overly strict
  const isUndefOrNull = (v: unknown) => v === undefined || v === null;
  const okNum = (k: string) => isUndefOrNull(o[k]) || typeof o[k] === 'number';
  const okStr = (k: string) => isUndefOrNull(o[k]) || typeof o[k] === 'string';
  if (!okNum('size') || !okNum('margin') || !okStr('dotsColor') || !okStr('bgColor')) return false;
  if (!okStr('logoUrl') || !okNum('logoSize')) return false;
  return true;
}
type DotsType = "dots" | "rounded" | "classy" | "classy-rounded" | "square" | "extra-rounded";
type BgGradType = "linear" | "radial";

// (removed) logo auto-sizing and transparent background helpers

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
  const [kick, setKick] = useState<number>(0);
  // (removed) data URL cache and CORS inlining logic

  // Core options
  const [size, setSize] = useState(220);
  const [margin, setMargin] = useState(2);
  const [ecLevel, setEcLevel] = useState<"L" | "M" | "Q" | "H">("M");
  // Removed dark mode tracking (not used)

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
  
  // Save status UI
  const [saveState, setSaveState] = useState<'idle'|'saving'|'success'|'error'>('idle');
  const [saveNote, setSaveNote] = useState<string>('');

  // (removed) frame/border feature
  const [perfMode, setPerfMode] = useState<boolean>(false);
  // (removed) export notices related to CORS/logo embedding
  
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

  // Theme detection removed

  const onUploadIcon = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      if (result) setLogoUrl(result);
    };
    reader.readAsDataURL(file);
  };

  // (removed) auto logo size logic

  // Convert a URL (same-origin recommended) to a data URL for reliable embedding inside SVG
  async function toDataUrl(src: string): Promise<string | null> {
    try {
      const res = await fetch(src, { cache: 'force-cache' });
      if (!res.ok) return null;
      const blob = await res.blob();
      return await new Promise<string>((resolve, reject) => {
        const fr = new FileReader();
        fr.onerror = () => reject(new Error('failed to read blob'));
        fr.onload = () => resolve(typeof fr.result === 'string' ? fr.result : '');
        fr.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  }

  // Generate a small PNG thumbnail (e.g., 256px) from current SVG
  async function buildThumbnailPngBlob(): Promise<Blob | null> {
    const svgText = await buildCombinedSVG();
    const svgBlob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    try {
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      img.src = url;
      await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = rej; });
      const sizePx = 256; // thumbnail target
      const canvas = document.createElement('canvas');
      canvas.width = sizePx; canvas.height = sizePx;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      ctx.imageSmoothingEnabled = false;
      ctx.imageSmoothingQuality = 'low';
      ctx.drawImage(img, 0, 0, sizePx, sizePx);
      return await canvasToPngBlob(canvas);
    } catch {
      return null;
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  async function selectBuiltinLogo(src: string) {
    // Prefer inlining as data URL to avoid cross-resource SVG image embedding issues
    const inlined = await toDataUrl(src);
    setLogoUrl(inlined || src);
  }

  function isDataUrl(u: string) { return typeof u === 'string' && u.startsWith('data:'); }

  // If a non-data URL logo is present, try to inline it for reliable preview
  const inliningLockRef = useRef<string | null>(null);
  useEffect(() => {
    (async () => {
      const u = logoUrl;
      if (!u || isDataUrl(u)) return;
      if (inliningLockRef.current === u) return;
      inliningLockRef.current = u;
      const inlined = await toDataUrl(u);
      if (inlined) setLogoUrl(inlined);
    })();
  }, [logoUrl]);

  // (previewInnerStyle removed – unused)

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
      margin: margin,
      type: 'svg',
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

  // Load saved options for this short code on first mount (with localStorage fallback)
  useEffect(() => {
    (async () => {
      try {
        let short_code = '';
        try {
          const u = new URL(value);
          short_code = (u.pathname || '').replace(/^\//, '');
        } catch {
          // value might be a relative path like "/abc123" or just "abc123"
          const v = String(value || '').trim();
          short_code = v.replace(/^https?:\/\//, '').replace(/^[^/]*\//, '').replace(/^\//, '');
          if (!short_code && v) {
            const parts = v.split('/').filter(Boolean);
            short_code = parts[parts.length - 1] || '';
          }
        }
        if (!short_code) return;
        let o: unknown = null;
        try {
          const { data } = await supabaseClient.auth.getSession();
          const token = data.session?.access_token;
          if (token) {
            const res = await fetch(`/api/qr?code=${encodeURIComponent(short_code)}`, { headers: { Authorization: `Bearer ${token}` } });
            if (res.ok) {
              const json = await res.json();
              o = json?.options ?? null;
            }
          }
        } catch {}
        // Fallback to per-code local draft, then last global draft
        if (!o) {
          try {
            const specific = window.localStorage.getItem(`qrDesigner:${short_code}`);
            if (specific) o = JSON.parse(specific);
          } catch {}
        }
        if (!o) {
          try {
            const raw = window.localStorage.getItem('qrDesigner:last');
            if (raw) o = JSON.parse(raw);
          } catch {}
        }
        if (!isSavedOptions(o)) return;
        // Apply all saved values safely, suppressing intermediate updates
        suppressUpdateRef.current = true;
        try {
          if (Number.isFinite(o.size)) setSize(Number(o.size));
          if (Number.isFinite(o.margin)) setMargin(Math.max(0, Number(o.margin)));
          if (o.ecLevel === 'L' || o.ecLevel === 'M' || o.ecLevel === 'Q' || o.ecLevel === 'H') setEcLevel(o.ecLevel);
          if (typeof o.perfMode === 'boolean') setPerfMode(!!o.perfMode);

          if (typeof o.dotsType === 'string') setDotsType(o.dotsType);
          if (typeof o.dotsColor === 'string') setDotsColor(o.dotsColor);
          if (typeof o.dotsGradientOn === 'boolean') setDotsGradientOn(o.dotsGradientOn);
          if (typeof o.dotsGradA === 'string') setDotsGradA(o.dotsGradA);
          if (typeof o.dotsGradB === 'string') setDotsGradB(o.dotsGradB);

          if (typeof o.cornerSquareType === 'string') setCornerSquareType(o.cornerSquareType);
          if (typeof o.cornerSquareColor === 'string') setCornerSquareColor(o.cornerSquareColor);
          if (typeof o.cornerDotType === 'string') setCornerDotType(o.cornerDotType);
          if (typeof o.cornerDotColor === 'string') setCornerDotColor(o.cornerDotColor);

          if (typeof o.bgColor === 'string') setBgColor(o.bgColor);
          if (typeof o.bgGradientOn === 'boolean') setBgGradientOn(o.bgGradientOn);
          if (typeof o.bgGradA === 'string') setBgGradA(o.bgGradA);
          if (typeof o.bgGradB === 'string') setBgGradB(o.bgGradB);
          if (o.bgGradType === 'linear' || o.bgGradType === 'radial') setBgGradType(o.bgGradType);

          if (typeof o.logoUrl === 'string') setLogoUrl(o.logoUrl);
          if (Number.isFinite(o.logoSize)) setLogoSize(Math.max(0.1, Math.min(0.45, Number(o.logoSize))));
          if (typeof o.hideBgDots === 'boolean') setHideBgDots(!!o.hideBgDots);
        } finally {
          requestAnimationFrame(() => {
            suppressUpdateRef.current = false;
            // Force one more update after the batch so preview reflects loaded options
            setKick((k) => k + 1);
          });
        }
      } catch {}
    })();
  }, [value]);

  // Update on options change, but allow temporary suppression to avoid flicker during batched resets
  useEffect(() => {
    if (suppressUpdateRef.current) return;
    qrRef.current?.update(options);
  }, [options]);

  // One-shot updater triggered after loading saved options finishes
  useEffect(() => {
    if (!kick) return;
    if (suppressUpdateRef.current) return;
    try { qrRef.current?.update(options); } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kick]);

  // Build a fresh SVG of the QR only (no frame) without using the live preview DOM
  async function buildCombinedSVG(): Promise<string> {
    // Render QR as SVG with current options and return the serialized SVG as-is
    const tempOpts: QRStyleOptions = { ...options, width: size, height: size, type: 'svg' };
    const tmp = new QRCodeStyling(tempOpts);
    const tmpDiv = document.createElement('div');
    tmp.append(tmpDiv);
    let svgNode: SVGSVGElement | null = null;
    for (let i = 0; i < 10; i++) {
      await new Promise<void>((r) => requestAnimationFrame(() => r()));
      svgNode = tmpDiv.querySelector('svg');
      if (svgNode) break;
      await new Promise((r) => setTimeout(r, 20));
    }
    if (svgNode) {
      let svgText = new XMLSerializer().serializeToString(svgNode);
      svgText = svgText.replace(/<\?xml[^>]*>/, '').replace(/<!DOCTYPE[^>]*>/, '');
      return svgText;
    }
    // fallback: empty minimal svg of expected size
    return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"></svg>`;
  }

  async function handleDownload(ext: 'png' | 'svg') {
    const pad = 0;
    const outer = size + pad * 2;
    // Ensure latest options are applied before we read states (not the DOM)
    try { qrRef.current?.update(options); } catch {}
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    const baseName = safeFileNameFromUrl(value);

    if (ext === 'svg') {
      const wrapped = await buildCombinedSVG();
      const outBlob = new Blob([wrapped], { type: 'image/svg+xml;charset=utf-8' });
      downloadBlob(outBlob, `${baseName}.svg`);
      return;
    }

    // PNG export: rasterize our combined SVG (not the preview) to a canvas
    const wrapped = await buildCombinedSVG();
    const svgBlob = new Blob([wrapped], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    // High-resolution export: upscale significantly, but cap sensibly
    const exportOuter = Math.min(4096, Math.max(1024, outer * 6));
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.src = url;
    await new Promise((res, rej) => { img.onload = () => res(null); img.onerror = rej; });
    const canvas = document.createElement('canvas');
    canvas.width = exportOuter; canvas.height = exportOuter;
    const ctx = canvas.getContext('2d');
    if (!ctx) { URL.revokeObjectURL(url); return; }
    ctx.imageSmoothingEnabled = false; // keep QR edges crisp
    ctx.imageSmoothingQuality = 'low';
    ctx.drawImage(img, 0, 0, exportOuter, exportOuter);
    const blob = await canvasToPngBlob(canvas);
    if (blob) downloadBlob(blob, `${baseName}.png`);
    URL.revokeObjectURL(url);
    return;
  }

  // Build a filesystem-safe filename from the full shortlink
  function safeFileNameFromUrl(urlStr: string): string {
    let raw = urlStr || 'qr';
    try {
      const u = new URL(urlStr);
      // keep hostname + pathname + search if any; include scheme for uniqueness
      raw = `${u.protocol}//${u.host}${u.pathname}${u.search}` || urlStr;
    } catch {
      // not a URL, use as-is
    }
    // replace characters not suitable for filenames
    const cleaned = raw
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 180); // keep it reasonable
    return cleaned || 'qr';
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

  // (removed unused drawRoundedRect)

  // Convert data URL to Blob
  function dataUrlToBlob(dataUrl: string): { blob: Blob; mime: string } | null {
    try {
      const m = /^data:([^;,]+);base64,(.*)$/i.exec(dataUrl);
      if (!m) return null;
      const mime = m[1];
      const b64 = m[2];
      const bin = atob(b64);
      const len = bin.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
      return { blob: new Blob([bytes], { type: mime }), mime };
    } catch {
      return null;
    }
  }

  function downloadBlob(blob: Blob, name: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }
  // (removed unused resetAll)

  const saveChanges = async () => {
    if (typeof window === 'undefined') return;
    setSaveState('saving');
    setSaveNote('');
    // Resolve short_code from value (robust)
    let short_code = '';
    try {
      const u = new URL(value);
      short_code = (u.pathname || '').replace(/^\//, '');
    } catch {
      const v = String(value || '').trim();
      short_code = v.replace(/^https?:\/\//, '').replace(/^[^/]*\//, '').replace(/^\//, '');
      if (!short_code && v) {
        const parts = v.split('/').filter(Boolean);
        short_code = parts[parts.length - 1] || '';
      }
    }

    // Upload base64 logo to Supabase Storage and use public URL
    let finalLogoUrl = logoUrl;
    try {
      const { data: sess } = await supabaseClient.auth.getSession();
      const userId = sess.session?.user?.id || '';
      if (userId && short_code && isDataUrl(logoUrl)) {
        const conv = dataUrlToBlob(logoUrl);
        if (conv) {
          const { blob, mime } = conv;
          const ext = mime.includes('svg') ? 'svg' : mime.includes('jpeg') ? 'jpg' : mime.includes('png') ? 'png' : 'bin';
          const path = `logos/${userId}/${short_code}-${Date.now()}.${ext}`;
          const bucket = 'qr-logos';
          const up = await supabaseClient.storage.from(bucket).upload(path, blob, { upsert: true, contentType: mime });
          if (!up.error) {
            const pub = supabaseClient.storage.from(bucket).getPublicUrl(path);
            const pubUrl = (pub && pub.data && typeof pub.data.publicUrl === 'string') ? pub.data.publicUrl : '';
            if (pubUrl) finalLogoUrl = pubUrl;
          }
        }
      }
    } catch {
      // ignore upload issues; fallback to existing logoUrl
    }

    // Try to build and upload a thumbnail image to Supabase Storage
    let thumbnailUrl: string | undefined = undefined;
    try {
      const thumbBlob = await buildThumbnailPngBlob();
      if (thumbBlob) {
        const { data: sess2 } = await supabaseClient.auth.getSession();
        const userId2 = sess2.session?.user?.id || '';
        if (userId2 && short_code) {
          const bucketT = 'qr-thumbs';
          const pathT = `thumbs/${userId2}/${short_code}.png`; // stable path per code
          const upT = await supabaseClient.storage.from(bucketT).upload(pathT, thumbBlob, { upsert: true, contentType: 'image/png', cacheControl: '3600' });
          if (!upT.error) {
            const pub = supabaseClient.storage.from(bucketT).getPublicUrl(pathT);
            const pubUrl = (pub && pub.data && typeof pub.data.publicUrl === 'string') ? pub.data.publicUrl : '';
            if (pubUrl) {
              // Bust caches with timestamp param
              thumbnailUrl = `${pubUrl}?v=${Date.now()}`;
            }
          }
        }
      }
    } catch {
      // ignore thumbnail failures
    }

    const payload = {
      size, margin, ecLevel, perfMode,
      dotsType, dotsColor, dotsGradientOn, dotsGradA, dotsGradB, dotsGradRotation,
      cornerSquareType, cornerSquareColor, cornerDotType, cornerDotColor,
      bgColor, bgGradientOn, bgGradA, bgGradB, bgGradType,
      logoUrl: finalLogoUrl, logoSize, hideBgDots,
      value,
      ts: Date.now(),
      ...(thumbnailUrl ? { thumbnailUrl } : {}),
    };
    // Persist locally as a fallback
    try {
      window.localStorage.setItem('qrDesigner:last', JSON.stringify(payload));
      try {
        if (short_code) window.localStorage.setItem(`qrDesigner:${short_code}`, JSON.stringify(payload));
      } catch {}
    } catch {}

    // Persist to backend (qr_styles upsert)
    try {
      if (!short_code) return;
      const { data } = await supabaseClient.auth.getSession();
      const token = data.session?.access_token;
      if (!token) return;
      const res = await fetch('/api/qr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ short_code, options: payload }),
      });
      if (res.ok) {
        setSaveState('success');
        setSaveNote('QR design saved successfully.');
        // Auto-hide success message after a short delay
        window.setTimeout(() => { setSaveState('idle'); setSaveNote(''); }, 2000);
      } else {
        setSaveState('error');
        setSaveNote('Failed to save changes.');
      }
    } catch (e) {
      // silent fail; could show toast
      console.error('Failed to save QR style', e);
      setSaveState('error');
      setSaveNote('Failed to save changes.');
    }
  };

  return (
    <div className="h-full grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-5 lg:gap-6 overflow-hidden">
      <div className="rounded-xl glass border border-[var(--border)] p-5 space-y-5 lg:space-y-6 h-full overflow-y-auto scrollbar">
        {/* Top bar: performance and reset all */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--muted)]">Performance mode</span>
            <input type="checkbox" checked={perfMode} onChange={(e) => setPerfMode(e.target.checked)} />
          </div>
          {/* Removed 'Reset all' button as per request */}
        </div>

        

        {/* Select styles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="text-xs font-medium text-[var(--muted)]">Patterns</div>
            <div className="flex flex-wrap gap-2.5 items-center">
              {(["square","rounded","dots","classy","classy-rounded","extra-rounded"] as DotsType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setDotsType(t)}
                  className={`h-14 w-14 rounded-md border grid place-items-center ${dotsType===t? 'outline outline-2 outline-[var(--accent)] outline-offset-2' : ''} tip`}
                  style={{ background: 'transparent', borderColor: 'var(--border)' }}
                  data-tip={t}
                >
                  <div className="grid grid-cols-5 grid-rows-5 gap-[2px] p-2 bg-[var(--surface)] rounded-md">
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
                <button key={lvl} className={`h-10 px-4 rounded border text-xs transition ${ecLevel===lvl? 'outline outline-2 outline-[var(--accent)] outline-offset-2 bg-[var(--panel)]' : ''}`} style={{ background: 'var(--surface)', borderColor: 'var(--border)' }} onClick={() => setEcLevel(lvl)}>
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
              {[...(palette.includes(dotsColor) ? [] : [dotsColor]), ...palette].map((c) => (
                <button
                  key={c}
                  className={`h-6 w-6 rounded-full border ${dotsColor===c ? 'outline outline-2 outline-[var(--accent)] outline-offset-2' : ''}`}
                  style={{ background: c, borderColor: 'var(--border)' }}
                  onClick={() => setDotsColor(c)}
                  aria-pressed={dotsColor===c}
                  aria-label={`Code color ${c}`}
                />
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-xs font-medium text-[var(--muted)]">Background</div>
            <div className="flex gap-2 flex-wrap items-center">
              {['#ffffff','#f1f5f9','#e2e8f0','#cbd5e1','#94a3b8'].map((c) => (
                <button
                  key={c}
                  className={`h-6 w-6 rounded border ${bgColor===c ? 'outline outline-2 outline-[var(--accent)] outline-offset-2' : ''}`}
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
                  className={`h-14 w-14 rounded-md border grid place-items-center ${cornerSquareType===sq && cornerDotType===dot ? 'outline outline-2 outline-[var(--accent)] outline-offset-2' : ''} tip`}
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
                      className={`h-14 w-14 rounded-md border grid place-items-center ${cornerSquareType===sq && cornerDotType===dot && cornerSquareColor===sc && cornerDotColor===dc ? 'outline outline-2 outline-[var(--accent)] outline-offset-2' : ''} tip`}
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
                  <button
                    key={c}
                    className={`h-6 w-6 rounded border ${cornerSquareColor===c ? 'outline outline-2 outline-[var(--accent)] outline-offset-2' : ''}`}
                    style={{ background: c, borderColor: 'var(--border)' }}
                    onClick={() => setCornerSquareColor(c)}
                    aria-pressed={cornerSquareColor===c}
                    aria-label={`Outer corner color ${c}`}
                  />
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex gap-2 flex-wrap items-center">
                <div className="w-full text-xs text-[var(--muted)]">Inner corner color</div>
                {palette.map((c) => (
                  <button
                    key={c}
                    className={`h-6 w-6 rounded border ${cornerDotColor===c ? 'outline outline-2 outline-[var(--accent)] outline-offset-2' : ''}`}
                    style={{ background: c, borderColor: 'var(--border)' }}
                    onClick={() => setCornerDotColor(c)}
                    aria-pressed={cornerDotColor===c}
                    aria-label={`Inner corner color ${c}`}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-xs font-medium text-[var(--muted)]">Logo</div>
            <input className="w-full h-9 rounded px-2" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }} placeholder="https://…/logo.png" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} />
            <div className="grid grid-cols-2 gap-2 items-center">
              <label className="text-xs">Size</label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={0.1}
                  max={0.45}
                  step={0.01}
                  disabled={!logoUrl}
                  value={logoSize}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    setLogoSize(Math.min(0.45, Math.max(0.1, isNaN(v) ? logoSize : v)));
                  }}
                />
                <span className="text-xs tabular-nums" style={{ color: 'var(--muted)' }}>{Math.round(logoSize*100)}%</span>
              </div>
              <label className="text-xs">Hide bg dots</label>
              <input type="checkbox" checked={hideBgDots} onChange={(e) => setHideBgDots(e.target.checked)} />
            </div>
            <div className="mt-2">
              <div className="text-xs font-medium text-[var(--muted)] mb-1">Pick an icon</div>
              <div className="flex flex-wrap gap-2">
                {builtinIcons.map(icon => (
                <button key={icon.name} className={`h-9 px-2 rounded border flex items-center gap-2 ${logoUrl===icon.src? 'outline outline-2 outline-[var(--accent)] outline-offset-2' : ''}`} style={{ background: 'var(--surface)', borderColor: 'var(--border)' }} onClick={() => selectBuiltinLogo(icon.src)}>
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
        {/* (removed) Borders section */}
      </div>
      <div className={`glass rounded-xl border border-[var(--border)] p-5 flex flex-col gap-5 items-center h-full overflow-hidden`}>
        <div className="text-sm text-[var(--muted)] self-start">Preview</div>
        <div className={`p-3 sm:p-4 md:p-5 rounded-xl border border-[var(--border)] bg-white w-full flex-1 grid place-items-center`}>
          <div ref={containerRef} className="[&>svg]:block [&>canvas]:block" />
        </div>
        {/* (removed) export notice UI */}
        <div className="pt-2 flex flex-wrap gap-3 items-center justify-center w-full">
          <button className="btn btn-secondary h-10 px-4" onClick={() => handleDownload("png")}>
            Download PNG
          </button>
          <button className="btn btn-secondary h-10 px-4" onClick={() => handleDownload("svg")}>
            Download SVG
          </button>
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
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 6V3L8 7l4 4V8c2.757 0 5 2.243 5 5a5 5 0 0 1-8.535 3.535l-1.414 1.414A7 7 0 1 0 12 6z"/>
            </svg>
            <span>Reset to Default</span>
          </button>
          <div className="flex items-center gap-3">
            <button
              className="btn btn-primary h-10 px-4 tip disabled:opacity-60 disabled:cursor-not-allowed"
              data-tip="Save current configuration"
              onClick={saveChanges}
              disabled={saveState==='saving'}
            >
              {saveState==='saving' ? 'Saving…' : 'Save changes'}
            </button>
            {saveState==='success' && (
              <span className="text-xs text-green-600">{saveNote}</span>
            )}
            {saveState==='error' && (
              <span className="text-xs text-red-600">{saveNote}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import QRCode from "qrcode";
import { supabaseClient } from "@/lib/supabaseClient";
import type QRCodeStyling from "qr-code-styling";
import type { Options as StyleOptions } from "qr-code-styling";
// Designer is intentionally not embedded here; customization will open on demand in a modal

type LinkRow = { short_code: string; target_url: string; created_at: string };

type QRItem = LinkRow & { short_url: string; qr_data_url: string | null };

type CustomDesignOptions = {
  size: number;
  margin: number;
  ecl: "L" | "M" | "Q" | "H";
  dotType: "square"|"dots"|"rounded"|"classy"|"classy-rounded"|"extra-rounded";
  dotColorMode: "single"|"linear";
  dotColorA: string;
  dotColorB: string;
  dotRotation: number;
  cornerSqType: "square"|"dot"|"extra-rounded";
  cornerSqColor: string;
  cornerDotType: "square"|"dot";
  cornerDotColor: string;
  bgColor: string;
  logoDataUrl?: string;
  logoSize: number;
  logoMargin: number;
  hideBgDots: boolean;
};

export default function QRCodesPage() {
  const [items, setItems] = useState<QRItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string>("");
  const [prefersDark, setPrefersDark] = useState<boolean>(false);
  const [showCustomize, setShowCustomize] = useState<boolean>(false);
  // Basic options
  const [size, setSize] = useState<number>(220);
  const [margin, setMargin] = useState<number>(1);
  const [ecl, setEcl] = useState<"L" | "M" | "Q" | "H">("M");
  // Dot styles (no gradients)
  const [dotType, setDotType] = useState<"square"|"dots"|"rounded"|"classy"|"classy-rounded"|"extra-rounded">("square");
  const [dotColorA, setDotColorA] = useState<string>("#ffffff");
  // Corners
  const [cornerSqType, setCornerSqType] = useState<"square"|"dot"|"extra-rounded">("square");
  const [cornerSqColor, setCornerSqColor] = useState<string>("#ffffff");
  const [cornerDotType, setCornerDotType] = useState<"square"|"dot">("square");
  const [cornerDotColor, setCornerDotColor] = useState<string>("#ffffff");
  // Background
  const [bgColor, setBgColor] = useState<string>("#ffffff");
  // Logo
  const [logoDataUrl, setLogoDataUrl] = useState<string | undefined>(undefined);
  const [logoSize, setLogoSize] = useState<number>(0.25); // 0..1
  const [logoMargin, setLogoMargin] = useState<number>(2);
  const [hideBgDots, setHideBgDots] = useState<boolean>(true);

  // Preview via qr-code-styling
  const previewRef = useRef<HTMLDivElement | null>(null);
  const qrStylingRef = useRef<QRCodeStyling | null>(null);
  const qrCtorRef = useRef<null | (new (opts?: StyleOptions) => QRCodeStyling)>(null);
  const [qrReady, setQrReady] = useState<boolean>(false);
  const [hasRendered, setHasRendered] = useState<boolean>(false);

  const origin = useMemo(() => {
    if (typeof window !== "undefined") return window.location.origin;
    return "";
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
    const update = () => setPrefersDark(!!mql?.matches);
    update();
    mql?.addEventListener?.('change', update);
    return () => mql?.removeEventListener?.('change', update);
  }, []);

  // Preload qr-code-styling constructor on mount for instant availability
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mod = await import("qr-code-styling");
        if (cancelled) return;
        qrCtorRef.current = (mod as { default: new (opts?: StyleOptions) => QRCodeStyling }).default;
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabaseClient.auth.getSession();
        const token = data.session?.access_token;
        const res = await fetch("/api/links", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const payload = await res.json();
        if (!res.ok) throw new Error(payload?.error || "Failed to load links");
        const links: LinkRow[] = payload.links || [];

        const withShort = links.map((l) => ({
          ...l,
          short_url: `${origin}/${l.short_code}`,
          qr_data_url: null as string | null,
        }));

        // Generate QR codes in parallel
        const generated = await Promise.all(
          withShort.map(async (it) => {
            try {
              const dataUrl = await QRCode.toDataURL(it.short_url, {
                errorCorrectionLevel: "M",
                margin: 1,
                color: { dark: prefersDark ? "#ffffff" : "#0b1220", light: "#ffffff00" },
                width: 200,
              });
              return { ...it, qr_data_url: dataUrl };
            } catch {
              return it; // leave qr_data_url null
            }
          })
        );

        setItems(generated);
        if (generated.length && !selected) setSelected(`${origin}/${generated[0].short_code}`);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to load QR codes");
      } finally {
        setLoading(false);
      }
    })();
  }, [origin, selected, prefersDark]);

  // Prepare defaults when opening the customizer
  useEffect(() => {
    if (!showCustomize) return;
    // Palette aligned to theme
    setDotColorA(prefersDark ? "#ffffff" : "#0b1220");
    setBgColor("#ffffff");
    setSize(264);
    setMargin(1);
    setEcl("M");
  }, [showCustomize, prefersDark]);

  // Apply saved options into state
  const applySavedOptions = (opt: Partial<CustomDesignOptions>) => {
    if (!opt) return;
    if (typeof opt.size === 'number') setSize(opt.size);
    if (typeof opt.margin === 'number') setMargin(opt.margin);
    if (opt.ecl) setEcl(opt.ecl);
    if (opt.dotType) setDotType(opt.dotType);
    if (opt.dotColorA) setDotColorA(opt.dotColorA);
    if (opt.cornerSqType) setCornerSqType(opt.cornerSqType);
    if (opt.cornerSqColor) setCornerSqColor(opt.cornerSqColor);
    if (opt.cornerDotType) setCornerDotType(opt.cornerDotType);
    if (opt.cornerDotColor) setCornerDotColor(opt.cornerDotColor);
    if (opt.bgColor) {
      // Sanitize to #rrggbb (strip alpha if #rrggbbaa)
      const c = opt.bgColor;
      if (/^#([0-9a-fA-F]{8})$/.test(c)) setBgColor('#' + c.slice(1, 7));
      else if (/^#([0-9a-fA-F]{6})$/.test(c)) setBgColor(c);
    }
    if (typeof opt.logoSize === 'number') setLogoSize(opt.logoSize);
    if (typeof opt.logoMargin === 'number') setLogoMargin(opt.logoMargin);
    if (typeof opt.hideBgDots === 'boolean') setHideBgDots(opt.hideBgDots);
    if (opt.logoDataUrl) setLogoDataUrl(opt.logoDataUrl);
  };

  // Load saved options (API -> localStorage)
  useEffect(() => {
    if (!showCustomize || !selected) return;
    const code = shortCodeOf(selected);
    (async () => {
      try {
        const { data: session } = await supabaseClient.auth.getSession();
        const token = session.session?.access_token;
        const res = await fetch(`/api/qr?code=${encodeURIComponent(code)}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const json = await res.json();
          if (json && json.options) { applySavedOptions(json.options); return; }
        }
      } catch {}
      // Fallback: localStorage
      try {
        const raw = localStorage.getItem(`qrs:${code}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.options) applySavedOptions(parsed.options);
        }
      } catch {}
    })();
  }, [showCustomize, selected]);

  // Initialize qr-code-styling each time the modal opens (dynamic import to avoid SSR issues)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!showCustomize || !selected || !previewRef.current) return;
    const container = previewRef.current as unknown as HTMLElement;
    let cancelled = false;
    (async () => {
      try {
        let QRCodeStylingClass = qrCtorRef.current;
        if (!QRCodeStylingClass) {
          const mod = await import("qr-code-styling");
          if (cancelled) return;
          QRCodeStylingClass = (mod as { default: new (opts?: StyleOptions) => QRCodeStyling }).default;
          qrCtorRef.current = QRCodeStylingClass;
        }
        // Build full initial options and create a fresh instance
        const initialOpts: StyleOptions = {
          type: "canvas",
          width: size,
          height: size,
          data: selected,
          margin,
          qrOptions: { errorCorrectionLevel: ecl },
          backgroundOptions: { color: bgColor },
          dotsOptions: { type: dotType, color: dotColorA },
          cornersSquareOptions: { type: cornerSqType, color: cornerSqColor },
          cornersDotOptions: { type: cornerDotType, color: cornerDotColor },
          imageOptions: logoDataUrl ? { image: logoDataUrl, imageSize: logoSize, margin: logoMargin, hideBackgroundDots: hideBgDots, crossOrigin: "anonymous" } : undefined,
        };
        qrStylingRef.current = new QRCodeStylingClass!(initialOpts);
        try { container.innerHTML = ""; } catch {}
        qrStylingRef.current.append(container);
        setHasRendered(true);
        // let the update effect run if user changes options after open
        setQrReady(v=>!v);
        // Fallback: if not rendered within 1s, force re-update
        setTimeout(() => {
          if (!hasRendered && qrStylingRef.current) {
            try { qrStylingRef.current.update(initialOpts); setHasRendered(true); } catch {}
          }
        }, 1000);
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [showCustomize, selected]);

  // Update preview when options change
  useEffect(() => {
    if (!showCustomize || !selected || !qrStylingRef.current) return;
    const opts: StyleOptions = {
      width: size,
      height: size,
      data: selected,
      margin,
      qrOptions: { errorCorrectionLevel: ecl },
      backgroundOptions: { color: bgColor },
      dotsOptions: { type: dotType, color: dotColorA },
      cornersSquareOptions: { type: cornerSqType, color: cornerSqColor },
      cornersDotOptions: { type: cornerDotType, color: cornerDotColor },
      imageOptions: logoDataUrl ? { image: logoDataUrl, imageSize: logoSize, margin: logoMargin, hideBackgroundDots: hideBgDots, crossOrigin: "anonymous" } : undefined,
    };
    try {
      qrStylingRef.current.update(opts);
      setHasRendered(true);
    } catch {}
  }, [showCustomize, selected, size, margin, ecl, bgColor, dotType, dotColorA, cornerSqType, cornerSqColor, cornerDotType, cornerDotColor, logoDataUrl, logoSize, logoMargin, hideBgDots, qrReady]);

  // Cleanup when modal closes: clear container and drop instance to avoid stale canvases
  useEffect(() => {
    if (showCustomize) return;
    const container = previewRef.current as unknown as HTMLElement | undefined;
    try { if (container) container.innerHTML = ""; } catch {}
    qrStylingRef.current = null;
    setHasRendered(false);
  }, [showCustomize]);

  const shortCodeOf = (url: string) => {
    try {
      const u = new URL(url);
      return u.pathname.replace(/^\//, "");
    } catch { return ""; }
  };

  const saveCustomDesign = async () => {
    const payload = {
      data: selected,
      options: {
        size, margin, ecl,
        dotType, dotColorA,
        cornerSqType, cornerSqColor, cornerDotType, cornerDotColor,
        bgColor, logoDataUrl, logoSize, logoMargin, hideBgDots,
      },
    };
    // Local storage fallback
    try {
      const code = shortCodeOf(selected);
      if (code) localStorage.setItem(`qrs:${code}`, JSON.stringify(payload));
    } catch {}
    // Try API persistence
    try {
      const { data: session } = await supabaseClient.auth.getSession();
      const token = session.session?.access_token;
      await fetch(`/api/qr`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ short_code: shortCodeOf(selected), options: payload.options }),
      });
    } catch {}
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)]">QR Codes</h1>
        <Link className="btn btn-primary" href="/dashboard/create">Create</Link>
      </header>

      {/* No always-visible designer. Customizer opens only when user clicks the button. */}

      {loading ? (
        <div className="p-4 text-sm text-[var(--muted)]">Loading…</div>
      ) : error ? (
        <div className="p-4 text-sm text-red-600">{error}</div>
      ) : items.length === 0 ? (
        <div className="p-4 text-sm text-[var(--muted)]">No links yet. Create your first one to generate a QR code.</div>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((it) => (
            <div key={it.short_code} className="rounded-xl glass p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="font-mono text-sm">/{it.short_code}</div>
                <div className="text-xs text-[var(--muted)]">{new Date(it.created_at).toLocaleDateString()}</div>
              </div>
              <div className="truncate text-sm" title={it.target_url}>{it.target_url}</div>
              <div className="rounded-md p-3 self-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                {it.qr_data_url ? (
                  <Image src={it.qr_data_url} alt={`QR for ${it.short_url}`} width={160} height={160} className="w-40 h-40" />
                ) : (
                  <div className="w-40 h-40 grid place-items-center text-sm text-[var(--muted)]">QR</div>
                )}
              </div>
              <div className="flex gap-2 justify-end">
                <a className="btn btn-secondary h-8" href={it.short_url} target="_blank" rel="noreferrer">Open</a>
                {it.qr_data_url ? (
                  <a className="btn btn-primary btn-no-motion h-8" href={it.qr_data_url} download={`qr-${it.short_code}.png`}>Download PNG</a>
                ) : null}
                <button className="btn btn-secondary h-8" onClick={() => { setSelected(it.short_url); requestAnimationFrame(()=>setShowCustomize(true)); }}>Custom QR</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCustomize && (
        <div className="fixed inset-0 z-50 grid place-items-center" style={{ background: 'color-mix(in oklab, var(--surface) 60%, transparent)' }}>
          <div className="w-[min(98vw,1200px)] h-[92vh] rounded-xl glass p-5 space-y-4 overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="text-lg font-semibold">Custom QR</div>
            </div>
            <div className="grid gap-4 lg:grid-cols-[1fr_1fr] h-[calc(92vh-64px)]">
              {/* Controls */}
              <div className="rounded-md p-4 space-y-4 overflow-auto" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div>
                  <div className="text-sm mb-1">Short link</div>
                  <div className="font-mono text-sm break-all">{selected}</div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <label className="text-sm flex flex-col gap-1">
                    <span>Size</span>
                    <input type="range" min={128} max={512} step={4} value={size} onChange={(e)=>setSize(parseInt(e.target.value,10))} />
                  </label>
                  <label className="text-sm flex flex-col gap-1">
                    <span>Margin</span>
                    <input type="range" min={0} max={8} step={1} value={margin} onChange={(e)=>setMargin(parseInt(e.target.value,10))} />
                  </label>
                  <div className="col-span-2 border-t border-[var(--border)] pt-2 text-sm font-medium">Code style</div>
                  <div className="col-span-2 flex flex-wrap gap-2 items-center">
                    <span className="text-sm">Dots</span>
                    {([
                      {key:'square', svg:<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden><rect x="3" y="3" width="5" height="5"/><rect x="10.5" y="3" width="5" height="5"/><rect x="18" y="3" width="3" height="3"/><rect x="3" y="10.5" width="5" height="5"/><rect x="10.5" y="10.5" width="5" height="5"/></svg>},
                      {key:'dots', svg:<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden><circle cx="5.5" cy="5.5" r="2.2"/><circle cx="12" cy="5.5" r="2.2"/><circle cx="5.5" cy="12" r="2.2"/><circle cx="12" cy="12" r="2.2"/></svg>},
                      {key:'rounded', svg:<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden><rect x="3" y="3" width="5" height="5" rx="2"/><rect x="10.5" y="3" width="5" height="5" rx="2"/><rect x="3" y="10.5" width="5" height="5" rx="2"/><rect x="10.5" y="10.5" width="5" height="5" rx="2"/></svg>},
                      {key:'classy', svg:<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden><path d="M3 3h5v3H6v2H3V3Z"/><path d="M10.5 3H16v3h-2v2h-3.5V3Z"/></svg>},
                      {key:'classy-rounded', svg:<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden><path d="M3 5a2 2 0 0 1 2-2h3v3H6v2H3V5Z"/><path d="M10.5 5a2 2 0 0 1 2-2H16v3h-2v2h-3.5V5Z"/></svg>},
                      {key:'extra-rounded', svg:<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden><rect x="3" y="3" width="5" height="5" rx="3"/><rect x="10.5" y="3" width="5" height="5" rx="3"/><rect x="3" y="10.5" width="5" height="5" rx="3"/><rect x="10.5" y="10.5" width="5" height="5" rx="3"/></svg>},
                    ] as const).map(opt => (
                      <button key={opt.key} className={`btn btn-secondary h-8 w-10 p-0 inline-grid place-items-center ${dotType===opt.key ? 'ring-2 ring-[var(--accent)]' : ''}`} onClick={()=>setDotType(opt.key as typeof dotType)} title={opt.key.replace('-', ' ')} aria-pressed={dotType===opt.key}>
                        {opt.svg}
                      </button>
                    ))}
                  </div>
                  <label className="text-sm flex flex-col gap-1">
                    <span>Color A</span>
                    <input type="color" value={dotColorA} onChange={(e)=>setDotColorA(e.target.value)} />
                  </label>
                  <div className="col-span-2 border-t border-[var(--border)] pt-2 text-sm font-medium">Corners</div>
                  <div className="col-span-2 flex flex-wrap gap-2 items-center">
                    <span className="text-sm">Squares</span>
                    {([
                      {key:'square', svg:<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden><rect x="2" y="2" width="8" height="8"/></svg>},
                      {key:'dot', svg:<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden><circle cx="6" cy="6" r="4"/></svg>},
                      {key:'extra-rounded', svg:<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden><rect x="2" y="2" width="8" height="8" rx="3"/></svg>},
                    ] as const).map(opt => (
                      <button key={opt.key} className={`btn btn-secondary h-8 w-10 p-0 inline-grid place-items-center ${cornerSqType===opt.key ? 'ring-2 ring-[var(--accent)]' : ''}`} onClick={()=>setCornerSqType(opt.key as typeof cornerSqType)} title={opt.key} aria-pressed={cornerSqType===opt.key}>
                        {opt.svg}
                      </button>
                    ))}
                  </div>
                  <label className="text-sm flex flex-col gap-1">
                    <span>Square color</span>
                    <input type="color" value={cornerSqColor} onChange={(e)=>setCornerSqColor(e.target.value)} />
                  </label>
                  <div className="text-sm flex items-center gap-2">
                    <span>Dots</span>
                    {(['square','dot'] as const).map(opt => (
                      <button key={opt} className={`btn btn-secondary h-8 w-10 p-0 inline-grid place-items-center ${cornerDotType===opt ? 'ring-2 ring-[var(--accent)]' : ''}`} onClick={()=>setCornerDotType(opt)} title={opt} aria-pressed={cornerDotType===opt}>
                        {opt==='square' ? <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden><rect x="5" y="5" width="6" height="6"/></svg> : <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden><circle cx="8" cy="8" r="3.5"/></svg>}
                      </button>
                    ))}
                  </div>
                  <label className="text-sm flex flex-col gap-1">
                    <span>Dot color</span>
                    <input type="color" value={cornerDotColor} onChange={(e)=>setCornerDotColor(e.target.value)} />
                  </label>
                  <div className="col-span-2 border-t border-[var(--border)] pt-2 text-sm font-medium">Background</div>
                  <label className="text-sm flex flex-col gap-1">
                    <span>Background color</span>
                    <input type="color" value={bgColor === '#ffffff00' ? '#00000000' : bgColor} onChange={(e)=>setBgColor(e.target.value)} />
                    <button type="button" className="btn btn-secondary h-8 mt-1" onClick={()=>setBgColor('#ffffff00')}>Transparent</button>
                  </label>
                  <div className="col-span-2 border-t border-[var(--border)] pt-2 text-sm font-medium">Logo</div>
                  <label className="text-sm flex flex-col gap-1 col-span-2">
                    <span>Upload logo (PNG/SVG/JPEG)</span>
                    <input type="file" accept="image/*" onChange={async (e)=>{
                      const f = e.target.files?.[0];
                      if (!f) { setLogoDataUrl(undefined); return; }
                      const reader = new FileReader();
                      reader.onload = () => setLogoDataUrl(reader.result as string);
                      reader.readAsDataURL(f);
                    }} />
                  </label>
                  <label className="text-sm flex flex-col gap-1">
                    <span>Logo size</span>
                    <input type="range" min={0.1} max={0.5} step={0.01} value={logoSize} onChange={(e)=>setLogoSize(parseFloat(e.target.value))} />
                  </label>
                  <label className="text-sm flex flex-col gap-1">
                    <span>Logo margin</span>
                    <input type="range" min={0} max={10} step={1} value={logoMargin} onChange={(e)=>setLogoMargin(parseInt(e.target.value,10))} />
                  </label>
                  <label className="text-sm flex items-center gap-2 col-span-2">
                    <input type="checkbox" checked={hideBgDots} onChange={(e)=>setHideBgDots(e.target.checked)} />
                    <span>Hide background dots behind logo</span>
                  </label>
                  <div className="col-span-2 border-t border-[var(--border)] pt-2 text-sm font-medium">Error correction</div>
                  <label className="text-sm flex flex-col gap-1 col-span-2">
                    <select className="btn btn-secondary h-8 text-left" value={ecl} onChange={(e: React.ChangeEvent<HTMLSelectElement>)=>setEcl(e.target.value as "L"|"M"|"Q"|"H")}>
                      <option value="L">L (7%)</option>
                      <option value="M">M (15%)</option>
                      <option value="Q">Q (25%)</option>
                      <option value="H">H (30%)</option>
                    </select>
                  </label>
                </div>
              </div>
              {/* Preview */}
              <div className="rounded-md p-0 flex flex-col overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div className="p-4">
                  <div ref={previewRef} className="w-full grid place-items-center" style={{ minHeight: 380 }}>
                    {!hasRendered && (
                      <div className="w-[260px] h-[260px] rounded-md animate-pulse" style={{ background: 'var(--panel)' }} />
                    )}
                  </div>
                </div>
                <div className="px-4 pb-3 border-t" style={{ borderColor: 'var(--border)' }}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-xs text-[var(--muted)]">Preview</div>
                    <div className="flex items-center gap-2">
                      {(!hasRendered) && (
                        <button className="btn btn-secondary h-8" onClick={()=>setQrReady(v=>!v)}>Retry</button>
                      )}
                      <button className="btn btn-primary btn-no-motion h-8" disabled={!hasRendered} onClick={async ()=>{
                        if (!qrStylingRef.current) return;
                        const blob = await qrStylingRef.current.getRawData('png');
                        if (!blob) return;
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url; a.download = 'qr-custom.png'; a.click();
                        setTimeout(()=>URL.revokeObjectURL(url), 5000);
                      }}>Download PNG</button>
                    </div>
                  </div>
                </div>
                <div className="px-4 py-3 border-t mt-0 flex justify-end gap-2" style={{ borderColor: 'var(--border)' }}>
                  <button className="btn btn-secondary h-8" onClick={() => setShowCustomize(false)}>Cancel</button>
                  <button className="btn btn-primary btn-no-motion h-8" onClick={saveCustomDesign}>Save Changes</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

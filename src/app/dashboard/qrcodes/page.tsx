"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import QRCode from "qrcode";
import { supabaseClient } from "@/lib/supabaseClient";
import QRCodeStyling, { type Options as StyleOptions } from "qr-code-styling";
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
  // Dot styles
  const [dotType, setDotType] = useState<"square"|"dots"|"rounded"|"classy"|"classy-rounded"|"extra-rounded">("square");
  const [dotColorMode, setDotColorMode] = useState<"single"|"linear">("single");
  const [dotColorA, setDotColorA] = useState<string>("#ffffff");
  const [dotColorB, setDotColorB] = useState<string>("#7ea6ff");
  const [dotRotation, setDotRotation] = useState<number>(45);
  // Corners
  const [cornerSqType, setCornerSqType] = useState<"square"|"dot"|"extra-rounded">("square");
  const [cornerSqColor, setCornerSqColor] = useState<string>("#ffffff");
  const [cornerDotType, setCornerDotType] = useState<"square"|"dot">("square");
  const [cornerDotColor, setCornerDotColor] = useState<string>("#ffffff");
  // Background
  const [bgColor, setBgColor] = useState<string>("#ffffff00");
  // Logo
  const [logoDataUrl, setLogoDataUrl] = useState<string | undefined>(undefined);
  const [logoSize, setLogoSize] = useState<number>(0.25); // 0..1
  const [logoMargin, setLogoMargin] = useState<number>(2);
  const [hideBgDots, setHideBgDots] = useState<boolean>(true);

  // Preview via qr-code-styling
  const previewRef = useRef<HTMLDivElement | null>(null);
  const qrStylingRef = useRef<QRCodeStyling | null>(null);

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
    setDotColorB("#7ea6ff");
    setBgColor("#ffffff00");
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
    if (opt.dotColorMode) setDotColorMode(opt.dotColorMode);
    if (opt.dotColorA) setDotColorA(opt.dotColorA);
    if (opt.dotColorB) setDotColorB(opt.dotColorB);
    if (typeof opt.dotRotation === 'number') setDotRotation(opt.dotRotation);
    if (opt.cornerSqType) setCornerSqType(opt.cornerSqType);
    if (opt.cornerSqColor) setCornerSqColor(opt.cornerSqColor);
    if (opt.cornerDotType) setCornerDotType(opt.cornerDotType);
    if (opt.cornerDotColor) setCornerDotColor(opt.cornerDotColor);
    if (opt.bgColor) setBgColor(opt.bgColor);
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

  // Initialize qr-code-styling once when modal opens
  useEffect(() => {
    if (!showCustomize || !selected || !previewRef.current) return;
    if (!qrStylingRef.current) {
      qrStylingRef.current = new QRCodeStyling({ type: "canvas" });
      qrStylingRef.current.append(previewRef.current);
    }
    return () => {};
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
      dotsOptions: dotColorMode === "single"
        ? { type: dotType, color: dotColorA }
        : { type: dotType, gradient: { type: "linear", rotation: dotRotation, colorStops: [{ offset: 0, color: dotColorA }, { offset: 1, color: dotColorB }] } },
      cornersSquareOptions: { type: cornerSqType, color: cornerSqColor },
      cornersDotOptions: { type: cornerDotType, color: cornerDotColor },
      imageOptions: logoDataUrl ? { image: logoDataUrl, imageSize: logoSize, margin: logoMargin, hideBackgroundDots: hideBgDots, crossOrigin: "anonymous" } : undefined,
    };
    try {
      qrStylingRef.current.update(opts);
    } catch {}
  }, [showCustomize, selected, size, margin, ecl, bgColor, dotType, dotColorMode, dotColorA, dotColorB, dotRotation, cornerSqType, cornerSqColor, cornerDotType, cornerDotColor, logoDataUrl, logoSize, logoMargin, hideBgDots]);

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
        dotType, dotColorMode, dotColorA, dotColorB, dotRotation,
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
                <button className="btn btn-secondary h-8" onClick={() => { setSelected(it.short_url); setShowCustomize(true); }}>Custom QR</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCustomize && (
        <div className="fixed inset-0 z-50 grid place-items-center" style={{ background: 'color-mix(in oklab, var(--surface) 60%, transparent)' }}>
          <div className="w-[min(98vw,1120px)] rounded-xl glass p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-lg font-semibold">Custom QR</div>
              <button className="btn btn-secondary h-8" onClick={() => setShowCustomize(false)}>Close</button>
            </div>
            <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
              {/* Controls */}
              <div className="rounded-md p-4 space-y-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
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
                  <label className="text-sm flex flex-col gap-1">
                    <span>Dots</span>
                    <select className="btn btn-secondary h-8 text-left" value={dotType} onChange={(e)=>setDotType(e.target.value as typeof dotType)}>
                      <option value="square">Square</option>
                      <option value="dots">Dots</option>
                      <option value="rounded">Rounded</option>
                      <option value="classy">Classy</option>
                      <option value="classy-rounded">Classy Rounded</option>
                      <option value="extra-rounded">Extra Rounded</option>
                    </select>
                  </label>
                  <label className="text-sm flex flex-col gap-1">
                    <span>Color mode</span>
                    <select className="btn btn-secondary h-8 text-left" value={dotColorMode} onChange={(e)=>setDotColorMode(e.target.value as "single"|"linear")}>
                      <option value="single">Single</option>
                      <option value="linear">Linear gradient</option>
                    </select>
                  </label>
                  <label className="text-sm flex flex-col gap-1">
                    <span>Color A</span>
                    <input type="color" value={dotColorA} onChange={(e)=>setDotColorA(e.target.value)} />
                  </label>
                  <label className="text-sm flex flex-col gap-1">
                    <span>Color B</span>
                    <input type="color" disabled={dotColorMode!=="linear"} value={dotColorB} onChange={(e)=>setDotColorB(e.target.value)} />
                  </label>
                  <label className="text-sm flex flex-col gap-1">
                    <span>Gradient rotation</span>
                    <input type="range" min={0} max={360} step={1} disabled={dotColorMode!=="linear"} value={dotRotation} onChange={(e)=>setDotRotation(parseInt(e.target.value,10))} />
                  </label>
                  <div className="col-span-2 border-t border-[var(--border)] pt-2 text-sm font-medium">Corners</div>
                  <label className="text-sm flex flex-col gap-1">
                    <span>Squares</span>
                    <select className="btn btn-secondary h-8 text-left" value={cornerSqType} onChange={(e)=>setCornerSqType(e.target.value as typeof cornerSqType)}>
                      <option value="square">Square</option>
                      <option value="dot">Dot</option>
                      <option value="extra-rounded">Extra Rounded</option>
                    </select>
                  </label>
                  <label className="text-sm flex flex-col gap-1">
                    <span>Square color</span>
                    <input type="color" value={cornerSqColor} onChange={(e)=>setCornerSqColor(e.target.value)} />
                  </label>
                  <label className="text-sm flex flex-col gap-1">
                    <span>Dots</span>
                    <select className="btn btn-secondary h-8 text-left" value={cornerDotType} onChange={(e)=>setCornerDotType(e.target.value as typeof cornerDotType)}>
                      <option value="square">Square</option>
                      <option value="dot">Dot</option>
                    </select>
                  </label>
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
                <div className="flex justify-end gap-2 pt-2">
                  <button className="btn btn-secondary h-8" onClick={() => setShowCustomize(false)}>Cancel</button>
                  <button className="btn btn-primary btn-no-motion h-8" onClick={saveCustomDesign}>Save Changes</button>
                </div>
              </div>
              {/* Preview */}
              <div className="rounded-md p-4 flex flex-col items-center gap-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div ref={previewRef} className="w-full grid place-items-center" style={{ minHeight: 320 }} />
                <button className="btn btn-primary btn-no-motion" onClick={async ()=>{
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
        </div>
      )}
    </div>
  );
}

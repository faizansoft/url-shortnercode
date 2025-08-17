"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type QRCodeStyling from "qr-code-styling";
import type { Options as StyleOptions } from "qr-code-styling";
import QRCode from "qrcode";
import { supabaseClient } from "@/lib/supabaseClient";

// Types shared with list page
type CustomDesignOptions = {
  size: number;
  margin: number;
  ecl: "L" | "M" | "Q" | "H";
  dotType: "square"|"dots"|"rounded"|"classy"|"classy-rounded"|"extra-rounded";
  dotColorA: string;
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

export default function CustomizeQRPage() {
  const search = useSearchParams();
  const url = search.get("url") || "";

  // Theme
  const [prefersDark, setPrefersDark] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
    const update = () => setPrefersDark(!!mql?.matches);
    update();
    mql?.addEventListener?.('change', update);
    return () => mql?.removeEventListener?.('change', update);
  }, []);

  // Basic options
  const [size, setSize] = useState<number>(264);
  const [margin, setMargin] = useState<number>(1);
  const [ecl, setEcl] = useState<"L" | "M" | "Q" | "H">("M");
  // Dots
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
  const [logoSize, setLogoSize] = useState<number>(0.25);
  const [logoMargin, setLogoMargin] = useState<number>(2);
  const [hideBgDots, setHideBgDots] = useState<boolean>(true);

  // Preview
  const previewRef = useRef<HTMLDivElement | null>(null);
  const qrRef = useRef<QRCodeStyling | null>(null);
  const ctorRef = useRef<null | (new (opts?: StyleOptions) => QRCodeStyling)>(null);
  const [readyTick, setReadyTick] = useState(0);
  const [hasRendered, setHasRendered] = useState(false);

  const shortCode = useMemo(() => {
    try { return new URL(url).pathname.replace(/^\//, ""); } catch { return ""; }
  }, [url]);

  // Defaults when page loads
  useEffect(() => {
    setDotColorA(prefersDark ? "#ffffff" : "#0b1220");
    setBgColor("#ffffff");
    setSize(264);
    setMargin(1);
    setEcl("M");
  }, [prefersDark]);

  // Load saved options
  useEffect(() => {
    if (!url) return;
    (async () => {
      // API first
      try {
        const { data } = await supabaseClient.auth.getSession();
        const token = data.session?.access_token;
        const res = await fetch(`/api/qr?short_code=${encodeURIComponent(shortCode)}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const body = await res.json();
          if (body?.options) applySaved(body.options);
          return;
        }
      } catch {}
      // Fallback to localStorage
      try {
        const raw = localStorage.getItem(`qrs:${shortCode}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.options) applySaved(parsed.options);
        }
      } catch {}
    })();
  }, [url, shortCode]);

  function applySaved(opt: Partial<CustomDesignOptions>) {
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
      const c = opt.bgColor;
      if (/^#([0-9a-fA-F]{8})$/.test(c)) setBgColor('#' + c.slice(1, 7));
      else if (/^#([0-9a-fA-F]{6})$/.test(c)) setBgColor(c);
    }
    if (typeof opt.logoSize === 'number') setLogoSize(opt.logoSize);
    if (typeof opt.logoMargin === 'number') setLogoMargin(opt.logoMargin);
    if (typeof opt.hideBgDots === 'boolean') setHideBgDots(opt.hideBgDots);
    if (opt.logoDataUrl) setLogoDataUrl(opt.logoDataUrl);
  }

  // Preload qr-code-styling
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mod = await import("qr-code-styling");
        if (cancelled) return;
        ctorRef.current = (mod as { default: new (opts?: StyleOptions) => QRCodeStyling }).default;
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);

  // Init instance on mount
  useEffect(() => {
    if (!url || !previewRef.current) return;
    const container = previewRef.current as unknown as HTMLElement;
    let cancelled = false;
    (async () => {
      try {
        let Ctor = ctorRef.current;
        if (!Ctor) {
          const mod = await import("qr-code-styling");
          if (cancelled) return;
          Ctor = (mod as { default: new (opts?: StyleOptions) => QRCodeStyling }).default;
          ctorRef.current = Ctor;
        }
        const initial: StyleOptions = {
          type: "canvas",
          width: size,
          height: size,
          data: url,
          margin,
          qrOptions: { errorCorrectionLevel: ecl },
          backgroundOptions: { color: bgColor },
          dotsOptions: { type: dotType, color: dotColorA },
          cornersSquareOptions: { type: cornerSqType, color: cornerSqColor },
          cornersDotOptions: { type: cornerDotType, color: cornerDotColor },
          imageOptions: logoDataUrl ? { image: logoDataUrl, imageSize: logoSize, margin: logoMargin, hideBackgroundDots: hideBgDots, crossOrigin: "anonymous" } : undefined,
        };
        qrRef.current = new Ctor!(initial);
        try { container.innerHTML = ""; } catch {}
        qrRef.current.append(container);
        setHasRendered(true);
        setReadyTick((v)=>v+1);
        // Fallbacks
        setTimeout(() => {
          if (cancelled || hasRendered) return;
          try { qrRef.current?.update(initial); } catch {}
          setTimeout(async () => {
            if (cancelled || hasRendered) return;
            try {
              container.innerHTML = "";
              const canvas = document.createElement('canvas');
              await QRCode.toCanvas(canvas, url, {
                errorCorrectionLevel: ecl,
                margin,
                width: size,
                color: {
                  dark: dotColorA || (prefersDark ? "#ffffff" : "#0b1220"),
                  light: "#ffffff00",
                },
              });
              container.appendChild(canvas);
              setHasRendered(true);
            } catch {}
          }, 500);
        }, 800);
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [url, readyTick]);

  // Update when options change
  useEffect(() => {
    if (!qrRef.current) return;
    const opts: StyleOptions = {
      width: size,
      height: size,
      data: url,
      margin,
      qrOptions: { errorCorrectionLevel: ecl },
      backgroundOptions: { color: bgColor },
      dotsOptions: { type: dotType, color: dotColorA },
      cornersSquareOptions: { type: cornerSqType, color: cornerSqColor },
      cornersDotOptions: { type: cornerDotType, color: cornerDotColor },
      imageOptions: logoDataUrl ? { image: logoDataUrl, imageSize: logoSize, margin: logoMargin, hideBackgroundDots: hideBgDots, crossOrigin: "anonymous" } : undefined,
    };
    try { qrRef.current.update(opts); setHasRendered(true); } catch {}
  }, [url, size, margin, ecl, bgColor, dotType, dotColorA, cornerSqType, cornerSqColor, cornerDotType, cornerDotColor, logoDataUrl, logoSize, logoMargin, hideBgDots]);

  // Save
  async function onSave() {
    const payload = {
      data: url,
      options: { size, margin, ecl, dotType, dotColorA, cornerSqType, cornerSqColor, cornerDotType, cornerDotColor, bgColor, logoDataUrl, logoSize, logoMargin, hideBgDots },
    };
    try { if (shortCode) localStorage.setItem(`qrs:${shortCode}`, JSON.stringify(payload)); } catch {}
    try {
      const { data } = await supabaseClient.auth.getSession();
      const token = data.session?.access_token;
      await fetch(`/api/qr`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ short_code: shortCode, options: payload.options }),
      });
    } catch {}
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-lg font-semibold">Customize QR</div>
          <div className="text-xs text-[var(--muted)] break-all">{url}</div>
        </div>
        <div className="flex gap-2">
          <Link className="btn btn-secondary h-8" href="/dashboard/qrcodes">Back</Link>
          <button className="btn btn-primary btn-no-motion h-8" onClick={onSave}>Save Changes</button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr] min-h-[70vh]">
        {/* Controls */}
        <div className="rounded-md p-4 space-y-4 overflow-auto" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm flex flex-col gap-1">
              <span>Size</span>
              <input type="range" min={128} max={640} step={4} value={size} onChange={(e)=>setSize(parseInt(e.target.value))} />
              <span className="text-xs text-[var(--muted)]">{size}px</span>
            </label>
            <label className="text-sm flex flex-col gap-1">
              <span>Margin</span>
              <input type="range" min={0} max={8} step={1} value={margin} onChange={(e)=>setMargin(parseInt(e.target.value))} />
              <span className="text-xs text-[var(--muted)]">{margin}px</span>
            </label>
          </div>

          <div className="space-y-2">
            <div className="text-sm">Dot type</div>
            <div className="flex flex-wrap gap-2">
              {(["square","dots","rounded","classy","classy-rounded","extra-rounded"] as const).map(t => (
                <button key={t} className={`chip ${dotType===t? 'chip-active':''}`} onClick={()=>setDotType(t)}>{t}</button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm flex flex-col gap-1">
              <span>Dots color</span>
              <input type="color" value={dotColorA} onChange={(e)=>setDotColorA(e.target.value)} />
            </label>
            <label className="text-sm flex flex-col gap-1">
              <span>Background</span>
              <input type="color" value={bgColor} onChange={(e)=>setBgColor(e.target.value)} />
            </label>
          </div>

          <div className="space-y-2">
            <div className="text-sm">Corners</div>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm flex flex-col gap-1">
                <span>Corner squares</span>
                <div className="flex flex-wrap gap-2">
                  {(["square","dot","extra-rounded"] as const).map(t => (
                    <button key={t} className={`chip ${cornerSqType===t? 'chip-active':''}`} onClick={()=>setCornerSqType(t)}>{t}</button>
                  ))}
                </div>
                <input type="color" value={cornerSqColor} onChange={(e)=>setCornerSqColor(e.target.value)} />
              </label>
              <label className="text-sm flex flex-col gap-1">
                <span>Corner dots</span>
                <div className="flex flex-wrap gap-2">
                  {(["square","dot"] as const).map(t => (
                    <button key={t} className={`chip ${cornerDotType===t? 'chip-active':''}`} onClick={()=>setCornerDotType(t)}>{t}</button>
                  ))}
                </div>
                <input type="color" value={cornerDotColor} onChange={(e)=>setCornerDotColor(e.target.value)} />
              </label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm flex flex-col gap-1">
              <span>Error correction</span>
              <select className="btn btn-secondary h-8 text-left" value={ecl} onChange={(e)=>setEcl(e.target.value as "L" | "M" | "Q" | "H")}>
                <option value="L">L (7%)</option>
                <option value="M">M (15%)</option>
                <option value="Q">Q (25%)</option>
                <option value="H">H (30%)</option>
              </select>
            </label>
            <div />
          </div>

          <div className="space-y-2">
            <div className="text-sm">Logo</div>
            <div className="flex items-center gap-3">
              <input type="file" accept="image/*" onChange={(e)=>{
                const file = e.target.files?.[0];
                if (!file) { setLogoDataUrl(undefined); return; }
                const reader = new FileReader();
                reader.onload = () => setLogoDataUrl(reader.result as string);
                reader.readAsDataURL(file);
              }} />
              {logoDataUrl && (
                <button className="btn h-8" onClick={()=>setLogoDataUrl(undefined)}>Remove</button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm flex flex-col gap-1">
                <span>Logo size</span>
                <input type="range" min={0.1} max={0.5} step={0.01} value={logoSize} onChange={(e)=>setLogoSize(parseFloat(e.target.value))} />
                <span className="text-xs text-[var(--muted)]">{Math.round(logoSize*100)}%</span>
              </label>
              <label className="text-sm flex flex-col gap-1">
                <span>Logo margin</span>
                <input type="range" min={0} max={8} step={1} value={logoMargin} onChange={(e)=>setLogoMargin(parseInt(e.target.value))} />
                <span className="text-xs text-[var(--muted)]">{logoMargin}px</span>
              </label>
            </div>
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={hideBgDots} onChange={(e)=>setHideBgDots(e.target.checked)} /> Hide background dots under logo
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
                {!hasRendered && (
                  <button className="btn btn-secondary h-8" onClick={()=>setReadyTick(v=>v+1)}>Retry</button>
                )}
                <button className="btn btn-primary btn-no-motion h-8" disabled={!hasRendered} onClick={async ()=>{
                  if (!qrRef.current) return;
                  const blob = await qrRef.current.getRawData('png');
                  if (!blob) return;
                  const urlObj = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = urlObj; a.download = `qr-${shortCode||'custom'}.png`; a.click();
                  setTimeout(()=>URL.revokeObjectURL(urlObj), 5000);
                }}>Download PNG</button>
              </div>
            </div>
          </div>
          <div className="px-4 py-3 border-t mt-0 flex justify-end gap-2" style={{ borderColor: 'var(--border)' }}>
            <Link className="btn btn-secondary h-8" href="/dashboard/qrcodes">Cancel</Link>
            <button className="btn btn-primary btn-no-motion h-8" onClick={onSave}>Save Changes</button>
          </div>
        </div>
      </div>
    </div>
  );
}

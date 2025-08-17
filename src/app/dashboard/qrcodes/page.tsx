"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import QRCode from "qrcode";
import { supabaseClient } from "@/lib/supabaseClient";
// Designer is intentionally not embedded here; customization will open on demand in a modal

type LinkRow = { short_code: string; target_url: string; created_at: string };

type QRItem = LinkRow & { short_url: string; qr_data_url: string | null };

export default function QRCodesPage() {
  const [items, setItems] = useState<QRItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string>("");
  const [prefersDark, setPrefersDark] = useState<boolean>(false);
  const [showCustomize, setShowCustomize] = useState<boolean>(false);
  // Customizer state
  const [size, setSize] = useState<number>(200);
  const [margin, setMargin] = useState<number>(1);
  const [darkColor, setDarkColor] = useState<string>("#ffffff");
  const [lightColor, setLightColor] = useState<string>("#ffffff00");
  const [ecl, setEcl] = useState<"L" | "M" | "Q" | "H">("M");
  const [customDataUrl, setCustomDataUrl] = useState<string | null>(null);

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
    // Initialize palette aligned to theme
    setDarkColor(prefersDark ? "#ffffff" : "#0b1220");
    setLightColor("#ffffff00");
    setSize(220);
    setMargin(1);
    setEcl("M");
  }, [showCustomize, prefersDark]);

  // Generate custom QR on option change
  useEffect(() => {
    if (!showCustomize || !selected) return;
    let cancelled = false;
    (async () => {
      try {
        const dataUrl = await QRCode.toDataURL(selected, {
          errorCorrectionLevel: ecl,
          margin,
          color: { dark: darkColor, light: lightColor },
          width: size,
        });
        if (!cancelled) setCustomDataUrl(dataUrl);
      } catch {
        if (!cancelled) setCustomDataUrl(null);
      }
    })();
    return () => { cancelled = true; };
  }, [showCustomize, selected, size, margin, darkColor, lightColor, ecl]);

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
          <div className="w-[min(96vw,720px)] rounded-xl glass p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-lg font-semibold">Custom QR</div>
              <button className="btn btn-secondary h-8" onClick={() => setShowCustomize(false)}>Close</button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-md p-4 flex flex-col items-center gap-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                {customDataUrl ? (
                  <Image src={customDataUrl} alt="QR preview" width={size} height={size} className="w-[min(320px,90%)] h-auto" />
                ) : (
                  <div className="w-40 h-40 grid place-items-center text-sm text-[var(--muted)]">Preview…</div>
                )}
                {customDataUrl && (
                  <a className="btn btn-primary btn-no-motion" href={customDataUrl} download={`qr-custom.png`}>Download PNG</a>
                )}
              </div>
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
                  <label className="text-sm flex flex-col gap-1">
                    <span>Dark color</span>
                    <input type="color" value={darkColor} onChange={(e)=>setDarkColor(e.target.value)} />
                  </label>
                  <label className="text-sm flex flex-col gap-1">
                    <span>Background</span>
                    <input type="color" value={lightColor === '#ffffff00' ? '#00000000' : lightColor} onChange={(e)=>setLightColor(e.target.value)} />
                    <button type="button" className="btn btn-secondary h-8 mt-1" onClick={()=>setLightColor('#ffffff00')}>Transparent</button>
                  </label>
                  <label className="text-sm flex flex-col gap-1 col-span-2">
                    <span>Error correction</span>
                    <select className="btn btn-secondary h-8 text-left" value={ecl} onChange={(e: React.ChangeEvent<HTMLSelectElement>)=>setEcl(e.target.value as "L"|"M"|"Q"|"H")}>
                      <option value="L">L (7%)</option>
                      <option value="M">M (15%)</option>
                      <option value="Q">Q (25%)</option>
                      <option value="H">H (30%)</option>
                    </select>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

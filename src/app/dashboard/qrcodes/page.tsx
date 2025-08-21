"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from "react";
import type { QRCodeToStringOptions, QRCodeToDataURLOptions } from "qrcode";
import Link from "next/link";
import Image from "next/image";
import QRCode from "qrcode";
import { supabaseClient } from "@/lib/supabaseClient";
import QRCodeStyling, { type Options as QRStyleOptions } from "qr-code-styling";
// Customization moved to a dedicated page: /dashboard/qrcodes/customize

type LinkRow = { short_code: string; target_url: string; created_at: string };

type QRItem = LinkRow & { short_url: string; qr_data_url: string | null };

// (formerly used by modal customizer)

export default function QRCodesPage() {
  const [items, setItems] = useState<QRItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 24;
  // Fixed look: no theme-based color changes
  // All customizer state removed in favor of dedicated page

  const origin = useMemo(() => {
    if (typeof window !== "undefined") return window.location.origin;
    return "";
  }, []);

  // No theme handling; QR colors remain fixed

  // (no modal preloading required)

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabaseClient.auth.getSession();
        const token = data.session?.access_token;
        const uid = data.session?.user?.id || '';
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

        // Generate or resolve QR previews in parallel (prefer stored thumbnails)
        const generated = await Promise.all(
          withShort.map(async (it) => {
            // Try to fetch saved style for this short_code
            let styledDataUrl: string | null = null;
            try {
              if (token) {
                const resStyle = await fetch(`/api/qr?code=${encodeURIComponent(it.short_code)}` , { headers: { Authorization: `Bearer ${token}` } });
                if (resStyle.ok) {
                  const { options } = await resStyle.json();
                  if (options && typeof options === 'object') {
                    // If we have a stored thumbnail URL, use it directly (fast path)
                    const thumb = (options as { thumbnailUrl?: unknown }).thumbnailUrl;
                    if (typeof thumb === 'string' && thumb) {
                      styledDataUrl = thumb;
                    } else {
                      // Fallback: generate styled SVG, rasterize to PNG for immediate UI
                      const svg = await generateStyledSvgString(it.short_url, options as SavedOptions);
                      if (svg) {
                        const pngDataUrl = await rasterizeSvgToPng(svg, 128);
                        styledDataUrl = pngDataUrl;
                        // Auto-backfill: create/upload PNG thumbnail, then update options
                        try {
                          const blob = dataUrlToBlob(pngDataUrl);
                          if (uid) {
                            const bucket = 'qr-thumbs';
                            const path = `thumbs/${uid}/${it.short_code}.png`;
                            const up = await supabaseClient.storage.from(bucket).upload(path, blob, { upsert: true, contentType: 'image/png', cacheControl: '31536000' });
                            if (!up.error) {
                              const pub = supabaseClient.storage.from(bucket).getPublicUrl(path);
                              const pubUrl = (pub && pub.data && typeof pub.data.publicUrl === 'string') ? pub.data.publicUrl : '';
                              if (pubUrl) {
                                const thumbUrl = `${pubUrl}?v=${Date.now()}`;
                                styledDataUrl = thumbUrl;
                                // Merge and update options with thumbnailUrl
                                try {
                                  await fetch('/api/qr', {
                                    method: 'POST',
                                    headers: {
                                      'Content-Type': 'application/json',
                                      'Authorization': `Bearer ${token}`,
                                    },
                                    body: JSON.stringify({ short_code: it.short_code, options: { ...(options as object), thumbnailUrl: thumbUrl } }),
                                  });
                                } catch {}
                              }
                            }
                          }
                        } catch {}
                      }
                    }
                  }
                }
              }
            } catch {}

            // LocalStorage fallback per short code
            if (!styledDataUrl) {
              try {
                const raw = window.localStorage.getItem(`qrDesigner:${it.short_code}`);
                if (raw) {
                  const opts = JSON.parse(raw);
                  if (opts && typeof opts === 'object') {
                    const svg = await generateStyledSvgString(it.short_url, opts as SavedOptions);
                    if (svg) styledDataUrl = await rasterizeSvgToPng(svg, 128);
                  }
                }
              } catch {}
            }

            if (styledDataUrl) return { ...it, qr_data_url: styledDataUrl };

            // Fallback to default simple QR if no style exists or failed
            const dataUrl = await robustDefaultDataUrl(it.short_url);
            return { ...it, qr_data_url: dataUrl };
          })
        );

        setItems(generated);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to load QR codes");
      } finally {
        setLoading(false);
      }
    })();
  }, [origin]);

  // Download SVG for a QR item using styled builder (same as Designer export)
async function handleDownloadSvg(shortUrl: string, code: string) {
  try {
    const svg = await buildStyledSvgOrDefault(shortUrl, code);
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `qr-${code}.svg`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (e) {
    console.error('Failed to generate SVG', e);
  }
}

  // Download high-resolution PNG for a QR item using styled SVG rasterization
async function handleDownloadPng(shortUrl: string, code: string) {
  try {
    const svg = await buildStyledSvgOrDefault(shortUrl, code);
    const pngDataUrl = await rasterizeSvgToPng(svg, 2048);
    const a = document.createElement('a');
    a.href = pngDataUrl;
    a.download = `qr-${code}@2x.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } catch (e) {
    console.error('Failed to generate PNG', e);
  }
}

  // (customizer handled entirely in dedicated page)

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)]">QR Codes</h1>
        <Link className="btn btn-primary h-9" href="/dashboard/create">Create</Link>
      </header>

      {/* No always-visible designer. Customizer opens only when user clicks the button. */}

      {loading ? (
        <div className="p-4 text-sm text-[var(--muted)]" role="status" aria-live="polite">Loading…</div>
      ) : error ? (
        <div className="p-4 text-sm text-red-600" role="alert">{error}</div>
      ) : items.length === 0 ? (
        <div className="p-4 text-sm text-[var(--muted)]" aria-live="polite">No links yet. Create your first one to generate a QR code.</div>
      ) : (
        <div className="grid auto-rows-fr gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {items.slice((page-1)*pageSize, page*pageSize).map((it) => (
            <div key={it.short_code} className="rounded-xl glass p-5 flex flex-col gap-3 h-full">
              <div className="flex items-center justify-between">
                <div className="font-mono text-sm">/{it.short_code}</div>
                <div className="text-xs text-[var(--muted)]">{new Date(it.created_at).toLocaleDateString()}</div>
              </div>
              <div className="truncate text-sm" title={it.target_url}>{it.target_url}</div>
              <div className="rounded-md p-3 self-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                {it.qr_data_url ? (
                  /^https?:/i.test(it.qr_data_url)
                    ? (
                        <img src={it.qr_data_url} alt={`QR for ${it.short_url}`} width={128} height={128} className="w-32 h-32" loading="lazy" decoding="async" fetchPriority="low" sizes="128px" />
                      )
                    : (
                        <Image src={it.qr_data_url} alt={`QR for ${it.short_url}`} width={128} height={128} className="w-32 h-32" loading="lazy" />
                      )
                ) : (
                  <div className="w-32 h-32 grid place-items-center text-sm text-[var(--muted)]">QR</div>
                )}
              </div>
              <div className="mt-auto pt-1 grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadSvg(it.short_url, it.short_code)}
                  className="btn btn-secondary h-9 w-full inline-flex items-center justify-center gap-2 px-3 whitespace-nowrap tip"
                  aria-label="Download QR as SVG"
                  data-tip="Download SVG"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M12 3v10.586l3.293-3.293 1.414 1.414L12 17.414l-4.707-4.707 1.414-1.414L11 13.586V3h2Z"/>
                    <path d="M19 18H5v3h14v-3Z"/>
                  </svg>
                  <span className="leading-none">SVG</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDownloadPng(it.short_url, it.short_code)}
                  className="btn btn-primary h-9 w-full inline-flex items-center justify-center gap-2 px-3 whitespace-nowrap tip"
                  aria-label="Download QR as PNG"
                  data-tip="Download high-res PNG"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M12 3v10.586l3.293-3.293 1.414 1.414L12 17.414l-4.707-4.707 1.414-1.414L11 13.586V3h2Z"/>
                    <path d="M19 18H5v3h14v-3Z"/>
                  </svg>
                  <span className="leading-none">PNG</span>
                </button>

                <Link
                  className="btn btn-secondary h-9 w-full inline-flex items-center justify-center gap-2 px-3 whitespace-nowrap tip"
                  href={`/dashboard/qrcodes/customize?url=${encodeURIComponent(it.short_url)}`}
                  aria-label="Customize QR"
                  data-tip="Customize QR"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25Zm3.92 1.33H5.5v-1.41l8.56-8.56 1.41 1.41-8.55 8.56ZM20.71 7.04a1 1 0 0 0 0-1.41L18.37 3.29a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83Z"/>
                  </svg>
                  <span className="leading-none">QR</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Simple Pagination Controls */}
      {!loading && !error && items.length > pageSize && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <button className="btn btn-secondary h-9" onClick={() => setPage((p) => Math.max(1, p-1))} disabled={page === 1}>Prev</button>
          <div className="text-sm">Page {page} of {Math.max(1, Math.ceil(items.length / pageSize))}</div>
          <button className="btn btn-secondary h-9" onClick={() => setPage((p) => Math.min(Math.ceil(items.length / pageSize), p+1))} disabled={page >= Math.ceil(items.length / pageSize)}>Next</button>
        </div>
      )}
    </div>
  );
}

// Local helper types mirroring Designer
type DotsType = "dots" | "rounded" | "classy" | "classy-rounded" | "square" | "extra-rounded";
type DotsOpts = NonNullable<QRStyleOptions["dotsOptions"]>;
type BgOpts = NonNullable<QRStyleOptions["backgroundOptions"]>;

interface SavedOptions {
  perfMode?: boolean;
  dotsType?: DotsType;
  dotsColor?: string;
  dotsGradientOn?: boolean;
  dotsGradA?: string;
  dotsGradB?: string;
  dotsGradRotation?: number;
  cornerSquareType?: "dot" | "square" | "extra-rounded";
  cornerSquareColor?: string;
  cornerDotType?: "dot" | "square";
  cornerDotColor?: string;
  bgColor?: string;
  bgGradientOn?: boolean;
  bgGradA?: string;
  bgGradB?: string;
  bgGradType?: "linear" | "radial";
  logoUrl?: string;
  logoSize?: number;
  hideBgDots?: boolean;
  ecLevel?: 'L' | 'M' | 'Q' | 'H';
  margin?: number;
}

// Ensure we can always render a basic QR data URL
async function robustDefaultDataUrl(data: string): Promise<string> {
  const attempt = async (opts: QRCodeToDataURLOptions) => {
    return await QRCode.toDataURL(data, opts);
  };
  try {
    return await attempt({ errorCorrectionLevel: 'M', margin: 1, color: { dark: '#0b1220', light: '#ffffff' }, width: 200 });
  } catch {}
  try {
    return await attempt({ errorCorrectionLevel: 'M', margin: 0, color: { dark: '#000000', light: '#ffffff' }, width: 200 });
  } catch {}
  try {
    return await attempt({ errorCorrectionLevel: 'L', margin: 0, color: { dark: '#000000', light: '#ffffff' }, width: 160 });
  } catch {}
  // last resort: transparent pixel
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"/>');
}

function isDataUrl(u: string): boolean { return typeof u === 'string' && u.startsWith('data:'); }

// Convert a URL (same-origin recommended) to a data URL
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

// Build a styled SVG data URL using qr-code-styling and saved options
async function generateStyledSvgDataUrl(data: string, saved: SavedOptions): Promise<string | null> {
  try {
    const perfMode = !!saved?.perfMode;
    const dotsType: DotsType | undefined = saved?.dotsType;
    const normHex = (c: string) => c.trim().toLowerCase();
    const hexToRgb = (hex: string) => {
      const h = hex.replace('#','');
      const bigint = parseInt(h.length === 3 ? h.split('').map(x=>x+x).join('') : h, 16);
      return { r: (bigint>>16)&255, g: (bigint>>8)&255, b: bigint&255 };
    }
    const luminance = (hex: string) => {
      const {r,g,b} = hexToRgb(hex);
      const a = [r,g,b].map(v=>{ v/=255; return v<=0.03928? v/12.92 : Math.pow((v+0.055)/1.055, 2.4) }) as [number, number, number];
      return 0.2126*a[0] + 0.7152*a[1] + 0.0722*a[2];
    }
    const baseDotsColor = typeof saved?.dotsColor === 'string' ? saved.dotsColor : '#0b1220';
    const rawBgColor = typeof saved?.bgColor === 'string' ? saved.bgColor : '#ffffff';
    const same = normHex(baseDotsColor) === normHex(rawBgColor);
    const contrastDots = luminance(rawBgColor) > 0.5 ? '#000000' : '#ffffff';
    const safeDotsColor = same ? contrastDots : baseDotsColor;
    const dotsGradientOn = !!saved?.dotsGradientOn;
    const dotsGradA = typeof saved?.dotsGradA === 'string' ? saved.dotsGradA : '#000000';
    const dotsGradB = typeof saved?.dotsGradB === 'string' ? saved.dotsGradB : '#000000';
    const dotsGradRotation = Number.isFinite(saved?.dotsGradRotation) ? Number(saved.dotsGradRotation) : 0;

    const cornerSquareType = saved?.cornerSquareType ?? 'square';
    const cornerSquareColor = typeof saved?.cornerSquareColor === 'string' ? saved.cornerSquareColor : '#0b1220';
    const cornerDotType = saved?.cornerDotType ?? 'dot';
    const cornerDotColor = typeof saved?.cornerDotColor === 'string' ? saved.cornerDotColor : '#0b1220';

    const bgColor = rawBgColor;
    const bgGradientOn = !!saved?.bgGradientOn;
    const bgGradA = typeof saved?.bgGradA === 'string' ? saved.bgGradA : '#ffffff';
    const bgGradB = typeof saved?.bgGradB === 'string' ? saved.bgGradB : '#e2e8f0';
    const bgGradType = saved?.bgGradType === 'radial' ? 'radial' : 'linear';

    let logoUrl = typeof saved?.logoUrl === 'string' ? saved.logoUrl : '';
    if (logoUrl && !isDataUrl(logoUrl)) {
      const inlined = await toDataUrl(logoUrl);
      if (inlined) logoUrl = inlined;
      else logoUrl = '';// prevent broken external refs inside data: SVGs
    }
    const logoSize = Number.isFinite(saved?.logoSize) ? Math.max(0, Math.min(1, Number(saved.logoSize))) : 0.25;
    const hideBgDots = !!saved?.hideBgDots;

    const ecLevel = ((): 'L'|'M'|'Q'|'H' => {
      const x = saved?.ecLevel;
      return x === 'L' || x === 'Q' || x === 'H' ? x : 'M';
    })();
    const margin = Number.isFinite(saved?.margin) ? Math.max(0, Number(saved.margin)) : 1;

    const dots: DotsOpts | { color: string; type: DotsType } = dotsGradientOn
      ? {
          type: (dotsType ?? 'rounded'),
          color: safeDotsColor,
          gradient: {
            type: 'linear',
            rotation: dotsGradRotation,
            colorStops: [
              { offset: 0, color: dotsGradA },
              { offset: 1, color: dotsGradB },
            ],
          },
        }
      : { type: (dotsType ?? 'rounded'), color: safeDotsColor };

    const bg: BgOpts | { color: string } = bgGradientOn
      ? {
          color: bgColor,
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

    const opts: QRStyleOptions = {
      width: 200,
      height: 200,
      data,
      type: 'svg',
      margin,
      qrOptions: { errorCorrectionLevel: ecLevel },
      dotsOptions: perfMode ? { color: safeDotsColor, type: 'square' } : (dots as DotsOpts),
      cornersSquareOptions: { type: cornerSquareType, color: cornerSquareColor },
      cornersDotOptions: { type: cornerDotType, color: cornerDotColor },
      backgroundOptions: perfMode ? { color: bgColor } : (bg as BgOpts),
      image: logoUrl || undefined,
      imageOptions: { imageSize: logoSize, hideBackgroundDots: hideBgDots, crossOrigin: 'anonymous' },
    };

    const tmp = new QRCodeStyling(opts);
    // Prefer direct SVG via getRawData to avoid DOM timing issues
    let svgText: string | null = null;
    const maybeRaw = tmp as unknown as { getRawData?: (type?: 'svg') => Promise<Blob> };
    if (typeof maybeRaw.getRawData === 'function') {
      try {
        const blob = await maybeRaw.getRawData('svg');
        svgText = await blob.text();
      } catch {}
    }
    if (!svgText) {
      // Fallback: render into a detached DIV and query the SVG
      const tmpDiv = document.createElement('div');
      tmp.append(tmpDiv);
      let svgNode: SVGSVGElement | null = null;
      for (let i = 0; i < 60; i++) {
        await new Promise<void>((r) => requestAnimationFrame(() => r()));
        svgNode = tmpDiv.querySelector('svg');
        if (svgNode) break;
        await new Promise((r) => setTimeout(r, 8));
      }
      if (!svgNode) return null;
      svgText = new XMLSerializer().serializeToString(svgNode);
    }
    svgText = svgText.replace(/<\?xml[^>]*>/, '').replace(/<!DOCTYPE[^>]*>/, '');
    const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgText)}`;
    return dataUrl;
  } catch {
    return null;
  }
}

// Build a styled SVG string (raw XML) using qr-code-styling
async function generateStyledSvgString(data: string, saved: SavedOptions): Promise<string | null> {
  try {
    const perfMode = !!saved?.perfMode;
    const dotsType: DotsType | undefined = saved?.dotsType;
    const normHex = (c: string) => c.trim().toLowerCase();
    const baseDotsColor = typeof saved?.dotsColor === 'string' ? saved.dotsColor : '#0b1220';
    const safeDotsColor = normHex(baseDotsColor) === normHex(saved?.bgColor ?? '') ? '#0b1220' : baseDotsColor;
    const dotsGradientOn = !!saved?.dotsGradientOn;
    const dotsGradA = typeof saved?.dotsGradA === 'string' ? saved.dotsGradA : '#000000';
    const dotsGradB = typeof saved?.dotsGradB === 'string' ? saved.dotsGradB : '#000000';
    const dotsGradRotation = Number.isFinite(saved?.dotsGradRotation) ? Number(saved.dotsGradRotation) : 0;

    const cornerSquareType = saved?.cornerSquareType ?? 'square';
    const cornerSquareColor = typeof saved?.cornerSquareColor === 'string' ? saved.cornerSquareColor : '#0b1220';
    const cornerDotType = saved?.cornerDotType ?? 'dot';
    const cornerDotColor = typeof saved?.cornerDotColor === 'string' ? saved.cornerDotColor : '#0b1220';

    const bgColor = typeof saved?.bgColor === 'string' ? saved.bgColor : '#ffffff';
    const bgGradientOn = !!saved?.bgGradientOn;
    const bgGradA = typeof saved?.bgGradA === 'string' ? saved.bgGradA : '#ffffff';
    const bgGradB = typeof saved?.bgGradB === 'string' ? saved.bgGradB : '#e2e8f0';
    const bgGradType = saved?.bgGradType === 'radial' ? 'radial' : 'linear';

    let logoUrl = typeof saved?.logoUrl === 'string' ? saved.logoUrl : '';
    if (logoUrl && !isDataUrl(logoUrl)) {
      const inlined = await toDataUrl(logoUrl);
      logoUrl = inlined || '';
    }
    const logoSize = Number.isFinite(saved?.logoSize) ? Math.max(0, Math.min(1, Number(saved.logoSize))) : 0.25;
    const hideBgDots = !!saved?.hideBgDots;

    const ecLevel = ((): 'L'|'M'|'Q'|'H' => {
      const x = saved?.ecLevel; return x === 'L' || x === 'Q' || x === 'H' ? x : 'M';
    })();
    const margin = Number.isFinite(saved?.margin) ? Math.max(0, Number(saved.margin)) : 1;

    const dots: DotsOpts | { color: string; type: DotsType } = dotsGradientOn
      ? { type: (dotsType ?? 'rounded'), color: safeDotsColor, gradient: { type: 'linear', rotation: dotsGradRotation, colorStops: [ { offset: 0, color: dotsGradA }, { offset: 1, color: dotsGradB } ] } }
      : { type: (dotsType ?? 'rounded'), color: safeDotsColor };

    const bg: BgOpts | { color: string } = bgGradientOn
      ? { color: bgColor, gradient: { type: bgGradType, rotation: 0, colorStops: [ { offset: 0, color: bgGradA }, { offset: 1, color: bgGradB } ] } }
      : { color: bgColor };

    const opts: QRStyleOptions = {
      width: 200,
      height: 200,
      data,
      type: 'svg',
      margin,
      qrOptions: { errorCorrectionLevel: ecLevel },
      dotsOptions: perfMode ? { color: safeDotsColor, type: 'square' } : (dots as DotsOpts),
      cornersSquareOptions: { type: cornerSquareType, color: cornerSquareColor },
      cornersDotOptions: { type: cornerDotType, color: cornerDotColor },
      backgroundOptions: perfMode ? { color: bgColor } : (bg as BgOpts),
      image: logoUrl || undefined,
      imageOptions: { imageSize: logoSize, hideBackgroundDots: hideBgDots, crossOrigin: 'anonymous' },
    };

    const tmp = new QRCodeStyling(opts);
    let svgText: string | null = null;
    const maybeRaw = tmp as unknown as { getRawData?: (type?: 'svg') => Promise<Blob> };
    if (typeof maybeRaw.getRawData === 'function') {
      try { const blob = await maybeRaw.getRawData('svg'); svgText = await blob.text(); } catch {}
    }
    if (!svgText) {
      const tmpDiv = document.createElement('div');
      tmp.append(tmpDiv);
      let svgNode: SVGSVGElement | null = null;
      for (let i = 0; i < 60; i++) {
        await new Promise<void>((r) => requestAnimationFrame(() => r()));
        svgNode = tmpDiv.querySelector('svg');
        if (svgNode) break;
        await new Promise((r) => setTimeout(r, 8));
      }
      if (!svgNode) return null;
      svgText = new XMLSerializer().serializeToString(svgNode);
    }
    svgText = svgText.replace(/<\?xml[^>]*>/, '').replace(/<!DOCTYPE[^>]*>/, '');
    return svgText;
  } catch {
    return null;
  }
}

// Try saved options from API/localStorage, else default QR SVG
async function buildStyledSvgOrDefault(shortUrl: string, shortCode: string): Promise<string> {
  let opts: SavedOptions | null = null;
  try {
    const { data } = await supabaseClient.auth.getSession();
    const token = data.session?.access_token;
    if (token) {
      const resStyle = await fetch(`/api/qr?code=${encodeURIComponent(shortCode)}`, { headers: { Authorization: `Bearer ${token}` } });
      if (resStyle.ok) {
        const { options } = await resStyle.json();
        if (options && typeof options === 'object') opts = options as SavedOptions;
      }
    }
  } catch {}
  if (!opts) {
    try { const raw = window.localStorage.getItem(`qrDesigner:${shortCode}`); if (raw) opts = JSON.parse(raw) as SavedOptions; } catch {}
  }
  if (opts) {
    const svg = await generateStyledSvgString(shortUrl, opts);
    if (svg) return svg;
  }
  const svg = await QRCode.toString(shortUrl, { type: 'svg', errorCorrectionLevel: 'M', margin: 1, color: { dark: '#0b1220', light: '#ffffff' } } as QRCodeToStringOptions);
  return svg;
}

// Rasterize SVG XML into a PNG data URL
async function rasterizeSvgToPng(svgText: string, exportOuter: number): Promise<string> {
  const svgBlob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);
  try {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.src = url;
    await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = rej; });
    const canvas = document.createElement('canvas');
    canvas.width = exportOuter; canvas.height = exportOuter;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('no ctx');
    ctx.imageSmoothingEnabled = false;
    ctx.imageSmoothingQuality = 'low';
    ctx.drawImage(img, 0, 0, exportOuter, exportOuter);
    return canvas.toDataURL('image/png');
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Convert a data URL (e.g., PNG) into a Blob without refetching
function dataUrlToBlob(dataUrl: string): Blob {
  const [meta, base64] = dataUrl.split(',');
  const mimeMatch = /data:([^;]+);/.exec(meta || '');
  const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
  const binary = atob(base64 || '');
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

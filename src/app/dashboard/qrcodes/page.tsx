"use client";

import { useEffect, useMemo, useState } from "react";
import type { QRCodeToStringOptions } from "qrcode";
import Link from "next/link";
import Image from "next/image";
import QRCode from "qrcode";
import { supabaseClient } from "@/lib/supabaseClient";
// Customization moved to a dedicated page: /dashboard/qrcodes/customize

type LinkRow = { short_code: string; target_url: string; created_at: string };

type QRItem = LinkRow & { short_url: string; qr_data_url: string | null };

// (formerly used by modal customizer)

export default function QRCodesPage() {
  const [items, setItems] = useState<QRItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
                color: { dark: "#0b1220", light: "#ffffff" },
                width: 200,
              });
              return { ...it, qr_data_url: dataUrl };
            } catch {
              return it; // leave qr_data_url null
            }
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

  // Download SVG for a QR item (transparent background, tight bounds)
  async function handleDownloadSvg(shortUrl: string, code: string) {
    try {
      const options: QRCodeToStringOptions = {
        type: 'svg',
        errorCorrectionLevel: 'M',
        margin: 0,
        color: { dark: '#0b1220', light: 'transparent' },
      };
      const svg = await QRCode.toString(shortUrl, options);
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
      // no-op; could surface toast if desired
      console.error('Failed to generate SVG', e);
    }
  }

  // Download high-resolution PNG for a QR item (transparent background)
  async function handleDownloadPng(shortUrl: string, code: string) {
    try {
      const dataUrl = await QRCode.toDataURL(shortUrl, {
        errorCorrectionLevel: 'M',
        margin: 0,
        color: { dark: '#0b1220', light: 'transparent' },
        width: 2048, // high-res output
      });
      const a = document.createElement('a');
      a.href = dataUrl;
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
          {items.map((it) => (
            <div key={it.short_code} className="rounded-xl glass p-5 flex flex-col gap-3 h-full">
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

    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
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
  const [prefersDark, setPrefersDark] = useState<boolean>(false);
  // All customizer state removed in favor of dedicated page

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
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to load QR codes");
      } finally {
        setLoading(false);
      }
    })();
  }, [origin, prefersDark]);

  // (customizer handled entirely in dedicated page)

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
                <a
                  className="btn btn-secondary h-8 whitespace-nowrap inline-flex items-center gap-2 px-3"
                  href={it.short_url}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Open short link in new tab"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M14 3h7v7h-2V6.414l-9.293 9.293-1.414-1.414L17.586 5H14V3Z"/>
                    <path d="M19 19H5V5h7V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7h-2v7Z"/>
                  </svg>
                  <span className="leading-none">Open</span>
                </a>
                {it.qr_data_url ? (
                  <a
                    className="btn btn-primary btn-no-motion h-8 whitespace-nowrap inline-flex items-center gap-2 px-3"
                    href={it.qr_data_url}
                    download={`qr-${it.short_code}.png`}
                    aria-label="Download QR as PNG"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                      <path d="M12 3v10.586l3.293-3.293 1.414 1.414L12 17.414l-4.707-4.707 1.414-1.414L11 13.586V3h2Z"/>
                      <path d="M19 18H5v3h14v-3Z"/>
                    </svg>
                    <span className="leading-none">PNG</span>
                  </a>
                ) : null}
                <Link
                  className="btn btn-secondary h-8 whitespace-nowrap inline-flex items-center gap-2 px-3"
                  href={`/dashboard/qrcodes/customize?url=${encodeURIComponent(it.short_url)}`}
                  aria-label="Customize QR"
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

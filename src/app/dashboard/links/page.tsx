"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { supabaseClient } from "@/lib/supabaseClient";

type LinkRow = { short_code: string; target_url: string; created_at: string };

export default function LinksIndexPage() {
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openCode, setOpenCode] = useState<string | null>(null);
  const [qrFor, setQrFor] = useState<string>("");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [prefersDark, setPrefersDark] = useState<boolean>(false);

  const origin = useMemo(() => (typeof window !== "undefined" ? window.location.origin : ""), []);

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
        setLinks(payload.links || []);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to load links");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Dark mode detection for QR color
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
    const update = () => setPrefersDark(!!mql?.matches);
    update();
    mql?.addEventListener?.('change', update);
    return () => mql?.removeEventListener?.('change', update);
  }, []);

  // Generate QR when target changes or theme changes
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!qrFor) { setQrDataUrl(null); return; }
      try {
        const dataUrl = await QRCode.toDataURL(qrFor, {
          errorCorrectionLevel: "M",
          margin: 1,
          color: { dark: prefersDark ? "#ffffff" : "#0b1220", light: "#ffffff00" },
          width: 200,
        });
        if (!cancelled) setQrDataUrl(dataUrl);
      } catch {
        if (!cancelled) setQrDataUrl(null);
      }
    })();
    return () => { cancelled = true; };
  }, [qrFor, prefersDark]);

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)]">Links</h1>
        <Link className="btn btn-primary" href="/dashboard/create">Create</Link>
      </header>

      {loading ? (
        <div className="p-4 text-sm text-[var(--muted)]">Loading…</div>
      ) : error ? (
        <div className="p-4 text-sm text-red-600">{error}</div>
      ) : links.length === 0 ? (
        <div className="p-4 text-sm text-[var(--muted)]">No links yet. Create your first one.</div>
      ) : (
        <div className="rounded-xl glass overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-[color-mix(in_oklab,var(--foreground)_65%,#64748b)]">
              <tr>
                <th className="p-3">Short</th>
                <th className="p-3">Target</th>
                <th className="p-3">Created</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {links.map((l) => (
                <tr key={l.short_code} className="border-t border-[var(--border)] hover:bg-[color-mix(in_oklab,var(--accent)_8%,var(--surface))] transition-colors">
                  <td className="p-3 font-mono">
                    <a className="underline" href={`/${l.short_code}`} target="_blank" rel="noreferrer">
                      /{l.short_code}
                    </a>
                  </td>
                  <td className="p-3 max-w-[420px] truncate" title={l.target_url}>{l.target_url}</td>
                  <td className="p-3">{new Date(l.created_at).toLocaleString()}</td>
                  <td className="p-3">
                    <div className="relative inline-flex items-center gap-2" onMouseLeave={() => { setOpenCode(null); setQrFor(""); }}>
                      <button
                        className="btn h-8"
                        onClick={() => {
                          const code = l.short_code;
                          if (openCode === code) {
                            setOpenCode(null);
                            setQrFor("");
                          } else {
                            setOpenCode(code);
                            setQrFor(`${origin}/${code}`);
                          }
                        }}
                      >QR</button>
                      <Link className="btn btn-secondary h-8" href={`/dashboard/links/${l.short_code}`}>View</Link>
                      {openCode === l.short_code && (
                        <div className="absolute right-0 top-[calc(100%+6px)] z-20 w-64 rounded-xl glass p-3" style={{ boxShadow: '0 10px 30px color-mix(in oklab, var(--foreground) 12%, transparent)' }}>
                          <div className="rounded-md p-3 flex flex-col items-center gap-2" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                            {qrDataUrl ? (
                              <>
                                <Image src={qrDataUrl} alt="QR" width={160} height={160} className="w-40 h-40" />
                                <a className="btn h-8 w-full justify-center" href={qrDataUrl} download={`qr-${l.short_code}.png`}>Download PNG</a>
                              </>
                            ) : (
                              <div className="text-sm text-[var(--muted)]">Generating…</div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

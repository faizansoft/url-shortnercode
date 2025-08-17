"use client";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { supabaseClient } from "@/lib/supabaseClient";

type LinkRow = { short_code: string; target_url: string; created_at: string };

export default function DashboardHome() {
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showQR, setShowQR] = useState(false);
  const [qrFor, setQrFor] = useState<string>("");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [prefersDark, setPrefersDark] = useState<boolean>(false);
  const [copied, setCopied] = useState<string | null>(null);

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
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)]">
          Dashboard
        </h1>
        <Link href="/dashboard/create" className="btn btn-primary">
          Create Short Link
        </Link>
      </header>

      <section className="rounded-xl glass overflow-x-auto">
        <div className="p-4 border-b/0 font-medium">Recent Links</div>
        {loading ? (
          <div className="p-4 text-sm text-[var(--muted)]">Loading…</div>
        ) : error ? (
          <div className="p-4 text-sm text-red-600">{error}</div>
        ) : links.length === 0 ? (
          <div className="p-4 text-sm text-[var(--muted)]">No links yet. Create your first one!</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-[color-mix(in_oklab,var(--foreground)_65%,#64748b)]">
              <tr>
                <th className="p-3">Code</th>
                <th className="p-3">Target</th>
                <th className="p-3">Created</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {links.map((r) => (
                <tr key={r.short_code} className="border-t border-[var(--border)] hover:bg-[color-mix(in_oklab,var(--accent)_8%,var(--surface))] transition-colors">
                  <td className="p-3 font-mono">{r.short_code}</td>
                  <td className="p-3 max-w-[520px] truncate">{r.target_url}</td>
                  <td className="p-3">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="p-3 text-right">
                    <div className="inline-flex items-center gap-2">
                      <button
                        className="btn btn-secondary h-8 inline-flex items-center gap-1"
                        onClick={() => {
                          setQrFor(`${origin}/${r.short_code}`);
                          setShowQR(true);
                        }}
                        title="Show QR"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 3h8v8H3V3zm2 2v4h4V5H5zm6-2h8v8h-8V3zm2 2v4h4V5h-4zM3 13h8v8H3v-8zm2 2v4h4v-4H5zm10 0h-2v2h2v-2zm2 0v2h2v-2h-2zm-4 4h-2v2h2v-2zm4 0h-2v2h2v-2zm2 0v2h2v-2h-2z"/></svg>
                        QR
                      </button>
                      <Link href={`/dashboard/links/${r.short_code}`} className="btn btn-secondary h-8">View</Link>
                      <button
                        className="btn btn-secondary h-8"
                        onClick={async () => {
                          const url = `${origin}/${r.short_code}`;
                          try { await navigator.clipboard.writeText(url); setCopied(r.short_code); setTimeout(() => setCopied(null), 1500); } catch {}
                        }}
                        title="Copy link"
                      >{copied === r.short_code ? "Copied" : "Copy"}</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {showQR && (
        <div className="fixed inset-0 z-50 grid place-items-center" style={{ background: 'color-mix(in oklab, var(--surface) 60%, transparent)' }}>
          <div className="w-[min(96vw,560px)] rounded-xl glass p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-lg font-semibold">Share & download QR</div>
              <button className="btn btn-secondary h-8" onClick={() => { setShowQR(false); setQrFor(""); }}>Close</button>
            </div>
            <div className="rounded-md p-4 flex flex-col items-center gap-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              {qrDataUrl ? (
                <>
                  <Image src={qrDataUrl} alt="QR" width={200} height={200} className="w-52 h-52" />
                  <div className="flex flex-wrap justify-center gap-2 w-full">
                    <a className="btn h-8" href={qrDataUrl} download={`qr-${qrFor.replace(`${origin}/`, '')}.png`}>Download PNG</a>
                    <button className="btn h-8" onClick={async () => { try { await navigator.clipboard.writeText(qrFor); setCopied("modal"); setTimeout(()=>setCopied(null),1500);} catch {} }}>{copied === "modal" ? "Copied" : "Copy link"}</button>
                    <a className="btn h-8" href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(qrFor)}`} target="_blank" rel="noreferrer">Share on X</a>
                    <a className="btn h-8" href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(qrFor)}`} target="_blank" rel="noreferrer">Facebook</a>
                    <a className="btn h-8" href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(qrFor)}`} target="_blank" rel="noreferrer">LinkedIn</a>
                    <a className="btn h-8" href={`https://api.whatsapp.com/send?text=${encodeURIComponent(qrFor)}`} target="_blank" rel="noreferrer">WhatsApp</a>
                  </div>
                </>
              ) : (
                <div className="text-sm text-[var(--muted)]">Generating…</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

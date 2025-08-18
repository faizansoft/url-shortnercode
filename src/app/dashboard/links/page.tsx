"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import QRCode from "qrcode";
import { supabaseClient } from "@/lib/supabaseClient";

type LinkRow = { short_code: string; target_url: string; created_at: string };

export default function LinksIndexPage() {
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showQR, setShowQR] = useState(false);
  const [qrFor, setQrFor] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [showShareLink, setShowShareLink] = useState(false);
  const [shareFor, setShareFor] = useState("");
  const [prefersDark, setPrefersDark] = useState<boolean>(false);
  const [copied, setCopied] = useState<string | null>(null);

  const origin = useMemo(() => (typeof window !== "undefined" ? window.location.origin : ""), []);
  const searchParams = useSearchParams();
  const q = (searchParams.get("q") || "").toLowerCase();

  const filteredLinks = useMemo(() => {
    if (!q) return links;
    return links.filter((l) =>
      l.short_code.toLowerCase().includes(q) ||
      l.target_url.toLowerCase().includes(q)
    );
  }, [links, q]);

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
    if (!showQR) return;
    if (!qrFor) return;
    let cancelled = false;
    (async () => {
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
  }, [showQR, qrFor]);

  async function handleShareQR() {
    try {
      if (!qrDataUrl || !qrFor) return;
      if (navigator.share) {
        // Convert data URL to File
        const res = await fetch(qrDataUrl);
        const blob = await res.blob();
        const file = new File([blob], "qr.png", { type: blob.type || "image/png" });
        // Some platforms require files plus text/url
        await navigator.share({
          files: [file],
          text: `Scan or open: ${qrFor}`,
          url: qrFor,
          title: "Share QR"
        });
      } else {
        // Fallback: open Twitter intent with link (cannot attach image)
        window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(qrFor)}`,'_blank');
      }
    } catch (e) {
      // ignore errors from dismissing share sheet
    }
  }

  async function handleShareLink() {
    try {
      if (!shareFor) return;
      if (navigator.share) {
        await navigator.share({ url: shareFor, title: "Share link", text: shareFor });
      } else {
        window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareFor)}`,'_blank');
      }
    } catch (e) { /* ignore */ }
  }

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
              {filteredLinks.length === 0 ? (
                <tr>
                  <td className="p-4 text-[var(--muted)]" colSpan={4}>No matches for &ldquo;{q}&rdquo;</td>
                </tr>
              ) : null}
              {filteredLinks.map((l) => (
                <tr key={l.short_code} className="border-t border-[var(--border)] hover:bg-[color-mix(in_oklab,var(--accent)_8%,var(--surface))] transition-colors">
                  <td className="p-3 font-mono">
                    <a className="underline" href={`/${l.short_code}`} target="_blank" rel="noreferrer">
                      /{l.short_code}
                    </a>
                  </td>
                  <td className="p-3 max-w-[420px] truncate tip" data-tip={l.target_url}>{l.target_url}</td>
                  <td className="p-3">{new Date(l.created_at).toLocaleString()}</td>
                  <td className="p-3">
                    <div className="inline-flex items-center gap-2">
                      <button
                        className="btn btn-secondary h-9 inline-flex items-center gap-1 tip"
                        onClick={() => { setQrFor(`${origin}/${l.short_code}`); setShowQR(true); }}
                        data-tip="Share QR"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M3 3h8v8H3V3zm2 2v4h4V5H5zm6-2h8v8h-8V3zm2 2v4h4V5h-4zM3 13h8v8H3v-8zm2 2v4h4v-4H5zm10 0h-2v2h2v-2zm2 0v2h2v-2h-2zm-4 4h-2v2h2v-2zm4 0h-2v2h2v-2zm2 0v2h2v-2h-2z"/></svg>
                        Share QR
                      </button>
                      <button
                        className="btn btn-secondary h-9 inline-flex items-center gap-1 tip"
                        onClick={() => { setShareFor(`${origin}/${l.short_code}`); setShowShareLink(true); }}
                        data-tip="Share Link"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M3.9 12a4 4 0 0 1 4-4H11v2H7.9a2 2 0 1 0 0 4H11v2H7.9a4 4 0 0 1-4-4Zm9.1-2h3.1a4 4 0 1 1 0 8H13v-2h3.1a2 2 0 1 0 0-4H13V10Zm-4 2h6v2H9v-2Z"/></svg>
                        Share Link
                      </button>
                      <Link className="btn btn-ghost h-9 inline-flex items-center gap-1" href={`/dashboard/links/${l.short_code}`}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M12 5c3.86 0 7 3.14 7 7s-3.14 7-7 7-7-3.14-7-7 3.14-7 7-7Zm0-2C6.48 3 2 7.48 2 13s4.48 10 10 10 10-4.48 10-10S17.52 3 12 3Zm0 5a5 5 0 0 0-5 5h2a3 3 0 1 1 3 3v2a5 5 0 0 0 0-10Z"/></svg>
                        View
                      </Link>
                      
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showShareLink && (
        <div className="fixed inset-0 z-50 grid place-items-center" style={{ background: 'color-mix(in oklab, var(--surface) 60%, transparent)' }}>
          <div className="w-[min(96vw,560px)] rounded-xl glass p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-lg font-semibold">Share short link</div>
              <button className="btn btn-ghost h-9" onClick={() => { setShowShareLink(false); setShareFor(""); }}>Close</button>
            </div>
            <div className="rounded-md p-4 flex flex-col items-center gap-4 w-full" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="w-full text-center break-all font-mono text-sm px-3 py-2 rounded-md" style={{ background: 'color-mix(in oklab, var(--surface) 94%, #fff 6%)', border: '1px solid var(--border)' }}>
                {shareFor}
              </div>
              <div className="flex flex-wrap justify-center gap-2 w-full">
                <button
                  className="btn btn-secondary h-9 px-4 inline-flex items-center gap-2 tip"
                  onClick={async () => { try { await navigator.clipboard.writeText(shareFor); setCopied(shareFor); setTimeout(()=>setCopied(null),1500);} catch {} }}
                  data-tip="Copy link"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M8 7a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2V7Zm-3 3h1v8a3 3 0 0 0 3 3h8v1H9a4 4 0 0 1-4-4v-8Z"/></svg>
                  {copied === shareFor ? 'Copied' : 'Copy'}
                </button>
                <button
                  className="btn btn-secondary h-9 px-4 inline-flex items-center gap-2 tip"
                  onClick={handleShareLink}
                  data-tip="Share link"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M18 8a3 3 0 1 0-2.815-4H15a3 3 0 0 0 0 6 2.99 2.99 0 0 0 2.815-2H18ZM6 14a3 3 0 1 0 2.815 4H9a3 3 0 0 0 0-6 2.99 2.99 0 0 0-2.815 2H6Zm9.5-5.5-7 4m7 1.5-7 4" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Share
                </button>
              </div>
              <div className="w-full h-px" style={{ background: 'var(--border)' }} />
              <div className="w-full">
                <div className="text-sm mb-2 text-center text-[color-mix(in_oklab,var(--foreground)_80%,#666)]">Share</div>
                <div className="flex justify-center gap-3 flex-wrap">
                  <a className="btn btn-secondary h-9 w-12 p-0 inline-grid place-items-center" aria-label="Share on X" href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareFor)}`} target="_blank" rel="noreferrer">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M18.244 2H21l-6.56 7.49L22.5 22H15.4l-5.14-6.68L3.62 22H1l7.06-8.06L1.5 2h7.26l4.64 6.13L18.244 2Zm-2.45 18h1.7L8.32 4h-1.7l9.174 16Z"/></svg>
                  </a>
                  <a className="btn btn-secondary h-9 w-12 p-0 inline-grid place-items-center" aria-label="Share on Facebook" href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareFor)}`} target="_blank" rel="noreferrer">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M13.5 22v-8h2.6l.4-3h-3V8.2c0-.9.3-1.5 1.6-1.5H17V4.1c-.3 0-1.2-.1-2.2-.1-2.2 0-3.8 1.3-3.8 3.9V11H8v3h3v8h2.5Z"/></svg>
                  </a>
                  <a className="btn btn-secondary h-9 w-12 p-0 inline-grid place-items-center" aria-label="Share on LinkedIn" href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareFor)}`} target="_blank" rel="noreferrer">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M6.94 6.5A2.44 2.44 0 1 1 2.06 6.5a2.44 2.44 0 0 1 4.88 0ZM3 21.5h3.9V9.03H3V21.5Zm7.2-12.47H14V10c.6-1.2 2.01-2.2 4.16-2.2 4.45 0 5.27 2.76 5.27 6.35v7.36h-3.9v-6.53c 0-1.56-.03-3.56-2.17-3.56-2.17 0-2.5 1.7-2.5 3.45v6.64H8.2V9.03h1.99Z"/></svg>
                  </a>
                  <a className="btn btn-secondary h-9 w-12 p-0 inline-grid place-items-center" aria-label="Share on WhatsApp" href={`https://api.whatsapp.com/send?text=${encodeURIComponent(shareFor)}`} target="_blank" rel="noreferrer">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M20.5 3.5A11 11 0 0 0 3.02 17.6L2 22l 4.5-1.02A11 11 0 1 0 20.5 3.5Zm-8.5 18a9 9 0 0 1-4.59-1.27l-.33-.2-2.72 .62.58-2.65-.22-.34a9 9 0 1 1 7.28 3.84Zm5.15-6.51c-.28-.14-1.65-.82-1.9-.91-.25-.09-.44-.14-.62 .14-.19 .28-.72 .9-.88 1.08-.16 .19-.33 .21-.61 .07-.28-.14-1.17-.43-2.23-1.36-.82-.73-1.38-1.63-1.54-1.91-.16-.28-.02-.43 .12-.57 .12-.12 .28-.33 .42-.49 .14-.16 .19-.28 .28-.47 .09-.19 .05-.35-.02-.49-.07-.14-.62-1.49-.85-2.05-.22-.53-.45-.46-.62-.46l-.53-.01c-.19 0-.49 .07-.75 .35-.26 .28-.98 .96-.98 2.34 0 1.38 1.01 2.72 1.14 2.9 .14 .19 1.99 3.04 4.83 4.26.68 .29 1.21 .46 1.63 .59 .68 .22 1.3 .19 1.79 .12 .55-.08 1.65-.67 1.88-1.31 .23-.65 .23-1.19 .16-1.31-.07-.12-.26-.19-.54-.33Z"/></svg>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {showQR && (
        <div className="fixed inset-0 z-50 grid place-items-center" style={{ background: 'color-mix(in oklab, var(--surface) 60%, transparent)' }}>
          <div className="w-[min(96vw,560px)] rounded-xl glass p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-lg font-semibold">Share & download QR</div>
              <button className="btn btn-ghost h-9" onClick={() => { setShowQR(false); setQrFor(""); }}>Close</button>
            </div>
            <div className="rounded-md p-4 flex flex-col items-center gap-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              {qrDataUrl ? (
                <>
                  <Image src={qrDataUrl} alt="QR" width={200} height={200} className="w-52 h-52" />
                  <div className="flex flex-wrap justify-center gap-2 w-full">
                    <div className="flex gap-2">
                      <a
                        className="btn btn-primary btn-no-motion h-9 px-5 inline-flex items-center gap-2"
                        href={qrDataUrl}
                        download={`qr-${qrFor.replace(`${origin}/`, '')}.png`}
                      >
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                          <path d="M12 3a1 1 0 0 1 1 1v8.586l2.293-2.293a1 1 0 1 1 1.414 1.414l-4 4a1 1 0 0 1-1.414 0l-4-4A1 1 0 0 1 8.707 10.293L11 12.586V4a1 1 0 0 1 1-1Z"/>
                          <path d="M5 19a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2a1 1 0 1 0-2 0v2H7v-2a1 1 0 1 0-2 0v2Z"/>
                        </svg>
                        Download PNG
                      </a>
                      <button
                        className="btn btn-secondary h-9 px-4 inline-flex items-center gap-2 tip"
                        onClick={handleShareQR}
                        data-tip="Share QR image + link"
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M18 8a3 3 0 1 0-2.815-4H15a3 3 0 0 0 0 6 2.99 2.99 0 0 0 2.815-2H18ZM6 14a3 3 0 1 0 2.815 4H9a3 3 0 0 0 0-6 2.99 2.99 0 0 0-2.815 2H6Zm9.5-5.5-7 4m7 1.5-7 4" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        Share QR
                      </button>
                    </div>
                  </div>
                  <div className="w-full h-px" style={{ background: 'var(--border)' }} />
                  <div className="w-full">
                    <div className="text-sm mb-2 text-center text-[color-mix(in_oklab,var(--foreground)_80%,#666)]">Share</div>
                    <div className="flex justify-center gap-3 flex-wrap">
                      <a className="btn btn-secondary h-9 w-12 p-0 inline-grid place-items-center" aria-label="Share on X" href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(qrFor)}`} target="_blank" rel="noreferrer">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M18.244 2H21l-6.56 7.49L22.5 22H15.4l-5.14-6.68L3.62 22H1l7.06-8.06L1.5 2h7.26l4.64 6.13L18.244 2Zm-2.45 18h1.7L8.32 4h-1.7l9.174 16Z"/></svg>
                      </a>
                      <a className="btn btn-secondary h-9 w-12 p-0 inline-grid place-items-center" aria-label="Share on Facebook" href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(qrFor)}`} target="_blank" rel="noreferrer">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M13.5 22v-8h2.6l.4-3h-3V8.2c0-.9.3-1.5 1.6-1.5H17V4.1c-.3 0-1.2-.1-2.2-.1-2.2 0-3.8 1.3-3.8 3.9V11H8v3h3v8h2.5Z"/></svg>
                      </a>
                      <a className="btn btn-secondary h-9 w-12 p-0 inline-grid place-items-center" aria-label="Share on LinkedIn" href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(qrFor)}`} target="_blank" rel="noreferrer">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M6.94 6.5A2.44 2.44 0 1 1 2.06 6.5a2.44 2.44 0 0 1 4.88 0ZM3 21.5h3.9V9.03H3V21.5Zm7.2-12.47H14V10c.6-1.2 2.01-2.2 4.16-2.2 4.45 0 5.27 2.76 5.27 6.35v7.36h-3.9v-6.53c 0-1.56-.03-3.56-2.17-3.56-2.17 0-2.5 1.7-2.5 3.45v6.64H8.2V9.03h1.99Z"/></svg>
                      </a>
                      <a className="btn btn-secondary h-9 w-12 p-0 inline-grid place-items-center" aria-label="Share on WhatsApp" href={`https://api.whatsapp.com/send?text=${encodeURIComponent(qrFor)}`} target="_blank" rel="noreferrer">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M20.5 3.5A11 11 0 0 0 3.02 17.6L2 22l 4.5-1.02A11 11 0 1 0 20.5 3.5Zm-8.5 18a9 9 0 0 1-4.59-1.27l-.33-.2-2.72 .62.58-2.65-.22-.34a9 9 0 1 1 7.28 3.84Zm5.15-6.51c-.28-.14-1.65-.82-1.9-.91-.25-.09-.44-.14-.62 .14-.19 .28-.72 .9-.88 1.08-.16 .19-.33 .21-.61 .07-.28-.14-1.17-.43-2.23-1.36-.82-.73-1.38-1.63-1.54-1.91-.16-.28-.02-.43 .12-.57 .12-.12 .28-.33 .42-.49 .14-.16 .19-.28 .28-.47 .09-.19 .05-.35-.02-.49-.07-.14-.62-1.49-.85-2.05-.22-.53-.45-.46-.62-.46l-.53-.01c-.19 0-.49 .07-.75 .35-.26 .28-.98 .96-.98 2.34 0 1.38 1.01 2.72 1.14 2.9 .14 .19 1.99 3.04 4.83 4.26.68 .29 1.21 .46 1.63 .59 .68 .22 1.3 .19 1.79 .12 .55-.08 1.65-.67 1.88-1.31 .23-.65 .23-1.19 .16-1.31-.07-.12-.26-.19-.54-.33Z"/></svg>
                      </a>
                    </div>
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

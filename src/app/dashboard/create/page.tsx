"use client";
<<<<<<< HEAD
import { useEffect, useState } from "react";
import Image from "next/image";
import QRCode from "qrcode";
=======
import { useState } from "react";
>>>>>>> 0e1f9ed (Initial commit)
import { supabaseClient } from "@/lib/supabaseClient";

export default function CreateLinkPage() {
  const [url, setUrl] = useState("");
  const [code, setCode] = useState("");
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<{ code: string; shortUrl: string } | null>(null);
<<<<<<< HEAD
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ kind: "success" | "error"; msg: string } | null>(null);
  const [prefersDark, setPrefersDark] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
    const update = () => setPrefersDark(!!mql?.matches);
    update();
    mql?.addEventListener?.('change', update);
    return () => mql?.removeEventListener?.('change', update);
  }, []);
=======
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ kind: "success" | "error"; msg: string } | null>(null);
>>>>>>> 0e1f9ed (Initial commit)

  function validateUrl(u: string) {
    try {
      const parsed = new URL(u);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  }

<<<<<<< HEAD
  // Generate QR when created or theme changes
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (created?.shortUrl) {
        try {
          const dataUrl = await QRCode.toDataURL(created.shortUrl, {
            errorCorrectionLevel: "M",
            margin: 1,
            color: { dark: prefersDark ? "#ffffff" : "#0b1220", light: "#ffffff00" },
            width: 200,
          });
          if (!cancelled) setQrDataUrl(dataUrl);
        } catch {
          if (!cancelled) setQrDataUrl(null);
        }
      } else {
        setQrDataUrl(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [created?.shortUrl, prefersDark]);

=======
>>>>>>> 0e1f9ed (Initial commit)
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreated(null);
    setError(null);
    if (!validateUrl(url)) {
      setCreating(false);
      setError("Please enter a valid http(s) URL");
      return;
    }
    try {
      const { data } = await supabaseClient.auth.getSession();
      const token = data.session?.access_token;

      const res = await fetch("/api/links", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ target_url: url, code: code || undefined }),
      });

      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error || "Failed to create link");

      const shortCode: string = payload?.short_code;
      if (!shortCode) throw new Error("No short code returned");

<<<<<<< HEAD
      const shortUrl = `${window.location.origin}/${shortCode}`;
      setCreated({ code: shortCode, shortUrl });
      setToast({ kind: "success", msg: "Link created successfully" });
      setTimeout(() => setToast(null), 2500);
      setTimeout(() => {
        navigator.clipboard.writeText(shortUrl).then(() => {
          setCopied(true);
          setToast({ kind: "success", msg: "Copied to clipboard" });
          setTimeout(() => setToast(null), 2000);
          setTimeout(() => setCopied(false), 1200);
        });
      }, 1000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setError(msg);
      setToast({ kind: "error", msg });
=======
      setCreated({ code: shortCode, shortUrl: `${window.location.origin}/${shortCode}` });
      setToast({ kind: "success", msg: "Link created successfully" });
      setTimeout(() => setToast(null), 2500);
    } catch (err: any) {
      setError(err?.message ?? "Something went wrong");
      setToast({ kind: "error", msg: err?.message ?? "Something went wrong" });
>>>>>>> 0e1f9ed (Initial commit)
      setTimeout(() => setToast(null), 3000);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
<<<<<<< HEAD
        <h1 className="text-2xl font-semibold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)]">Create short link</h1>
=======
        <h1 className="text-2xl font-semibold tracking-tight">Create short link</h1>
>>>>>>> 0e1f9ed (Initial commit)
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <section className="lg:col-span-2 rounded-xl glass p-5">
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm text-[var(--muted)]">Destination URL</label>
              <input
                type="url"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/my-long-url"
<<<<<<< HEAD
                className="w-full h-11 px-3 rounded-md outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[color-mix(in_oklab,var(--accent)_30%,transparent)]"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
=======
                className="w-full h-11 px-3 rounded-md bg-white/5 border border-white/10 outline-none focus:border-[var(--accent)]"
>>>>>>> 0e1f9ed (Initial commit)
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-[var(--muted)]">Custom code (optional)</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\s+/g, "-"))}
                placeholder="your-alias"
<<<<<<< HEAD
                className="w-full h-11 px-3 rounded-md outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[color-mix(in_oklab,var(--accent)_30%,transparent)]"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
=======
                className="w-full h-11 px-3 rounded-md bg-white/5 border border-white/10 outline-none focus:border-[var(--accent)]"
>>>>>>> 0e1f9ed (Initial commit)
              />
            </div>
            {error && (
              <div className="text-sm text-red-600">{error}</div>
            )}
            <div className="flex gap-3">
<<<<<<< HEAD
              <button disabled={creating || !url || !validateUrl(url)} className="btn btn-primary h-9">
=======
              <button
                disabled={creating || !url || !validateUrl(url)}
                className="px-4 h-10 rounded-md bg-[var(--accent)] text-white disabled:opacity-50"
              >
>>>>>>> 0e1f9ed (Initial commit)
                {creating ? "Creating…" : "Create link"}
              </button>
              <button
                type="button"
<<<<<<< HEAD
                className="btn btn-secondary h-9"
=======
                className="px-4 h-10 rounded-md border border-white/10 hover:bg-white/5"
>>>>>>> 0e1f9ed (Initial commit)
                onClick={() => {
                  setUrl("");
                  setCode("");
                  setCreated(null);
                  setError(null);
                }}
              >
                Reset
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-xl glass p-5 space-y-3">
          <div className="text-sm text-[var(--muted)]">Preview</div>
          {created ? (
            <div className="space-y-3">
              <div className="text-sm">Short URL</div>
<<<<<<< HEAD
              <div className="p-3 rounded-md font-mono text-sm" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                {created.shortUrl}
              </div>
              <div className="flex gap-2">
                <a className="btn btn-secondary h-9" href={created.shortUrl} target="_blank" rel="noreferrer">Open</a>
                <button className="btn btn-secondary h-9" onClick={async () => {
                  await navigator.clipboard.writeText(created.shortUrl);
                  setCopied(true);
                  setToast({ kind: "success", msg: "Copied to clipboard" });
                  setTimeout(() => setToast(null), 2000);
                  setTimeout(() => setCopied(false), 1200);
                }}>{copied ? "Copied" : "Copy"}</button>
              </div>
              <div className="text-sm">QR code</div>
              {qrDataUrl ? (
                <div className="rounded-md p-3 space-y-3 flex flex-col items-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <Image src={qrDataUrl} alt="QR code for short URL" width={160} height={160} className="w-40 h-40" />
                  <div className="flex gap-2">
                    <a className="btn btn-primary h-9" href={qrDataUrl} download={`qr-${created.code}.png`}>Download PNG</a>
                  </div>
                </div>
              ) : (
                <div className="aspect-square w-40 rounded-md grid place-items-center font-semibold" style={{ background: 'var(--surface)', color: 'var(--foreground)', border: '1px solid var(--border)' }}>
                  QR
                </div>
              )}
=======
              <div className="p-3 rounded-md bg-white/5 border border-white/10 font-mono text-sm">
                {created.shortUrl}
              </div>
              <div className="flex gap-2">
                <a
                  className="btn btn-secondary h-8"
                  href={created.shortUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open
                </a>
                <button
                  className="btn h-8"
                  onClick={async () => {
                    await navigator.clipboard.writeText(created.shortUrl);
                    setToast({ kind: "success", msg: "Copied to clipboard" });
                    setTimeout(() => setToast(null), 2000);
                  }}
                >
                  Copy
                </button>
              </div>
              <div className="text-sm">QR (placeholder)</div>
              <div className="aspect-square w-40 bg-white rounded-md grid place-items-center text-black font-semibold">
                QR
              </div>
>>>>>>> 0e1f9ed (Initial commit)
            </div>
          ) : (
            <div className="text-sm text-[var(--muted)]">Fill the form to preview your link and QR.</div>
          )}
        </section>
      </div>
      {toast && (
        <div
          className={`fixed bottom-4 right-4 px-3 py-2 rounded-md shadow-lg text-sm ${
            toast.kind === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"
          }`}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}

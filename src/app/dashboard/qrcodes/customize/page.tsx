"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import QRCode from "qrcode";

export default function CustomizeQRPage() {
  const search = useSearchParams();
  const url = search.get("url") || "";

  const [prefersDark, setPrefersDark] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
    const update = () => setPrefersDark(!!mql?.matches);
    update();
    mql?.addEventListener?.('change', update);
    return () => mql?.removeEventListener?.('change', update);
  }, []);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [renderKey, setRenderKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!url || !containerRef.current) return;
    setLoading(true);
    setErr(null);
    const container = containerRef.current;
    container.innerHTML = "";
    const canvas = document.createElement('canvas');
    (async () => {
      try {
        await QRCode.toCanvas(canvas, url, {
          errorCorrectionLevel: "M",
          margin: 1,
          width: 320,
          color: {
            dark: prefersDark ? "#ffffff" : "#0b1220",
            light: "#ffffff00",
          },
        });
        container.appendChild(canvas);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Failed to render QR");
      } finally {
        setLoading(false);
      }
    })();
  }, [url, prefersDark, renderKey]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-lg font-semibold">QR Preview</div>
          <div className="text-xs text-[var(--muted)] break-all">{url}</div>
        </div>
        <div className="flex gap-2">
          <button className="btn h-8" onClick={() => setRenderKey(v => v + 1)}>Retry</button>
          <Link className="btn btn-secondary h-8" href="/dashboard/qrcodes">Back</Link>
        </div>
      </div>

      <div className="rounded-md p-4 grid place-items-center min-h-[380px]" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        {loading && <div className="w-[260px] h-[260px] rounded-md animate-pulse" style={{ background: 'var(--panel)' }} />}
        {!loading && err && <div className="text-sm text-red-600">{err}</div>}
        <div ref={containerRef} className="[&>canvas]:block" />
      </div>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";

function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export default function InterstitialClient({ code }: { code: string }) {
  const [target, setTarget] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [secLeft, setSecLeft] = useState(3);
  const sessionId = useMemo(() => uuid(), []);
  const startedAtRef = useRef<number>(Date.now());

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`/api/links?code=${encodeURIComponent(code)}`, { cache: 'no-store' });
        if (!res.ok) throw new Error('not found');
        const j = await res.json();
        const url = j?.link?.target_url as string | undefined;
        if (!url) throw new Error('not found');
        if (!alive) return;
        setTarget(url);
        // funnel: landing shown
        await fetch('/api/engagement', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'event', link_code: code, session_id: sessionId, step: 'landing_shown' }) });
        // start countdown
        const started = Date.now();
        startedAtRef.current = started;
        let left = 3;
        setSecLeft(left);
        const go = async () => {
          try {
            // funnel: redirect
            await fetch('/api/engagement', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'event', link_code: code, session_id: sessionId, step: 'redirect' }) });
            // session summary
            const duration_ms = Date.now() - startedAtRef.current;
            const payload = { type: 'session', link_code: code, session_id: sessionId, duration_ms, bounced: false, started_at: new Date(startedAtRef.current).toISOString(), ended_at: new Date().toISOString() };
            if (navigator.sendBeacon) {
              navigator.sendBeacon('/api/engagement', new Blob([JSON.stringify(payload)], { type: 'application/json' }));
            } else {
              await fetch('/api/engagement', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            }
          } catch { /* ignore */ }
          // navigate
          window.location.replace(url);
        };
        const t = setInterval(() => { left -= 1; setSecLeft(left); if (left <= 0) { clearInterval(t); go(); } }, 1000);
      } catch {
        setError('Link not found');
      }
    })();
    return () => { alive = false; };
  }, [code, sessionId]);

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ maxWidth: 520, width: '100%', textAlign: 'center' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Redirecting…</h1>
        {error ? (
          <p style={{ color: '#b91c1c' }}>{error}</p>
        ) : (
          <>
            <p style={{ color: '#4b5563', marginBottom: 8 }}>You are being redirected to the destination.</p>
            {target && <p style={{ fontSize: 12, color: '#6b7280', wordBreak: 'break-all' }}>{target}</p>}
            <p style={{ marginTop: 16, color: '#374151' }}>Continuing in {secLeft}s…</p>
            <p style={{ fontSize: 12, color: '#6b7280', marginTop: 8 }}>If you are not redirected, <a href={target ?? '#'} onClick={(e) => { if (!target) e.preventDefault(); }} style={{ color: '#2563eb' }}>click here</a>.</p>
          </>
        )}
      </div>
    </div>
  );
}

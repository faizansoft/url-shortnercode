"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabaseClient } from "@/lib/supabaseClient";

type LinkDetail = {
  id: string;
  short_code: string;
  target_url: string;
  user_id: string | null;
  created_at: string;
};

type ClickRow = {
  created_at: string;
  referrer: string | null;
  ip: string | null;
};

export default function LinkDetailsPage() {
  const params = useParams<{ code: string }>();
  const code = params.code;

  const [link, setLink] = useState<LinkDetail | null>(null);
  const [clicks, setClicks] = useState<ClickRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [daily, setDaily] = useState<Record<string, number>>({});
  const [topReferrers, setTopReferrers] = useState<Array<{ referrer: string; count: number }>>([]);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabaseClient.auth.getSession();
        const token = data.session?.access_token;
        const res = await fetch(`/api/links?code=${encodeURIComponent(code)}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const payload = await res.json();
        if (!res.ok) throw new Error(payload?.error || "Failed to load link");
        setLink(payload.link);
        setClicks(payload.clicks || []);
        setDaily(payload.daily || {});
        setTopReferrers(payload.topReferrers || []);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to load link");
      } finally {
        setLoading(false);
      }
    })();
  }, [code]);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <div className="text-sm"><Link href="/dashboard">← Back to Dashboard</Link></div>
          <h1 className="text-2xl font-semibold tracking-tight mt-1 bg-clip-text text-transparent bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)]">Link Details</h1>
        </div>
        {link && (
          <a className="btn btn-secondary" href={`/${link.short_code}`} target="_blank" rel="noreferrer">
            Open /{link.short_code}
          </a>
        )}
      </header>

      {loading ? (
        <div className="p-4 text-sm text-[var(--muted)]">Loading…</div>
      ) : error ? (
        <div className="p-4 text-sm text-red-600">{error}</div>
      ) : !link ? (
        <div className="p-4 text-sm text-[var(--muted)]">Not found.</div>
      ) : (
        <>
          <section className="rounded-xl glass p-5 space-y-3">
            <div className="text-sm text-[var(--muted)]">Short URL</div>
            <div className="font-mono">{`${window.location.origin}/${link.short_code}`}</div>
            <div className="text-sm text-[var(--muted)]">Target</div>
            <div className="truncate">{link.target_url}</div>
            <div className="text-sm text-[var(--muted)]">Created</div>
            <div>{new Date(link.created_at).toLocaleString()}</div>
          </section>

          <section className="rounded-xl glass p-5">
            <div className="p-0 pb-3 font-medium">Daily Clicks (last 30 days)</div>
            <DailyLineChart daily={daily} />
          </section>

          <section className="rounded-xl glass p-5">
            <div className="p-0 pb-3 font-medium">Top Referrers</div>
            {topReferrers.length === 0 ? (
              <div className="text-sm text-[var(--muted)]">No referrer data yet.</div>
            ) : (
              <ul className="space-y-2">
                {topReferrers.map((r) => (
                  <li key={r.referrer} className="flex items-center gap-3">
                    <div className="w-40 truncate" title={r.referrer}>{r.referrer}</div>
                    <div className="flex-1 h-2 bg-gray-100 rounded">
                      <div
                        className="h-2 rounded bg-[var(--accent)]"
                        style={{ width: `${(r.count / Math.max(...topReferrers.map(t => t.count))) * 100}%` }}
                      />
                    </div>
                    <div className="w-10 text-right tabular-nums">{r.count}</div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-xl glass overflow-x-auto">
            <div className="p-4 border-b/0 font-medium">Recent Clicks</div>
            {clicks.length === 0 ? (
              <div className="p-4 text-sm text-[var(--muted)]">No clicks yet.</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="text-left text-[color-mix(in_oklab,var(--foreground)_65%,#64748b)]">
                  <tr>
                    <th className="p-3">Time</th>
                    <th className="p-3">Referrer</th>
                    <th className="p-3">IP</th>
                  </tr>
                </thead>
                <tbody>
                  {clicks.map((c, i) => (
                    <tr key={i} className="border-t border-[var(--border)] hover:bg-[color-mix(in_oklab,var(--accent)_8%,var(--surface))] transition-colors">
                      <td className="p-3">{new Date(c.created_at).toLocaleString()}</td>
                      <td className="p-3 max-w-[420px] truncate">{c.referrer || "—"}</td>
                      <td className="p-3">{c.ip || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function DailyLineChart({ daily }: { daily: Record<string, number> }) {
  const entries = Object.entries(daily).sort((a, b) => a[0].localeCompare(b[0]));
  const total = entries.reduce((s, [, v]) => s + v, 0);
  if (entries.length === 0 || total === 0) {
    return <div className="text-sm text-[var(--muted)] h-[220px] grid place-items-center">No clicks in the last 30 days</div>;
  }
  const labels = entries.map(([d]) => d);
  const values = entries.map(([, v]) => v);
  const max = Math.max(1, ...values);

  const w = Math.max(360, Math.min(1200, labels.length * 24));
  const h = 220;
  const pad = { l: 28, r: 16, t: 16, b: 28 };
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;

  const pts = values.map((v, i) => {
    const x = pad.l + (labels.length === 1 ? innerW / 2 : (i / (labels.length - 1)) * innerW);
    const y = pad.t + innerH - (v / max) * innerH;
    return [x, y] as const;
  });

  const path = pts.map((p, i) => (i === 0 ? `M ${p[0]},${p[1]}` : `L ${p[0]},${p[1]}`)).join(' ');

  const [hover, setHover] = useState<number | null>(null);

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = (e.target as SVGElement).closest('svg')!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    // find nearest x
    let idx = 0;
    let best = Infinity;
    for (let i = 0; i < pts.length; i++) {
      const dx = Math.abs(pts[i][0] - x);
      if (dx < best) { best = dx; idx = i; }
    }
    setHover(idx);
  };

  const onLeave = () => setHover(null);

  const gradientId = `grad-${Math.random().toString(36).slice(2, 8)}`;

  return (
    <div className="relative overflow-x-auto">
      <svg width={w} height={h} className="block" onMouseMove={onMove} onMouseLeave={onLeave}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.32" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        <rect x={0} y={0} width={w} height={h} fill="transparent" />

        {/* gridlines */}
        {Array.from({ length: 5 }).map((_, i) => {
          const y = pad.t + (i / 4) * innerH;
          return (
            <line key={`g-${i}`} x1={pad.l} x2={w - pad.r} y1={y} y2={y} stroke="color-mix(in oklab, var(--surface) 85%, var(--foreground))" strokeWidth={1} />
          );
        })}

        {/* area fill */}
        <path d={`${path} L ${pad.l + innerW},${pad.t + innerH} L ${pad.l},${pad.t + innerH} Z`} fill={`url(#${gradientId})`} />

        {/* line */}
        <path d={path} fill="none" stroke="var(--accent)" strokeWidth={2} />

        {/* points */}
        {pts.map(([x, y], i) => (
          <circle key={`p-${i}`} cx={x} cy={y} r={2.5} fill="var(--accent)" />
        ))}

        {/* x labels (sparse) */}
        {labels.map((d, i) => {
          const show = i % Math.max(1, Math.ceil(labels.length / 10)) === 0 || i === labels.length - 1;
          if (!show) return null;
          const x = pts[i][0];
          return (
            <text key={`x-${i}`} x={x} y={h - 8} textAnchor="middle" fontSize={10} fill="var(--muted)">{d.slice(8, 10)}</text>
          );
        })}

        {/* hover crosshair */}
        {hover !== null && (
          <g>
            <line x1={pts[hover][0]} x2={pts[hover][0]} y1={pad.t} y2={pad.t + innerH} stroke="var(--border)" strokeDasharray="3,3" />
            <circle cx={pts[hover][0]} cy={pts[hover][1]} r={4} fill="var(--background)" stroke="var(--accent)" />
          </g>
        )}
      </svg>

      {/* tooltip */}
      {hover !== null && (
        <div
          className="absolute px-2 py-1 rounded border text-xs shadow-sm"
          style={{
            left: Math.min(Math.max(pts[hover][0] - 40, 0), w - 100),
            top: Math.max(pts[hover][1] - 38, 0),
            background: 'var(--surface)',
            borderColor: 'var(--border)'
          }}
        >
          <div className="font-medium">{labels[hover]}</div>
          <div className="tabular-nums">{values[hover]} clicks</div>
        </div>
      )}
    </div>
  );
}

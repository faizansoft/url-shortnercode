"use client";

import { useEffect, useMemo, useState, useId, useRef, useCallback } from "react";
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

type EngagementPayload = {
  avgTimeOnPageSec: number | null;
  bounceRate: number | null; // percentage 0-100
  funnel: Array<{ step: string; count: number }>;
} | null;

export default function LinkDetailsPage() {
  const params = useParams<{ code: string }>();
  const code = params.code;

  const [link, setLink] = useState<LinkDetail | null>(null);
  const [clicks, setClicks] = useState<ClickRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [daily, setDaily] = useState<Record<string, number>>({});
  const [topReferrers, setTopReferrers] = useState<Array<{ referrer: string; count: number }>>([]);
  const [rangeDays, setRangeDays] = useState<7 | 30 | 90>(30);
  const [engagement, setEngagement] = useState<EngagementPayload>(null);

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
        setEngagement(payload.engagement || null);
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

          {/* Engagement widgets */}
          <section className="rounded-xl glass p-5">
            <div className="p-0 pb-3 font-medium">Engagement</div>
            {engagement ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <MetricCard title="Avg Time on Page" value={
                  engagement.avgTimeOnPageSec == null ? '—' : `${engagement.avgTimeOnPageSec}s`
                }/>
                <MetricCard title="Bounce Rate" value={
                  engagement.bounceRate == null ? '—' : `${engagement.bounceRate}%`
                }/>
                <div className="rounded-lg border p-4" style={{ borderColor: 'var(--border)' }}>
                  <div className="text-xs text-[var(--muted)] mb-2">Funnel</div>
                  {(!engagement.funnel || engagement.funnel.length === 0) ? (
                    <div className="text-sm text-[var(--muted)]">No funnel events yet.</div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead className="text-left text-[color-mix(in_oklab,var(--foreground)_65%,#64748b)]">
                        <tr>
                          <th className="py-1">Step</th>
                          <th className="py-1 text-right">Count</th>
                        </tr>
                      </thead>
                      <tbody>
                        {engagement.funnel.map((f) => (
                          <tr key={f.step} className="border-t border-[var(--border)]">
                            <td className="py-1 capitalize">{f.step.replace(/_/g,' ')}</td>
                            <td className="py-1 text-right tabular-nums">{f.count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-sm text-[var(--muted)]">No engagement data yet.</div>
            )}
          </section>

          <section className="rounded-xl glass p-5">
            <div className="flex items-center justify-between">
              <div className="p-0 pb-3 font-medium">Daily Clicks</div>
              <RangeSelector value={rangeDays} onChange={setRangeDays} />
            </div>
            <DailyLineChart daily={daily} rangeDays={rangeDays} />
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

function MetricCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-lg border p-4" style={{ borderColor: 'var(--border)' }}>
      <div className="text-xs text-[var(--muted)] mb-1">{title}</div>
      <div className="text-xl font-semibold">{value}</div>
    </div>
  );
}

function DailyLineChart({ daily, rangeDays }: { daily: Record<string, number>; rangeDays: 7 | 30 | 90 }) {
  // Hooks must be called unconditionally at the top level
  const [hover, setHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerW, setContainerW] = useState<number>(600);
  const rafId = useRef<number | null>(null);
  const lastX = useRef<number | null>(null);

  // Observe container width for responsiveness
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const cw = Math.max(0, Math.floor(entry.contentRect.width));
        if (!cw) continue;
        setContainerW((prev) => (cw !== prev ? cw : prev));
      }
    });
    ro.observe(el);
    // initial
    setContainerW(el.clientWidth || 600);
    return () => ro.disconnect();
  }, []);

  const entries = useMemo(() => Object.entries(daily).sort((a, b) => a[0].localeCompare(b[0])), [daily]);
  const sliced = useMemo(() => entries.slice(-rangeDays), [entries, rangeDays]);
  const total = useMemo(() => sliced.reduce((s, [, v]) => s + v, 0), [sliced]);
  const labels = useMemo(() => sliced.map(([d]) => d), [sliced]);
  const values = useMemo(() => sliced.map(([, v]) => v), [sliced]);
  const max = Math.max(1, ...values);

  const h = 220;
  const pad = { l: 28, r: 16, t: 16, b: 28 };
  // Ensure reasonable per-point spacing but fill available container width
  const minPerPoint = 28;
  const minContentW = labels.length > 1 ? (labels.length - 1) * minPerPoint + 1 : minPerPoint;
  const desiredW = pad.l + Math.max(minContentW, 0) + pad.r;
  const w = Math.max(containerW, desiredW);
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;

  const pts = useMemo(() => values.map((v, i) => {
    const x = pad.l + (labels.length === 1 ? innerW / 2 : (i / (labels.length - 1)) * innerW);
    const y = pad.t + innerH - (v / max) * innerH;
    return [x, y] as const;
  }), [values, labels, innerW, innerH, pad.l, pad.t, max]);

  // Straight polyline path
  const buildLinearPath = (points: ReadonlyArray<readonly [number, number]>) => {
    if (points.length === 0) return '';
    return points.map((p, i) => (i === 0 ? `M ${p[0]},${p[1]}` : `L ${p[0]},${p[1]}`)).join(' ');
  };

  // Catmull–Rom to cubic Bézier: curve interpolates THROUGH all points
  // Clamp control points to avoid over/undershoot (e.g., below zero between flat segments)
  const buildSmoothPath = useCallback((points: ReadonlyArray<readonly [number, number]>) => {
    const n = points.length;
    if (n === 0) return '';
    if (n === 1) return `M ${points[0][0]},${points[0][1]}`;
    let d = `M ${points[0][0]},${points[0][1]}`;
    for (let i = 0; i < n - 1; i++) {
      const p0 = points[Math.max(0, i - 1)];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[Math.min(n - 1, i + 2)];
      // Uniform Catmull-Rom with tension = 0.5 => factor = 1/6
      const c1x = p1[0] + (p2[0] - p0[0]) / 6;
      let c1y = p1[1] + (p2[1] - p0[1]) / 6;
      const c2x = p2[0] - (p3[0] - p1[0]) / 6;
      let c2y = p2[1] - (p3[1] - p1[1]) / 6;
      // Clamp control Y within the segment's Y-range and chart bounds to prevent dips/peaks
      const segMin = Math.min(p1[1], p2[1]);
      const segMax = Math.max(p1[1], p2[1]);
      const chartMinY = pad.t; // top
      const chartMaxY = pad.t + innerH; // bottom
      const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
      c1y = clamp(c1y, Math.max(segMin, chartMinY), Math.min(segMax, chartMaxY));
      c2y = clamp(c2y, Math.max(segMin, chartMinY), Math.min(segMax, chartMaxY));
      d += ` C ${c1x},${c1y} ${c2x},${c2y} ${p2[0]},${p2[1]}`;
    }
    return d;
  }, [innerH, pad.t]);
  const shouldSmooth = labels.length >= 5 && new Set(values).size > 1;
  const path = useMemo(() => (shouldSmooth ? buildSmoothPath(pts) : buildLinearPath(pts)), [pts, shouldSmooth, buildSmoothPath]);

  const pickNearest = useCallback((x: number) => {
    let idx = 0;
    let best = Infinity;
    for (let i = 0; i < pts.length; i++) {
      const dx = Math.abs(pts[i][0] - x);
      if (dx < best) { best = dx; idx = i; }
    }
    setHover(idx);
  }, [pts]);

  const onMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    lastX.current = e.clientX - rect.left;
    if (rafId.current == null) {
      rafId.current = requestAnimationFrame(() => {
        rafId.current = null;
        if (lastX.current != null) pickNearest(lastX.current);
      });
    }
  }, [pickNearest]);

  const onTouchMove = useCallback((e: React.TouchEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const touch = e.touches[0];
    lastX.current = touch.clientX - rect.left;
    if (rafId.current == null) {
      rafId.current = requestAnimationFrame(() => {
        rafId.current = null;
        if (lastX.current != null) pickNearest(lastX.current);
      });
    }
  }, [pickNearest]);

  const onLeave = () => setHover(null);

  const gradientId = useId();

  const noData = entries.length === 0 || total === 0;

  return (
    <div ref={containerRef} className="relative overflow-x-auto">
      {noData ? (
        <div className="text-sm text-[var(--muted)] h-[220px] grid place-items-center">No clicks in the selected range</div>
      ) : (
      <svg
        ref={svgRef}
        width={w}
        height={h}
        className="block"
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        onTouchStart={onTouchMove}
        onTouchMove={onTouchMove}
        onTouchEnd={onLeave}
        role="img"
        aria-label={`Daily clicks over time for last ${rangeDays} days`}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.32" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        <rect x={0} y={0} width={w} height={h} fill="transparent" />

        {/* gridlines + y-axis ticks */}
        {Array.from({ length: 5 }).map((_, i) => {
          const y = pad.t + (i / 4) * innerH;
          const val = Math.round((max * (1 - i / 4)));
          return (
            <g key={`g-${i}`}>
              <line x1={pad.l} x2={w - pad.r} y1={y} y2={y} stroke="color-mix(in oklab, var(--surface) 85%, var(--foreground))" strokeWidth={1} />
              {i !== 4 && (
                <text x={pad.l - 8} y={y + 3} textAnchor="end" fontSize={10} fill="var(--muted)">{val}</text>
              )}
            </g>
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
          <g pointerEvents="none">
            <line x1={pts[hover][0]} x2={pts[hover][0]} y1={pad.t} y2={pad.t + innerH} stroke="var(--border)" strokeDasharray="3,3" />
            <circle cx={pts[hover][0]} cy={pts[hover][1]} r={4} fill="var(--background)" stroke="var(--accent)" />
          </g>
        )}
      </svg>
      )}

      {/* tooltip */}
      {!noData && hover !== null && (
        <div
          className="absolute px-2 py-1 rounded border text-xs shadow-sm"
          style={{
            left: Math.min(Math.max(pts[hover][0] - 48, 8), w - 140),
            top: Math.max(pts[hover][1] - 38, 0),
            background: 'var(--surface)',
            borderColor: 'var(--border)',
            pointerEvents: 'none'
          }}
        >
          <div className="font-medium">
            {new Date(labels[hover]).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit' })}
          </div>
          <div className="tabular-nums">{values[hover]} clicks</div>
          {hover > 0 && (
            (() => {
              const prev = values[hover - 1] ?? 0;
              const diff = values[hover] - prev;
              const pct = prev > 0 ? (diff / prev) * 100 : (values[hover] > 0 ? 100 : 0);
              const sign = diff > 0 ? '+' : diff < 0 ? '−' : '';
              return (
                <div className="tabular-nums text-[var(--muted)]">{sign}{Math.abs(diff)} ({sign || ''}{Math.round(Math.abs(pct))}%) vs prev day</div>
              );
            })()
          )}
        </div>
      )}
    </div>
  );
}

function RangeSelector({ value, onChange }: { value: 7 | 30 | 90; onChange: (v: 7 | 30 | 90) => void }) {
  const options: Array<7 | 30 | 90> = [7, 30, 90];
  return (
    <div className="inline-flex items-center gap-1 rounded border px-1 py-1" style={{ borderColor: 'var(--border)' }}>
      {options.map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={
            `px-2 py-0.5 rounded text-xs ${v === value ? 'bg-[var(--accent)] text-white' : 'hover:bg-[color-mix(in_oklab,var(--accent)_10%,var(--surface))]'}`
          }
        >
          {v}d
        </button>
      ))}
    </div>
  );
}

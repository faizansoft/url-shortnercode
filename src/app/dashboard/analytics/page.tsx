"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseClient } from "@/lib/supabaseClient";
type Summary = { totalClicks: number; totalLinks: number };
type CountItem<TLabel extends string> = { [K in TLabel]: string } & { count: number };
type TopLink = { code: string; count: number };
type TopReferrer = CountItem<"referrer">;
type Device = CountItem<"device">;
type Browser = CountItem<"browser">;
type Os = CountItem<"os">;
type ReferrerDomain = CountItem<"domain">;

type AnalyticsData = {
  summary: Summary;
  daily: Record<string, number>;
  hourly: Record<string, number>;
  weekdays: Record<string, number>;
  topLinks: TopLink[];
  topReferrers: TopReferrer[];
  devices: Device[];
  browsers: Browser[];
  oses: Os[];
  referrerDomains: ReferrerDomain[];
  range?: { days: number };
};

// Aggregate daily series into weekly/monthly/yearly buckets
function aggregateSeries(pairs: Array<[string, number]>, granularity: 'daily'|'weekly'|'monthly'|'yearly'): Array<[string, number]> {
  if (granularity === 'daily') return pairs;
  const map = new Map<string, number>();
  for (const [d, v] of pairs) {
    const date = new Date(d);
    if (Number.isNaN(date.getTime())) {
      map.set('Other', (map.get('Other') || 0) + v);
      continue;
    }
    let key = '';
    if (granularity === 'weekly') {
      // ISO week key: YYYY-Www
      const tmp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
      const dayNum = tmp.getUTCDay() || 7;
      tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
      const weekNo = Math.ceil((((tmp as unknown as number) - (yearStart as unknown as number)) / 86400000 + 1) / 7);
      key = `${tmp.getUTCFullYear()}-W${String(weekNo).padStart(2,'0')}`;
    } else if (granularity === 'monthly') {
      key = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`;
    } else {
      key = String(date.getFullYear());
    }
    map.set(key, (map.get(key) || 0) + v);
  }
  return Array.from(map.entries()).sort((a,b) => a[0].localeCompare(b[0]));
}

export default function AnalyticsDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [days, setDays] = useState<7 | 30 | 90>(30);
  const [granularity, setGranularity] = useState<'daily'|'weekly'|'monthly'|'yearly'>('daily');

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabaseClient.auth.getSession();
        const token = data.session?.access_token;
        const res = await fetch(`/api/analytics?days=${days}` , {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const payload: unknown = await res.json();
        if (!res.ok) throw new Error((payload as { error?: string })?.error || "Failed to load analytics");
        setData(payload as AnalyticsData);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to load analytics");
      } finally {
        setLoading(false);
      }
    })();
  }, [days]);

  const dailySeries = useMemo(() => {
    const entries: Array<[string, number]> = data?.daily ? Object.entries(data.daily) : [];
    return entries.sort((a, b) => a[0].localeCompare(b[0]));
  }, [data]);

  const aggregatedSeries = useMemo(() => aggregateSeries(dailySeries, granularity), [dailySeries, granularity]);

  const hourlySeries = useMemo(() => {
    const entries: Array<[string, number]> = data?.hourly ? Object.entries(data.hourly) : [];
    return entries.sort((a, b) => Number(a[0]) - Number(b[0]));
  }, [data]);

  const weekdaySeries = useMemo(() => {
    const w = data?.weekdays || {};
    const order = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    return order.map((k) => [k, Number(w[k] || 0)]) as Array<[string, number]>;
  }, [data]);

  const dailyTotal = useMemo(() => dailySeries.reduce((s, [, v]) => s + v, 0), [dailySeries]);
  const hourlyTotal = useMemo(() => hourlySeries.reduce((s, [, v]) => s + v, 0), [hourlySeries]);
  const weekdayTotal = useMemo(() => weekdaySeries.reduce((s, [, v]) => s + v, 0), [weekdaySeries]);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)]">Analytics</h1>
      </header>

      {loading ? (
        <div className="p-4 text-sm text-[var(--muted)]">Loading…</div>
      ) : error ? (
        <div className="p-4 text-sm text-red-600">{error}</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard label="Total Clicks" value={data?.summary?.totalClicks ?? 0} />
            <StatCard label="Total Links" value={data?.summary?.totalLinks ?? 0} />
            <StatCard label="Avg Clicks / Link" value={avgClicks(data?.summary)} />
          </div>
          {/* Top row: top day + device donut */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <section className="rounded-xl glass p-5 lg:col-span-2">
              <div className="flex items-center justify-between">
                <div className="font-medium">Top performing date by total engagements</div>
                <div className="text-xs text-[var(--muted)]">Showing last {days} days</div>
              </div>
              <TopDay fromPairs={dailySeries} />
            </section>
            <section className="rounded-xl glass p-5">
              <div className="flex items-center justify-between">
                <div className="font-medium">Total engagements by device</div>
                <div className="text-xs text-[var(--muted)]">Donut</div>
              </div>
              <DonutChart
                items={(data?.devices ?? []).map((x) => ({ label: x.device, value: x.count }))}
              />
            </section>
          </div>

          {/* Row: line over time + referrer bars */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <section className="rounded-xl glass p-5 lg:col-span-2">
              <div className="flex items-center justify-between">
                <div className="font-medium">Total engagements over time</div>
                <div className="text-xs text-[var(--muted)]">{days}d</div>
              </div>
              {dailyTotal > 0 ? (
                <LineChart labels={aggregatedSeries.map(([d]) => d)} values={aggregatedSeries.map(([, v]) => v)} height={220} />
              ) : (
                <div className="text-sm text-[var(--muted)] h-[220px] grid place-items-center">No data</div>
              )}
            </section>
            <section className="rounded-xl glass p-5">
              <div className="flex items-center justify-between">
                <div className="font-medium">Total engagements by referrer</div>
                <div className="text-xs text-[var(--muted)]">Last 30d</div>
              </div>
              <ColumnChart items={(data?.referrerDomains ?? []).map((x) => ({ label: x.domain || 'direct', value: x.count }))} height={240} />
            </section>
          </div>

          {/* Row: weekday + hourly + filters */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <section className="rounded-xl glass p-5">
              <div className="p-0 pb-3 font-medium">Clicks by Weekday</div>
              {weekdayTotal > 0 ? (
                <DailyBars fromPairs={weekdaySeries} height={140} />
              ) : (
                <div className="text-sm text-[var(--muted)] h-[140px] flex items-center justify-center">No clicks recorded yet</div>
              )}
            </section>
            <section className="rounded-xl glass p-5">
              <div className="p-0 pb-3 font-medium">Clicks by Hour (last 24h)</div>
              {hourlyTotal > 0 ? (
                <DailyBars fromPairs={hourlySeries} height={140} />
              ) : (
                <div className="text-sm text-[var(--muted)] h-[140px] flex items-center justify-center">No clicks in the last 24 hours</div>
              )}
            </section>
            <aside className="rounded-xl glass p-5">
              <div className="p-0 pb-3 font-medium">Filters</div>
              <div className="flex items-center gap-2">
                <RangeBtn current={days} value={7} onClick={() => setDays(7)} label="7d" />
                <RangeBtn current={days} value={30} onClick={() => setDays(30)} label="30d" />
                <RangeBtn current={days} value={90} onClick={() => setDays(90)} label="90d" />
              </div>
              <div className="mt-3 text-xs text-[var(--muted)]">Daily range applies to charts.</div>
              <div className="mt-4">
                <div className="p-0 pb-2 font-medium text-sm">Granularity</div>
                <div className="inline-flex items-center rounded border p-1 gap-1 bg-[color-mix(in_oklab,var(--surface)_85%,transparent)] text-sm">
                  {(['daily','weekly','monthly','yearly'] as const).map(g => (
                    <button
                      key={g}
                      onClick={() => setGranularity(g)}
                      className={`px-3 py-1 rounded ${granularity===g? 'bg-[var(--surface)] border' : ''}`}
                      title={`Aggregate data ${g}`}
                    >
                      {g[0].toUpperCase()+g.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </aside>
          </div>
          </>
        )}
    </div>
  );
}

// Vertical column chart (with gridlines) for referrers
function ColumnChart({ items, height = 240 }: { items: Array<{ label: string; value: number }>; height?: number }) {
  const labels = items.map(i => i.label);
  const values = items.map(i => i.value);
  const max = Math.max(1, ...values);
  const barWidth = 36;
  const gap = 20;
  const padding = 28; // left/right padding
  const w = Math.max(320, padding * 2 + items.length * barWidth + (items.length - 1) * gap);
  const h = height;
  const chartTop = 10;
  const chartBottom = 28; // space for x labels
  const chartHeight = h - chartTop - chartBottom;
  const steps = 5; // gridlines count
  const yFor = (v: number) => chartTop + chartHeight - (v / max) * chartHeight;

  if (items.length === 0) {
    return <div className="text-sm text-[var(--muted)] h-[240px] grid place-items-center">No data</div>;
  }

  return (
    <div className="overflow-x-auto">
      <svg width={w} height={h} className="block">
        <rect x={0} y={0} width={w} height={h} fill="transparent" />
        {/* Horizontal gridlines */}
        {Array.from({ length: steps + 1 }).map((_, i) => {
          const y = chartTop + (i / steps) * chartHeight;
          return (
            <line key={i} x1={padding - 6} x2={w - padding + 6} y1={y} y2={y} stroke="color-mix(in oklab, var(--surface) 85%, var(--foreground))" strokeWidth={1} />
          );
        })}
        {/* Bars */}
        {items.map((it, i) => {
          const x = padding + i * (barWidth + gap);
          const y = yFor(it.value);
          const bh = Math.max(2, chartTop + chartHeight - y);
          return (
            <g key={i}>
              <rect x={x} y={y} width={barWidth} height={bh} rx={2} fill="var(--accent)" />
              <title>{`${labels[i]}: ${values[i]}`}</title>
              {/* value label above bar (optional) */}
              {/* <text x={x + barWidth / 2} y={y - 6} textAnchor="middle" className="tabular-nums" fontSize={11} fill="var(--foreground)">{it.value}</text> */}
              <text x={x + barWidth / 2} y={h - 8} textAnchor="middle" fontSize={11} fill="var(--foreground)">{labels[i]}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// Lightweight SVG line chart for daily engagements over time
function LineChart({ labels, values, height = 200 }: { labels: string[]; values: number[]; height?: number }) {
  const w = Math.max(240, Math.min(1200, labels.length * 28));
  const h = height;
  const max = Math.max(1, ...values);
  const pts = values.map((v, i) => [
    (i / Math.max(1, values.length - 1)) * (w - 40) + 20,
    h - (v / max) * (h - 30) - 10,
  ] as const);
  const d = pts.map((p, i) => (i === 0 ? `M ${p[0]},${p[1]}` : `L ${p[0]},${p[1]}`)).join(' ');
  return (
    <div className="overflow-x-auto">
      <svg width={w} height={h} className="block">
        <rect x={0} y={0} width={w} height={h} fill="transparent" />
        <path d={d} fill="none" stroke="var(--accent)" strokeWidth={2} >
          <title>Total engagements over time</title>
        </path>
        {pts.map(([x, y], i) => (
          <g key={i}>
            <circle cx={x} cy={y} r={3} fill="var(--accent)" />
            <title>{`${labels[i]}: ${values[i]}`}</title>
          </g>
        ))}
      </svg>
    </div>
  );
}

// Donut chart for categorical splits (e.g., devices)
function DonutChart({ items, size = 220 }: { items: Array<{ label: string; value: number }>; size?: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const totalVal = items.reduce((s, it) => s + it.value, 0);
  const total = totalVal || 1;
  const r = size / 2 - 12;
  const cx = size / 2;
  const cy = size / 2;
  const colors = ['#14b8a6', '#60a5fa', '#f59e0b', '#a78bfa', '#22c55e', '#f97316'];

  if (items.length === 0 || totalVal === 0) {
    return <div className="text-sm text-[var(--muted)] h-[220px] grid place-items-center">No data</div>;
  }

  let acc = 0; // accumulate fractions to compute arc start/end
  return (
    <div className="flex gap-4 items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="color-mix(in oklab, var(--surface) 85%, var(--foreground))" strokeWidth={18} />
        {items.map((it, i) => {
          const frac = it.value / total;
          const start = acc * 2 * Math.PI - Math.PI / 2;
          const end = (acc + frac) * 2 * Math.PI - Math.PI / 2;
          acc += frac;
          const x1 = cx + r * Math.cos(start), y1 = cy + r * Math.sin(start);
          const x2 = cx + r * Math.cos(end), y2 = cy + r * Math.sin(end);
          const large = end - start > Math.PI ? 1 : 0;
          const path = `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
          const active = hover === i;
          return (
            <path
              key={i}
              d={path}
              stroke={colors[i % colors.length]}
              strokeWidth={active ? 22 : 18}
              strokeOpacity={hover === null || active ? 1 : 0.45}
              fill="none"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              style={{ cursor: 'pointer', transition: 'all 120ms ease' }}
            >
              <title>{`${it.label}: ${it.value}`}</title>
            </path>
          );
        })}
        <text x={cx} y={cy - 6} textAnchor="middle" dominantBaseline="central" fontSize={18} fill="var(--foreground)">
          {totalVal}
        </text>
        {hover !== null && (
          <text x={cx} y={cy + 14} textAnchor="middle" dominantBaseline="central" fontSize={12} fill="var(--muted)">
            {items[hover].label} • {Math.round((items[hover].value / total) * 100)}%
          </text>
        )}
      </svg>
      <ul className="text-sm space-y-1">
        {items.map((it, i) => (
          <li
            key={i}
            className="flex items-center gap-2"
            title={`${it.label}: ${it.value}`}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            style={{ opacity: hover === null || hover === i ? 1 : 0.6, transition: 'opacity 120ms ease', cursor: 'default' }}
          >
            <span className="inline-block w-3 h-3 rounded-sm" style={{ background: colors[i % colors.length] }} />
            <span className="min-w-[96px]">{it.label}</span>
            <span className="tabular-nums ml-auto">{it.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Horizontal bar chart for ranked lists (e.g., referrers)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function HBarChart({ items }: { items: Array<{ label: string; value: number }> }) {
  const max = Math.max(1, ...items.map(i => i.value));
  return (
    <ul className="space-y-2">
      {items.map((it, i) => (
        <li key={i} className="flex items-center gap-3" title={`${it.label}: ${it.value}`}>
          <span className="w-32 truncate" title={it.label}>{it.label}</span>
          <div className="flex-1 h-3 rounded bg-[color-mix(in_oklab,var(--surface)_85%,var(--foreground))]">
            <div className="h-full rounded bg-[var(--accent)]" style={{ width: `${(it.value / max) * 100}%` }} />
          </div>
          <span className="w-14 text-right tabular-nums">{it.value}</span>
        </li>
      ))}
      {items.length === 0 && <li className="text-sm text-[var(--muted)]">No data</li>}
    </ul>
  );
}

// Highlights the best performing day
function TopDay({ fromPairs }: { fromPairs: Array<[string, number]> }) {
  if (fromPairs.length === 0) return <div className="text-sm text-[var(--muted)]">No data</div>;
  const best = fromPairs.reduce((a, b) => (b[1] > a[1] ? b : a));
  return (
    <div className="mt-2 flex items-center justify-between p-4 rounded border bg-[color-mix(in_oklab,var(--surface)_85%,transparent)]">
      <div>
        <div className="text-xl font-semibold">{new Date(best[0]).toDateString?.() || best[0]}</div>
        <div className="text-sm text-[var(--muted)]">Highest daily engagements</div>
      </div>
      <div className="text-3xl font-bold tabular-nums">{best[1]}</div>
    </div>
  );
}

function RangeBtn({ current, value, label, onClick }: { current: 7 | 30 | 90; value: 7 | 30 | 90; label: string; onClick: () => void }) {
  const active = current === value;
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-3 h-8 rounded-md text-sm border"
      style={{
        color: active ? 'var(--background)' : 'var(--foreground)',
        background: active ? 'var(--accent)' : 'transparent',
        borderColor: active ? 'transparent' : 'var(--border)'
      }}
      aria-pressed={active}
    >
      {label}
    </button>
  );
}

function avgClicks(summary?: Partial<Summary> | null) {
  const total = summary?.totalClicks ?? 0;
  const links = summary?.totalLinks ?? 0;
  if (!links) return 0;
  return Math.round((total / links) * 10) / 10;
}

function DailyBars({ fromPairs, height = 100, withLabels = true }: { fromPairs: Array<[string, number]>; height?: number; withLabels?: boolean }) {
  const max = Math.max(1, ...fromPairs.map(([, v]) => v));
  return (
    <div className="flex flex-col gap-2">
      <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${fromPairs.length || 1}, minmax(0,1fr))`, height }}>
        {fromPairs.map(([key, v]) => {
          const h = (v / max) * height;
          const innerH = v > 0 ? Math.max(2, Math.round(h)) : 0;
          return (
            <div
              key={key}
              className="relative rounded border"
              style={{
                background: 'color-mix(in oklab, var(--surface) 88%, var(--foreground))',
                borderColor: 'var(--border)'
              }}
              title={`${key}: ${v}`}
            >
              <div
                className="absolute bottom-0 left-0 right-0 bg-[var(--accent)] rounded"
                style={{ height: `${innerH}px` }}
              />
            </div>
          );
        })}
      </div>
      {withLabels && (
        <div className="grid gap-1 text-[10px] leading-3 text-[var(--muted)]" style={{ gridTemplateColumns: `repeat(${fromPairs.length || 1}, minmax(0,1fr))` }}>
          {fromPairs.map(([key], idx) => {
            const show = idx % Math.max(1, Math.ceil(fromPairs.length / 14)) === 0 || idx === fromPairs.length - 1;
            const dd = /\d{4}-\d{2}-\d{2}/.test(key) ? key.slice(8, 10) : key;
            return (
              <div key={`lbl-${key}`} className="text-center tabular-nums">
                {show ? dd : ''}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function RankedBars({ items }: { items: Array<{ label: string; count: number }> }) {
  const max = Math.max(1, ...items.map((i) => i.count));
  return (
    <ul className="space-y-2">
      {items.length === 0 ? (
        <li className="text-sm text-[var(--muted)]">No data</li>
      ) : (
        items.map((i) => (
          <li key={i.label} className="flex items-center gap-3">
            <div className="w-48 truncate" title={i.label}>{i.label}</div>
            <div className="flex-1 h-2 rounded" style={{ background: 'color-mix(in oklab, var(--surface) 92%, var(--foreground))' }}>
              <div className="h-2 rounded bg-[var(--accent)]" style={{ width: `${(i.count / max) * 100}%` }} />
            </div>
            <div className="w-12 text-right tabular-nums">{i.count}</div>
          </li>
        ))
      )}
    </ul>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseClient } from "@/lib/supabaseClient";

type Summary = { totalClicks: number; totalLinks: number };
type CountItem<TLabel extends string> = { [K in TLabel]: string } & { count: number };
type TopLink = { code: string; count: number };
type TopReferrer = CountItem<"referrer">;
type Country = CountItem<"country">;
type Device = CountItem<"device">;
type Browser = CountItem<"browser">;
type Os = CountItem<"os">;
type ReferrerDomain = CountItem<"domain">;
type Region = CountItem<"region">;
type City = CountItem<"city">;

type AnalyticsData = {
  summary: Summary;
  daily: Record<string, number>;
  hourly: Record<string, number>;
  weekdays: Record<string, number>;
  topLinks: TopLink[];
  topReferrers: TopReferrer[];
  countries: Country[];
  devices: Device[];
  browsers: Browser[];
  oses: Os[];
  referrerDomains: ReferrerDomain[];
  regions: Region[];
  cities: City[];
  range?: { days: number };
};

export default function AnalyticsDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [days, setDays] = useState<7 | 30 | 90>(30);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabaseClient.auth.getSession();
        const token = data.session?.access_token;
        const res = await fetch(`/api/analytics?days=${days}`, {
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

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 items-start">
            {/* Left column (2/3): charts */}
            <div className="xl:col-span-2 space-y-4">
              <section className="rounded-xl glass p-5">
                <div className="p-0 pb-3 font-medium">Clicks over time ({days} days)</div>
                {dailyTotal > 0 ? (
                  <DailyBars fromPairs={dailySeries} height={160} />
                ) : (
                  <div className="text-sm text-[var(--muted)] h-[160px] flex items-center justify-center">No clicks in the selected period</div>
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
              <section className="rounded-xl glass p-5">
                <div className="p-0 pb-3 font-medium">Clicks by Weekday</div>
                {weekdayTotal > 0 ? (
                  <DailyBars fromPairs={weekdaySeries} height={140} />
                ) : (
                  <div className="text-sm text-[var(--muted)] h-[140px] flex items-center justify-center">No clicks recorded yet</div>
                )}
              </section>
            </div>

            {/* Right column (1/3): filters and ranked lists */}
            <div className="space-y-4">
              <aside className="rounded-xl glass p-5 sticky top-4">
                <div className="p-0 pb-3 font-medium">Filters</div>
                <div className="flex items-center gap-2">
                  <RangeBtn current={days} value={7} onClick={() => setDays(7)} label="7d" />
                  <RangeBtn current={days} value={30} onClick={() => setDays(30)} label="30d" />
                  <RangeBtn current={days} value={90} onClick={() => setDays(90)} label="90d" />
                </div>
                <div className="mt-3 text-xs text-[var(--muted)]">Daily range applies to the time chart.</div>
              </aside>
              <section className="rounded-xl glass p-5">
                <div className="p-0 pb-3 font-medium">Top Links</div>
                <RankedBars items={(data?.topLinks ?? []).map((x) => ({ label: `/${x.code}`, count: x.count }))} />
              </section>
              <section className="rounded-xl glass p-5">
                <div className="p-0 pb-3 font-medium">Top Referrers</div>
                <RankedBars items={(data?.topReferrers ?? []).map((x) => ({ label: x.referrer, count: x.count }))} />
              </section>
              <section className="rounded-xl glass p-5">
                <div className="p-0 pb-3 font-medium">Countries</div>
                <RankedBars items={(data?.countries ?? []).map((x) => ({ label: x.country, count: x.count }))} />
              </section>
              <section className="rounded-xl glass p-5">
                <div className="p-0 pb-3 font-medium">Devices</div>
                <RankedBars items={(data?.devices ?? []).map((x) => ({ label: x.device, count: x.count }))} />
              </section>
              <section className="rounded-xl glass p-5">
                <div className="p-0 pb-3 font-medium">Browsers</div>
                <RankedBars items={(data?.browsers ?? []).map((x) => ({ label: x.browser, count: x.count }))} />
              </section>
              <section className="rounded-xl glass p-5">
                <div className="p-0 pb-3 font-medium">Operating Systems</div>
                <RankedBars items={(data?.oses ?? []).map((x) => ({ label: x.os, count: x.count }))} />
              </section>
              <section className="rounded-xl glass p-5">
                <div className="p-0 pb-3 font-medium">Referrer Domains</div>
                <RankedBars items={(data?.referrerDomains ?? []).map((x) => ({ label: x.domain, count: x.count }))} />
              </section>
              <section className="rounded-xl glass p-5">
                <div className="p-0 pb-3 font-medium">Regions</div>
                <RankedBars items={(data?.regions ?? []).map((x) => ({ label: x.region, count: x.count }))} />
              </section>
              <section className="rounded-xl glass p-5">
                <div className="p-0 pb-3 font-medium">Cities</div>
                <RankedBars items={(data?.cities ?? []).map((x) => ({ label: x.city, count: x.count }))} />
              </section>
            </div>
          </div>
        </>
      )}
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

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl glass p-5">
      <div className="text-sm text-[var(--muted)]">{label}</div>
      <div className="text-2xl font-semibold mt-1 tabular-nums">{value}</div>
    </div>
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
  const labelEvery = Math.max(1, Math.ceil(fromPairs.length / 14));
  return (
    <div className="flex flex-col gap-2">
      <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${fromPairs.length || 1}, minmax(0,1fr))`, height }}>
        {fromPairs.map(([key, v]) => {
          const h = (v / max) * height;
          const innerH = v > 0 ? Math.max(2, Math.round(h)) : 0; // ensure visibility for small non-zero values
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
            const show = idx % labelEvery === 0 || idx === fromPairs.length - 1;
            // For YYYY-MM-DD use DD, for hour "0..23" use same, else use key
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

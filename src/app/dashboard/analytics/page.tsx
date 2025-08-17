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
};

export default function AnalyticsDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabaseClient.auth.getSession();
        const token = data.session?.access_token;
        const res = await fetch("/api/analytics", {
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
  }, []);

  const dailySeries = useMemo(() => {
    const entries: Array<[string, number]> = data?.daily ? Object.entries(data.daily) : [];
    return entries.sort((a, b) => a[0].localeCompare(b[0]));
  }, [data]);

  const hourlySeries = useMemo(() => {
    const entries: Array<[string, number]> = data?.hourly ? Object.entries(data.hourly) : [];
    return entries.sort((a, b) => a[0].localeCompare(b[0]));
  }, [data]);

  const weekdaySeries = useMemo(() => {
    const w = data?.weekdays || {};
    const order = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    return order.map((k) => [k, Number(w[k] || 0)]) as Array<[string, number]>;
  }, [data]);

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

          <section className="rounded-xl glass p-5">
            <div className="p-0 pb-3 font-medium">Clicks over time (30 days)</div>
            <DailyBars fromPairs={dailySeries} height={120} />
          </section>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <section className="rounded-xl glass p-5">
              <div className="p-0 pb-3 font-medium">Clicks by Hour (last 24h)</div>
              <DailyBars fromPairs={hourlySeries} height={100} />
            </section>
            <section className="rounded-xl glass p-5">
              <div className="p-0 pb-3 font-medium">Clicks by Weekday</div>
              <DailyBars fromPairs={weekdaySeries} height={100} />
            </section>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <section className="rounded-xl glass p-5">
              <div className="p-0 pb-3 font-medium">Top Links</div>
              <RankedBars
                items={(data?.topLinks ?? []).map((x) => ({ label: `/${x.code}`, count: x.count }))}
              />
            </section>
            <section className="rounded-xl glass p-5">
              <div className="p-0 pb-3 font-medium">Top Referrers</div>
              <RankedBars items={(data?.topReferrers ?? []).map((x) => ({ label: x.referrer, count: x.count }))} />
            </section>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <section className="rounded-xl glass p-5">
              <div className="p-0 pb-3 font-medium">Countries</div>
              <RankedBars items={(data?.countries ?? []).map((x) => ({ label: x.country, count: x.count }))} />
            </section>
            <section className="rounded-xl glass p-5">
              <div className="p-0 pb-3 font-medium">Devices</div>
              <RankedBars items={(data?.devices ?? []).map((x) => ({ label: x.device, count: x.count }))} />
            </section>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <section className="rounded-xl glass p-5">
              <div className="p-0 pb-3 font-medium">Browsers</div>
              <RankedBars items={(data?.browsers ?? []).map((x) => ({ label: x.browser, count: x.count }))} />
            </section>
            <section className="rounded-xl glass p-5">
              <div className="p-0 pb-3 font-medium">Operating Systems</div>
              <RankedBars items={(data?.oses ?? []).map((x) => ({ label: x.os, count: x.count }))} />
            </section>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <section className="rounded-xl glass p-5">
              <div className="p-0 pb-3 font-medium">Referrer Domains</div>
              <RankedBars items={(data?.referrerDomains ?? []).map((x) => ({ label: x.domain, count: x.count }))} />
            </section>
            <section className="rounded-xl glass p-5">
              <div className="p-0 pb-3 font-medium">Regions</div>
              <RankedBars items={(data?.regions ?? []).map((x) => ({ label: x.region, count: x.count }))} />
            </section>
          </div>

          <section className="rounded-xl glass p-5">
            <div className="p-0 pb-3 font-medium">Cities</div>
            <RankedBars items={(data?.cities ?? []).map((x) => ({ label: x.city, count: x.count }))} />
          </section>
        </>
      )}
    </div>
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

function DailyBars({ fromPairs, height = 100 }: { fromPairs: Array<[string, number]>; height?: number }) {
  const max = Math.max(1, ...fromPairs.map(([, v]) => v));
  return (
    <div className="flex items-end gap-1" style={{ height }}>
      {fromPairs.map(([day, v]) => (
        <div
          key={day}
          className="flex-1 min-w-[4px] rounded relative"
          style={{ background: 'color-mix(in oklab, var(--surface) 92%, var(--foreground))' }}
          title={`${day}: ${v}`}
        >
          <div
            className="absolute bottom-0 left-0 right-0 bg-[var(--accent)] rounded"
            style={{ height: `${(v / max) * 100}%` }}
          />
        </div>
      ))}
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

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
            <DailyBars daily={daily} />
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

function DailyBars({ daily }: { daily: Record<string, number> }) {
  const entries = Object.entries(daily).sort((a, b) => a[0].localeCompare(b[0]));
  const max = Math.max(1, ...entries.map(([, v]) => v));
  return (
    <div className="flex items-end gap-1 h-24">
      {entries.map(([day, v]) => (
        <div key={day} className="flex-1 min-w-[4px] bg-gray-100 rounded relative" title={`${day}: ${v}`}>
          <div
            className="absolute bottom-0 left-0 right-0 bg-[var(--accent)] rounded"
            style={{ height: `${(v / max) * 100}%` }}
          />
        </div>
      ))}
    </div>
  );
}

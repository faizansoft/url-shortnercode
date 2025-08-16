"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabaseClient } from "@/lib/supabaseClient";

type LinkRow = { short_code: string; target_url: string; created_at: string };

export default function LinksIndexPage() {
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      } catch (e: any) {
        setError(e?.message ?? "Failed to load links");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Links</h1>
        <Link className="btn" href="/dashboard/create">Create</Link>
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
              {links.map((l) => (
                <tr key={l.short_code} className="border-t border-[var(--border)]">
                  <td className="p-3 font-mono">
                    <a className="underline" href={`/${l.short_code}`} target="_blank" rel="noreferrer">
                      /{l.short_code}
                    </a>
                  </td>
                  <td className="p-3 max-w-[420px] truncate" title={l.target_url}>{l.target_url}</td>
                  <td className="p-3">{new Date(l.created_at).toLocaleString()}</td>
                  <td className="p-3">
                    <Link className="btn h-8" href={`/dashboard/links/${l.short_code}`}>View</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

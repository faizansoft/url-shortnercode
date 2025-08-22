"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabaseClient } from "@/lib/supabaseClient";

type PageRow = {
  id: string;
  title: string;
  slug: string;
  published: boolean;
  created_at?: string;
};

export default function PagesListPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<PageRow[]>([]);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const canSubmit = title.trim().length >= 3;

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabaseClient.auth.getSession();
        const token = data.session?.access_token;
        const res = await fetch("/api/pages", { headers: token ? { Authorization: `Bearer ${token}` } : {}, cache: 'no-store' });
        const payload = await res.json();
        if (!res.ok) throw new Error(payload?.error || "Failed to load pages");
        setItems(payload.pages || []);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to load pages");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function slugify(t: string) {
    return t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
  }

  useEffect(() => {
    if (!slug) setSlug(slugify(title));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    try {
      const { data } = await supabaseClient.auth.getSession();
      const token = data.session?.access_token;
      const res = await fetch('/api/pages', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ title, slug }) });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error || 'Create failed');
      setItems((p) => [payload.page, ...p]);
      setTitle(""); setSlug("");
    } catch (e) {
      alert((e as Error).message);
    }
  }

  const rows = useMemo(() => items, [items]);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)]">Pages</h1>
        <div className="text-xs text-[var(--muted)]">Create and manage landing pages</div>
      </header>

      <section className="rounded-xl glass p-5">
        <div className="font-medium mb-3">Create a new page</div>
        <form className="grid gap-3 sm:grid-cols-[1fr_280px_auto]" onSubmit={handleCreate}>
          <input
            type="text"
            placeholder="Title (e.g., Summer Promo)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="h-10 px-3 rounded-md border"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
          />
          <input
            type="text"
            placeholder="slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase())}
            className="h-10 px-3 rounded-md border font-mono"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
          />
          <button type="submit" className="btn btn-primary h-10" disabled={!canSubmit}>Create</button>
        </form>
      </section>

      {loading ? (
        <div className="p-4 text-sm text-[var(--muted)]">Loading…</div>
      ) : error ? (
        <div className="p-4 text-sm text-red-600">{error}</div>
      ) : rows.length === 0 ? (
        <div className="p-4 text-sm text-[var(--muted)]">No pages yet. Create your first one above.</div>
      ) : (
        <section className="rounded-xl glass p-5">
          <div className="font-medium mb-3">Your pages</div>
          <table className="w-full text-sm">
            <thead className="text-left text-[color-mix(in_oklab,var(--foreground)_65%,#64748b)]">
              <tr>
                <th className="py-2">Title</th>
                <th className="py-2">Slug</th>
                <th className="py-2">Status</th>
                <th className="py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} className="border-t border-[var(--border)]">
                  <td className="py-2">{p.title}</td>
                  <td className="py-2 font-mono">{p.slug}</td>
                  <td className="py-2">{p.published ? 'Published' : 'Draft'}</td>
                  <td className="py-2 text-right">
                    <Link href={`/dashboard/pages/${p.id}/edit`} className="btn btn-secondary h-8">Edit</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}

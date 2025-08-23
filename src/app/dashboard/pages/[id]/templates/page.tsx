"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { themePresets, type ThemePreset } from "@/lib/pageThemes";
import { supabaseClient } from "@/lib/supabaseClient";
import Image from "next/image";

export const runtime = "edge";

type SortKey = "popularity" | "az" | "newest";

export default function TemplateGalleryPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id as string;
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [selectedUseCases, setSelectedUseCases] = useState<string[]>([]);
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [sort, setSort] = useState<SortKey>("popularity");
  const [applying, setApplying] = useState<string | null>(null);

  // Build filter facets from presets
  const { useCases, styles } = useMemo(() => {
    const uc = new Set<string>();
    const st = new Set<string>();
    themePresets.forEach((p) => {
      p.useCases?.forEach((u) => uc.add(u));
      p.styles?.forEach((s) => st.add(s));
    });
    return { useCases: Array.from(uc).sort(), styles: Array.from(st).sort() };
  }, []);

  const filtered = useMemo(() => {
    let list: ThemePreset[] = themePresets;
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q));
    }
    if (selectedUseCases.length) {
      list = list.filter((p) => p.useCases?.some((u) => selectedUseCases.includes(u)));
    }
    if (selectedStyles.length) {
      list = list.filter((p) => p.styles?.some((s) => selectedStyles.includes(s)));
    }
    if (sort === "popularity") {
      list = [...list].sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0));
    } else if (sort === "az") {
      list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    } else if (sort === "newest") {
      // As we don't have createdAt, approximate by original order reversed
      list = [...list].reverse();
    }
    return list;
  }, [query, selectedUseCases, selectedStyles, sort]);

  function toggle<T extends string>(arr: T[], v: T): T[] {
    return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
  }

  async function applyPreset(presetId: string) {
    try {
      setApplying(presetId);
      const preset = themePresets.find((p) => p.id === presetId);
      if (!preset) throw new Error("Preset not found");
      const { data } = await supabaseClient.auth.getSession();
      const token = data.session?.access_token;
      const res = await fetch(`/api/pages/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ theme: preset.theme, branding: preset.starterBranding ?? undefined, blocks: preset.starterBlocks ?? undefined }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error || "Failed to apply template");
      router.push(`/dashboard/pages/${id}/edit`);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setApplying(null);
    }
  }

  useEffect(() => {
    // Ensure page id exists
    if (!id) router.push("/dashboard/pages");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)]">Select a template</h1>
        <div className="flex items-center gap-2">
          <a className="btn btn-secondary h-9" href={`/dashboard/pages/${id}/edit`}>Back to editor</a>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-4">
        {/* Sidebar filters */}
        <aside className="rounded-xl glass p-4 space-y-4">
          <div className="space-y-2">
            <div className="text-xs text-[var(--muted)]">Search</div>
            <input
              className="h-9 w-full rounded border px-2"
              style={{ background: "var(--surface)", borderColor: "var(--border)" }}
              placeholder="Search templates"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <div className="text-xs text-[var(--muted)]">By use case</div>
            <div className="flex flex-col gap-1">
              {useCases.map((u) => (
                <label key={u} className="inline-flex items-center gap-2">
                  <input type="checkbox" checked={selectedUseCases.includes(u)} onChange={() => setSelectedUseCases((p) => toggle(p, u))} />
                  <span className="text-sm">{u}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-xs text-[var(--muted)]">By style</div>
            <div className="flex flex-col gap-1">
              {styles.map((s) => (
                <label key={s} className="inline-flex items-center gap-2">
                  <input type="checkbox" checked={selectedStyles.includes(s)} onChange={() => setSelectedStyles((p) => toggle(p, s))} />
                  <span className="text-sm">{s}</span>
                </label>
              ))}
            </div>
          </div>
        </aside>

        {/* Main list */}
        <section className="rounded-xl glass p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs text-[var(--muted)]">{filtered.length} templates</div>
            <div className="inline-flex items-center gap-2">
              <div className="text-xs text-[var(--muted)]">Sort</div>
              <select
                className="h-9 rounded border px-2"
                style={{ background: "var(--surface)", borderColor: "var(--border)" }}
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
              >
                <option value="popularity">Popularity</option>
                <option value="az">A–Z</option>
                <option value="newest">Newest</option>
              </select>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((p) => (
              <article key={p.id} className="rounded border overflow-hidden" style={{ borderColor: "var(--border)" }}>
                <div className="aspect-[4/3] bg-[var(--surface-2)] relative">
                  <LivePresetPreview preset={p} />
                </div>
                <div className="p-3 space-y-2">
                  <div className="font-medium">{p.name}</div>
                  <div className="flex flex-wrap gap-1">
                    {(p.useCases || []).slice(0, 2).map((t) => (
                      <span key={t} className="px-2 py-0.5 rounded border text-xs" style={{ borderColor: "var(--border)" }}>{t}</span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <div className="text-xs text-[var(--muted)]">{p.styles?.join(" · ")}</div>
                    <button
                      className="btn btn-primary h-8"
                      onClick={() => applyPreset(p.id)}
                      disabled={applying === p.id}
                    >
                      {applying === p.id ? "Applying…" : "Use template"}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function LivePresetPreview({ preset }: { preset: ThemePreset }) {
  const t = preset.theme;
  const b = preset.starterBranding;
  const grad = `linear-gradient(${t.gradient.angle}deg, ${t.gradient.stops.map(s => `${s.color} ${s.at}%`).join(', ')})`;
  const borderR = `${t.radius}px`;
  const brand = (b?.brandColor ?? t.palette.primary);
  const accent = (b?.accentColor ?? t.palette.secondary);
  const hasCover = typeof b?.coverUrl === 'string' && !!b?.coverUrl;
  const bgOverlayOpacity = typeof b?.bg?.overlay?.opacity === 'number' ? b!.bg!.overlay!.opacity : 0.35;
  const bgImage = hasCover ? `${`linear-gradient(rgba(0,0,0,${bgOverlayOpacity}), rgba(0,0,0,${bgOverlayOpacity}))`}, url(${b!.coverUrl})` : grad;

  return (
    <div className="absolute inset-0 p-3" style={{ background: t.palette.surface, color: t.palette.foreground }}>
      <div className="w-full h-full rounded" style={{ borderRadius: borderR, background: hasCover ? undefined : grad, backgroundImage: hasCover ? bgImage : undefined, backgroundSize: hasCover ? 'cover' : undefined, backgroundPosition: hasCover ? 'center' : undefined, position: 'relative', overflow: 'hidden' }}>
        {/* Header/logo */}
        <div className="absolute left-3 right-3 top-3 flex items-center gap-2">
          {b?.logoUrl ? (
            <div className="h-5 w-auto max-w-[100px] overflow-hidden">
              <Image src={b.logoUrl} alt="logo" width={100} height={20} style={{ width: 'auto', height: '20px', objectFit: 'contain' }} unoptimized />
            </div>
          ) : (
            <div className="h-3 w-16 rounded" style={{ background: brand, opacity: 0.95 }} />
          )}
          <div className="h-2 w-10 rounded" style={{ background: accent, opacity: 0.8 }} />
        </div>
        {/* Hero block */}
        <div className="absolute left-4 right-4 top-10">
          <div className="h-6 w-2/3 rounded mb-2" style={{ background: 'rgba(255,255,255,0.9)' }} />
          <div className="h-3 w-1/2 rounded" style={{ background: 'rgba(255,255,255,0.7)' }} />
        </div>
        {/* CTA */}
        <div className="absolute left-4 bottom-4">
          <div className="h-6 w-24 rounded" style={{ background: brand }} />
        </div>
        {/* Card/image stub */}
        <div className="absolute right-4 bottom-4">
          <div className="h-12 w-16 rounded" style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.15)' }} />
        </div>
      </div>
    </div>
  );
}

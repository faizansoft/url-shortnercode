"use client";

import Link from "next/link";
import React, { Suspense, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import NavItem from "./NavItem";
import AuthGuard from "./AuthGuard";
import UserMenu from "./UserMenu";

function DashboardSearchBox() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [queryInput, setQueryInput] = useState<string>(searchParams.get("q") || "");

  // Sync input when URL changes externally
  useEffect(() => {
    const currentQ = searchParams.get("q") || "";
    setQueryInput(currentQ);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.toString()]);

  // Debounced update of the URL query param
  useEffect(() => {
    const t = setTimeout(() => {
      const usp = new URLSearchParams(searchParams.toString());
      if (queryInput) usp.set("q", queryInput);
      else usp.delete("q");
      const qs = usp.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryInput]);

  return (
    <input
      type="search"
      placeholder="Search links…"
      value={queryInput}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQueryInput(e.target.value)}
      className="w-full h-9 px-3 rounded-md outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[color-mix(in_oklab,var(--accent)_30%,transparent)]"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
      }}
    />
  );
}

export default function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const isCustomize = pathname === "/dashboard/qrcodes/customize";
  const [collapsed, setCollapsed] = useState<boolean>(false);
  type ThemeMode = 'light' | 'dark';
  const [theme, setTheme] = useState<ThemeMode>('light');

  // Read persisted sidebar state
  useEffect(() => {
    try {
      const saved = localStorage.getItem("dash.sidebar.collapsed");
      if (saved != null) setCollapsed(saved === "1");
      else if (typeof window !== 'undefined' && window.innerWidth <= 1024) setCollapsed(true);
    } catch {}
  }, []);

  // Persist sidebar state
  useEffect(() => {
    try {
      localStorage.setItem("dash.sidebar.collapsed", collapsed ? "1" : "0");
    } catch {}
  }, [collapsed]);

  // Initialize theme from storage or system preference
  useEffect(() => {
    try {
      const saved = localStorage.getItem('ui.theme') as ThemeMode | null;
      const systemDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      const initial: ThemeMode = saved ?? (systemDark ? 'dark' : 'light');
      setTheme(initial);
      const html = document.documentElement;
      html.classList.remove('theme-light', 'theme-dark');
      html.classList.add(initial === 'dark' ? 'theme-dark' : 'theme-light');
    } catch {}
  }, []);

  // Apply and persist theme on change
  useEffect(() => {
    try {
      const html = document.documentElement;
      html.classList.remove('theme-light', 'theme-dark');
      html.classList.add(theme === 'dark' ? 'theme-dark' : 'theme-light');
      localStorage.setItem('ui.theme', theme);
    } catch {}
  }, [theme]);

  const toggleTheme = () => {
    setTheme((t: ThemeMode) => (t === 'dark' ? 'light' : 'dark'));
  };
  return (
    <div className={`${collapsed ? "grid-cols-[72px_1fr]" : "grid-cols-[240px_1fr]"} min-h-[100dvh] grid`}>
      <aside className={`glass text-sm ${collapsed ? "p-2" : "p-4"} flex flex-col gap-3 relative rounded-none border-r border-[var(--border)] sticky top-0 h-[100dvh] overflow-hidden`} style={{ borderRadius: 0 }}>
        <div className="pointer-events-none absolute inset-0 opacity-40" aria-hidden>
          <div className="absolute -top-24 -left-24 h-64 w-64 rounded-full blur-3xl" style={{background: 'radial-gradient(circle at 50% 50%, color-mix(in oklab, var(--accent) 22%, transparent), transparent 60%)'}} />
          <div className="absolute -bottom-24 -right-24 h-64 w-64 rounded-full blur-3xl" style={{background: 'radial-gradient(circle at 50% 50%, color-mix(in oklab, var(--accent-2) 18%, transparent), transparent 60%)'}} />
        </div>
        {/* Toggle inside sidebar */}
        <div className={`flex ${collapsed ? 'justify-center' : 'justify-end'} mt-1`}>
          <button
            type="button"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={() => setCollapsed((v: boolean) => !v)}
            className="btn btn-chrome btn-icon"
            title={collapsed ? "Expand" : "Collapse"}
          >
            {collapsed ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 6L2 12L8 18"/><path d="M2 12H22"/></svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 6L22 12L16 18"/><path d="M2 12H22"/></svg>
            )}
          </button>
        </div>
        {/* Logo moved to header; removed here */}
        {/* Removed standalone Create button as requested */}
        <nav className="flex flex-col gap-1 relative mt-1">
          <NavItem
            href="/dashboard/create"
            label="Create"
            collapsed={collapsed}
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14" />
                <path d="M5 12h14" />
              </svg>
            }
          />
          <NavItem
            href="/dashboard"
            label="Overview"
            collapsed={collapsed}
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 10.5 12 3l9 7.5" />
                <path d="M5 9.5V21h14V9.5" />
              </svg>
            }
          />
          <NavItem
            href="/dashboard/links"
            label="Links"
            collapsed={collapsed}
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 0 1 0-7l1.5-1.5a5 5 0 0 1 7 7L17 12" />
                <path d="M14 11a5 5 0 0 1 0 7L12.5 19.5a5 5 0 0 1-7-7L7 12" />
              </svg>
            }
          />
          <NavItem
            href="/dashboard/qrcodes"
            label="QR Codes"
            collapsed={collapsed}
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 3h6v6H3z" />
                <path d="M15 3h6v6h-6z" />
                <path d="M15 15h6v6h-6z" />
                <path d="M3 15h6v6H3z" />
                <path d="M12 7v2" />
                <path d="M12 15v2" />
                <path d="M7 12h2" />
                <path d="M15 12h2" />
              </svg>
            }
          />
          <NavItem
            href="/dashboard/pages"
            label="Pages"
            collapsed={collapsed}
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" />
                <path d="M14 3v4a2 2 0 0 0 2 2h4" />
              </svg>
            }
          />
          <NavItem
            href="/dashboard/analytics"
            label="Analytics"
            collapsed={collapsed}
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 3v18h18" />
                <path d="M7 15l4-6 4 3 4-7" />
              </svg>
            }
          />
          <NavItem
            href="/dashboard/settings"
            label="Settings"
            collapsed={collapsed}
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.06a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.06a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.06a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c0 .67.4 1.28 1.01 1.54.31.13.66.2 1.02.2H21a2 2 0 1 1 0 4h-.06a1.65 1.65 0 0 0-1.54 1.26Z" />
              </svg>
            }
          />
        </nav>
        {/* Removed footer branding */}
      </aside>
      <div className="flex flex-col min-h-[100dvh] min-h-screen">
        <header
          className="sticky top-0 z-10 glass rounded-none border-b border-[var(--border)]"
          style={{ borderRadius: 0 }}
        >
          <div className="max-w-6xl mx-auto px-6 h-14 flex items-center gap-3">
            {/* Logo in header */}
            <div className="flex items-center gap-3">
              <Link href="/" className="text-base font-semibold relative">
                <span className="brand-text">URL Shortner</span>
              </Link>
            </div>
            <div className="flex-1">
              <Suspense fallback={<div className="h-9" /> }>
                <DashboardSearchBox />
              </Suspense>
            </div>
            {/* Removed header Create button as requested */}
            <button
              aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
              title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
              className="btn btn-chrome btn-icon"
              onClick={toggleTheme}
            >
              {theme === 'dark' ? (
                // Sun icon
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
                </svg>
              ) : (
                // Moon icon
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </button>
            <button
              aria-label="Notifications"
              className="btn btn-chrome btn-icon"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="block"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M15 18a3 3 0 1 1-6 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <path d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 7h18s-3 0-3-7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <UserMenu />
          </div>
        </header>
        <main className={`${isCustomize ? 'relative p-0 overflow-hidden' : 'p-6 overflow-auto scrollbar'} flex-1 min-h-0`}>
          <AuthGuard>
            {isCustomize ? (
              <div className="absolute inset-0">
                <div className="mx-auto max-w-6xl w-full h-full min-h-0 flex flex-col p-6 space-y-4">
                  {children}
                </div>
              </div>
            ) : (
              <div className="mx-auto max-w-6xl w-full space-y-4 h-full min-h-0 flex flex-col">{children}</div>
            )}
          </AuthGuard>
        </main>
      </div>
    </div>
  );
}

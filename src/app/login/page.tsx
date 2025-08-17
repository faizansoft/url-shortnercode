"use client";

import { FormEvent, useState } from "react";
import { supabaseClient } from "@/lib/supabaseClient";

type Mode = "login" | "signup";

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string>("");
  const [variant, setVariant] = useState<"error" | "success" | "info">("info");

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  async function handleEmailAuth(e: FormEvent) {
    e.preventDefault();
    setMessage("");
    setVariant("info");
    setLoading(true);
    try {
      if (mode === "signup") {
        if (password.length < 6) throw new Error("Password must be at least 6 characters.");
        if (password !== confirm) throw new Error("Passwords do not match.");
        const { error } = await supabaseClient.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${siteUrl}/auth/callback` },
        });
        if (error) throw error;
        setVariant("success");
        setMessage("Check your email to confirm your account.");
      } else {
        const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setVariant("success");
        setMessage("Logged in. Redirecting…");
        // Let your auth listener in layout or middleware redirect, or simply reload
        setTimeout(() => window.location.assign("/dashboard"), 500);
      }
    } catch (err: unknown) {
      setVariant("error");
      setMessage(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handleOAuth(provider: "google" | "apple" | "facebook") {
    setLoading(true);
    setMessage("");
    setVariant("info");
    try {
      const { error } = await supabaseClient.auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${siteUrl}/auth/callback` },
      });
      if (error) throw error;
    } catch (err: unknown) {
      setVariant("error");
      setMessage(err instanceof Error ? err.message : "OAuth sign-in failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-6">
      <div className="w-[min(1000px,100%)] mx-auto grid md:grid-cols-2 gap-8 items-center">
        {/* Hero / Home-like left column */}
        <div className="space-y-5">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)]">
            Home
          </h1>
          <p className="text-[color-mix(in_oklab,var(--foreground)_80%,#64748b)] leading-relaxed">
            Welcome back. Create short links, QR codes, and track analytics — all in one place.
          </p>
          <ul className="text-sm text-[var(--muted)] space-y-1 list-disc pl-5">
            <li className="marker:text-[var(--accent)]">Custom short codes</li>
            <li className="marker:text-[var(--accent)]">QR download and sharing</li>
            <li className="marker:text-[var(--accent)]">Click analytics</li>
          </ul>
        </div>

        {/* Auth palette right column */}
        <div className="rounded-2xl p-6 border border-[var(--border)]" style={{ background: 'var(--surface)' }}>
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => { setMode("login"); setMessage(""); }}
              className={`btn h-8 ${mode === "login" ? "btn-primary" : "btn-secondary"}`}
            >Login</button>
            <button
              onClick={() => { setMode("signup"); setMessage(""); }}
              className={`btn h-8 ${mode === "signup" ? "btn-primary" : "btn-secondary"}`}
            >Sign up</button>
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-3">
            <div>
              <label className="block text-sm mb-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full h-10 px-3 rounded-md outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[color-mix(in_oklab,var(--accent)_35%,transparent)]"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-10 px-3 rounded-md outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[color-mix(in_oklab,var(--accent)_35%,transparent)]"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
              />
            </div>
            {mode === "signup" && (
              <div>
                <label className="block text-sm mb-1">Confirm password</label>
                <input
                  type="password"
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-10 px-3 rounded-md outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[color-mix(in_oklab,var(--accent)_35%,transparent)]"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                />
              </div>
            )}

            <button type="submit" disabled={loading} className="btn btn-primary w-full justify-center">
              {loading ? (mode === "signup" ? "Creating…" : "Signing in…") : (mode === "signup" ? "Create account" : "Sign in")}
            </button>

            {message && (
              <div className={`text-sm ${
                variant === "error" ? "text-red-600" : variant === "success" ? "text-green-700" : "text-[var(--muted)]"
              }`}>{message}</div>
            )}
          </form>

          <div className="my-4 w-full h-px" style={{ background: 'var(--border)' }} />
          <div className="text-sm mb-2 text-[color-mix(in_oklab,var(--foreground)_80%,#666)]">Continue with</div>
          <div className="grid grid-cols-3 gap-2">
            <button onClick={() => handleOAuth("google")} className="btn h-9 inline-grid place-items-center" aria-label="Continue with Google">
              <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden fill="currentColor"><path d="M21.6 12.227c0-.64-.057-1.253-.163-1.84H12v3.48h5.4a4.614 4.614 0 0 1-2 3.027v2.514h3.237c1.894-1.744 2.963-4.313 2.963-7.181Z"/><path d="M12 22c2.7 0 4.968-.9 6.624-2.441l-3.238-2.514c-.9.6-2.05.96-3.386.96-2.604 0-4.81-1.758-5.596-4.122H3.05v2.59A9.998 9.998 0 0 0 12 22Z"/><path d="M6.404 13.883A5.997 5.997 0 0 1 6.09 12c0-.652.112-1.284.314-1.883V7.526H3.051A9.998 9.998 0 0 0 2 12c0 1.61.386 3.133 1.051 4.474l3.353-2.59Z"/><path d="M12 6.4c1.47 0 2.79.506 3.827 1.498l2.87-2.87C16.963 3.272 14.695 2.4 12 2.4A9.998 9.998 0 0 0 3.05 7.526l3.353 2.591C7.19 8.753 9.396 6.4 12 6.4Z"/></svg>
            </button>
            <button onClick={() => handleOAuth("apple")} className="btn h-9 inline-grid place-items-center" aria-label="Continue with Apple">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M16.365 1.43c0 1.14-.42 2.073-1.25 2.797-.9.798-1.98 1.26-3.164 1.186-.04-1.12.44-2.11 1.29-2.86.9-.8 2-1.25 3.124-1.288ZM19.6 21.2c-.82.78-1.77 1.118-2.85 1.118-1.078 0-1.916-.34-2.95-.34-1.072 0-1.91.34-2.99.34-1.08 0-2.02-.36-2.83-1.14-.88-.82-1.49-1.953-1.83-3.4-.36-1.586-.26-3.064.3-4.43.48-1.17 1.2-2.09 2.16-2.76.96-.67 2.01-1.01 3.14-1.02 1.02 0 2.04.35 3.06.35 1 0 1.96-.35 2.89-1.03.58-.43 1.06-.94 1.43-1.54-.02-.01.02.02 0 0 .04.05.07.1.1.15.68 1.11.97 2.2.88 3.27-.09 1.09-.53 2.07-1.29 2.95-.76.88-1.7 1.43-2.82 1.64.94.19 1.73.62 2.36 1.29.63.67 1.05 1.52 1.28 2.55.23 1.04.19 2.04-.13 3.02-.32.98-.85 1.81-1.59 2.49Z"/></svg>
            </button>
            <button onClick={() => handleOAuth("facebook")} className="btn h-9 inline-grid place-items-center" aria-label="Continue with Facebook">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M13.5 22v-8h2.6l.4-3h-3V8.2c0-.9.3-1.5 1.6-1.5H17V4.1c-.3 0-1.2-.1-2.2-.1-2.2 0-3.8 1.3-3.8 3.9V11H8v3h3v8h2.5Z"/></svg>
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

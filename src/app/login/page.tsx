"use client";

import { FormEvent, useState } from "react";
import { supabaseClient } from "@/lib/supabaseClient";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState<string>("");

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setMessage("");
    try {
      const { error } = await supabaseClient.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: `${siteUrl}/auth/callback`,
        },
      });
      if (error) throw error;
      setStatus("sent");
      setMessage("Check your email for a magic link to sign in.");
    } catch (err: unknown) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Failed to send magic link.");
    }
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm space-y-3 rounded-lg p-4"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
        }}
      >
        <h1 className="text-lg font-semibold">Sign in</h1>
        <p className="text-sm" style={{ color: "var(--muted)" }}>We&apos;ll email you a magic link to sign in.</p>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full h-10 px-3 rounded-md outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[color-mix(in_oklab,var(--accent)_35%,transparent)]"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
          }}
        />
        <button
          type="submit"
          disabled={status === "sending"}
          className="btn btn-primary w-full justify-center"
        >
          {status === "sending" ? "Sending…" : "Send magic link"}
        </button>
        {message && (
          <div className={`text-sm ${status === "error" ? "text-red-600" : "text-green-700"}`}>{message}</div>
        )}
      </form>
    </div>
  );
}

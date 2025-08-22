import Link from "next/link";
import SessionCTA from "./SessionCTA";

export default function Home() {
  return (
    <main className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-6">
      <div className="w-[min(1000px,100%)] mx-auto grid md:grid-cols-2 gap-8 items-center">
        <div className="space-y-5">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)]">
            Short links, QR codes, and analytics — fast.
          </h1>
          <p className="text-[color-mix(in_oklab,var(--foreground)_80%,#64748b)] leading-relaxed">
            Create branded short links and QR codes in seconds. Track clicks, devices, referrers, and share anywhere. Works beautifully in light and dark mode.
          </p>
          <div className="flex flex-wrap gap-3">
            <SessionCTA />
          </div>
        </div>

        <div className="rounded-2xl glass p-6 border border-[var(--border)]">
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-xl p-4" style={{ background: 'color-mix(in oklab, var(--accent) 12%, var(--surface))', border: '1px solid var(--border)' }}>
              <div className="text-sm font-medium mb-2">Create</div>
              <div className="text-xs text-[var(--muted)]">Short links with custom codes</div>
            </div>
            <div className="rounded-xl p-4" style={{ background: 'color-mix(in oklab, var(--accent) 12%, var(--surface))', border: '1px solid var(--border)' }}>
              <div className="text-sm font-medium mb-2">QR Codes</div>
              <div className="text-xs text-[var(--muted)]">Download and share instantly</div>
            </div>
            <div className="rounded-xl p-4" style={{ background: 'color-mix(in oklab, var(--accent) 12%, var(--surface))', border: '1px solid var(--border)' }}>
              <div className="text-sm font-medium mb-2">Analytics</div>
              <div className="text-xs text-[var(--muted)]">Referrers, devices & more</div>
            </div>
          </div>
          <div className="mt-6 rounded-xl border border-[var(--border)] p-4 flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Free to start</div>
              <div className="text-xs text-[var(--muted)]">No credit card required</div>
            </div>
            <Link href="/login" className="btn btn-secondary h-9">Get started</Link>
          </div>
        </div>
      </div>
    </main>
  );
}

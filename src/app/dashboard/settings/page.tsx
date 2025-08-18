export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)]">Settings</h1>
        <p className="text-sm text-[var(--muted)]">Manage your account and workspace preferences.</p>
      </div>

      <div className="rounded-xl glass p-5">
        <h2 className="text-sm font-medium mb-2">General</h2>
        <p className="text-sm text-[var(--muted)]">This is a placeholder page. We’ll add real settings here.</p>
      </div>
    </div>
  );
}

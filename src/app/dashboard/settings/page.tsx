export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Settings</h1>
        <p className="text-sm text-[var(--muted)]">Manage your account and workspace preferences.</p>
      </div>

      <div className="rounded-md p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <h2 className="text-sm font-medium mb-2">General</h2>
        <p className="text-sm text-[var(--muted)]">This is a placeholder page. We’ll add real settings here.</p>
      </div>
    </div>
  );
}

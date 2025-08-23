"use client";

import { useParams } from "next/navigation";

export const runtime = "edge";

export default function TemplateGalleryPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id as string;
  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Templates removed</h1>
        <div className="flex items-center gap-2">
          <a className="btn btn-secondary h-9" href={`/dashboard/pages/${id}/edit`}>Back to editor</a>
        </div>
      </header>
      <section className="rounded-xl glass p-5 space-y-3">
        <p className="text-sm text-[var(--muted)]">
          The templates gallery has been retired as part of removing theme and branding support. Build your page using the block palette on the left in the editor.
        </p>
      </section>
    </div>
  );
}

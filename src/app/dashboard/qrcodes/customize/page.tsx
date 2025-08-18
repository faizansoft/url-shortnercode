"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Designer from "../Designer";

export default function CustomizeQRPage() {
  return (
    <div className="space-y-4">
      <Suspense fallback={<div className="p-4 text-sm text-[var(--muted)]">Loading…</div>}>
        <CustomizeQRInner />
      </Suspense>
    </div>
  );
}

function CustomizeQRInner() {
  const search = useSearchParams();
  const url = search.get("url") || "";
  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-lg font-semibold">Customize design</div>
          <div className="text-xs text-[var(--muted)] break-all">{url}</div>
        </div>
        <div className="flex gap-2">
          <Link className="btn btn-secondary h-8" href="/dashboard/qrcodes">Back</Link>
        </div>
      </div>

      {/* Full-featured designer with patterns, corners, colors, icons */}
      <Designer value={url} />
    </>
  );
}

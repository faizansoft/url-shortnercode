"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Designer from "../Designer";

export default function CustomizeQRPage() {
  return (
    <div className="flex flex-col gap-4 min-h-screen overflow-hidden">
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

      {/* Fixed page: Designer fills remaining height; only its left panel scrolls */}
      <div className="flex-1 min-h-0 overflow-hidden pt-2">
        <Designer value={url} />
      </div>
    </>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabaseClient";

export default function UserMenu() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  async function logout() {
    await supabaseClient.auth.signOut();
    router.replace("/login");
  }

  return (
    <div className="relative">
      <button
        aria-label="Account"
        className="btn btn-ghost h-9 w-9 p-0 rounded-full font-semibold"
        onClick={() => setOpen((v) => !v)}
      >
        U
      </button>
      {open && (
        <div
          className="absolute right-0 mt-2 w-40 rounded-md text-sm shadow-lg border"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          <button
            className="w-full text-left px-3 py-2 rounded-md transition-colors"
            style={{ background: 'transparent' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'color-mix(in oklab, var(--accent) 10%, var(--surface))')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            onClick={logout}
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}

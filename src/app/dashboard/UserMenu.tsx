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
        <div className="absolute right-0 mt-2 w-40 rounded-md border bg-white shadow-lg text-sm">
          <button
            className="w-full text-left px-3 py-2 hover:bg-gray-50"
            onClick={logout}
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}

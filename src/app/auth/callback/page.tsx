"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabaseClient";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "done" | "error">("loading");

  useEffect(() => {
    (async () => {
      try {
        const { error } = await supabaseClient.auth.getSession();
        if (error) throw error;
        // Supabase JS automatically parses tokens from URL and sets the session.
        setStatus("done");
        router.replace("/dashboard");
      } catch (e) {
        setStatus("error");
      }
    })();
  }, [router]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center text-sm text-neutral-600">
      {status === "loading" && "Finalizing sign-in…"}
      {status === "error" && "Failed to finalize sign-in. Please try the magic link again."}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabaseClient } from "@/lib/supabaseClient";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<"loading" | "authed" | "guest">("loading");
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let mounted = true;
    const check = async () => {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!mounted) return;
      setStatus(session ? "authed" : "guest");
    };
    check();

    // Subscribe to auth changes to keep guard in sync (sign-in, sign-out, token refresh)
    const { data: sub } = supabaseClient.auth.onAuthStateChange(() => {
      check();
    });

    // Re-check when tab gets focus (helps after long inactivity)
    const onVis = () => {
      if (document.visibilityState === 'visible') check();
    };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      mounted = false;
      sub.subscription?.unsubscribe();
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [pathname]);

  useEffect(() => {
    if (status === "guest") {
      router.replace("/login");
    }
  }, [status, router]);

  if (status !== "authed") {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-neutral-500">
        Checking session…
      </div>
    );
  }

  return <>{children}</>;
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabaseClient } from "@/lib/supabaseClient";

export default function SessionCTA() {
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await supabaseClient.auth.getSession();
        if (mounted) setHasSession(!!data.session);
      } catch {
        if (mounted) setHasSession(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  if (hasSession === null) {
    return <button className="btn btn-primary">Loading…</button>;
  }

  return hasSession ? (
    <Link href="/dashboard" className="btn btn-primary">Go to Dashboard</Link>
  ) : (
    <div className="flex flex-wrap gap-3">
      <Link href="/login" className="btn btn-primary">Login</Link>
      <Link href="/login" className="btn btn-secondary">Register</Link>
    </div>
  );
}

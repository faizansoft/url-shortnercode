export const runtime = 'edge'
export const dynamic = 'force-dynamic'

import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabaseServerSSR";

export default async function LoginLayout({ children }: { children: React.ReactNode }) {
  const supabase = await getSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (data.user) {
    redirect("/dashboard");
  }
  return children;
}

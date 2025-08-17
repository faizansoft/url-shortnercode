import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabaseServerSSR";
import LoginClient from "./LoginClient";

export default async function LoginPage() {
  const supabase = await getSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (data.user) {
    redirect("/dashboard");
  }
  return <LoginClient />;
}

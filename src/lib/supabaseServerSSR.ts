import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Normalize URL: ensure protocol and no trailing slash
const normalizedWithProto = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`
const supabaseUrl = normalizedWithProto.replace(/\/+$/g, '')

export async function getSupabaseServerClient() {
  const cookieStore = await cookies()
  return createServerClient(supabaseUrl, anonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
      // No-ops in RSC; we don't mutate cookies from here
      set() { /* noop */ },
      remove() { /* noop */ },
    },
  })
}

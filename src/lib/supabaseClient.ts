import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let cachedClient: SupabaseClient | null = null

export function getSupabaseClient(): SupabaseClient {
  if (cachedClient) return cachedClient

  // Ensure this only runs in the browser
  if (typeof window === 'undefined') {
    throw new Error('supabaseClient is only available in the browser')
  }

  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!rawUrl || !supabaseAnonKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }

  // Normalize URL: ensure protocol and no trailing slash
  const normalizedWithProto = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`
  const supabaseUrl = normalizedWithProto.replace(/\/+$/g, '')

  cachedClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'url-shortner-auth',
    },
  })
  return cachedClient
}

// Backward-compatible export that lazily initializes on first property access
export const supabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop: string | symbol, receiver: unknown) {
    const client = getSupabaseClient()
    const value = Reflect.get(client as object, prop, receiver) as unknown
    if (typeof value === 'function') {
      return (value as (...args: unknown[]) => unknown).bind(client)
    }
    return value
  },
})

import { createClient } from '@supabase/supabase-js'

// Browser/client-side Supabase instance (uses public anon key)
const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Normalize URL: ensure protocol and no trailing slash
const normalizedWithProto = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`
const supabaseUrl = normalizedWithProto.replace(/\/+$/g, '')

export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'url-shortner-auth',
  },
})

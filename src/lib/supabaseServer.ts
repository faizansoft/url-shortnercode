import { createClient } from '@supabase/supabase-js'

// Server-side Supabase client (uses service role key). Do NOT import this in client code.
const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Normalize URL: ensure protocol and no trailing slash
const normalizedWithProto = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`
const supabaseUrl = normalizedWithProto.replace(/\/+$/g, '')

export const supabaseServer = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
})

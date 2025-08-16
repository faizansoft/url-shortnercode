import { createClient } from '@supabase/supabase-js'

<<<<<<< HEAD
// Lazily initialize the server-side Supabase client at runtime to avoid
// reading env vars during the build phase.
let cachedClient: ReturnType<typeof createClient> | null = null

export function getSupabaseServer() {
  if (cachedClient) return cachedClient

  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!rawUrl || !serviceRoleKey) {
    throw new Error('Supabase environment variables are missing')
  }

  // Normalize URL: ensure protocol and no trailing slash
  const normalizedWithProto = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`
  const supabaseUrl = normalizedWithProto.replace(/\/+$/g, '')

  cachedClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  })
  return cachedClient
}
=======
// Server-side Supabase client (uses service role key). Do NOT import this in client code.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const supabaseServer = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
})
>>>>>>> 0e1f9ed (Initial commit)

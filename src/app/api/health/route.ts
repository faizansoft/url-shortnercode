import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseServer } from '@/lib/supabaseServer'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const startedAt = Date.now()
  const url = new URL(req.url)
  const bucket = url.searchParams.get('bucket') || 'qr-thumbs'
  const path = url.searchParams.get('path') || 'thumbs/example.png'

  // Env presence (do not leak secrets)
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const svc = process.env.SUPABASE_SERVICE_ROLE_KEY
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL

  let supabaseUrlNorm: string | null = null
  let authUserId: string | null = null
  let publicUrl: string | null = null
  const errors: Array<{ where: string; message: string }> = []

  // Normalize URL like server client does
  try {
    if (rawUrl) {
      const withProto = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`
      supabaseUrlNorm = withProto.replace(/\/+$/g, '')
    }
  } catch (e) {
    errors.push({ where: 'normalize', message: (e as Error).message })
  }

  // Try server client and optional auth token check
  try {
    const supabase = getSupabaseServer()
    // Optional Bearer token to validate auth works end-to-end
    const auth = req.headers.get('authorization') || req.headers.get('Authorization')
    const token = auth?.startsWith('Bearer ') ? auth.slice('Bearer '.length) : null
    if (token) {
      try {
        const { data, error } = await supabase.auth.getUser(token)
        if (!error) authUserId = data.user?.id ?? null
        else errors.push({ where: 'auth.getUser', message: error.message })
      } catch (e) {
        errors.push({ where: 'auth.getUser.catch', message: (e as Error).message })
      }
    }
    // Build a sample public URL for storage to verify URL shape
    try {
      const res = supabase.storage.from(bucket).getPublicUrl(path)
      publicUrl = (res && res.data && typeof res.data.publicUrl === 'string') ? res.data.publicUrl : null
    } catch (e) {
      errors.push({ where: 'storage.getPublicUrl', message: (e as Error).message })
    }
  } catch (e) {
    errors.push({ where: 'getSupabaseServer', message: (e as Error).message })
  }

  const tookMs = Date.now() - startedAt
  return NextResponse.json({
    ok: errors.length === 0,
    tookMs,
    env: {
      NEXT_PUBLIC_SUPABASE_URL_present: !!rawUrl,
      NEXT_PUBLIC_SUPABASE_ANON_KEY_present: !!anon,
      SUPABASE_SERVICE_ROLE_KEY_present: !!svc,
      NEXT_PUBLIC_SITE_URL_present: !!siteUrl,
    },
    supabaseUrlNorm,
    authUserId,
    sample: { bucket, path, publicUrl },
    errors,
  })
}

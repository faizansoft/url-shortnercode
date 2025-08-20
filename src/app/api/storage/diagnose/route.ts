import { NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabaseServer'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

export async function GET() {
  const errors: string[] = []
  const env = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'present' : 'missing',
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'present' : 'missing',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'present' : 'missing',
  }

  let server
  try {
    server = getSupabaseServer()
  } catch (e: unknown) {
    errors.push(e instanceof Error ? e.message : 'Failed to init Supabase server client')
    return NextResponse.json({ ok: false, env, errors }, { status: 500 })
  }

  // List buckets (admin) to confirm service role works
  let buckets: Array<{ id: string; name?: string }> = []
  try {
    const { data, error } = await server.storage.listBuckets()
    if (error) {
      errors.push(`listBuckets error: ${error.message}`)
    } else {
      buckets = (data || []).map((b) => ({ id: b.id, name: (b as any).name }))
    }
  } catch (e: unknown) {
    errors.push(`listBuckets threw: ${e instanceof Error ? e.message : 'unknown error'}`)
  }

  // Try small test uploads to expected buckets
  const now = Date.now()
  const testContent = new Blob([`diagnostic ${now}`], { type: 'text/plain' })
  const targets = [
    { bucket: 'qr-thumbs', path: `diagnostics/${now}.txt`, contentType: 'text/plain' },
    { bucket: 'qr-logos', path: `diagnostics/${now}.txt`, contentType: 'text/plain' },
  ] as const

  const attempts: Array<{ bucket: string; path: string; uploaded: boolean; error?: string; publicUrl?: string }> = []

  for (const t of targets) {
    try {
      const up = await server.storage.from(t.bucket).upload(t.path, testContent, {
        upsert: true,
        contentType: t.contentType,
        cacheControl: '60',
      })
      if (up.error) {
        attempts.push({ bucket: t.bucket, path: t.path, uploaded: false, error: up.error.message })
      } else {
        const pub = server.storage.from(t.bucket).getPublicUrl(t.path)
        const publicUrl = pub?.data?.publicUrl || ''
        attempts.push({ bucket: t.bucket, path: t.path, uploaded: true, publicUrl })
      }
    } catch (e: unknown) {
      attempts.push({ bucket: t.bucket, path: t.path, uploaded: false, error: e instanceof Error ? e.message : 'unknown error' })
    }
  }

  return NextResponse.json({ ok: errors.length === 0, env, buckets, attempts, errors })
}

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabaseServer'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

// Table expected:
// create table qr_styles (
//   id uuid primary key default gen_random_uuid(),
//   user_id uuid not null,
//   short_code text not null,
//   options jsonb not null,
//   updated_at timestamp with time zone default now(),
//   unique(user_id, short_code)
// );

export async function GET(req: NextRequest) {
  try {
    const supabaseServer = getSupabaseServer()
    const { searchParams } = new URL(req.url)
    const code = searchParams.get('code')?.trim()
    const debug = searchParams.get('debug') === '1'
    if (!code) return NextResponse.json({ error: 'Missing code' }, { status: 400 })

    // Auth
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization')
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.slice('Bearer '.length)
      : undefined
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: { 'Cache-Control': 'no-store' } })

    const { data: authData } = await supabaseServer.auth.getUser(token)
    const user_id = authData?.user?.id
    if (!user_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: { 'Cache-Control': 'no-store' } })

    const startedAt = Date.now()
    const { data, error } = await supabaseServer
      .from('qr_styles')
      .select('options')
      .eq('user_id', user_id)
      .eq('short_code', code)
      .maybeSingle()

    if (error) {
      // If table missing, respond with empty options but note
      if (error.message?.toLowerCase().includes('relation') && error.message?.toLowerCase().includes('does not exist')) {
        return NextResponse.json(
          { options: null, warning: 'qr_styles table not configured' },
          { status: 200, headers: { 'Cache-Control': 'private, max-age=30' } }
        )
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const tookMs = Date.now() - startedAt
    return NextResponse.json(
      { options: data?.options ?? null, ...(debug ? { diagnostics: { tookMs, short_code: code, user_id } } : {}) },
      { headers: { 'Cache-Control': 'private, max-age=30' } }
    )
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabaseServer = getSupabaseServer()
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400, headers: { 'Cache-Control': 'no-store' } })
    }
    const short_code = typeof (body as any)?.short_code === 'string' ? (body as any).short_code.trim() : ''
    const options = (body as any)?.options
    if (!short_code || typeof options !== 'object') {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400, headers: { 'Cache-Control': 'no-store' } })
    }

    // Basic validation and size limit (~100KB JSON)
    let optionsJson = ''
    try { optionsJson = JSON.stringify(options) } catch { return NextResponse.json({ error: 'Options must be JSON-serializable' }, { status: 400, headers: { 'Cache-Control': 'no-store' } }) }
    if (optionsJson.length > 100_000) {
      return NextResponse.json({ error: 'Options too large (limit ~100KB)' }, { status: 413, headers: { 'Cache-Control': 'no-store' } })
    }
    // Optional: validate thumbnailUrl shape if present
    const thumb = (options as Record<string, unknown>)?.['thumbnailUrl']
    if (typeof thumb === 'string' && thumb.length > 0) {
      const ok = /^https?:\/\//i.test(thumb) || thumb.startsWith('data:image/')
      if (!ok) return NextResponse.json({ error: 'thumbnailUrl must be http(s) or data:image URL' }, { status: 400, headers: { 'Cache-Control': 'no-store' } })
    }

    // Auth
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization')
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.slice('Bearer '.length)
      : undefined
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: authData } = await supabaseServer.auth.getUser(token)
    const user_id = authData?.user?.id
    if (!user_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Upsert
    const startedAt = Date.now()
    const { error } = await supabaseServer
      .from('qr_styles')
      .upsert({ user_id, short_code, options }, { onConflict: 'user_id,short_code' })

    if (error) {
      if (error.message?.toLowerCase().includes('relation') && error.message?.toLowerCase().includes('does not exist')) {
        return NextResponse.json({ ok: false, warning: 'qr_styles table not configured' }, { headers: { 'Cache-Control': 'no-store' } })
      }
      return NextResponse.json({ error: error.message }, { status: 500, headers: { 'Cache-Control': 'no-store' } })
    }

    const tookMs = Date.now() - startedAt
    return NextResponse.json({ ok: true, diagnostics: { tookMs } }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500, headers: { 'Cache-Control': 'no-store' } })
  }
}

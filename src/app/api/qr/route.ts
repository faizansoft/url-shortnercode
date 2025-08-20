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

    return NextResponse.json(
      { options: data?.options ?? null },
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
    const body = await req.json()
    const short_code = typeof body?.short_code === 'string' ? body.short_code.trim() : ''
    const options = body?.options
    if (!short_code || typeof options !== 'object') {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400, headers: { 'Cache-Control': 'no-store' } })
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
    const { error } = await supabaseServer
      .from('qr_styles')
      .upsert({ user_id, short_code, options }, { onConflict: 'user_id,short_code' })

    if (error) {
      if (error.message?.toLowerCase().includes('relation') && error.message?.toLowerCase().includes('does not exist')) {
        return NextResponse.json({ ok: false, warning: 'qr_styles table not configured' }, { headers: { 'Cache-Control': 'no-store' } })
      }
      return NextResponse.json({ error: error.message }, { status: 500, headers: { 'Cache-Control': 'no-store' } })
    }

    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500, headers: { 'Cache-Control': 'no-store' } })
  }
}

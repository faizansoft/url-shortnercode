import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabaseServer'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

// POST /api/engagement
// Accepts beacons for session timing and funnel events.
// Body shapes:
// { type: 'session', link_code?: string, link_id?: string, session_id: string, started_at?: string, ended_at?: string, duration_ms?: number, bounced?: boolean }
// { type: 'event', link_code?: string, link_id?: string, session_id: string, step: string, ts?: string }
export async function POST(req: NextRequest) {
  try {
    const supabaseServer = getSupabaseServer()
    const body = await req.json().catch(() => ({})) as Record<string, any>
    const type = String(body.type || '')
    let link_id: string | null = typeof body.link_id === 'string' ? body.link_id : null
    const link_code: string | null = typeof body.link_code === 'string' ? body.link_code : null

    // Resolve link_id by code if necessary
    if (!link_id && link_code) {
      const { data: row } = await supabaseServer
        .from('links')
        .select('id')
        .eq('short_code', link_code)
        .maybeSingle()
      link_id = (row as any)?.id ?? null
    }

    if (!link_id) return NextResponse.json({ ok: false, error: 'link not found' }, { status: 400, headers: { 'Cache-Control': 'no-store' } })

    if (type === 'session') {
      const session_id = typeof body.session_id === 'string' ? body.session_id : null
      if (!session_id) return NextResponse.json({ ok: false, error: 'session_id required' }, { status: 400 })
      const started_at = body.started_at ? new Date(body.started_at).toISOString() : null
      const ended_at = body.ended_at ? new Date(body.ended_at).toISOString() : null
      const duration_ms = Number.isFinite(body.duration_ms) ? Math.max(0, Number(body.duration_ms)) : null
      const bounced = !!body.bounced
      try {
        // Upsert by (link_id, session_id)
        const payload = { link_id, session_id, started_at, ended_at, duration_ms, bounced }
        await supabaseServer
          .from('engagement_sessions')
          .upsert(payload, { onConflict: 'link_id,session_id' } as any)
        return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } })
      } catch (e) {
        return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500, headers: { 'Cache-Control': 'no-store' } })
      }
    }

    if (type === 'event') {
      const session_id = typeof body.session_id === 'string' ? body.session_id : null
      const step = typeof body.step === 'string' ? body.step : null
      if (!session_id || !step) return NextResponse.json({ ok: false, error: 'session_id and step required' }, { status: 400 })
      const ts = body.ts ? new Date(body.ts).toISOString() : new Date().toISOString()
      try {
        await supabaseServer
          .from('funnel_events')
          .insert({ link_id, session_id, step, ts })
        return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } })
      } catch (e) {
        return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500, headers: { 'Cache-Control': 'no-store' } })
      }
    }

    return NextResponse.json({ ok: false, error: 'invalid type' }, { status: 400, headers: { 'Cache-Control': 'no-store' } })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ ok: false, error: message }, { status: 500, headers: { 'Cache-Control': 'no-store' } })
  }
}

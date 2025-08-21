import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabaseServer'
import { generateShortCode, isValidUrl } from '@/lib/shortCode'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const supabaseServer = getSupabaseServer()
    let payload: unknown
    try {
      payload = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400, headers: { 'Cache-Control': 'no-store' } })
    }
    const obj = (payload ?? {}) as Record<string, unknown>
    const target_url = typeof obj.target_url === 'string' ? obj.target_url.trim() : ''
    const code = typeof obj.code === 'string' ? obj.code.trim() : undefined

    if (!target_url || !isValidUrl(target_url)) {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400, headers: { 'Cache-Control': 'no-store' } })
    }

    // choose short_code (custom if provided, else generate unique)
    let short_code: string = ''
    if (typeof code === 'string' && code) {
      const custom = code
      if (!/^[a-zA-Z0-9-_]{3,64}$/.test(custom)) {
        return NextResponse.json({ error: 'Invalid custom code format' }, { status: 400, headers: { 'Cache-Control': 'no-store' } })
      }
      const { data: exists, error: checkErr } = await supabaseServer
        .from('links')
        .select('id')
        .eq('short_code', custom)
        .limit(1)
        .maybeSingle()
      if (checkErr) return NextResponse.json({ error: checkErr.message }, { status: 500, headers: { 'Cache-Control': 'no-store' } })
      if (exists) return NextResponse.json({ error: 'Custom code already taken' }, { status: 409, headers: { 'Cache-Control': 'no-store' } })
      short_code = custom
    } else {
      // ensure unique short_code
      for (let i = 0; i < 5; i++) {
        const candidate = generateShortCode()
        const { data, error } = await supabaseServer
          .from('links')
          .select('id')
          .eq('short_code', candidate)
          .limit(1)
          .maybeSingle()
        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500, headers: { 'Cache-Control': 'no-store' } })
        }
        if (!data) { short_code = candidate; break }
      }
      if (!short_code) {
        return NextResponse.json({ error: 'Failed to generate short code, retry.' }, { status: 500, headers: { 'Cache-Control': 'no-store' } })
      }
    }

    // Try to attach user_id from Supabase auth token if provided
    let user_id: string | null = null
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization')
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.slice('Bearer '.length)
      : undefined

    if (token) {
      const { data: authData } = await supabaseServer.auth.getUser(token)
      user_id = authData?.user?.id ?? null
    }

    const startedAt = Date.now()
    const { data: inserted, error: insertErr } = await supabaseServer
      .from('links')
      .insert({ short_code, target_url, user_id })
      .select('*')
      .single()

    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 500, headers: { 'Cache-Control': 'no-store' } })
    }

    const tookMs = Date.now() - startedAt
    return NextResponse.json({ short_code: inserted.short_code, target_url: inserted.target_url, diagnostics: { tookMs } }, { status: 201, headers: { 'Cache-Control': 'no-store' } })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500, headers: { 'Cache-Control': 'no-store' } })
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabaseServer = getSupabaseServer()
    const { searchParams } = new URL(req.url)
    const code = searchParams.get('code')
    const debug = searchParams.get('debug') === '1'

    // Attach user context if provided via Bearer; used for listing
    let user_id: string | null = null
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization')
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.slice('Bearer '.length)
      : undefined
    if (token) {
      const { data: authData } = await supabaseServer.auth.getUser(token)
      user_id = authData?.user?.id ?? null
    }

    if (code) {
      // detail view: fetch link and some basic analytics
      type LinkRow = { id: string; short_code: string; target_url: string; user_id: string; created_at?: string }
      const startedAt = Date.now()
      const { data: linkRaw, error } = await supabaseServer
        .from('links')
        .select('id, short_code, target_url, user_id, created_at')
        .eq('short_code', code)
        .maybeSingle()
      if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: { 'Cache-Control': 'no-store' } })
      const link = (linkRaw ?? null) as LinkRow | null
      if (!link) return NextResponse.json({ error: 'Not found' }, { status: 404, headers: { 'Cache-Control': 'no-store' } })

      // Pull recent clicks (up to 1000 rows). Avoid referencing a specific timestamp column
      // because schema may differ (created_at vs createdAt, etc.). We'll normalize later.
      const { data: rawClicks, error: clicksErr } = await supabaseServer
        .from('clicks')
        .select('*')
        .eq('link_id', link.id)
        .limit(1000)
      if (clicksErr) return NextResponse.json({ error: clicksErr.message }, { status: 500, headers: { 'Cache-Control': 'no-store' } })

      // Normalize clicks and sort by derived timestamp desc
      type AnyClick = Record<string, unknown>
      const clicks = (rawClicks ?? [])
        .map((c: AnyClick) => {
          const tsRaw = (c['created_at'] ?? c['createdAt'] ?? c['timestamp'] ?? c['ts'] ?? c['inserted_at'] ?? c['insertedAt']) as string | number | Date | null | undefined
          const ts = tsRaw ? new Date(tsRaw) : new Date(0)
          const created_at = Number.isNaN(ts.getTime()) ? new Date(0).toISOString() : ts.toISOString()
          const referrer = (c['referrer'] ?? null) as string | null
          const ip = (c['ip'] ?? null) as string | null
          return { created_at, referrer, ip }
        })
        .sort((a, b) => (new Date(b.created_at).getTime() - new Date(a.created_at).getTime()))

      // Build daily counts for last 30 days
      const dayKey = (d: Date) => d.toISOString().slice(0, 10)
      const daily: Record<string, number> = {}
      for (let i = 0; i < 30; i++) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        daily[dayKey(d)] = 0
      }
      for (const c of clicks) {
        const key = (c.created_at as string).slice(0, 10)
        if (key in daily) daily[key]++
      }

      // Top referrers
      const refCounts: Record<string, number> = {}
      for (const c of clicks) {
        const ref = (c.referrer || 'direct') as string
        refCounts[ref] = (refCounts[ref] || 0) + 1
      }
      const topReferrers = Object.entries(refCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([referrer, count]) => ({ referrer, count }))

      const tookMs = Date.now() - startedAt
      return NextResponse.json(
        { link, clicks: clicks.slice(0, 20), daily, topReferrers, ...(debug ? { diagnostics: { tookMs, clicksCount: rawClicks?.length ?? 0 } } : {}) },
        { headers: { 'Cache-Control': 'no-store' } }
      )
    }

    // list recent links for the authenticated user, else public (none)
    if (!user_id) {
      return NextResponse.json({ links: [] }, { headers: { 'Cache-Control': 'no-store' } })
    }
    const { data: links, error } = await supabaseServer
      .from('links')
      .select('short_code, target_url, created_at')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })
      .limit(120)
    if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: { 'Cache-Control': 'no-store' } })
    return NextResponse.json(
      { links: links ?? [] },
      { headers: { 'Cache-Control': 'private, max-age=15' } }
    )
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500, headers: { 'Cache-Control': 'no-store' } })
  }
}

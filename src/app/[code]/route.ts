import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabaseServer'
import { geoLookup } from '@/lib/geo'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  ctx: unknown
) {
  const code = (ctx as { params?: { code?: string } })?.params?.code
  if (!code || code.length < 3) {
    return NextResponse.redirect(new URL('/_not-found', new URL(_req.url)), 302)
  }

  // Find target URL
  const supabaseServer = getSupabaseServer()
  type LinkRow = { id: string; target_url: string }
  const { data: linkRaw, error } = await supabaseServer
    .from('links')
    .select('id, target_url')
    .eq('short_code', code)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  const link = (linkRaw ?? null) as LinkRow | null
  if (!link) {
    return NextResponse.redirect(new URL('/_not-found', new URL(_req.url)), 302)
  }

  // Prepare logging context
  const ref = _req.headers.get('referer') ?? null
  const ip = getClientIp(_req)
  const ua = _req.headers.get('user-agent') ?? null

  // Synchronous logging (await) to ensure write happens on Edge before redirect
  const nowIso = new Date().toISOString()
  // Insert minimal columns first to avoid schema mismatches. Rely on DB defaults for timestamps.
  const minimalPayload = { link_id: link.id, referrer: ref, ...(ip ? { ip } : {}), ...(ua ? { ua } : {}) }
  try {
    const { error } = await supabaseServer
      .from('clicks')
      // Cast to any to satisfy TS when schema generics resolve to never in CI
      .insert(minimalPayload as any)
    if (error) {
      // Fallback: try with explicit created_at for schemas without default timestamp
      await supabaseServer
        .from('clicks')
        .insert({ ...minimalPayload, created_at: nowIso } as any)
    }
  } catch {
    // Swallow errors to not block redirect
  }

  // Best-effort, non-blocking geo enrichment into a separate table `click_geo`
  if (ip) {
    try {
      const geo = await geoLookup(ip)
      if (geo) {
        await supabaseServer
          .from('click_geo')
          .insert({
            link_id: link.id,
            ip,
            country: geo.country ?? null,
            region: geo.region ?? null,
            city: geo.city ?? null,
            latitude: geo.lat ?? null,
            longitude: geo.lon ?? null,
            org: geo.org ?? null,
            asn: geo.asn ?? null,
            created_at: nowIso,
          })
      }
    } catch {
      // ignore
    }
  }

  // Redirect to interstitial which records engagement and then forwards to target
  const base = new URL(_req.url)
  const interstitial = new URL(`/i/${encodeURIComponent(code)}`, base)
  return NextResponse.redirect(interstitial, 302)
}
 

// Extract best-effort client IP from common proxy/CDN headers
function getClientIp(req: NextRequest): string | null {
  const hdr = (k: string) => req.headers.get(k) || req.headers.get(k.toLowerCase())
  const first = (v: string | null) => v?.split(',')[0]?.trim() || null
  const parseForwarded = (v: string | null) => {
    if (!v) return null
    // Example: for="203.0.113.43:47062";proto=https;by="203.0.113.43"
    // We extract the first for= token's IP
    const m = v.match(/for=\"?\[?([^\];\"]+)/i)
    if (!m) return null
    const candidate = m[1].split(':')[0]
    return candidate || null
  }
  // Priority: CF-Connecting-IP, True-Client-IP, X-Real-IP, X-Forwarded-For
  const candidates = [
    hdr('CF-Connecting-IP'),
    hdr('True-Client-IP'),
    hdr('X-Client-IP'),
    hdr('X-Real-IP'),
    first(hdr('X-Forwarded-For')),
    parseForwarded(hdr('Forwarded')),
  ].filter(Boolean) as string[]
  const ip = candidates[0] || null
  if (!ip) return null
  // Ignore obvious private/local addresses to avoid resolving server location
  if (/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.|127\.|::1|fc00:|fe80:)/i.test(ip)) return null
  return ip
}

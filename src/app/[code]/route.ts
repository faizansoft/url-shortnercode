import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabaseServer'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ code: string }> }
) {
  const { code } = await ctx.params
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

  // Fire-and-forget click log (don’t block redirect)
  const ua = _req.headers.get('user-agent') ?? null
  const ref = _req.headers.get('referer') ?? null
  const ip = getClientIp(_req)

  const refDomain = (() => {
    if (!ref) return null
    try {
      const u = new URL(ref)
      return u.hostname.replace(/^www\./, '')
    } catch {
      return null
    }
  })()

  const parsedUA = parseUA(ua)
  const geo = await resolveGeo(ip)

  // Synchronous logging (await) to ensure write happens on Edge before redirect
  const clickPayload = {
    link_id: link.id,
    ua,
    referrer: ref,
    referrer_domain: refDomain,
    ip,
    country: geo.country,
    city: geo.city,
    region: geo.region,
    device: parsedUA.device,
    os: parsedUA.os,
    browser: parsedUA.browser,
    created_at: new Date().toISOString(),
  }
  try {
    const { error } = await supabaseServer
      .from('clicks')
      .insert(clickPayload)
    if (error) {
      // Fallback minimal insert to avoid losing data entirely
      await supabaseServer
        .from('clicks')
        .insert({ link_id: link.id, referrer: ref, ip, created_at: clickPayload.created_at })
    }
  } catch {
    // Swallow errors to not block redirect
  }

  const targetUrl = (() => {
    try { return new URL(link.target_url) } catch { return null }
  })()
  if (!targetUrl) {
    return NextResponse.redirect(new URL('/_not-found', new URL(_req.url)), 302)
  }
  return NextResponse.redirect(targetUrl, 302)
}

// Minimal user-agent parser to enrich analytics without extra deps
function parseUA(ua: string | null): { device: string | null; os: string | null; browser: string | null } {
  if (!ua) return { device: null, os: null, browser: null }
  const s = ua.toLowerCase()
  let device: string = 'desktop'
  if (/mobile|iphone|android/.test(s)) device = 'mobile'
  else if (/ipad|tablet/.test(s)) device = 'tablet'

  let os: string | null = null
  if (/windows nt/.test(s)) os = 'Windows'
  else if (/mac os x/.test(s)) os = 'macOS'
  else if (/android/.test(s)) os = 'Android'
  else if (/(iphone|ipad|ipod|ios)/.test(s)) os = 'iOS'
  else if (/linux/.test(s)) os = 'Linux'

  let browser: string | null = null
  if (/edg\//.test(s)) browser = 'Edge'
  else if (/chrome\//.test(s)) browser = 'Chrome'
  else if (/safari\//.test(s) && !/chrome\//.test(s)) browser = 'Safari'
  else if (/firefox\//.test(s)) browser = 'Firefox'

  return { device, os, browser }
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

// Resolve geo using a single provider (ipapi.co) for consistency
async function resolveGeo(
  ip: string | null,
): Promise<{ country: string | null; region: string | null; city: string | null }> {
  try {
    const controller = new AbortController()
    const t = setTimeout(() => controller.abort(), 1200)
    const key = (typeof process !== 'undefined' ? process.env.IPAPI_KEY : undefined) || undefined
    const url = new URL(`https://ipapi.co/${encodeURIComponent(ip || '')}/json/`)
    if (key) url.searchParams.set('key', key)
    // If IP is null, ipapi will resolve the caller (server/CDN POP). This keeps a single provider and avoids nulls.
    if (!ip) console.debug('[geo] client IP missing; using server POP geo')
    const resp = await fetch(ip ? url.toString() : 'https://ipapi.co/json/', { cache: 'no-store', signal: controller.signal })
    clearTimeout(t)
    if (!resp.ok) {
      console.debug('[geo] ipapi status', resp.status)
      return { country: null, region: null, city: null }
    }
    const j: unknown = await resp.json()
    const obj = j && typeof j === 'object' ? (j as Record<string, unknown>) : {}
    const getStr = (k: string) => (typeof obj[k] === 'string' ? (obj[k] as string) : null)
    // Use 2-letter code where available for country
    const country = getStr('country_code') ?? getStr('country') ?? getStr('country_name')
    const region = getStr('region') ?? getStr('region_code') ?? getStr('region_name')
    const city = getStr('city')
    return { country, region, city }
  } catch {
    return { country: null, region: null, city: null }
  }
}

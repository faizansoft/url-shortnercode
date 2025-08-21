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

  // Debug mode: add ?geo=1 to inspect IP/geo resolution
  const urlObj = new URL(_req.url)
  const geoDebug = urlObj.searchParams.get('geo') === '1'

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
  const geo = await getCloudflareGeo(_req)

  if (geoDebug) {
    const hdr = (k: string) => _req.headers.get(k) || _req.headers.get(k.toLowerCase())
    return NextResponse.json({
      debug: true,
      provider: 'cloudflare',
      extractedIp: ip,
      headers: {
        'CF-Connecting-IP': hdr('CF-Connecting-IP'),
        'True-Client-IP': hdr('True-Client-IP'),
        'X-Client-IP': hdr('X-Client-IP'),
        'X-Real-IP': hdr('X-Real-IP'),
        'X-Forwarded-For': hdr('X-Forwarded-For'),
        Forwarded: hdr('Forwarded'),
      },
      ua,
      geo,
    })
  }

  // Synchronous logging (await) to ensure write happens on Edge before redirect
  const clickPayload = {
    link_id: link.id,
    ua,
    referrer: ref,
    referrer_domain: refDomain,
    ip,
    country: geo?.country ?? null,
    region: geo?.region ?? null,
    city: geo?.city ?? null,
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

// Get geo data from Cloudflare only (Edge-compatible)
async function getCloudflareGeo(
  req: NextRequest,
): Promise<{ country: string | null; region: string | null; city: string | null } | null> {
  // Cloudflare Workers/Pages expose a cf object on the Request with rich geo
  const anyReq = req as unknown as { cf?: Record<string, unknown> }
  const cf = anyReq.cf || undefined
  const getStr = (o: Record<string, unknown> | undefined, k: string) =>
    o && typeof o[k] === 'string' ? (o[k] as string) : null
  
  // Try Cloudflare geo first
  const cfCountry = getStr(cf, 'country')
  const cfRegion = getStr(cf, 'region')
  const cfCity = getStr(cf, 'city')
  
  // Some CF configs expose geo in a nested object
  const anyGeo = cf?.httpProtocol ? undefined : (cf as unknown as Record<string, unknown>)
  const geoCountry = getStr(anyGeo, 'country')
  const geoRegion = getStr(anyGeo, 'region')
  const geoCity = getStr(anyGeo, 'city')
  
  // Backup to headers when cf object not populated
  const hdr = (k: string) => req.headers.get(k) || req.headers.get(k.toLowerCase())
  const hCountry = hdr('CF-IPCountry') || hdr('cf-ipcountry')
  const hRegion = hdr('CF-Region') || hdr('cf-region')
  const hCity = hdr('CF-IPCity') || hdr('cf-ipcity') || hdr('cf-city')
  
  // Get the best available data from Cloudflare
  const country = cfCountry || geoCountry || hCountry || null
  const region = cfRegion || geoRegion || hRegion || null
  const city = cfCity || geoCity || hCity || null
  
  // Return whatever we have from Cloudflare headers/context
  if (country || region || city) return { country, region, city }
  return null
}

// Parse user agent string into { browser, os, device }

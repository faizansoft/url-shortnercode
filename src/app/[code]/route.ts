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
  let geo = await getCloudflareGeo(_req)
  // Optional enrichment via local shards on Edge when Cloudflare data is incomplete
  const enrichEnabled = (process.env.ENABLE_GEO_ENRICH ?? '1') !== '0'
  if (enrichEnabled && (!geo || !(geo.country && geo.region && geo.city))) {
    const enriched = await enrichGeoViaApi(ip, geo, _req.url)
    if (enriched) geo = enriched
  }

  if (geoDebug) {
    const hdr = (k: string) => _req.headers.get(k) || _req.headers.get(k.toLowerCase())
    return NextResponse.json({
      debug: true,
      provider: 'cloudflare+api',
      extractedIp: ip,
      enrichment: lastEnrichment, // shows attempted/ok/provider and partial data
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

// Edge-safe enrichment using local JSON shards generated from IP2Location DB3 CSV
async function enrichGeoViaApi(
  ip: string | null,
  base: { country: string | null; region: string | null; city: string | null } | null,
  reqUrl: string,
): Promise<{ country: string | null; region: string | null; city: string | null } | null> {
  try {
    if (!ip) return base
    const needs = !base || !(base.country && base.region && base.city)
    if (!needs) return base
    // Decide IPv4 vs IPv6
    const v4 = ipToInt(ip)
    if (v4 != null) {
      const firstOctet = (v4 >>> 24) & 0xff
      const shard = await loadShardFromRequest(firstOctet, reqUrl)
      if (shard && shard.length > 0) {
        const rec = findInRanges(shard, v4)
        if (rec) {
          lastEnrichment = { attempted: true, ok: true, status: 200, data: { country: rec.c || null, region: rec.r || null, city: rec.ci || null }, provider: 'local' }
          return { country: base?.country || (rec.c || null), region: base?.region || (rec.r || null), city: base?.city || (rec.ci || null) }
        }
      }
      // Fallback: use IPv6 shards via IPv4-mapped address ::ffff:a.b.c.d if IPv4 shards missing/no match
      const mapped = v4ToV6MappedBigInt(v4)
      const b0m = Number((mapped >> 120n) & 0xffn)
      const b1m = Number((mapped >> 112n) & 0xffn)
      const shard6m = await loadShard6FromRequest(b0m, b1m, reqUrl)
      if (!shard6m || shard6m.length === 0) { lastEnrichment = { attempted: true, ok: false, status: 404, error: 'no shard (v4-mapped)', provider: 'local' }; return base }
      const rec6m = findInRangesBig(shard6m, mapped)
      if (!rec6m) { lastEnrichment = { attempted: true, ok: false, status: 204, error: 'no match (v4-mapped)', provider: 'local' }; return base }
      lastEnrichment = { attempted: true, ok: true, status: 200, data: { country: rec6m.c || null, region: rec6m.r || null, city: rec6m.ci || null }, provider: 'local' }
      return { country: base?.country || (rec6m.c || null), region: base?.region || (rec6m.r || null), city: base?.city || (rec6m.ci || null) }
    }
    const v6 = ip6ToBigInt(ip)
    if (v6 != null) {
      const b0 = Number((v6 >> 120n) & 0xffn)
      const b1 = Number((v6 >> 112n) & 0xffn)
      const shard6 = await loadShard6FromRequest(b0, b1, reqUrl)
      if (!shard6 || shard6.length === 0) { lastEnrichment = { attempted: true, ok: false, status: 404, error: 'shard6 not found', provider: 'local' }; return base }
      const rec6 = findInRangesBig(shard6, v6)
      if (!rec6) { lastEnrichment = { attempted: true, ok: false, status: 204, error: 'no match v6', provider: 'local' }; return base }
      lastEnrichment = { attempted: true, ok: true, status: 200, data: { country: rec6.c || null, region: rec6.r || null, city: rec6.ci || null }, provider: 'local' }
      return { country: base?.country || (rec6.c || null), region: base?.region || (rec6.r || null), city: base?.city || (rec6.ci || null) }
    }
    return base
  } catch {
    lastEnrichment = { attempted: true, ok: false, status: -1 }
    return base
  }
}

// capture latest enrichment attempt for debug endpoint
let lastEnrichment: { attempted: boolean; ok: boolean; status: number; provider?: 'local'; data?: { country: string | null; region: string | null; city: string | null }; error?: string } | null = null

// Utilities for local shard lookup
function ipToInt(ip: string): number | null {
  const m = ip.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
  if (!m) return null
  const a = [1,2,3,4].map(i => Number(m[i]))
  if (a.some(n => n < 0 || n > 255 || !Number.isInteger(n))) return null
  return ((a[0] << 24) | (a[1] << 16) | (a[2] << 8) | a[3]) >>> 0
}

type ShardRec = { s: number; e: number; c?: string | null; r?: string | null; ci?: string | null }
const shardCache: Map<number, ShardRec[] | 'missing'> = new Map()

// We need request URL to construct proper absolute URL; provide wrapper used in enrich
async function loadShardFromRequest(octet: number, reqUrl: string): Promise<ShardRec[] | null> {
  const cached = shardCache.get(octet)
  if (cached) return cached === 'missing' ? null : cached
  try {
    const res = await fetch(new URL(`/ip2l/${octet}.json`, reqUrl))
    if (!res.ok) { shardCache.set(octet, 'missing'); return null }
    const data = await res.json() as ShardRec[]
    shardCache.set(octet, data)
    return data
  } catch {
    shardCache.set(octet, 'missing')
    return null
  }
}

function findInRanges(arr: ShardRec[], x: number): ShardRec | null {
  let lo = 0, hi = arr.length - 1
  while (lo <= hi) {
    const mid = (lo + hi) >>> 1
    const r = arr[mid]
    if (x < r.s) hi = mid - 1
    else if (x > r.e) lo = mid + 1
    else return r
  }
  return null
}

// Parse user agent string into { browser, os, device }

// IPv6 support (BigInt-based)
type Shard6Rec = { s: string; e: string; c?: string | null; r?: string | null; ci?: string | null }
const shard6Cache: Map<number, Shard6Rec[] | 'missing'> = new Map()

function ip6ToBigInt(ip: string): bigint | null {
  try {
    let [head] = ip.split('%') // strip zone index if present
    const parts = head.split('::')
    let hextets: string[]
    if (parts.length === 1) {
      hextets = parts[0].split(':')
      if (hextets.length !== 8) return null
    } else if (parts.length === 2) {
      const left = parts[0] ? parts[0].split(':') : []
      const right = parts[1] ? parts[1].split(':') : []
      const missing = 8 - (left.length + right.length)
      if (missing < 1) return null
      hextets = [...left, ...Array(missing).fill('0'), ...right]
    } else {
      return null
    }
    const nums = hextets.map(h => {
      if (!h) return 0n
      const v = BigInt('0x' + h)
      if (v < 0n || v > 0xffffn) throw new Error('bad')
      return v
    })
    let res = 0n
    for (let i = 0; i < 8; i++) res = (res << 16n) | nums[i]
    return res
  } catch {
    return null
  }
}

async function loadShard6FromRequest(b0: number, b1: number, reqUrl: string): Promise<Shard6Rec[] | null> {
  const key = (b0 << 8) | b1
  const cached = shard6Cache.get(key)
  if (cached) return cached === 'missing' ? null : cached
  try {
    const res = await fetch(new URL(`/ip2l6/${b0}/${b1}.json`, reqUrl))
    if (!res.ok) { shard6Cache.set(key, 'missing'); return null }
    const data = await res.json() as Shard6Rec[]
    shard6Cache.set(key, data)
    return data
  } catch {
    shard6Cache.set(key, 'missing')
    return null
  }
}

function findInRangesBig(arr: Shard6Rec[], x: bigint): Shard6Rec | null {
  let lo = 0, hi = arr.length - 1
  while (lo <= hi) {
    const mid = (lo + hi) >>> 1
    const r = arr[mid]
    const rs = BigInt(r.s)
    const re = BigInt(r.e)
    if (x < rs) hi = mid - 1
    else if (x > re) lo = mid + 1
    else return r
  }
  return null
}

// Convert IPv4 integer to IPv6-mapped address BigInt (::ffff:a.b.c.d)
function v4ToV6MappedBigInt(v4: number): bigint {
  // upper 96 bits zero, then 0xffff (16 bits), then 32-bit IPv4
  return (0xffffn << 32n) | BigInt(v4 >>> 0)
}

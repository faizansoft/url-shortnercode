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
  const ip = _req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null

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

// Resolve geo using a single provider (ipapi.co) for consistency
async function resolveGeo(
  ip: string | null,
): Promise<{ country: string | null; region: string | null; city: string | null }> {
  try {
    const controller = new AbortController()
    const t = setTimeout(() => controller.abort(), 1200)
    // If IP is missing, calling /json/ without IP would resolve server location; avoid that and return nulls
    if (!ip) {
      clearTimeout(t)
      return { country: null, region: null, city: null }
    }
    const resp = await fetch(`https://ipapi.co/${encodeURIComponent(ip)}/json/`, { cache: 'no-store', signal: controller.signal })
    clearTimeout(t)
    if (!resp.ok) return { country: null, region: null, city: null }
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

import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'

export const runtime = 'edge'

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ code: string }> }
) {
  const { code } = await ctx.params
  if (!code || code.length < 3) {
    return NextResponse.redirect(new URL('/_not-found', _req.url), 302)
  }

  // Find target URL
  const { data: link, error } = await supabaseServer
    .from('links')
    .select('id, target_url')
    .eq('short_code', code)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  if (!link) {
    return NextResponse.redirect(new URL('/_not-found', _req.url), 302)
  }

  // Fire-and-forget click log (don’t block redirect)
  const ua = _req.headers.get('user-agent') ?? null
  const ref = _req.headers.get('referer') ?? null
  const ip = _req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null
  // Prefer generic/Cloudflare headers (no Vercel-specific headers)
  const countryHeader = _req.headers.get('cf-ipcountry')
  const cityHeader = _req.headers.get('cf-ipcity')
  const regionHeader = _req.headers.get('cf-region')

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
  const geo = await resolveGeo(_req, ip, countryHeader, regionHeader, cityHeader)

  // Best-effort logging; ignore response (avoid PromiseLike catch typing issue)
  ;(async () => {
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
      console.log('[redirect] inserting click', clickPayload)
      const { error } = await supabaseServer
        .from('clicks')
        .insert(clickPayload)
      if (error) {
        console.error('[redirect] click insert error (enhanced)', error)
        // Fallback minimal insert to avoid losing data entirely
        const { error: fbErr } = await supabaseServer
          .from('clicks')
          .insert({ link_id: link.id, referrer: ref, ip, created_at: clickPayload.created_at })
        if (fbErr) console.error('[redirect] click insert error (fallback)', fbErr)
      }
    } catch (e) {
      console.error('[redirect] click insert exception', e)
    }
  })()

  return NextResponse.redirect(link.target_url, 302)
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

// Resolve geo from generic headers or public IP geolocation API (no Vercel dependency)
async function resolveGeo(
  _req: NextRequest,
  ip: string | null,
  countryHeader: string | null,
  regionHeader: string | null,
  cityHeader: string | null
): Promise<{ country: string | null; region: string | null; city: string | null }> {
  // Prefer already provided headers (e.g., Cloudflare)
  const country = countryHeader ?? null
  const region = regionHeader ?? null
  const city = cityHeader ?? null
  if (country || region || city) return { country, region, city }

  // Fallback: use a lightweight public IP geolocation API if IP is available
  if (!ip) return { country: null, region: null, city: null }
  try {
    // ipapi.co has a permissive free tier with rate limits; replace with your preferred provider if needed
    const resp = await fetch(`https://ipapi.co/${encodeURIComponent(ip)}/json/`, { cache: 'no-store' })
    if (!resp.ok) return { country: null, region: null, city: null }
    const j: any = await resp.json()
    return {
      country: (j && (j.country_name || j.country)) || null,
      region: (j && (j.region || j.region_code || j.region_name)) || null,
      city: (j && j.city) || null,
    }
  } catch {
    return { country: null, region: null, city: null }
  }
}

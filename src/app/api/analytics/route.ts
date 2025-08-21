import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabaseServer'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

// GET /api/analytics
// Aggregates clicks for the authenticated user's links
export async function GET(req: NextRequest) {
  try {
    const auth = req.headers.get('authorization') || req.headers.get('Authorization')
    const token = auth?.startsWith('Bearer ') ? auth.slice('Bearer '.length) : null

    const supabaseServer = getSupabaseServer()
    let user_id: string | null = null
    if (token) {
      const { data, error } = await supabaseServer.auth.getUser(token)
      if (error) {
        // Not fatal; treat as unauthenticated
      } else {
        user_id = data.user?.id ?? null
      }
    }

    if (!user_id) {
      return NextResponse.json({
        summary: { totalClicks: 0, totalLinks: 0 },
        daily: {},
        topReferrers: [],
        topLinks: [],
        countries: [],
        devices: [],
        diagnostics: { resolvedUserId: null, linkCount: 0, clickCount: 0 },
      })
    }

    // Read optional range for daily buckets and debug flag
    const url = new URL(req.url)
    const daysParam = url.searchParams.get('days')
    const debug = url.searchParams.get('debug') === '1'
    const allowed = new Set(['7','30','90'])
    const days = allowed.has(daysParam ?? '') ? Number(daysParam) : 30

    // Get user's links
    const { data: links, error: linksErr } = await supabaseServer
      .from('links')
      .select('id, short_code, created_at')
      .eq('user_id', user_id)
      .limit(2000)
    if (linksErr) return NextResponse.json({ error: linksErr.message }, { status: 500 })
    const linkIds = (links ?? []).map((l) => l.id)

    if (linkIds.length === 0) {
      return NextResponse.json({
        summary: { totalClicks: 0, totalLinks: 0 },
        daily: {},
        topReferrers: [],
        topLinks: [],
        countries: [],
        devices: [],
        diagnostics: { resolvedUserId: user_id, linkCount: 0, clickCount: 0 },
      })
    }

    // Fetch clicks for these links; select all columns and normalize later to be schema-agnostic
    const { data: rawClicks, error: clicksErr } = await supabaseServer
      .from('clicks')
      .select('*')
      .in('link_id', linkIds)
      .limit(50000)
    if (clicksErr) return NextResponse.json({ error: clicksErr.message }, { status: 500 })

    type AnyRow = Record<string, unknown>
    const getIso = (r: AnyRow): string => {
      const v = (r['created_at'] ?? r['createdAt'] ?? r['timestamp'] ?? r['ts'] ?? r['inserted_at'] ?? r['insertedAt']) as string | number | Date | null | undefined
      const d = v ? new Date(v) : new Date(0)
      return Number.isNaN(d.getTime()) ? new Date(0).toISOString() : d.toISOString()
    }
    const getRef = (r: AnyRow): string => (r['referrer'] ?? (r as Record<string, unknown>)['referer'] ?? 'direct') as string
    const getLinkId = (r: AnyRow): string => (r['link_id'] ?? r['linkId'] ?? r['link'] ?? '') as string
    const getCountry = (r: AnyRow): string | null => (r['country'] ?? r['country_code'] ?? r['countryCode'] ?? null) as string | null
    const getDevice = (r: AnyRow): string | null => (r['device'] ?? r['ua_device'] ?? r['user_agent_device'] ?? null) as string | null

    type LinkRow = { id: string; short_code: string }
    const linkMap = new Map<string, { short_code: string }>()
    const typedLinks = (links ?? []) as unknown as LinkRow[]
    for (const l of typedLinks) linkMap.set(l.id, { short_code: l.short_code })

    const getRegion = (r: AnyRow): string | null => (r['region'] ?? r['region_name'] ?? r['subdivision'] ?? null) as string | null
    const getCity = (r: AnyRow): string | null => (r['city'] ?? r['city_name'] ?? null) as string | null
    const getBrowser = (r: AnyRow): string | null => (r['browser'] ?? r['ua_browser'] ?? null) as string | null
    const getOS = (r: AnyRow): string | null => (r['os'] ?? r['ua_os'] ?? null) as string | null
    const getRefDomain = (r: AnyRow): string | null => (r['referrer_domain'] ?? (r as Record<string, unknown>)['referer_domain'] ?? null) as string | null

    // Helpers
    const strip = (s: string | null): string | null => {
      if (!s) return null;
      const t = String(s).trim();
      return t.length ? t : null;
    };
    const parseDomain = (u: string | null): string | null => {
      const v = strip(u);
      if (!v) return null;
      try {
        const url = new URL(v);
        const host = url.hostname.toLowerCase();
        return host || null;
      } catch {
        // Not a full URL; attempt to treat as host
        const m = /^[a-z0-9.-]+$/i.test(v) ? v : null;
        return m ? m.toLowerCase() : null;
      }
    };
    const collapseSubdomain = (host: string): string => host.replace(/^www\./i, '').replace(/^m\./i, '').replace(/^l\./i, '');
    const domainAliases: Record<string, string> = {
      't.co': 'twitter.com',
      'x.com': 'twitter.com',
      'mobile.twitter.com': 'twitter.com',
      'tweetdeck.twitter.com': 'twitter.com',
      'lnkd.in': 'linkedin.com',
      'l.instagram.com': 'instagram.com',
      'm.facebook.com': 'facebook.com',
      'lm.facebook.com': 'facebook.com',
      'l.facebook.com': 'facebook.com',
      'm.youtube.com': 'youtube.com',
      'news.google.com': 'google.com',
      'amp.reddit.com': 'reddit.com',
      'old.reddit.com': 'reddit.com',
      'np.reddit.com': 'reddit.com',
    };
    const normalizeDomainHost = (host: string | null): string | null => {
      if (!host) return null;
      const h = collapseSubdomain(host);
      if (domainAliases[h]) return domainAliases[h];
      // Collapse common country subdomains like google.co.uk -> google.co.uk (keep as-is), but strip deep subdomains
      const parts = h.split('.');
      if (parts.length > 2) {
        // If looks like deep subdomain e.g., sub.domain.tld -> domain.tld
        const base = parts.slice(-2).join('.');
        return domainAliases[base] || base;
      }
      return h;
    };
    const normalizeCountry = (c: string | null): string | null => {
      const v = strip(c);
      if (!v) return null;
      const u = v.toUpperCase();
      // quick alias
      const alias = u === 'UK' ? 'GB' : u;
      return alias;
    };

    const anomalies = {
      parsedRefDomainFromReferrer: 0,
      malformedReferrer: 0,
      unknown: { country: 0, region: 0, city: 0, device: 0, browser: 0, os: 0 },
    };

    const clicks = (rawClicks ?? []).map((r) => {
      const ref = strip(getRef(r)) || 'direct';
      const refDomRaw = strip(getRefDomain(r));
      const parsedDom = parseDomain(ref);
      const refDomNorm = normalizeDomainHost(refDomRaw || parsedDom);
      const refDom = refDomNorm || 'direct';
      if (!refDomRaw && parsedDom) anomalies.parsedRefDomainFromReferrer++;
      if (!refDomRaw && !parsedDom && ref !== 'direct') anomalies.malformedReferrer++;

      const country = normalizeCountry(getCountry(r));
      const region = strip(getRegion(r));
      const city = strip(getCity(r));
      const device = strip(getDevice(r));
      const browser = strip(getBrowser(r));
      const os = strip(getOS(r));
      if (!country) anomalies.unknown.country++;
      if (!region) anomalies.unknown.region++;
      if (!city) anomalies.unknown.city++;
      if (!device) anomalies.unknown.device++;
      if (!browser) anomalies.unknown.browser++;
      if (!os) anomalies.unknown.os++;
      return {
        ts: getIso(r),
        referrer: ref,
        referrer_domain: refDom,
        link_id: getLinkId(r),
        country,
        region,
        city,
        device,
        browser,
        os,
      };
    })

    // Country display name expander (server-side) for convenience
    const DisplayNamesCtor: typeof Intl.DisplayNames | undefined = (Intl as unknown as { DisplayNames?: typeof Intl.DisplayNames }).DisplayNames
    const regionNames = DisplayNamesCtor ? new Intl.DisplayNames(['en'], { type: 'region' }) : null
    const toCountryName = (codeOrName: string) => {
      if (!codeOrName) return 'Unknown'
      const s = String(codeOrName)
      if (/^[A-Z]{2}$/.test(s)) {
        return regionNames?.of(s) || s
      }
      return s
    }

    // Summary
    const totalClicks = clicks.length
    const totalLinks = links?.length ?? 0

    // Daily for last N days (7/30/90)
    const dayKey = (d: Date) => d.toISOString().slice(0, 10)
    const daily: Record<string, number> = {}
    for (let i = 0; i < days; i++) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      daily[dayKey(d)] = 0
    }
    for (const c of clicks) {
      const k = c.ts.slice(0, 10)
      if (k in daily) daily[k]++
    }

    // Referrers
    const refCounts: Record<string, number> = {}
    for (const c of clicks) {
      const key = c.referrer || 'direct'
      refCounts[key] = (refCounts[key] || 0) + 1
    }
    const topReferrers = Object.entries(refCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([referrer, count]) => ({ referrer, count }))

    // Referrer domains
    const refDomCounts: Record<string, number> = {}
    for (const c of clicks) {
      const key = c.referrer_domain ?? 'direct'
      refDomCounts[key] = (refDomCounts[key] || 0) + 1
    }
    const referrerDomains = Object.entries(refDomCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([domain, count]) => ({ domain, count }))

    // Top links
    const linkCounts: Record<string, number> = {}
    for (const c of clicks) {
      const id = c.link_id
      linkCounts[id] = (linkCounts[id] || 0) + 1
    }
    const topLinks = Object.entries(linkCounts)
      .map(([id, count]) => ({ code: linkMap.get(id)?.short_code ?? 'unknown', count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20)

    // Countries
    const countryCounts: Record<string, number> = {}
    for (const c of clicks) {
      const cc = c.country || 'Unknown'
      countryCounts[cc] = (countryCounts[cc] || 0) + 1
    }
    const countries = Object.entries(countryCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([country, count]) => ({ country, count }))

    const countriesHuman = countries.map(({ country, count }) => ({ code: country, name: toCountryName(country), count }))

    // Regions
    const regionCounts: Record<string, number> = {}
    for (const c of clicks) {
      const rg = c.region || 'Unknown'
      regionCounts[rg] = (regionCounts[rg] || 0) + 1
    }
    const regions = Object.entries(regionCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([region, count]) => ({ region, count }))

    // Cities
    const cityCounts: Record<string, number> = {}
    for (const c of clicks) {
      const ct = c.city || 'Unknown'
      cityCounts[ct] = (cityCounts[ct] || 0) + 1
    }
    const cities = Object.entries(cityCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([city, count]) => ({ city, count }))

    // Devices
    const deviceCounts: Record<string, number> = {}
    for (const c of clicks) {
      const dv = c.device || 'Unknown'
      deviceCounts[dv] = (deviceCounts[dv] || 0) + 1
    }
    const devices = Object.entries(deviceCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([device, count]) => ({ device, count }))

    // Browsers
    const browserCounts: Record<string, number> = {}
    for (const c of clicks) {
      const br = c.browser ?? 'Unknown'
      browserCounts[br] = (browserCounts[br] || 0) + 1
    }
    const browsers = Object.entries(browserCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([browser, count]) => ({ browser, count }))

    // OS
    const osCounts: Record<string, number> = {}
    for (const c of clicks) {
      const os = c.os ?? 'Unknown'
      osCounts[os] = (osCounts[os] || 0) + 1
    }
    const oses = Object.entries(osCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([os, count]) => ({ os, count }))

    // Hourly (last 24 hours)
    const hourly: Record<string, number> = {}
    for (let i = 0; i < 24; i++) {
      const d = new Date(); d.setHours(d.getHours() - i, 0, 0, 0)
      const k = d.toISOString().slice(0, 13) // YYYY-MM-DDTHH
      hourly[k] = 0
    }
    for (const c of clicks) {
      const k = c.ts.slice(0, 13)
      if (k in hourly) hourly[k]++
    }

    // Weekdays (0-6)
    const weekdays: Record<string, number> = { Sun: 0, Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0 }
    for (const c of clicks) {
      const d = new Date(c.ts)
      const i = d.getDay()
      const names = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'] as const
      weekdays[names[i]]++
    }

    return NextResponse.json({
      summary: { totalClicks, totalLinks },
      daily,
      topReferrers,
      topLinks,
      countries,
      countriesHuman,
      regions,
      cities,
      devices,
      browsers,
      oses,
      referrerDomains: referrerDomains,
      hourly,
      weekdays,
      range: { days },
      diagnostics: {
        resolvedUserId: user_id,
        linkCount: linkIds.length,
        clickCount: totalClicks,
        anomalies,
        ...(debug ? { sample: clicks.slice(0, 20) } : {}),
      },
    })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

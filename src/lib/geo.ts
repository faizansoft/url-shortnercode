// Lightweight geolocation using ipwho.is (no key, generous free tier)
// Note: Do not call for private/local IPs. Use sparingly and cache responses.

export type GeoLite = {
  country?: string | null;
  region?: string | null;
  city?: string | null;
  lat?: number | null;
  lon?: number | null;
  asn?: string | null;
  org?: string | null;
};

const isPrivateIp = (ip: string) => /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.|127\.|::1|fc00:|fe80:)/i.test(ip);

// Simple in-memory TTL cache (best-effort; edge/runtime may not persist across requests)
const cache = new Map<string, { exp: number; data: GeoLite }>();
const TTL_MS = 1000 * 60 * 60; // 1h

export async function geoLookup(ip: string | null): Promise<GeoLite | null> {
  try {
    if (!ip || isPrivateIp(ip)) return null;
    const now = Date.now();
    const hit = cache.get(ip);
    if (hit && hit.exp > now) return hit.data;

    const url = `https://ipwho.is/${encodeURIComponent(ip)}?fields=success,country,region,city,latitude,longitude,connection.org,connection.asn`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    const j = await res.json();
    if (!j || j.success === false) return null;
    const out: GeoLite = {
      country: j.country ?? null,
      region: j.region ?? null,
      city: j.city ?? null,
      lat: typeof j.latitude === 'number' ? j.latitude : null,
      lon: typeof j.longitude === 'number' ? j.longitude : null,
      asn: j?.connection?.asn ? String(j.connection.asn) : null,
      org: j?.connection?.org ?? null,
    };
    cache.set(ip, { exp: now + TTL_MS, data: out });
    return out;
  } catch {
    return null;
  }
}

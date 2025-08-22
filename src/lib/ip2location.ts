// Geo lookup disabled: lightweight stub only

export type GeoData = { country: string | null; region: string | null; city: string | null }

export async function getGeoFromIP(_ip: string | null): Promise<GeoData> {
  return { country: null, region: null, city: null }
}

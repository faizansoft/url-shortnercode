import ip2location from 'ip2location-nodejs'
import path from 'path'
import fs from 'fs'

// Initialize IP2Location with the database path
const DB_PATH = path.join(process.cwd(), 'data', 'IP2LOCATION-LITE-DB1.IPV6.BIN')

// Cache the IP2Location instance
let ip2l: any | null = null
let triedInit = false

// Simple function to get geo data from IP
interface GeoData {
  country: string | null;
  region: string | null;
  city: string | null;
}

export async function getGeoFromIP(ip: string | null): Promise<GeoData> {
  if (!ip) return { country: null, region: null, city: null }

  try {
    // Lazy initialization
    if (!ip2l && !triedInit) {
      triedInit = true
      try {
        if (!fs.existsSync(DB_PATH)) {
          console.warn(`[ip2location] Database file not found at ${DB_PATH}. Skipping IP2Location lookup.`)
        } else {
          ip2l = new (ip2location as any).IP2Location()
          ip2l.open(DB_PATH)
        }
      } catch (error) {
        console.error('[ip2location] Failed to initialize:', error)
      }
    }

    if (!ip2l) return { country: null, region: null, city: null }

    const result = ip2l.getAll(ip)
    
    return {
      country: result?.countryShort || null,
      region: result?.region || null,
      city: result?.city || null,
    }
  } catch (error) {
    console.error('[ip2location] Lookup failed:', error)
    return { country: null, region: null, city: null }
  }
}

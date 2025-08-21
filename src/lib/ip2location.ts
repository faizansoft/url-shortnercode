import ip2location from 'ip2location-nodejs'
import path from 'path'
import fs from 'fs'

// Initialize IP2Location with the database path (try common filenames)
const DATA_DIR = path.join(process.cwd(), 'data')
const DB_CANDIDATES = [
  'IP2LOCATION-LITE-DB1.IPV6.BIN',
  'IP2LOCATION-LITE-DB1.BIN',
  'IP2LOCATION-LITE-DB3.IPV6.BIN',
  'IP2LOCATION-LITE-DB3.BIN',
]
function findDbPath(): { dbPath: string | null; zipFound: string | null } {
  const zipNames = ['IP2LOCATION-LITE-DB1.IPV6.BIN.zip', 'IP2LOCATION-LITE-DB3.BIN.zip', 'IP2LOCATION-LITE-DB3.IPV6.BIN.zip', 'IP2LOCATION-LITE-DB1.BIN.zip']
  for (const name of DB_CANDIDATES) {
    const p = path.join(DATA_DIR, name)
    if (fs.existsSync(p)) return { dbPath: p, zipFound: null }
  }
  for (const z of zipNames) {
    const zp = path.join(DATA_DIR, z)
    if (fs.existsSync(zp)) return { dbPath: null, zipFound: zp }
  }
  return { dbPath: null, zipFound: null }
}

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
        const { dbPath, zipFound } = findDbPath()
        if (!dbPath) {
          if (zipFound) {
            console.warn(`[ip2location] Found ZIP at ${zipFound}. Please extract the .BIN into the data/ directory.`)
          } else {
            console.warn('[ip2location] No IP2Location .BIN database found in data/. Skipping lookup.')
          }
        } else {
          ip2l = new (ip2location as any).IP2Location()
          ip2l.open(dbPath)
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

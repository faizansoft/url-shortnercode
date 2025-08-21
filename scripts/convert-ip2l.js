#!/usr/bin/env node

// Convert IP2Location DB3 CSV (IPv4) into shards by first octet under public/ip2l/
// Input CSV columns (DB3):
//   ip_from, ip_to, country_code, country_name, region_name, city_name
// Usage:
//   node scripts/convert-ip2l.js data/IP2LOCATION-LITE-DB3.CSV

const fs = require('fs')
const path = require('path')
const readline = require('readline')

const inputPath = process.argv[2] || process.env.IP2L_CSV
if (!inputPath) {
  console.error('Usage: node scripts/convert-ip2l.js <path-to-DB3-CSV>')
  process.exit(1)
}

const projectRoot = process.cwd()
const outDir = path.join(projectRoot, 'public', 'ip2l')
fs.mkdirSync(outDir, { recursive: true })

/**
 * Minimal CSV parser for a single line supporting quoted fields and commas inside quotes
 */
function parseCsvLine(line) {
  const res = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        // escaped quote
        if (line[i + 1] === '"') { cur += '"'; i++; continue }
        inQuotes = false
      } else {
        cur += ch
      }
    } else {
      if (ch === ',') { res.push(cur); cur = '' }
      else if (ch === '"') { inQuotes = true }
      else { cur += ch }
    }
  }
  res.push(cur)
  return res
}

function ip2int(ip) {
  const parts = ip.split('.')
  if (parts.length !== 4) return null
  const a = parts.map(p => {
    const n = Number(p)
    return Number.isInteger(n) && n >= 0 && n <= 255 ? n : NaN
  })
  if (a.some(Number.isNaN)) return null
  return (a[0] << 24) | (a[1] << 16) | (a[2] << 8) | a[3]
}

/**
 * Shards map: firstOctet -> array of { s: number, e: number, c: string, r?: string, ci?: string }
 */
const shards = new Map()

async function main() {
  const rl = readline.createInterface({
    input: fs.createReadStream(inputPath),
    crlfDelay: Infinity,
  })

  let lineNo = 0
  for await (const line of rl) {
    lineNo++
    if (!line || line[0] === '#') continue
    const cols = parseCsvLine(line)
    if (cols.length < 6) {
      if (lineNo === 1) continue // header line maybe
      continue
    }
    // DB3 CSV format (ipv4): ip_from,ip_to,country_code,country_name,region_name,city_name
    const ipFromStr = cols[0]
    const ipToStr = cols[1]
    const country = cols[2] || null
    const region = cols[4] || null
    const city = cols[5] || null

    // Some CSVs use numeric ip_from/ip_to. If dotted, convert to int.
    let s = Number(ipFromStr)
    let e = Number(ipToStr)
    if (!Number.isFinite(s) || !Number.isFinite(e)) {
      const si = ip2int(ipFromStr)
      const ei = ip2int(ipToStr)
      if (si == null || ei == null) continue
      s = si >>> 0
      e = ei >>> 0
    }

    const firstOctet = (s >>> 24) & 0xff
    if (!shards.has(firstOctet)) shards.set(firstOctet, [])
    shards.get(firstOctet).push({ s, e, c: country || null, r: region || null, ci: city || null })
  }

  // Sort and write each shard
  for (const [octet, arr] of shards.entries()) {
    arr.sort((a, b) => a.s - b.s)
    const outPath = path.join(outDir, `${octet}.json`)
    fs.writeFileSync(outPath, JSON.stringify(arr))
    console.log(`Wrote ${outPath} (${arr.length} ranges)`)    
  }

  console.log('Done. Place public/ip2l/*.json on your host (Pages will serve them).')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

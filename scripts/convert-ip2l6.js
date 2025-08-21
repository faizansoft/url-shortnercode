/*
Usage:
  node scripts/convert-ip2l6.js data/IP2LOCATION-LITE-DB3.IPV6.CSV

Reads IP2Location LITE DB3 IPv6 CSV ("ip_from","ip_to","country_code","country_name","region_name","city_name")
and writes sharded JSON ranges to public/ip2l6/<b0>/<b1>.json where b0/b1 are the top 16 bits of ip_from.
Each record is { s: string, e: string, c: string|null, r: string|null, ci: string|null }
*/

const fs = require('fs')
const path = require('path')
const readline = require('readline')

const inputPath = process.argv[2] || process.env.IP2L6_CSV
if (!inputPath) {
  console.error('Usage: node scripts/convert-ip2l6.js <path-to-DB3-IPv6-CSV>')
  process.exit(1)
}

const projectRoot = process.cwd()
const outRoot = path.join(projectRoot, 'public', 'ip2l6')
fs.mkdirSync(outRoot, { recursive: true })

function parseCsvLine(line) {
  const res = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
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

// Shards map: b0 -> Map(b1 -> Array(records))
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
      if (lineNo === 1) continue // header-like first line
      continue
    }
    const unq = (v) => {
      if (v == null) return null
      let t = v
      if (t.length >= 2 && t[0] === '"' && t[t.length - 1] === '"') t = t.slice(1, -1)
      if (t === '-' || t === '') return null
      return t
    }
    const sStr = unq(cols[0])
    const eStr = unq(cols[1])
    const country = unq(cols[2])
    const region = unq(cols[4])
    const city = unq(cols[5])

    let s, e
    try {
      s = BigInt(sStr)
      e = BigInt(eStr)
    } catch {
      continue
    }

    const b0 = Number((s >> 120n) & 0xffn)
    const b1 = Number((s >> 112n) & 0xffn)
    if (!shards.has(b0)) shards.set(b0, new Map())
    const m = shards.get(b0)
    if (!m.has(b1)) m.set(b1, [])
    m.get(b1).push({ s: s.toString(), e: e.toString(), c: country || null, r: region || null, ci: city || null })
  }

  for (const [b0, map2] of shards.entries()) {
    const dir = path.join(outRoot, String(b0))
    fs.mkdirSync(dir, { recursive: true })
    for (const [b1, arr] of map2.entries()) {
      arr.sort((a, b) => (BigInt(a.s) < BigInt(b.s) ? -1 : 1))
      const outPath = path.join(dir, `${b1}.json`)
      fs.writeFileSync(outPath, JSON.stringify(arr))
      console.log(`Wrote ${outPath} (${arr.length} ranges)`)    
    }
  }

  console.log('Done. Place public/ip2l6/<b0>/<b1>.json on your host (Pages will serve them).')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
